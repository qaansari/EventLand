namespace EventLand.Infrastructure.Services;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Infrastructure.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public class PayFastPaymentService : IPayFastPaymentService
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly ILogger<PayFastPaymentService> _logger;
    private readonly PayFastOptions _payFastOptions;

    public PayFastPaymentService(
        IApplicationDbContext context,
        ICacheService cacheService,
        ILogger<PayFastPaymentService> logger,
        IOptions<PayFastOptions> payFastOptions)
    {
        _context = context;
        _cacheService = cacheService;
        _logger = logger;
        _payFastOptions = payFastOptions.Value;
    }

    public async Task<PayFastCheckoutResponseDto> CreateCheckoutAsync(PayFastCheckoutRequestDto request)
    {
        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.Id == request.BookingId && !b.IsDeleted);

        if (booking is null)
            throw new KeyNotFoundException($"Booking with ID '{request.BookingId}' not found.");

        // Lookup fee configuration by method code, defaulting to 2.53% if not found
        var methodCode = (request.PaymentMethodCode ?? "bank_wallet").ToLowerInvariant();
        var feeConfig = await _context.PaymentFeeConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.PaymentMethodCode.ToLower() == methodCode && f.IsActive && !f.IsDeleted);

        decimal commissionRate = feeConfig?.CommissionPercentage ?? (methodCode switch
        {
            "card_international" => 4.025m,
            "card_domestic" => 3.39m,
            _ => 2.53m
        });

        // Gateway Fee calculation based on payment method category
        var gatewayFee = Math.Round(booking.TotalAmount * (commissionRate / 100m), 2);
        var grossAmount = booking.TotalAmount + gatewayFee;

        var transactionId = $"PF-EVL-{booking.BookingRef}";
        var expirationWindow = DateTimeOffset.UtcNow.AddMinutes(60);

        var checkoutUrl = string.IsNullOrWhiteSpace(_payFastOptions.CheckoutUrl)
            ? $"https://checkout.payfast.co.za/eng/process?token={transactionId}&amt={grossAmount}&ref={booking.BookingRef}"
            : $"{_payFastOptions.CheckoutUrl}?token={transactionId}&amt={grossAmount}&ref={booking.BookingRef}";

        booking.PayFastTransactionId = transactionId;
        booking.PayFastUrl = checkoutUrl;
        booking.GatewayFee = gatewayFee;
        booking.GrossAmount = grossAmount;
        booking.PaymentExpiresAt = expirationWindow;
        booking.PaymentStatus = PaymentStatus.Pending;
        booking.Status = BookingStatus.Pending;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Generated PayFast Pakistan Checkout {TransactionId} for Booking {BookingRef}. Subtotal: PKR {Subtotal}, Fee ({FeeRate}%): PKR {Fee}, Total Payable: PKR {GrossAmount}", 
            transactionId, booking.BookingRef, booking.TotalAmount, commissionRate, gatewayFee, grossAmount);

        return new PayFastCheckoutResponseDto(
            Success: true,
            TransactionId: transactionId,
            BookingRef: booking.BookingRef,
            BaseAmount: booking.TotalAmount,
            GatewayFee: gatewayFee,
            GrossAmount: grossAmount,
            CheckoutUrl: checkoutUrl,
            Status: "UNPAID",
            Message: $"PayFast checkout generated. Complete payment of PKR {grossAmount} within 60 minutes."
        );
    }

    public async Task<bool> ProcessIpnCallbackAsync(PayFastIpnPayloadDto payload)
    {
        var booking = await _context.Bookings
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(b => (b.PayFastTransactionId == payload.TransactionId || b.BookingRef == payload.BookingRef) && !b.IsDeleted);

        if (booking is null)
        {
            _logger.LogWarning("PayFast IPN Received for unknown TransactionId: {TransactionId}, BookingRef: {BookingRef}", 
                payload.TransactionId, payload.BookingRef);
            return false;
        }

        var statusUpper = (payload.Status ?? "").ToUpperInvariant();

        if (statusUpper == "PAID" || statusUpper == "SUCCESS" || statusUpper == "00" || statusUpper == "COMPLETE")
        {
            if (decimal.TryParse(payload.AmountPaid, out var amountPaid) && amountPaid < booking.GrossAmount)
            {
                _logger.LogWarning(
                    "PayFast IPN rejected for {BookingRef}: paid {Paid} is less than required payable {Payable}.",
                    booking.BookingRef, amountPaid, booking.GrossAmount);
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

            _logger.LogInformation("Booking {BookingRef} successfully PAID via PayFast IPN.", booking.BookingRef);
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

            _logger.LogInformation("Booking {BookingRef} marked EXPIRED/CANCELLED via PayFast IPN. Seats returned to pool.", booking.BookingRef);
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
            Amount = request.Amount > 0 ? request.Amount : (booking.GrossAmount > 0 ? booking.GrossAmount : booking.TotalAmount),
            Reason = request.Reason ?? "Customer Requested Refund",
            Status = "Processed",
            PayFastRefundId = $"RF-PF-{booking.BookingRef}",
            ProcessedByUserId = adminUserId,
            ProcessedByEmail = adminEmail ?? "admin@eventland.pk",
            ProcessedAt = DateTimeOffset.UtcNow
        };

        _context.RefundRecords.Add(refundRecord);
        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(booking.EventId);

        _logger.LogInformation("Successfully executed PayFast refund of PKR {Amount} for Booking {BookingRef}", 
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

    public async Task<List<PaymentFeeConfigDto>> GetFeeConfigurationsAsync()
    {
        var configs = await _context.PaymentFeeConfigs
            .AsNoTracking()
            .Where(f => !f.IsDeleted)
            .OrderBy(f => f.Id)
            .ToListAsync();

        return configs.Select(f => new PaymentFeeConfigDto(
            f.Id,
            f.PaymentMethodCode,
            f.DisplayName,
            f.CommissionPercentage,
            f.Description,
            f.IsActive,
            f.UpdatedAt
        )).ToList();
    }

    public async Task<PaymentFeeConfigDto> UpdateFeeConfigurationAsync(int id, UpdatePaymentFeeConfigDto dto)
    {
        var config = await _context.PaymentFeeConfigs
            .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);

        if (config is null)
            throw new KeyNotFoundException($"Payment fee configuration with ID '{id}' not found.");

        config.CommissionPercentage = dto.CommissionPercentage;
        if (dto.IsActive.HasValue) config.IsActive = dto.IsActive.Value;
        if (!string.IsNullOrWhiteSpace(dto.DisplayName)) config.DisplayName = dto.DisplayName;
        if (!string.IsNullOrWhiteSpace(dto.Description)) config.Description = dto.Description;
        config.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated PayFast fee config ID {Id} ({Code}): Commission set to {Rate}%", 
            config.Id, config.PaymentMethodCode, config.CommissionPercentage);

        return new PaymentFeeConfigDto(
            config.Id,
            config.PaymentMethodCode,
            config.DisplayName,
            config.CommissionPercentage,
            config.Description,
            config.IsActive,
            config.UpdatedAt
        );
    }
}
