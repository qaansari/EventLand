namespace EventLand.Api.Controllers;

using System;
using System.Security.Claims;
using System.Threading.Tasks;
using EventLand.Api.Extensions;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using EventLand.Application.Dtos;
using EventLand.Application.Services;

public record ProcessBankRefundRequestDto(
    int BookingId,
    decimal Amount,
    string? Reason = null
);

public record ProcessBankRefundResponseDto(
    bool Success,
    string Message
);

[ApiController]
[Route("api/payments")]
public class PaymentController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IPaymentFeeService _paymentFeeService;
    private readonly IPayProService _payProService;
    private readonly ICacheService? _cacheService;

    public PaymentController(
        IApplicationDbContext context,
        IPaymentFeeService paymentFeeService,
        IPayProService payProService,
        ICacheService? cacheService = null)
    {
        _context = context;
        _paymentFeeService = paymentFeeService;
        _payProService = payProService;
        _cacheService = cacheService;
    }

    /// <summary>
    /// Checks booking bank transfer payment status and remaining 30-minute hold countdown timer.
    /// Requires authentication — the caller must be the booking owner or an admin.
    /// </summary>
    [HttpGet("status/{bookingRef}")]
    [Authorize]
    public async Task<IActionResult> GetPaymentStatus(string bookingRef)
    {
        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingRef == bookingRef && !b.IsDeleted);

        if (booking is null) return NotFound(new { message = $"Booking ref '{bookingRef}' not found." });

        // Authorization: only the booking owner or an admin can view payment status.
        if (!User.IsAdmin())
        {
            var callerEmail = User.GetEmail();
            if (string.IsNullOrWhiteSpace(callerEmail) ||
                !string.Equals(callerEmail, booking.CustomerEmail, StringComparison.OrdinalIgnoreCase))
            {
                return Forbid();
            }
        }

        var now = DateTimeOffset.UtcNow;
        var expiresAt = booking.PaymentExpiresAt ?? now.AddMinutes(30);
        var remainingSeconds = Math.Max(0, (int)(expiresAt - now).TotalSeconds);

        return Ok(new
        {
            bookingRef = booking.BookingRef,
            status = booking.Status.ToString(),
            paymentStatus = booking.PaymentStatus.ToString(),
            paymentMethod = booking.PaymentMethod.ToString(),
            totalAmount = booking.TotalAmount,
            bankTransactionRef = booking.BankTransactionRef,
            paymentProofUrl = booking.PaymentProofUrl,
            verifiedAt = booking.VerifiedAt,
            verifiedByAdminEmail = booking.VerifiedByAdminEmail,
            expiresAt = expiresAt,
            remainingSeconds = remainingSeconds,
            isExpired = remainingSeconds <= 0 && booking.PaymentStatus == PaymentStatus.Pending,
            isPaid = booking.PaymentStatus == PaymentStatus.Paid
        });
    }

    /// <summary>
    /// Administrative Refund Route for Bank Transfer bookings.
    /// </summary>
    [HttpPost("refund")]
    [Authorize(Roles = "SuperAdmin,Admin,superadmin,admin")]
    public async Task<IActionResult> ProcessRefund([FromBody] ProcessBankRefundRequestDto dto)
    {
        var adminId = User.GetUserId();
        var adminEmail = User.GetEmail() ?? "admin@eventland.pk";

        var booking = await _context.Bookings
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(b => b.Id == dto.BookingId && !b.IsDeleted);

        if (booking is null)
            return NotFound(new { message = $"Booking ID '{dto.BookingId}' not found." });

        if (booking.PaymentStatus == PaymentStatus.Refunded)
            return BadRequest(new { message = $"Booking '{booking.BookingRef}' is already refunded." });

        booking.PaymentStatus = PaymentStatus.Refunded;
        booking.Status = BookingStatus.Cancelled;
        booking.RefundedAt = DateTimeOffset.UtcNow;
        booking.RefundReason = dto.Reason;

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

        var refundAmount = dto.Amount > 0 ? dto.Amount : booking.TotalAmount;
        var refundRecord = new RefundRecord
        {
            BookingId = booking.Id,
            Amount = refundAmount,
            Reason = dto.Reason ?? "Direct Bank Transfer Refund",
            Status = "Processed",
            ProcessedByUserId = adminId,
            ProcessedByEmail = adminEmail,
            ProcessedAt = DateTimeOffset.UtcNow
        };

        _context.RefundRecords.Add(refundRecord);
        await _context.SaveChangesAsync();

        var seatIds = booking.BookingSeats.Select(bs => bs.SeatId).ToList();
        if (seatIds.Any() && _cacheService != null)
        {
            await _cacheService.ReleaseSeatsAsync(booking.EventId, seatIds, null);
            await _cacheService.ClearEventCacheAsync(booking.EventId);
        }

        return Ok(new ProcessBankRefundResponseDto(
            Success: true,
            Message: $"Direct bank refund of PKR {refundAmount:N0} recorded successfully. Booking cancelled and seats returned to available pool."
        ));
    }

    /// <summary>
    /// Lists all active payment methods and calculates the monetary breakdown for an optional subtotal amount.
    /// Internal percentage commission rates are NEVER returned to callers.
    /// </summary>
    [HttpGet("methods")]
    public async Task<IActionResult> GetPaymentMethods([FromQuery] decimal subtotal = 0)
    {
        var configs = await _context.PaymentConfigs
            .AsNoTracking()
            .Where(c => c.IsActive && !c.IsDeleted)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        var platformFee = _paymentFeeService.CalculatePlatformFee(subtotal);

        var methods = configs.Select(c =>
        {
            var processingFee = _paymentFeeService.CalculateProcessingFee(subtotal, c.PercentageFee, c.FixedFee);
            var total = subtotal + platformFee + processingFee;

            return new AvailablePaymentMethodDto(
                Id: c.Id,
                Provider: c.Provider,
                PaymentMethod: c.PaymentMethod,
                DisplayName: c.DisplayName,
                Currency: c.Currency,
                PlatformFee: platformFee,
                PaymentProcessingFee: processingFee,
                TotalAmount: total
            );
        }).ToList();

        return Ok(methods);
    }

    /// <summary>
    /// Authoritative fee quote endpoint.
    /// Recalculates ticket subtotal, platform fee, processing fee, and total payable amount.
    /// Percentage commission rates are NEVER exposed.
    /// </summary>
    [HttpPost("quote")]
    [HttpPost("calculate")]
    public async Task<IActionResult> CalculateQuote([FromBody] CalculatePaymentQuoteRequestDto dto)
    {
        if (dto.Subtotal < 0)
            return BadRequest(new { message = "Subtotal cannot be negative." });

        try
        {
            var result = await _paymentFeeService.CalculateTotalAsync(dto.Subtotal, dto.PaymentMethod);

            return Ok(new PaymentFeeQuoteDto(
                Subtotal: result.Subtotal,
                PlatformFee: result.PlatformFee,
                PaymentProcessingFee: result.ProcessingFee,
                TotalAmount: result.TotalAmount,
                Currency: result.Currency,
                PaymentMethod: result.PaymentMethod,
                DisplayName: result.DisplayName
            ));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Initiates a PayPro online checkout session for an existing pending booking.
    /// Returns 1Pay connect URL and OTC voucher code.
    /// </summary>
    [HttpPost("paypro/checkout")]
    [HttpPost("paypro/initiate")]
    [Authorize]
    public async Task<IActionResult> InitiatePayProCheckout([FromBody] InitiatePayProCheckoutRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.BookingRef))
            return BadRequest(new { message = "Booking reference is required." });

        var booking = await _context.Bookings
            .Include(b => b.TicketTier)
            .Include(b => b.PaymentTransactions)
            .FirstOrDefaultAsync(b => b.BookingRef == dto.BookingRef && !b.IsDeleted);

        if (booking is null)
            return NotFound(new { message = $"Booking '{dto.BookingRef}' not found." });

        // Authorization check: owner or admin
        if (!User.IsAdmin())
        {
            var callerEmail = User.GetEmail();
            if (string.IsNullOrWhiteSpace(callerEmail) ||
                !string.Equals(callerEmail, booking.CustomerEmail, StringComparison.OrdinalIgnoreCase))
            {
                return Forbid();
            }
        }

        if (booking.PaymentStatus == PaymentStatus.Paid)
            return BadRequest(new { message = "Booking is already paid." });

        if (booking.Status == BookingStatus.Cancelled)
            return BadRequest(new { message = "Booking is cancelled and cannot be paid." });

        // Check if hold window has expired
        if (booking.PaymentExpiresAt.HasValue && booking.PaymentExpiresAt.Value <= DateTimeOffset.UtcNow)
        {
            return BadRequest(new { message = "The payment reservation hold window for this booking has expired. Please place a new booking." });
        }

        // Determine target payment method
        var normalizedMethod = dto.PaymentMethod?.Trim().ToLowerInvariant() ?? "easypaisa_jazzcash";
        var config = await _context.PaymentConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.PaymentMethod.ToLower() == normalizedMethod && c.IsActive && !c.IsDeleted);

        if (config is null)
        {
            return BadRequest(new { message = $"Payment method '{dto.PaymentMethod}' is not active or supported." });
        }

        try
        {
            var response = await _payProService.CreateInvoiceAsync(booking, config, dto.ReturnUrl);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }
    }

    /// <summary>
    /// PayPro Instant Payment Notification (IPN) webhook callback.
    /// Public endpoint called by PayPro servers upon payment completion.
    /// Verifies status server-side, validates amounts, and confirms tickets idempotently.
    /// </summary>
    [HttpPost("paypro-ipn")]
    [HttpPost("paypro/ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> HandlePayProIpn([FromBody] PayProIpnRequestDto ipnDto)
    {
        if (ipnDto is null)
            return BadRequest(new { message = "Empty payload received." });

        var result = await _payProService.ProcessIpnCallbackAsync(ipnDto);

        if (!result.Success && result.Status == "REJECTED")
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}
