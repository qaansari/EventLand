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
    private readonly IPaymentFeeService _paymentFeeService;
    private readonly ILogger<BookingService> _logger;

    public BookingService(
        IApplicationDbContext context, 
        ICacheService cacheService,
        INotificationService notificationService,
        IPaymentFeeService paymentFeeService,
        ILogger<BookingService> logger)
    {
        _context = context;
        _cacheService = cacheService;
        _notificationService = notificationService;
        _paymentFeeService = paymentFeeService;
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
        decimal subtotalAmount;
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

            subtotalAmount = seats.Sum(s => s.Price ?? s.Zone!.Price);
            unitPrice = Math.Round(subtotalAmount / effectiveQuantity, 2);
        }
        else
        {
            unitPrice = tier.Price;
            subtotalAmount = tier.Price * effectiveQuantity;
        }

        Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var paymentMethod);
        if (paymentMethod == PaymentMethod.None)
        {
            paymentMethod = PaymentMethod.BankTransfer;
        }

        // Authoritative pricing breakdown via IPaymentFeeService
        decimal platformFee = 0m;
        decimal processingFee = 0m;
        decimal feePercentage = 0m;

        var normalizedMethod = dto.PaymentMethod?.Trim().ToLowerInvariant() ?? string.Empty;
        if (normalizedMethod is "easypaisa_jazzcash" or "qr_code" or "paypro" or "payproeasypaisajazzcash" or "payproqrcode")
        {
            var lookupMethod = normalizedMethod == "qr_code" || normalizedMethod == "payproqrcode" ? "qr_code" : "easypaisa_jazzcash";
            var feeResult = await _paymentFeeService.CalculateTotalAsync(subtotalAmount, lookupMethod);
            platformFee = feeResult.PlatformFee;
            processingFee = feeResult.ProcessingFee;
            feePercentage = feeResult.FeePercentageAtPurchase;
        }
        else
        {
            // Direct bank transfer / default
            platformFee = _paymentFeeService.CalculatePlatformFee(subtotalAmount);
        }

        decimal totalPayableAmount = subtotalAmount + platformFee + processingFee;

        // Authenticated identity is authoritative over any client-supplied email.
        var effectiveEmail = string.IsNullOrWhiteSpace(userEmail) ? dto.CustomerEmail : userEmail;

        // Collision-safe booking reference: CSPRNG + uniqueness check before insert.
        // Cap iterations at 100 to prevent infinite loops under adversarial collision flooding.
        string bookingRef = string.Empty;
        const int maxAttempts = 100;
        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            bookingRef = $"EVL-{System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000)}";
            if (!await _context.Bookings.AnyAsync(b => b.BookingRef == bookingRef))
                break;
            if (attempt == maxAttempts - 1)
                throw new InvalidOperationException("Failed to generate a unique booking reference after multiple attempts. Please try again.");
        }

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
            SubtotalAmount = subtotalAmount,
            PlatformFee = platformFee,
            PaymentProcessingFee = processingFee,
            FeePercentageAtPurchase = feePercentage,
            TotalAmount = totalPayableAmount,
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

            if (seatIds.Count > 0)
            {
                var flipped = await _context.Seats
                    .Where(s => seatIds.Contains(s.Id)
                             && s.Status == SeatStatus.Available
                             && !s.IsDeleted
                             && _context.SeatingZones.Any(z => z.Id == s.ZoneId && z.EventId == dto.EventId && !z.IsDeleted))
                    .ExecuteUpdateAsync(s => s.SetProperty(seat => seat.Status, SeatStatus.Reserved));

                if (flipped != seatIds.Count)
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
        var booking = await GetBookingForMutationAsync(id);

        if (booking.PaymentExpiresAt.HasValue && booking.PaymentExpiresAt.Value <= DateTimeOffset.UtcNow && booking.PaymentStatus == PaymentStatus.Pending)
        {
            throw new InvalidOperationException("The 30-minute payment hold window for this booking has expired. Please place a new booking.");
        }

        booking.BankTransactionRef = dto.BankTransactionRef?.Trim();
        booking.PaymentProofUrl = dto.PaymentProofUrl?.Trim();
        booking.SenderAccountTitle = dto.SenderAccountTitle?.Trim();
        booking.SenderBankName = dto.SenderBankName?.Trim();
        booking.SenderAccountLast4 = dto.SenderAccountLast4?.Trim();
        booking.PaymentStatus = PaymentStatus.PendingVerification;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Customer submitted Bank Transfer Proof for Booking {BookingRef} (Ref: {BankTxRef})", 
            booking.BookingRef, booking.BankTransactionRef);

        return MapToDto(booking);
    }

    public async Task<BookingDto> ConfirmBankPaymentAsync(int id, ConfirmBankPaymentDto dto, int? adminId = null, string? adminEmail = null)
    {
        var booking = await GetBookingForMutationAsync(id);

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

        // Dispatch E-Ticket pass via Email in background
        _ = Task.Run(async () =>
        {
            try
            {
                await _notificationService.SendTicketConfirmationEmailAsync(resultDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background error sending ticket confirmation email for Booking {BookingRef}", booking.BookingRef);
            }
        });

        _logger.LogInformation("Admin {AdminEmail} verified & confirmed Bank Transfer for Booking {BookingRef}. E-Ticket generated!",
            adminEmail, booking.BookingRef);

        return resultDto;
    }

    public async Task<BookingDto> RejectBankPaymentAsync(int id, RejectBankPaymentDto dto, int? adminId = null, string? adminEmail = null)
    {
        var booking = await GetBookingForMutationAsync(id);

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

    private async Task<Booking> GetBookingForMutationAsync(int id)
    {
        var booking = await _context.Bookings
            .Include(b => b.Event)
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);

        return booking ?? throw new KeyNotFoundException($"Booking with ID '{id}' not found.");
    }

    public async Task<BookingDto?> GetBookingByIdAsync(int id)
    {
        var b = await _context.Bookings
            .AsNoTracking()
            .Include(x => x.Event).ThenInclude(e => e!.Venue)
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
            .Include(x => x.Event).ThenInclude(e => e!.Venue)
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

        var normalizedEmail = email.Trim().ToLowerInvariant();

        var baseFilter = _context.Bookings
            .AsNoTracking()
            .Where(b => EF.Functions.Like(b.CustomerEmail, normalizedEmail) && !b.IsDeleted);

        var totalCount = await baseFilter.CountAsync();

        var items = await baseFilter
            .Include(x => x.Event).ThenInclude(e => e!.Venue)
            .Include(x => x.TicketTier)
            .Include(x => x.BookingSeats).ThenInclude(bs => bs.Seat)
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
            FileUrlHelper.FormatPaymentSlipUrl(b.PaymentProofUrl),
            b.SenderAccountTitle,
            b.SenderBankName,
            b.SenderAccountLast4,
            b.VerifiedAt,
            b.PaymentExpiresAt,
            FileUrlHelper.FormatEventBannerUrl(b.Event?.Banner),
            b.Event?.Venue?.Name,
            b.SubtotalAmount,
            b.PlatformFee,
            b.PaymentProcessingFee
        );
    }

    // ── Gate Check-In & Ticket Validation ────────────────────────────────────
    public async Task<TicketValidationResultDto> ValidateGateTicketAsync(ValidateGateTicketRequestDto request, int? validatorUserId = null, string? validatorEmail = null)
    {
        var validatedAt = DateTimeOffset.UtcNow;
        if (string.IsNullOrWhiteSpace(request.TicketCode))
        {
            return new TicketValidationResultDto(
                IsValid: false,
                Status: "INVALID",
                Message: "Ticket code or QR payload cannot be empty.",
                ValidatedAt: validatedAt
            );
        }

        var parsedRef = ExtractBookingRef(request.TicketCode);
        int.TryParse(parsedRef, out var numericId);

        var booking = await _context.Bookings
            .Include(b => b.Event)
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(b => (!string.IsNullOrEmpty(b.BookingRef) && b.BookingRef.ToLower() == parsedRef.ToLower()) 
                                   || (numericId > 0 && b.Id == numericId));

        if (booking is null || booking.IsDeleted)
        {
            return new TicketValidationResultDto(
                IsValid: false,
                Status: "NOT_FOUND",
                Message: $"Ticket pass '{parsedRef}' was not found in the system.",
                ValidatedAt: validatedAt
            );
        }

        var seatLabels = booking.BookingSeats
            .Where(bs => bs.Seat != null)
            .Select(bs => bs.Seat!.Label)
            .ToList();

        // 1. Payment status check
        if (booking.PaymentStatus != PaymentStatus.Paid || booking.Status != BookingStatus.Confirmed)
        {
            var reason = booking.Status == BookingStatus.Cancelled ? "CANCELLED"
                : booking.PaymentStatus == PaymentStatus.Expired ? "EXPIRED"
                : booking.PaymentStatus == PaymentStatus.Refunded ? "REFUNDED"
                : "UNPAID";

            var msg = reason switch
            {
                "CANCELLED" => "This ticket pass has been CANCELLED and is invalid for entry.",
                "EXPIRED" => "This ticket hold has EXPIRED and was never completed.",
                "REFUNDED" => "This ticket pass has been REFUNDED and is void for entry.",
                _ => $"Payment status is {booking.PaymentStatus}. Tickets require confirmed payment before gate admission."
            };

            return new TicketValidationResultDto(
                IsValid: false,
                Status: reason,
                Message: msg,
                BookingId: booking.Id,
                BookingRef: booking.BookingRef,
                CustomerName: booking.CustomerName,
                CustomerEmail: booking.CustomerEmail,
                CustomerPhone: booking.CustomerPhone,
                EventId: booking.EventId,
                EventTitle: booking.Event?.Title,
                TicketTierName: booking.TicketTier?.Name,
                Quantity: booking.Quantity,
                SeatLabels: seatLabels,
                ValidatedAt: validatedAt
            );
        }

        // 2. Event constraint check (if specified by scanner)
        if (request.EventId.HasValue && booking.EventId != request.EventId.Value)
        {
            return new TicketValidationResultDto(
                IsValid: false,
                Status: "EVENT_MISMATCH",
                Message: $"Wrong Event: This ticket is for '{booking.Event?.Title}', not the selected event.",
                BookingId: booking.Id,
                BookingRef: booking.BookingRef,
                CustomerName: booking.CustomerName,
                CustomerEmail: booking.CustomerEmail,
                CustomerPhone: booking.CustomerPhone,
                EventId: booking.EventId,
                EventTitle: booking.Event?.Title,
                TicketTierName: booking.TicketTier?.Name,
                Quantity: booking.Quantity,
                SeatLabels: seatLabels,
                ValidatedAt: validatedAt
            );
        }

        // 3. Show constraint check (if specified)
        if (request.EventShowId.HasValue && booking.TicketTier?.EventShowId != null && booking.TicketTier.EventShowId != request.EventShowId.Value)
        {
            return new TicketValidationResultDto(
                IsValid: false,
                Status: "SHOW_MISMATCH",
                Message: "Wrong Show Slot: This ticket is scheduled for a different show timing.",
                BookingId: booking.Id,
                BookingRef: booking.BookingRef,
                CustomerName: booking.CustomerName,
                CustomerEmail: booking.CustomerEmail,
                CustomerPhone: booking.CustomerPhone,
                EventId: booking.EventId,
                EventTitle: booking.Event?.Title,
                TicketTierName: booking.TicketTier?.Name,
                Quantity: booking.Quantity,
                SeatLabels: seatLabels,
                ValidatedAt: validatedAt
            );
        }

        // 4. Double-entry prevention check
        if (booking.IsCheckedIn)
        {
            var alreadyCheckInTime = booking.CheckedInAt?.ToLocalTime().ToString("g") ?? "Earlier";
            var gatekeeper = !string.IsNullOrWhiteSpace(booking.CheckedInBy) ? booking.CheckedInBy : "Gatekeeper";
            return new TicketValidationResultDto(
                IsValid: false,
                Status: "ALREADY_CHECKED_IN",
                Message: $"DUPLICATE ENTRY DETECTED: This pass was already checked in on {alreadyCheckInTime} by {gatekeeper}.",
                BookingId: booking.Id,
                BookingRef: booking.BookingRef,
                CustomerName: booking.CustomerName,
                CustomerEmail: booking.CustomerEmail,
                CustomerPhone: booking.CustomerPhone,
                EventId: booking.EventId,
                EventTitle: booking.Event?.Title,
                TicketTierName: booking.TicketTier?.Name,
                Quantity: booking.Quantity,
                SeatLabels: seatLabels,
                CheckedInAt: booking.CheckedInAt,
                CheckedInBy: booking.CheckedInBy,
                GateName: booking.GateNotes,
                ValidatedAt: validatedAt
            );
        }

        // 5. Check-In admission execution
        if (request.CheckIn)
        {
            booking.IsCheckedIn = true;
            booking.CheckedInAt = validatedAt;
            booking.CheckedInBy = validatorEmail ?? "Gatekeeper";
            booking.GateNotes = request.GateName;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Ticket {BookingRef} successfully checked in at gate {GateName} by {Validator}.", 
                booking.BookingRef, request.GateName, validatorEmail);

            return new TicketValidationResultDto(
                IsValid: true,
                Status: "APPROVED",
                Message: $"ENTRY APPROVED! Welcome, {booking.CustomerName}.",
                BookingId: booking.Id,
                BookingRef: booking.BookingRef,
                CustomerName: booking.CustomerName,
                CustomerEmail: booking.CustomerEmail,
                CustomerPhone: booking.CustomerPhone,
                EventId: booking.EventId,
                EventTitle: booking.Event?.Title,
                TicketTierName: booking.TicketTier?.Name,
                Quantity: booking.Quantity,
                SeatLabels: seatLabels,
                CheckedInAt: booking.CheckedInAt,
                CheckedInBy: booking.CheckedInBy,
                GateName: booking.GateNotes,
                ValidatedAt: validatedAt
            );
        }

        // Validate/preview only mode
        return new TicketValidationResultDto(
            IsValid: true,
            Status: "VALID_NOT_CHECKED_IN",
            Message: $"Ticket is valid for {booking.CustomerName} ({booking.Quantity} pass{(booking.Quantity > 1 ? "es" : "")}). Ready for check-in.",
            BookingId: booking.Id,
            BookingRef: booking.BookingRef,
            CustomerName: booking.CustomerName,
            CustomerEmail: booking.CustomerEmail,
            CustomerPhone: booking.CustomerPhone,
            EventId: booking.EventId,
            EventTitle: booking.Event?.Title,
            TicketTierName: booking.TicketTier?.Name,
            Quantity: booking.Quantity,
            SeatLabels: seatLabels,
            ValidatedAt: validatedAt
        );
    }

    public async Task<GateStatsDto> GetEventGateStatsAsync(int eventId)
    {
        var ev = await _context.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId && !e.IsDeleted);

        if (ev is null)
            throw new KeyNotFoundException($"Event with ID '{eventId}' not found.");

        var bookings = await _context.Bookings
            .AsNoTracking()
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .Where(b => b.EventId == eventId && b.PaymentStatus == PaymentStatus.Paid && !b.IsDeleted)
            .OrderByDescending(b => b.CheckedInAt)
            .ToListAsync();

        var totalSold = bookings.Sum(b => b.Quantity);
        var checkedInList = bookings.Where(b => b.IsCheckedIn).ToList();
        var totalCheckedIn = checkedInList.Sum(b => b.Quantity);
        var remaining = Math.Max(0, totalSold - totalCheckedIn);
        var pct = totalSold > 0 ? Math.Round((double)totalCheckedIn / totalSold * 100, 1) : 0.0;

        var recentScans = checkedInList
            .Take(25)
            .Select(b => new RecentGateScanDto(
                BookingId: b.Id,
                BookingRef: b.BookingRef,
                CustomerName: b.CustomerName,
                TierName: b.TicketTier?.Name ?? "General",
                SeatSummary: b.BookingSeats.Count > 0 
                    ? string.Join(", ", b.BookingSeats.Select(s => s.Seat?.Label ?? "")) 
                    : $"{b.Quantity} Tickets",
                Status: "APPROVED",
                CheckedInAt: b.CheckedInAt ?? DateTimeOffset.UtcNow,
                CheckedInBy: b.CheckedInBy,
                GateName: b.GateNotes
            ))
            .ToList();

        return new GateStatsDto(
            EventId: ev.Id,
            EventTitle: ev.Title,
            TotalTicketsSold: totalSold,
            TotalCheckedIn: totalCheckedIn,
            TotalRemaining: remaining,
            AttendancePercentage: pct,
            RecentScans: recentScans
        );
    }

    public async Task<TicketValidationResultDto> ResetGateCheckInAsync(ResetGateCheckInRequestDto request, int? adminId = null, string? adminEmail = null)
    {
        var validatedAt = DateTimeOffset.UtcNow;
        var parsedRef = ExtractBookingRef(request.TicketCode);
        int.TryParse(parsedRef, out var numericId);

        var booking = await _context.Bookings
            .Include(b => b.Event)
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(b => (!string.IsNullOrEmpty(b.BookingRef) && b.BookingRef.ToLower() == parsedRef.ToLower()) 
                                   || (numericId > 0 && b.Id == numericId));

        if (booking is null || booking.IsDeleted)
            throw new KeyNotFoundException($"Booking '{parsedRef}' not found.");

        booking.IsCheckedIn = false;
        booking.CheckedInAt = null;
        booking.CheckedInBy = null;
        booking.GateNotes = !string.IsNullOrWhiteSpace(request.Reason) 
            ? $"Reset: {request.Reason.Trim()}" 
            : $"Reset by {adminEmail ?? "Admin"} at {validatedAt:g}";

        await _context.SaveChangesAsync();

        _logger.LogInformation("Ticket {BookingRef} check-in reset by {AdminEmail}.", booking.BookingRef, adminEmail);

        var seatLabels = booking.BookingSeats
            .Where(bs => bs.Seat != null)
            .Select(bs => bs.Seat!.Label)
            .ToList();

        return new TicketValidationResultDto(
            IsValid: true,
            Status: "RESET",
            Message: $"Check-in status for ticket {booking.BookingRef} has been successfully reset.",
            BookingId: booking.Id,
            BookingRef: booking.BookingRef,
            CustomerName: booking.CustomerName,
            CustomerEmail: booking.CustomerEmail,
            CustomerPhone: booking.CustomerPhone,
            EventId: booking.EventId,
            EventTitle: booking.Event?.Title,
            TicketTierName: booking.TicketTier?.Name,
            Quantity: booking.Quantity,
            SeatLabels: seatLabels,
            ValidatedAt: validatedAt
        );
    }

    public static string ExtractBookingRef(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var trimmed = input.Trim();

        // Handle raw QR text containing "ID: EVL-XXXX"
        var idMarker = "ID:";
        var idIndex = trimmed.IndexOf(idMarker, StringComparison.OrdinalIgnoreCase);
        if (idIndex >= 0)
        {
            var substring = trimmed.Substring(idIndex + idMarker.Length).TrimStart();
            var lineEnd = substring.IndexOfAny(new[] { '\r', '\n', ' ', '\t' });
            return (lineEnd > 0 ? substring[..lineEnd] : substring).Trim();
        }

        // Handle verify URL e.g. /verify/EVL-XXXX or https://.../verify/EVL-XXXX
        var verifyMarker = "/verify/";
        var verifyIndex = trimmed.IndexOf(verifyMarker, StringComparison.OrdinalIgnoreCase);
        if (verifyIndex >= 0)
        {
            var afterVerify = trimmed.Substring(verifyIndex + verifyMarker.Length).Trim();
            var slashOrParam = afterVerify.IndexOfAny(new[] { '?', '#', '/', ' ' });
            return (slashOrParam > 0 ? afterVerify[..slashOrParam] : afterVerify).Trim();
        }

        // Handle ?verify=EVL-XXXX
        var paramMarker = "verify=";
        var paramIndex = trimmed.IndexOf(paramMarker, StringComparison.OrdinalIgnoreCase);
        if (paramIndex >= 0)
        {
            var afterParam = trimmed.Substring(paramIndex + paramMarker.Length).Trim();
            var endParam = afterParam.IndexOfAny(new[] { '&', '#', ' ' });
            return (endParam > 0 ? afterParam[..endParam] : afterParam).Trim();
        }

        // Handle standard EVL- regex or direct ref
        var evlMatch = System.Text.RegularExpressions.Regex.Match(trimmed, @"(EVL-[A-Za-z0-9\-]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (evlMatch.Success)
        {
            return evlMatch.Groups[1].Value.Trim();
        }

        return trimmed;
    }
}
