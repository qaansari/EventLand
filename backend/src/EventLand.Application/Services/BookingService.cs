namespace EventLand.Application.Services;

using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using Microsoft.EntityFrameworkCore;

public class BookingService : IBookingService
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public BookingService(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
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
        // Seated events price per seat (seat override → zone price → tier price);
        // general-admission events price by tier.
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

        // Authenticated identity is authoritative over any client-supplied email.
        var effectiveEmail = string.IsNullOrWhiteSpace(userEmail) ? dto.CustomerEmail : userEmail;

        // Collision-safe booking reference: CSPRNG + uniqueness check before insert.
        // The unique index on BookingRef remains the final backstop against the race window.
        string bookingRef;
        do
        {
            bookingRef = $"EVL-{System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000)}";
        } while (await _context.Bookings.AnyAsync(b => b.BookingRef == bookingRef));

        var booking = new Booking
        {
            EventId = dto.EventId,
            TicketTierId = dto.TicketTierId,
            UserId = userId,
            BookingRef = bookingRef,
            CustomerName = dto.CustomerName,
            CustomerEmail = effectiveEmail,
            CustomerPhone = dto.CustomerPhone,
            Quantity = effectiveQuantity,
            UnitPrice = unitPrice,
            TotalAmount = totalAmount,
            // Pending until payment is confirmed via the PayPro invoice/IPN flow.
            Status = BookingStatus.Pending,
            PaymentStatus = PaymentStatus.Pending,
            PaymentMethod = paymentMethod,
            // Give abandoned bookings a reclaim window even before an invoice is generated.
            PaymentExpiresAt = DateTimeOffset.UtcNow.AddMinutes(60)
        };

        // Built once, outside the retryable delegate: re-adding the same entity
        // references on a transient-failure retry is a no-op, so no duplicate rows.
        var bookingSeats = seatIds
            .Select(seatId => new BookingSeat
            {
                Booking = booking,
                SeatId = seatId,
                EventShowId = dto.EventShowId
            })
            .ToList();

        // ── Atomic reservation ───────────────────────────────────────────────
        // EnableRetryOnFailure requires explicit transactions to run inside an
        // execution strategy. All availability guards run as conditional UPDATEs
        // so the database is the single source of truth against oversell / double-book.
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

        return await GetBookingByIdAsync(booking.Id)
            ?? throw new InvalidOperationException("Failed to load created booking.");
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
            .Where(b => b.CustomerEmail == email && !b.IsDeleted);

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
            b.GatewayFee,
            b.GrossAmount > 0 ? b.GrossAmount : b.TotalAmount,
            b.Status.ToString(),
            b.PaymentStatus.ToString(),
            b.PaymentMethod.ToString(),
            b.PaidAt,
            b.CreatedAt,
            b.BookingSeats.Select(bs => new BookingSeatDto(
                bs.Seat.Id,
                bs.Seat.Label,
                bs.Seat.Row,
                bs.Seat.Col,
                bs.Seat.Price
            )).ToList(),
            b.PayFastTransactionId,
            b.PayFastUrl,
            b.PaymentExpiresAt
        );
    }
}
