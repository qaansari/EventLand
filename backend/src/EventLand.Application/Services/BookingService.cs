namespace EventLand.Application.Services;

using EventLand.Application.Common;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Domain.Exceptions;
using EventLand.Domain.Services;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

public class BookingService : IBookingService
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly INotificationService _notificationService;
    private readonly IPaymentFeeService _paymentFeeService;
    private readonly ILogger<BookingService> _logger;
    private readonly IGateQrSignatureService? _gateQrSignatureService;
    private readonly TimeProvider _timeProvider;
    private readonly EventLand.Application.Common.EventLandTelemetry? _telemetry;

    public BookingService(
        IApplicationDbContext context,
        ICacheService cacheService,
        INotificationService notificationService,
        IPaymentFeeService paymentFeeService,
        ILogger<BookingService> logger,
        IGateQrSignatureService? gateQrSignatureService = null,
        TimeProvider? timeProvider = null,
        EventLand.Application.Common.EventLandTelemetry? telemetry = null)
    {
        _context = context;
        _cacheService = cacheService;
        _notificationService = notificationService;
        _paymentFeeService = paymentFeeService;
        _logger = logger;
        _gateQrSignatureService = gateQrSignatureService;
        _timeProvider = timeProvider ?? TimeProvider.System;
        _telemetry = telemetry;
    }

    public async Task<BookingDto> CreateBookingAsync(CreateBookingDto dto, int? userId = null, string? userEmail = null)
    {
        var ev = await _context.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == dto.EventId && !e.IsDeleted);

        if (ev is null)
            throw new KeyNotFoundException($"Event with ID '{dto.EventId}' not found.");

        EventShow? show = null;
        if (dto.EventShowId.HasValue && dto.EventShowId.Value > 0)
        {
            show = await _context.EventShows
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == dto.EventShowId.Value && s.EventId == dto.EventId && !s.IsDeleted);
        }

        var tier = await _context.TicketTiers
            .AsNoTracking()
            .Include(t => t.EventShow)
            .FirstOrDefaultAsync(t => t.Id == dto.TicketTierId && t.EventId == dto.EventId && !t.IsDeleted);

        if (tier is null)
            throw new KeyNotFoundException($"Ticket tier '{dto.TicketTierId}' not found for event '{dto.EventId}'.");

        var now = _timeProvider.GetUtcNow();
        var availability = AvailabilityPolicy.Evaluate(ev, show ?? tier.EventShow, tier, now);
        if (!availability.IsBookable)
            throw new InvalidOperationException(availability.Reason);

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

        // Server-side Bank Maintenance Check: Reject if direct bank transfer is selected during maintenance window
        if (paymentMethod == PaymentMethod.BankTransfer)
        {
            var activeBank = await _context.BankAccounts
                .AsNoTracking()
                .Where(b => b.IsActive && b.IsEnabled && !b.IsDeleted)
                .FirstOrDefaultAsync();

            if (activeBank != null)
            {
                var opStatus = activeBank.GetOperationalStatus(now);
                if (!opStatus.IsOperational && opStatus.State == BankOperationalState.UnderMaintenance)
                {
                    throw new BankMaintenanceException(
                        opStatus.Reason ?? "Direct bank transfers are currently paused for maintenance.",
                        opStatus.UntilUtc);
                }
            }
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
            platformFee = await _paymentFeeService.CalculatePlatformFeeAsync(subtotalAmount);
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
        now = _timeProvider.GetUtcNow();
        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            var reserved = await _context.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE TicketTiers SET SoldCount = SoldCount + {effectiveQuantity} WHERE Id = {tier.Id} AND IsDeleted = 0 AND Status = 'Available' AND (SoldCount + {effectiveQuantity}) <= AvailableQuantity");

            if (reserved == 0)
                throw new InvalidOperationException($"Not enough tickets available in tier '{tier.Name}'.");

            var trackedTier = _context.ChangeTracker.Entries<TicketTier>().FirstOrDefault(e => e.Entity.Id == tier.Id);
            if (trackedTier != null)
            {
                trackedTier.Entity.SoldCount += effectiveQuantity;
                trackedTier.Property(t => t.SoldCount).IsModified = false;
            }

            if (seatIds.Count > 0)
            {
                var flipped = await _context.Seats
                    .Where(s => seatIds.Contains(s.Id)
                             && s.Status == SeatStatus.Available
                             && !s.IsDeleted
                             && _context.SeatingZones.Any(z => z.Id == s.ZoneId && z.EventId == dto.EventId && !z.IsDeleted))
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(seat => seat.Status, SeatStatus.Reserved)
                        .SetProperty(seat => seat.State, SeatState.TemporarilyHeld)
                        .SetProperty(seat => seat.UpdatedAt, now));

                if (flipped != seatIds.Count)
                    throw new SeatAlreadyBookedException(dto.EventId, seatIds, "One or more selected seats are no longer available. Please choose different seats.");
            }

            _context.Bookings.Add(booking);
            foreach (var bs in bookingSeats)
                _context.BookingSeats.Add(bs);

            // Dynamically recompute event status based on fresh tier inventory
            var eventForStatus = await _context.Events
                .FirstOrDefaultAsync(e => e.Id == dto.EventId);
            if (eventForStatus != null)
            {
                var activeTiers = await _context.TicketTiers
                    .AsNoTracking()
                    .Where(t => t.EventId == dto.EventId && !t.IsDeleted)
                    .ToListAsync();
                eventForStatus.RecomputeDynamicStatus(activeTiers);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        });

        // Release the ephemeral (Redis) hold now that the DB reservation is authoritative.
        if (isSeated)
            await _cacheService.ReleaseSeatsAsync(dto.EventId, seatIds, dto.EventShowId);

        await _cacheService.ClearEventCacheAsync(dto.EventId);

        _logger.LogInformation("Created Booking {BookingRef} for {CustomerEmail}. 30-min hold expires at {HoldExpiresAt:O}",
            booking.BookingRef, booking.CustomerEmail, holdExpiresAt);

        _telemetry?.RecordBookingTransition("None", booking.State.ToString(), true);

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

        var now = _timeProvider.GetUtcNow();
        booking.SubmitBankProof(
            dto.BankTransactionRef?.Trim() ?? string.Empty,
            dto.PaymentProofUrl?.Trim() ?? string.Empty,
            dto.SenderAccountTitle?.Trim(),
            dto.SenderBankName?.Trim(),
            dto.SenderAccountLast4?.Trim(),
            now,
            booking.CustomerEmail);

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

        var now = _timeProvider.GetUtcNow();
        booking.ConfirmPayment(adminId, adminEmail, now, adminEmail ?? "admin@eventland.pk");

        // Permanently book reserved seats with authoritative concurrency verification
        var seatIds = booking.BookingSeats.Select(bs => bs.SeatId).ToList();
        if (seatIds.Count > 0)
        {
            var bookedRows = await _context.Seats
                .Where(s => seatIds.Contains(s.Id) && (s.Status == SeatStatus.Available || s.Status == SeatStatus.Reserved) && !s.IsDeleted)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(seat => seat.Status, SeatStatus.Booked)
                    .SetProperty(seat => seat.State, SeatState.Booked)
                    .SetProperty(seat => seat.UpdatedAt, now));

            if (bookedRows != seatIds.Count)
            {
                throw new SeatAlreadyBookedException(booking.EventId, seatIds, $"One or more seats for booking '{booking.BookingRef}' were already booked by another transaction.");
            }

            foreach (var bs in booking.BookingSeats)
            {
                if (bs.Seat != null)
                {
                    bs.Seat.Status = SeatStatus.Booked;
                    bs.Seat.State = SeatState.Booked;
                }
            }

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

        _telemetry?.RecordBookingTransition("PendingHold", "Confirmed", true);

        return resultDto;
    }

    public async Task<BookingDto> RejectBankPaymentAsync(int id, RejectBankPaymentDto dto, int? adminId = null, string? adminEmail = null)
    {
        var booking = await GetBookingForMutationAsync(id);

        var now = _timeProvider.GetUtcNow();
        booking.RejectPayment(adminId, adminEmail, dto.Reason ?? "Payment transfer could not be verified by Admin.", now, adminEmail ?? "admin@eventland.pk");
        booking.RefundReason = dto.Reason ?? "Payment transfer could not be verified by Admin.";

        if (booking.TicketTierId > 0)
        {
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE TicketTiers SET SoldCount = CASE WHEN SoldCount >= {booking.Quantity} THEN SoldCount - {booking.Quantity} ELSE 0 END WHERE Id = {booking.TicketTierId}");
        }

        if (booking.TicketTier != null)
        {
            booking.TicketTier.SoldCount = Math.Max(0, booking.TicketTier.SoldCount - booking.Quantity);
            _context.Entry(booking.TicketTier).Property(t => t.SoldCount).IsModified = false;
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

        var eventForStatus = await _context.Events
            .FirstOrDefaultAsync(e => e.Id == booking.EventId);
        if (eventForStatus != null)
        {
            var activeTiers = await _context.TicketTiers
                .AsNoTracking()
                .Where(t => t.EventId == booking.EventId && !t.IsDeleted)
                .ToListAsync();
            eventForStatus.RecomputeDynamicStatus(activeTiers);
        }

        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(booking.EventId);

        _logger.LogInformation("Admin {AdminEmail} rejected Bank Transfer for Booking {BookingRef}. Seats unlocked.",
            adminEmail, booking.BookingRef);

        _telemetry?.RecordBookingTransition("PendingHold", "Cancelled", true);

        return MapToDto(booking);
    }

    public async Task<ProcessBankRefundResponseDto> ProcessBankRefundAsync(ProcessBankRefundRequestDto dto, int? adminId = null, string? adminEmail = null)
    {
        var now = _timeProvider.GetUtcNow();
        var effectiveAdminEmail = adminEmail ?? "admin@eventland.pk";

        var booking = await _context.Bookings
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(b => b.Id == dto.BookingId && !b.IsDeleted);

        if (booking is null)
            throw new KeyNotFoundException($"Booking ID '{dto.BookingId}' not found.");

        // Idempotency: If already refunded, return existing active refund record
        if (booking.State == BookingState.Refunded || booking.PaymentStatus == PaymentStatus.Refunded)
        {
            var existingRefund = await _context.RefundRecords
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.BookingId == booking.Id && r.Status == RefundStatus.Processed);

            return new ProcessBankRefundResponseDto(
                Success: true,
                Message: $"Booking '{booking.BookingRef}' has already been refunded.",
                RefundId: existingRefund?.Id,
                Amount: existingRefund?.Amount ?? booking.TotalAmount,
                Status: existingRefund?.Status.ToString() ?? RefundStatus.Processed.ToString()
            );
        }

        // State validation: only confirmed bookings can be refunded
        if (booking.State != BookingState.Confirmed)
        {
            throw new InvalidOperationException($"Cannot refund booking '{booking.BookingRef}' in state '{booking.State}'. Only confirmed bookings can be refunded.");
        }

        var refundAmount = dto.Amount > 0 ? dto.Amount : booking.TotalAmount;
        if (refundAmount > booking.TotalAmount)
        {
            throw new InvalidOperationException($"Refund amount ({refundAmount:N2}) cannot exceed the booking total amount ({booking.TotalAmount:N2}).");
        }

        var reason = string.IsNullOrWhiteSpace(dto.Reason) ? "Direct Bank Transfer Refund" : dto.Reason.Trim();

        RefundRecord refundRecord = null!;
        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            var existingInTx = await _context.RefundRecords
                .FirstOrDefaultAsync(r => r.BookingId == booking.Id && (r.Status == RefundStatus.Requested || r.Status == RefundStatus.Approved || r.Status == RefundStatus.Processed));

            if (existingInTx != null && existingInTx.Status == RefundStatus.Processed)
            {
                refundRecord = existingInTx;
                return;
            }

            // Transition booking Confirmed -> Refunded
            booking.ProcessRefund(now, reason, effectiveAdminEmail);

            // Void tickets / gate pass so scanners reject them
            booking.ScanState = TicketScanState.Revoked;

            // Create or advance refund record
            if (existingInTx != null)
            {
                existingInTx.Process(adminId, effectiveAdminEmail, now, dto.ProviderRefundRef);
                refundRecord = existingInTx;
            }
            else
            {
                refundRecord = RefundRecord.CreateProcessed(
                    booking.Id, refundAmount, reason, adminId, effectiveAdminEmail, now, dto.ProviderRefundRef);
                _context.RefundRecords.Add(refundRecord);
            }

            // Restore tier inventory via bounded atomic SQL
            if (booking.TicketTierId > 0)
            {
                await _context.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE TicketTiers SET SoldCount = CASE WHEN SoldCount >= {booking.Quantity} THEN SoldCount - {booking.Quantity} ELSE 0 END WHERE Id = {booking.TicketTierId}");
            }

            if (booking.TicketTier != null)
            {
                booking.TicketTier.SoldCount = Math.Max(0, booking.TicketTier.SoldCount - booking.Quantity);
                _context.Entry(booking.TicketTier).Property(t => t.SoldCount).IsModified = false;
            }

            // Release seats in database
            var seatIds = booking.BookingSeats.Select(bs => bs.SeatId).ToList();
            if (seatIds.Count > 0)
            {
                await _context.Seats
                    .Where(s => seatIds.Contains(s.Id))
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(seat => seat.Status, SeatStatus.Available)
                        .SetProperty(seat => seat.State, SeatState.Available)
                        .SetProperty(seat => seat.UpdatedAt, now));

                foreach (var bs in booking.BookingSeats)
                {
                    if (bs.Seat != null)
                    {
                        bs.Seat.Status = SeatStatus.Available;
                        bs.Seat.State = SeatState.Available;
                    }
                }
            }

            // Enqueue transactional outbox message for refund
            var seatIdsJson = JsonSerializer.Serialize(seatIds);
            _context.OutboxMessages.Add(new OutboxMessage
            {
                Id = Guid.NewGuid(),
                EventType = "BookingRefundedEvent",
                PayloadJson = $"{{\"BookingId\":{booking.Id},\"BookingRef\":\"{booking.BookingRef}\",\"EventId\":{booking.EventId},\"Amount\":{refundAmount},\"SeatIds\":{seatIdsJson}}}",
                CreatedAt = now,
                UpdatedAt = now
            });

            // Recompute dynamic event status
            var eventForStatus = await _context.Events.FirstOrDefaultAsync(e => e.Id == booking.EventId);
            if (eventForStatus != null)
            {
                var activeTiers = await _context.TicketTiers
                    .AsNoTracking()
                    .Where(t => t.EventId == booking.EventId && !t.IsDeleted)
                    .ToListAsync();
                eventForStatus.RecomputeDynamicStatus(activeTiers);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        });

        var postSeatIds = booking.BookingSeats.Select(bs => bs.SeatId).ToList();
        if (postSeatIds.Count > 0)
        {
            await _cacheService.ReleaseSeatsAsync(booking.EventId, postSeatIds, null);
        }
        await _cacheService.ClearEventCacheAsync(booking.EventId);

        _logger.LogInformation("Admin {AdminEmail} processed Bank Refund for Booking {BookingRef} (Amount: PKR {Amount:N0}). Seats released and tickets revoked.",
            effectiveAdminEmail, booking.BookingRef, refundAmount);

        _telemetry?.RecordRefundTransition("Approved", "Processed", true);
        _telemetry?.RecordBookingTransition("Confirmed", "Refunded", true);

        return new ProcessBankRefundResponseDto(
            Success: true,
            Message: $"Direct bank refund of PKR {refundAmount:N0} recorded successfully. Booking cancelled and seats returned to available pool.",
            RefundId: refundRecord?.Id,
            Amount: refundRecord?.Amount ?? refundAmount,
            Status: refundRecord?.Status.ToString() ?? RefundStatus.Processed.ToString()
        );
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

    // ── Gate Check-In & Ticket Validation (Audit #7) ────────────────────────
    public async Task<TicketValidationResultDto> ValidateGateTicketAsync(ValidateGateTicketRequestDto request, int? validatorUserId = null, string? validatorEmail = null)
    {
        var validatedAt = _timeProvider.GetUtcNow();
        if (string.IsNullOrWhiteSpace(request.TicketCode))
        {
            return new TicketValidationResultDto(
                IsValid: false,
                Status: "INVALID",
                Message: "Ticket code or QR payload cannot be empty.",
                ValidatedAt: validatedAt,
                TicketState: TicketScanState.Revoked
            );
        }

        string parsedRef;
        int? qrEventId = null;
        int? qrShowId = null;
        int? qrSeatId = null;

        var trimmedCode = request.TicketCode.Trim();
        if (trimmedCode.StartsWith("EVL-QR:", StringComparison.OrdinalIgnoreCase))
        {
            if (_gateQrSignatureService != null)
            {
                var parseResult = _gateQrSignatureService.ParseAndVerifyPayload(trimmedCode);
                if (!parseResult.IsValid)
                {
                    return new TicketValidationResultDto(
                        IsValid: false,
                        Status: "INVALID_SIGNATURE",
                        Message: "TAMPER DETECTED: Ticket QR code digital signature is invalid or modified.",
                        ValidatedAt: validatedAt,
                        TicketState: TicketScanState.Revoked
                    );
                }
                parsedRef = parseResult.BookingRef;
                qrEventId = parseResult.EventId > 0 ? parseResult.EventId : null;
                qrShowId = parseResult.ShowId;
                qrSeatId = parseResult.SeatId;
            }
            else
            {
                parsedRef = ExtractBookingRef(trimmedCode);
            }
        }
        else
        {
            parsedRef = ExtractBookingRef(trimmedCode);
        }

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
                ValidatedAt: validatedAt,
                TicketState: TicketScanState.Revoked
            );
        }

        var seatLabels = booking.BookingSeats
            .Where(bs => bs.Seat != null)
            .Select(bs => bs.Seat!.Label)
            .ToList();

        // 1. Payment status & lifecycle check
        if (booking.PaymentStatus != PaymentStatus.Paid || booking.Status != BookingStatus.Confirmed || booking.State != BookingState.Confirmed)
        {
            var reason = booking.State == BookingState.Cancelled ? "CANCELLED"
                : booking.State == BookingState.Expired ? "EXPIRED"
                : booking.State == BookingState.Refunded ? "REFUNDED"
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
                ValidatedAt: validatedAt,
                TicketState: TicketScanState.Revoked
            );
        }

        // 2. Event constraint check (scanner requested or embedded in QR)
        var targetEventId = request.EventId ?? qrEventId;
        if (targetEventId.HasValue && booking.EventId != targetEventId.Value)
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
                ValidatedAt: validatedAt,
                TicketState: TicketScanState.Revoked
            );
        }

        // 3. Show constraint check (if specified)
        var targetShowId = request.EventShowId ?? qrShowId;
        if (targetShowId.HasValue && booking.TicketTier?.EventShowId != null && booking.TicketTier.EventShowId != targetShowId.Value)
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
                ValidatedAt: validatedAt,
                TicketState: TicketScanState.InvalidShowSlot
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
                ValidatedAt: validatedAt,
                TicketState: TicketScanState.ScannedAndAdmitted,
                DeviceId: booking.CheckedInDeviceId
            );
        }

        // 5. Validate / preview only mode
        if (!request.CheckIn)
        {
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
                ValidatedAt: validatedAt,
                TicketState: TicketScanState.Issued
            );
        }

        // 6. Atomic admission Compare-And-Set (CAS) to prevent turnstile race conditions
        var gateNotes = request.GateName ?? booking.GateNotes;
        var rowsUpdated = await _context.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE Bookings SET IsCheckedIn = 1, ScanState = {(int)TicketScanState.ScannedAndAdmitted}, CheckedInAt = {validatedAt}, CheckedInBy = {validatorEmail ?? "Gatekeeper"}, CheckedInDeviceId = {request.DeviceId}, GateScanSequence = {request.SequenceNumber}, GateNotes = {gateNotes}, UpdatedAt = {validatedAt}, UpdatedBy = {validatorEmail} WHERE Id = {booking.Id} AND IsCheckedIn = 0 AND State = {(int)BookingState.Confirmed} AND IsDeleted = 0");

        if (rowsUpdated == 0)
        {
            // Another concurrent gate scan won the admission race
            var refreshed = await _context.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == booking.Id);
            var alreadyCheckInTime = refreshed?.CheckedInAt?.ToLocalTime().ToString("g") ?? "Earlier";
            var gatekeeper = !string.IsNullOrWhiteSpace(refreshed?.CheckedInBy) ? refreshed.CheckedInBy : "Gatekeeper";
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
                CheckedInAt: refreshed?.CheckedInAt,
                CheckedInBy: refreshed?.CheckedInBy,
                GateName: refreshed?.GateNotes,
                ValidatedAt: validatedAt,
                TicketState: TicketScanState.ScannedAndAdmitted,
                DeviceId: refreshed?.CheckedInDeviceId
            );
        }

        booking.CheckInAdmit(validatedAt, validatorEmail ?? "Gatekeeper", request.DeviceId, request.SequenceNumber, gateNotes);

        _logger.LogInformation("Ticket {BookingRef} successfully checked in at gate {GateName} by {Validator}.",
            booking.BookingRef, request.GateName, validatorEmail);

        _telemetry?.RecordGateScan("APPROVED", request.DeviceId ?? "unknown");

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
            CheckedInAt: validatedAt,
            CheckedInBy: validatorEmail ?? "Gatekeeper",
            GateName: gateNotes,
            ValidatedAt: validatedAt,
            TicketState: TicketScanState.ScannedAndAdmitted,
            DeviceId: request.DeviceId
        );
    }

    public async Task<OfflineGateSyncBatchResponseDto> SyncOfflineGateScansAsync(
        OfflineGateSyncBatchRequestDto batchRequest,
        int? validatorUserId = null,
        string? validatorEmail = null)
    {
        var now = _timeProvider.GetUtcNow();
        var results = new List<OfflineGateSyncItemResultDto>();
        int totalAdmitted = 0;
        int totalRejected = 0;
        int totalDuplicateAlerts = 0;

        if (batchRequest.Scans == null || batchRequest.Scans.Count == 0)
        {
            return new OfflineGateSyncBatchResponseDto(
                TotalProcessed: 0,
                TotalAdmitted: 0,
                TotalRejected: 0,
                TotalDuplicateSecurityAlerts: 0,
                Results: results
            );
        }

        var sortedScans = batchRequest.Scans.OrderBy(s => s.ScannedAt).ToList();

        foreach (var item in sortedScans)
        {
            var parsedRef = ExtractBookingRef(item.BookingRef);
            int.TryParse(parsedRef, out var numericId);

            var booking = await _context.Bookings
                .Include(b => b.TicketTier)
                .FirstOrDefaultAsync(b => (!string.IsNullOrEmpty(b.BookingRef) && b.BookingRef.ToLower() == parsedRef.ToLower())
                                       || (numericId > 0 && b.Id == numericId));

            if (booking is null || booking.IsDeleted)
            {
                totalRejected++;
                results.Add(new OfflineGateSyncItemResultDto(
                    BookingRef: item.BookingRef,
                    Status: "NOT_FOUND",
                    Message: $"Ticket pass '{item.BookingRef}' was not found in the system.",
                    AdmittedAt: null
                ));
                continue;
            }

            // Verify HMAC signature if signature provided
            if (_gateQrSignatureService != null && !string.IsNullOrWhiteSpace(item.Signature))
            {
                var isSigValid = _gateQrSignatureService.VerifySignature(
                    booking.BookingRef,
                    item.EventId ?? booking.EventId,
                    item.EventShowId ?? booking.TicketTier?.EventShowId,
                    item.Signature,
                    item.SeatId);

                if (!isSigValid)
                {
                    totalRejected++;
                    results.Add(new OfflineGateSyncItemResultDto(
                        BookingRef: booking.BookingRef,
                        Status: "INVALID_SIGNATURE",
                        Message: "Digital signature verification failed for offline scan.",
                        AdmittedAt: null
                    ));
                    continue;
                }
            }

            // Revocation / cancellation check
            if (booking.State != BookingState.Confirmed || booking.PaymentStatus != PaymentStatus.Paid)
            {
                totalRejected++;
                results.Add(new OfflineGateSyncItemResultDto(
                    BookingRef: booking.BookingRef,
                    Status: "TICKET_REVOKED",
                    Message: $"Ticket status is {booking.State} and cannot be admitted.",
                    AdmittedAt: null
                ));
                continue;
            }

            // Duplicate admission reconciliation
            if (booking.IsCheckedIn)
            {
                if (booking.CheckedInDeviceId == item.DeviceId)
                {
                    totalRejected++;
                    results.Add(new OfflineGateSyncItemResultDto(
                        BookingRef: booking.BookingRef,
                        Status: "ALREADY_CHECKED_IN",
                        Message: $"Already checked in by this device at {booking.CheckedInAt:g}.",
                        AdmittedAt: booking.CheckedInAt
                    ));
                }
                else
                {
                    totalRejected++;
                    totalDuplicateAlerts++;
                    results.Add(new OfflineGateSyncItemResultDto(
                        BookingRef: booking.BookingRef,
                        Status: "SECURITY_ALERT_DUPLICATE_ENTRY",
                        Message: $"SECURITY ALERT: Duplicate scan across devices! Previously admitted at {booking.CheckedInAt:g} on device '{booking.CheckedInDeviceId}'.",
                        AdmittedAt: booking.CheckedInAt
                    ));
                }
                continue;
            }

            // Compare-and-Set admission
            var gateNotes = item.GateName ?? "Offline Sync";
            var rowsUpdated = await _context.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE Bookings SET IsCheckedIn = 1, ScanState = {(int)TicketScanState.ScannedAndAdmitted}, CheckedInAt = {item.ScannedAt}, CheckedInBy = {validatorEmail ?? "OfflineGate"}, CheckedInDeviceId = {item.DeviceId}, GateScanSequence = {item.SequenceNumber}, GateNotes = {gateNotes}, UpdatedAt = {now}, UpdatedBy = {validatorEmail} WHERE Id = {booking.Id} AND IsCheckedIn = 0 AND State = {(int)BookingState.Confirmed} AND IsDeleted = 0");

            if (rowsUpdated == 1)
            {
                totalAdmitted++;
                booking.IsCheckedIn = true;
                booking.ScanState = TicketScanState.ScannedAndAdmitted;
                booking.CheckedInAt = item.ScannedAt;
                booking.CheckedInDeviceId = item.DeviceId;
                booking.GateScanSequence = item.SequenceNumber;
                booking.GateNotes = gateNotes;

                results.Add(new OfflineGateSyncItemResultDto(
                    BookingRef: booking.BookingRef,
                    Status: "APPROVED",
                    Message: "Offline scan successfully synced and admitted.",
                    AdmittedAt: item.ScannedAt
                ));
            }
            else
            {
                totalRejected++;
                var refreshed = await _context.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == booking.Id);
                if (refreshed?.CheckedInDeviceId == item.DeviceId)
                {
                    results.Add(new OfflineGateSyncItemResultDto(
                        BookingRef: booking.BookingRef,
                        Status: "ALREADY_CHECKED_IN",
                        Message: $"Already checked in by this device at {refreshed.CheckedInAt:g}.",
                        AdmittedAt: refreshed.CheckedInAt
                    ));
                }
                else
                {
                    totalDuplicateAlerts++;
                    results.Add(new OfflineGateSyncItemResultDto(
                        BookingRef: booking.BookingRef,
                        Status: "SECURITY_ALERT_DUPLICATE_ENTRY",
                        Message: $"SECURITY ALERT: Duplicate scan across devices! Previously admitted on device '{refreshed?.CheckedInDeviceId}'.",
                        AdmittedAt: refreshed?.CheckedInAt
                    ));
                }
            }
        }

        return new OfflineGateSyncBatchResponseDto(
            TotalProcessed: sortedScans.Count,
            TotalAdmitted: totalAdmitted,
            TotalRejected: totalRejected,
            TotalDuplicateSecurityAlerts: totalDuplicateAlerts,
            Results: results
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
        var validatedAt = _timeProvider.GetUtcNow();
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

        booking.ResetCheckIn(validatedAt, adminEmail, request.Reason);

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
            ValidatedAt: validatedAt,
            TicketState: booking.ScanState
        );
    }

    public static string ExtractBookingRef(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var trimmed = input.Trim();

        // Handle EVL-QR signed payload
        if (trimmed.StartsWith("EVL-QR:", StringComparison.OrdinalIgnoreCase))
        {
            var parts = trimmed.Split(':');
            if (parts.Length >= 2 && !string.IsNullOrWhiteSpace(parts[1]))
            {
                return parts[1].Trim();
            }
        }

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
