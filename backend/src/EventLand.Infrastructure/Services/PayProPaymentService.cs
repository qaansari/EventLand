namespace EventLand.Infrastructure.Services;

using System;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

public class PayProPaymentService : IPayProPaymentService
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly ILogger<PayProPaymentService> _logger;

    public PayProPaymentService(
        IApplicationDbContext context,
        ICacheService cacheService,
        ILogger<PayProPaymentService> logger)
    {
        _context = context;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<PayProInvoiceResponseDto> CreateInvoiceAsync(PayProInvoiceRequestDto request)
    {
        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.Id == request.BookingId && !b.IsDeleted);

        if (booking is null)
            throw new KeyNotFoundException($"Booking with ID '{request.BookingId}' not found.");

        var payProInvoiceId = $"PP-EVL-{booking.BookingRef}";
        var expirationWindow = DateTimeOffset.UtcNow.AddMinutes(60); // Max 1 Hour Seat Timer

        var connectUrl = $"https://connect.paypro.com.pk/1pay/invoice/{payProInvoiceId}?amt={request.Amount}&ref={booking.BookingRef}";
        var otcVoucherCode = $"9200{booking.BookingRef.Replace("EVL-", "")}";

        booking.PayProInvoiceId = payProInvoiceId;
        booking.PayProConnectUrl = connectUrl;
        booking.PaymentExpiresAt = expirationWindow;
        booking.PaymentStatus = PaymentStatus.Pending;
        booking.Status = BookingStatus.Pending;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Generated PayPro Pakistan Invoice {InvoiceId} for Booking {BookingRef}, expiring at {ExpiresAt}", 
            payProInvoiceId, booking.BookingRef, expirationWindow);

        return new PayProInvoiceResponseDto(
            Success: true,
            InvoiceId: payProInvoiceId,
            BookingRef: booking.BookingRef,
            Amount: request.Amount,
            ConnectUrl: connectUrl,
            OtcVoucherCode: otcVoucherCode,
            Status: "UNPAID",
            Message: "PayPro Pakistan invoice generated successfully. Complete payment within 60 minutes."
        );
    }

    public async Task<bool> ProcessIpnCallbackAsync(PayProIpnPayloadDto payload)
    {
        var booking = await _context.Bookings
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(b => (b.PayProInvoiceId == payload.InvoiceId || b.BookingRef == payload.BookingRef) && !b.IsDeleted);

        if (booking is null)
        {
            _logger.LogWarning("PayPro IPN Received for unknown InvoiceId: {InvoiceId}, BookingRef: {BookingRef}", 
                payload.InvoiceId, payload.BookingRef);
            return false;
        }

        var statusUpper = (payload.Status ?? "").ToUpperInvariant();

        if (statusUpper == "PAID" || statusUpper == "SUCCESS" || statusUpper == "00")
        {
            // Amount verification: reject callbacks whose paid amount does not cover the
            // booking total. This is a defense-in-depth check on top of signature
            // verification performed by the caller.
            if (decimal.TryParse(payload.AmountPaid, out var amountPaid) && amountPaid < booking.TotalAmount)
            {
                _logger.LogWarning(
                    "PayPro IPN rejected for {BookingRef}: paid {Paid} is less than payable {Payable}.",
                    booking.BookingRef, amountPaid, booking.TotalAmount);
                return false;
            }

            booking.PaymentStatus = PaymentStatus.Paid;
            booking.Status = BookingStatus.Confirmed;
            booking.PaidAt = DateTimeOffset.UtcNow;

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

            _logger.LogInformation("Booking {BookingRef} successfully PAID via PayPro IPN.", booking.BookingRef);
            return true;
        }
        else if (statusUpper == "EXPIRED" || statusUpper == "CANCELLED" || statusUpper == "FAILED")
        {
            booking.PaymentStatus = PaymentStatus.Expired;
            booking.Status = BookingStatus.Cancelled;

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

            _logger.LogInformation("Booking {BookingRef} marked EXPIRED/CANCELLED via PayPro IPN. Seats returned to pool.", booking.BookingRef);
            return true;
        }

        return false;
    }

    public async Task<ProcessRefundResponseDto> ExecuteRefundAsync(ProcessRefundRequestDto request, int? adminUserId = null, string? adminEmail = null)
    {
        var booking = await _context.Bookings
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(b => b.Id == request.BookingId && !b.IsDeleted);

        if (booking is null)
            throw new KeyNotFoundException($"Booking ID '{request.BookingId}' not found.");

        if (booking.PaymentStatus == PaymentStatus.Refunded)
            throw new InvalidOperationException($"Booking '{booking.BookingRef}' is already refunded.");

        booking.PaymentStatus = PaymentStatus.Refunded;
        booking.Status = BookingStatus.Cancelled;
        booking.RefundedAt = DateTimeOffset.UtcNow;
        booking.RefundReason = request.Reason;

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

        var refundRecord = new RefundRecord
        {
            BookingId = booking.Id,
            Amount = request.Amount > 0 ? request.Amount : booking.TotalAmount,
            Reason = request.Reason ?? "Customer Requested Refund",
            Status = "Processed",
            PayProRefundId = $"RF-PP-{booking.BookingRef}",
            ProcessedByUserId = adminUserId,
            ProcessedByEmail = adminEmail ?? "admin@eventland.pk",
            ProcessedAt = DateTimeOffset.UtcNow
        };

        _context.RefundRecords.Add(refundRecord);
        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(booking.EventId);

        _logger.LogInformation("Successfully executed refund of PKR {Amount} for Booking {BookingRef}", 
            refundRecord.Amount, booking.BookingRef);

        return new ProcessRefundResponseDto(
            Success: true,
            RefundRecordId: refundRecord.Id,
            BookingId: booking.Id,
            Amount: refundRecord.Amount,
            Status: "Processed",
            Message: $"Refund of PKR {refundRecord.Amount} processed successfully. Booking cancelled and seats returned to available pool."
        );
    }

    public async Task CheckAndExpirePendingBookingsAsync()
    {
        var cutoff = DateTimeOffset.UtcNow;
        var expiredBookings = await _context.Bookings
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .Where(b => b.PaymentStatus == PaymentStatus.Pending && b.PaymentExpiresAt != null && b.PaymentExpiresAt <= cutoff && !b.IsDeleted)
            .ToListAsync();

        if (!expiredBookings.Any()) return;

        foreach (var booking in expiredBookings)
        {
            booking.PaymentStatus = PaymentStatus.Expired;
            booking.Status = BookingStatus.Cancelled;

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
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Expired {Count} pending bookings exceeding 1-hour payment timer.", expiredBookings.Count);
    }
}
