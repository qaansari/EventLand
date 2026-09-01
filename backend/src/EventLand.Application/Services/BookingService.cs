namespace EventLand.Application.Services;

using EventLand.Application.Common;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

public class BookingService : IBookingService
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<BookingService> _logger;

    public BookingService(
        IApplicationDbContext context, 
        ICacheService cacheService,
        INotificationService notificationService,
        ILogger<BookingService> logger)
    {
        _context = context;
        _cacheService = cacheService;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<BookingDto> CreateBookingAsync(CreateBookingDto dto, int? userId = null, string? userEmail = null)
    {
        var ev = await _context.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == dto.EventId && !e.IsDeleted);

        if (ev is null)
            throw new KeyNotFoundException($"Event with ID '{dto.EventId}' not found.");

        var tier = await _context.TicketTiers
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == dto.TicketTierId && t.EventId == dto.EventId && !t.IsDeleted);

        if (tier is null)
            throw new KeyNotFoundException($"Ticket tier '{dto.TicketTierId}' not found for event '{dto.EventId}'.");

        // Deduplicate any repeated seat ids the client may have sent.
        var seatIds = dto.SelectedSeatIds?.Where(id => id > 0).Distinct().ToList() ?? new List<int>();
        var isSeated = seatIds.Count > 0;

        var effectiveQuantity = isSeated ? seatIds.Count : Math.Max(1, dto.Quantity);

        if (tier.MaxPerOrder > 0 && effectiveQuantity > tier.MaxPerOrder)
            throw new InvalidOperationException($"You may book at most {tier.MaxPerOrder} ticket(s) per order for '{tier.Name}'.");

        // ── Pricing ──────────────────────────────────────────────────────────
        // Seated events price per seat; general-admission events price by tier.
        decimal unitPrice;
        decimal totalAmount;
        List<Seat> seats = new();

        if (isSeated)
        {
            seats = await _context.Seats
                .AsNoTracking()
                .Include(s => s.Zone)
                .Where(s => seatIds.Contains(s.Id) && !s.IsDeleted)
                .ToListAsync();

            if (seats.Count != seatIds.Count)
                throw new InvalidOperationException("One or more selected seats could not be found.");

            if (seats.Any(s => s.Zone == null || s.Zone.EventId != dto.EventId))
                throw new InvalidOperationException("One or more selected seats do not belong to this event.");

            totalAmount = seats.Sum(s => s.Price ?? s.Zone!.Price);
            unitPrice = Math.Round(totalAmount / effectiveQuantity, 2);
        }
        else
        {
            unitPrice = tier.Price;
            totalAmount = tier.Price * effectiveQuantity;
        }

        Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var paymentMethod);
        if (paymentMethod == PaymentMethod.None)
        {
            paymentMethod = PaymentMethod.BankTransfer;
        }

        // Authenticated identity is authoritative over any client-supplied email.
        var effectiveEmail = string.IsNullOrWhiteSpace(userEmail) ? dto.CustomerEmail : userEmail;

        // Collision-safe booking reference: CSPRNG + uniqueness check before insert.
        string bookingRef;
        do
        {
            bookingRef = $"EVL-{System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000)}";
        } while (await _context.Bookings.AnyAsync(b => b.BookingRef == bookingRef));

        // Exactly 30-minute reservation hold window for bank transfer
        var holdExpiresAt = DateTimeOffset.UtcNow.AddMinutes(30);

        var booking = new Booking
        {
            EventId = dto.EventId,
            TicketTierId = dto.TicketTierId,
            UserId = userId,
            BookingRef = bookingRef,
            CustomerName = dto.CustomerName.Trim(),
            CustomerEmail = effectiveEmail.Trim(),
            CustomerPhone = dto.CustomerPhone.Trim(),
            Quantity = effectiveQuantity,
            UnitPrice = unitPrice,
            TotalAmount = totalAmount,
            Status = BookingStatus.Pending,
            PaymentStatus = PaymentStatus.Pending,
            PaymentMethod = paymentMethod,
            PaymentExpiresAt = holdExpiresAt
        };

        var bookingSeats = seatIds
            .Select(seatId => new BookingSeat
            {
                Booking = booking,
                SeatId = seatId,
                EventShowId = dto.EventShowId
            })
            .ToList();

        // ── Atomic reservation ───────────────────────────────────────────────
        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            var reserved = await _context.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE TicketTiers SET SoldCount = SoldCount + {effectiveQuantity} WHERE Id = {tier.Id} AND IsDeleted = 0 AND (SoldCount + {effectiveQuantity}) <= AvailableQuantity");

            if (reserved == 0)
                throw new InvalidOperationException($"Not enough tickets available in tier '{tier.Name}'.");

            foreach (var seatId in seatIds)
            {
                // Flip only if still Available AND still belongs to this event.
                var flipped = await _context.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE Seats SET Status = {(int)SeatStatus.Reserved} WHERE Id = {seatId} AND Status = {(int)SeatStatus.Available} AND IsDeleted = 0 AND ZoneId IN (SELECT Id FROM SeatingZones WHERE EventId = {dto.EventId} AND IsDeleted = 0)");

                if (flipped == 0)
                    throw new InvalidOperationException("One or more selected seats are no longer available. Please choose different seats.");
            }

            _context.Bookings.Add(booking);
            foreach (var bs in bookingSeats)
                _context.BookingSeats.Add(bs);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        });

        // Release the ephemeral (Redis) hold now that the DB reservation is authoritative.
        if (isSeated)
            await _cacheService.ReleaseSeatsAsync(dto.EventId, seatIds, dto.EventShowId);

        await _cacheService.ClearEventCacheAsync(dto.EventId);

        _logger.LogInformation("Created Booking {BookingRef} for {CustomerEmail}. 30-min hold expires at {HoldExpiresAt:O}",
            booking.BookingRef, booking.CustomerEmail, holdExpiresAt);

        return await GetBookingByIdAsync(booking.Id)
            ?? throw new InvalidOperationException("Failed to load created booking.");
    }

    public async Task<BookingDto> SubmitPaymentProofAsync(int id, SubmitBankPaymentProofDto dto)
    {
        var booking = await _context.Bookings
            .Include(b => b.Event)
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);

        if (booking is null)
            throw new KeyNotFoundException($"Booking with ID '{id}' not found.");

        if (booking.PaymentExpiresAt.HasValue && booking.PaymentExpiresAt.Value <= DateTimeOffset.UtcNow && booking.PaymentStatus == PaymentStatus.Pending)
        {
            throw new InvalidOperationException("The 30-minute payment hold window for this booking has expired. Please place a new booking.");
        }

        booking.BankTransactionRef = dto.BankTransactionRef?.Trim();
        booking.PaymentProofUrl = dto.PaymentProofUrl?.Trim();
        booking.PaymentStatus = PaymentStatus.PendingVerification;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Customer submitted Bank Transfer Proof for Booking {BookingRef} (Ref: {BankTxRef})", 
            booking.BookingRef, booking.BankTransactionRef);

        return MapToDto(booking);
    }

    public async Task<BookingDto> ConfirmBankPaymentAsync(int id, ConfirmBankPaymentDto dto, int? adminId = null, string? adminEmail = null)
    {
        var booking = await _context.Bookings
            .Include(b => b.Event)
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);

        if (booking is null)
            throw new KeyNotFoundException($"Booking with ID '{id}' not found.");

        if (booking.PaymentStatus == PaymentStatus.Paid)
            return MapToDto(booking);

        var now = DateTimeOffset.UtcNow;
        booking.PaymentStatus = PaymentStatus.Paid;
        booking.Status = BookingStatus.Confirmed;
        booking.PaidAt = now;
        booking.VerifiedByAdminId = adminId;
        booking.VerifiedByAdminEmail = adminEmail ?? "admin@eventland.pk";
        booking.VerifiedAt = now;

        // Permanently book reserved seats
        foreach (var bs in booking.BookingSeats)
        {
            if (bs.Seat != null)
            {
                bs.Seat.Status = SeatStatus.Booked;
            }
        }

        var seatIds = booking.BookingSeats.Select(bs => bs.SeatId).ToList();
        if (seatIds.Any())
        {
            await _cacheService.ReleaseSeatsAsync(booking.EventId, seatIds, null);
        }

        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(booking.EventId);

        var resultDto = MapToDto(booking);

        // Dispatch E-Ticket pass via Email
        _ = _notificationService.SendTicketConfirmationEmailAsync(resultDto);

        _logger.LogInformation("Admin {AdminEmail} verified & confirmed Bank Transfer for Booking {BookingRef}. E-Ticket generated!",
            adminEmail, booking.BookingRef);

        return resultDto;
    }

    public async Task<BookingDto> RejectBankPaymentAsync(int id, RejectBankPaymentDto dto, int? adminId = null, string? adminEmail = null)
    {
        var booking = await _context.Bookings
            .Include(b => b.Event)
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);

        if (booking is null)
            throw new KeyNotFoundException($"Booking with ID '{id}' not found.");

        booking.PaymentStatus = PaymentStatus.Failed;
        booking.Status = BookingStatus.Cancelled;
        booking.RefundReason = dto.Reason ?? "Payment transfer could not be verified by Admin.";
        booking.VerifiedByAdminId = adminId;
        booking.VerifiedByAdminEmail = adminEmail ?? "admin@eventland.pk";
        booking.VerifiedAt = DateTimeOffset.UtcNow;

        if (booking.TicketTier != null)
        {
            booking.TicketTier.SoldCount = Math.Max(0, booking.TicketTier.SoldCount - booking.Quantity);
        }

        foreach (var bs in booking.BookingSeats)
        {
            if (bs.Seat != null)
            {
                bs.Seat.Status = SeatStatus.Available;
            }
        }

        var seatIds = booking.BookingSeats.Select(bs => bs.SeatId).ToList();
        if (seatIds.Any())
        {
            await _cacheService.ReleaseSeatsAsync(booking.EventId, seatIds, null);
        }

        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(booking.EventId);

        _logger.LogInformation("Admin {AdminEmail} rejected Bank Transfer for Booking {BookingRef}. Seats unlocked.",
            adminEmail, booking.BookingRef);

        return MapToDto(booking);
    }

    public async Task<BookingDto?> GetBookingByIdAsync(int id)
    {
        var b = await _context.Bookings
            .AsNoTracking()
            .Include(x => x.Event)
            .Include(x => x.TicketTier)
            .Include(x => x.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (b is null) return null;

        return MapToDto(b);
    }

    public async Task<BookingDto?> GetBookingByRefAsync(string bookingRef)
    {
        var b = await _context.Bookings
            .AsNoTracking()
            .Include(x => x.Event)
            .Include(x => x.TicketTier)
            .Include(x => x.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(x => x.BookingRef == bookingRef && !x.IsDeleted);

        if (b is null) return null;

        return MapToDto(b);
    }

    public async Task<PagedResult<BookingDto>> GetBookingsByEmailAsync(string email, int pageNumber = 1, int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Bookings
            .AsNoTracking()
            .Include(x => x.Event)
            .Include(x => x.TicketTier)
            .Include(x => x.BookingSeats).ThenInclude(bs => bs.Seat)
            .Where(b => b.CustomerEmail.ToLower() == email.ToLower() && !b.IsDeleted);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<BookingDto>(items.Select(MapToDto).ToList(), totalCount, pageNumber, pageSize);
    }

    private static BookingDto MapToDto(Booking b)
    {
        return new BookingDto(
            b.Id,
            b.EventId,
            b.Event?.Title ?? "Event",
            b.TicketTierId,
            b.TicketTier?.Name ?? "Ticket Tier",
            b.BookingRef,
            b.CustomerName,
            b.CustomerEmail,
            b.CustomerPhone,
            b.Quantity,
            b.UnitPrice,
            b.TotalAmount,
            b.Status.ToString(),
            b.PaymentStatus.ToString(),
            b.PaymentMethod.ToString(),
            b.PaidAt,
            b.CreatedAt,
            b.BookingSeats
                .Where(bs => bs.Seat != null)
                .Select(bs => new BookingSeatDto(
                    bs.Seat!.Id,
                    bs.Seat.Label,
                    bs.Seat.Row,
                    bs.Seat.Col,
                    bs.Seat.Price
                )).ToList(),
            b.BankTransactionRef,
            b.PaymentProofUrl,
            b.VerifiedAt,
            b.PaymentExpiresAt,
            FileUrlHelper.FormatEventBannerUrl(b.Event?.Banner),
            b.Event?.Venue?.Name ?? b.Event?.Address
        );
    }
}
