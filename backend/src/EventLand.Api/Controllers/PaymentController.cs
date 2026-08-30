namespace EventLand.Api.Controllers;

using System;
using System.Security.Claims;
using System.Threading.Tasks;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/payments")]
public class PaymentController : ControllerBase
{
    private readonly IPayFastPaymentService _paymentService;
    private readonly ApplicationDbContext _context;

    public PaymentController(IPayFastPaymentService paymentService, ApplicationDbContext context)
    {
        _paymentService = paymentService;
        _context = context;
    }

    private string? GetAuthenticatedEmail() =>
        User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");

    private int? GetAuthenticatedUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(raw, out var id) ? id : (int?)null;
    }

    /// <summary>
    /// Gets active payment gateway commission fee configurations for checkout calculation.
    /// </summary>
    [HttpGet("fee-configs")]
    public async Task<IActionResult> GetFeeConfigurations()
    {
        var feeConfigs = await _paymentService.GetFeeConfigurationsAsync();
        return Ok(feeConfigs);
    }

    /// <summary>
    /// Updates a payment gateway commission fee configuration (Admins only).
    /// </summary>
    [HttpPut("fee-configs/{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateFeeConfiguration(int id, [FromBody] UpdatePaymentFeeConfigDto dto)
    {
        try
        {
            var updated = await _paymentService.UpdateFeeConfigurationAsync(id, dto);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Checks invoice/checkout payment status and remaining timer (Max 60 Minutes).
    /// </summary>
    [HttpGet("status/{bookingRef}")]
    public async Task<IActionResult> GetPaymentStatus(string bookingRef)
    {
        await _paymentService.CheckAndExpirePendingBookingsAsync();

        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingRef == bookingRef && !b.IsDeleted);

        if (booking is null) return NotFound(new { message = $"Booking ref '{bookingRef}' not found." });

        var now = DateTimeOffset.UtcNow;
        var expiresAt = booking.PaymentExpiresAt ?? now.AddMinutes(60);
        var remainingSeconds = Math.Max(0, (int)(expiresAt - now).TotalSeconds);

        return Ok(new
        {
            bookingRef = booking.BookingRef,
            status = booking.Status.ToString(),
            paymentStatus = booking.PaymentStatus.ToString(),
            paymentMethod = booking.PaymentMethod.ToString(),
            totalAmount = booking.TotalAmount,
            gatewayFee = booking.GatewayFee,
            grossAmount = booking.GrossAmount > 0 ? booking.GrossAmount : booking.TotalAmount,
            payFastTransactionId = booking.PayFastTransactionId,
            payFastUrl = booking.PayFastUrl,
            expiresAt = expiresAt,
            remainingSeconds = remainingSeconds,
            isExpired = remainingSeconds <= 0 && booking.PaymentStatus.ToString() == "Pending",
            isPaid = booking.PaymentStatus.ToString() == "Paid"
        });
    }

    /// <summary>
    /// Generates PayFast Pakistan checkout link and calculates gateway commission fee.
    /// Only logged-in, active users may purchase, and only for their own bookings.
    /// </summary>
    [HttpPost("create-checkout")]
    [Authorize]
    public async Task<IActionResult> CreateCheckout([FromBody] PayFastCheckoutRequestDto dto)
    {
        var userEmail = GetAuthenticatedEmail();
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized(new { message = "Authentication is required to purchase tickets." });
        }

        var user = await _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == userEmail.ToLower() && !u.IsDeleted);
        if (user is null || !user.IsActive)
        {
            return BadRequest(new { message = "Only active, verified users are authorized to purchase tickets." });
        }

        var booking = await _context.Bookings.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == dto.BookingId && !b.IsDeleted);
        if (booking is null)
        {
            return NotFound(new { message = $"Booking '{dto.BookingRef}' not found." });
        }
        if (!string.Equals(booking.CustomerEmail, userEmail, StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = "You are not authorized to pay for this booking." });
        }

        try
        {
            var res = await _paymentService.CreateCheckoutAsync(dto);
            return Ok(res);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Public PayFast Pakistan IPN Callback Webhook.
    /// Asynchronously notified by PayFast upon payment completion, expiry, or cancellation.
    /// </summary>
    [HttpPost("payfast-ipn")]
    public async Task<IActionResult> PayFastIpnCallback([FromBody] PayFastIpnPayloadDto payload)
    {
        if (payload is null || (string.IsNullOrWhiteSpace(payload.TransactionId) && string.IsNullOrWhiteSpace(payload.BookingRef)))
        {
            return BadRequest(new { message = "Invalid IPN payload." });
        }

        var processed = await _paymentService.ProcessIpnCallbackAsync(payload);
        if (processed)
        {
            return Ok(new { success = true, message = "PayFast IPN processed successfully." });
        }

        return BadRequest(new { success = false, message = "Failed to process IPN callback." });
    }

    /// <summary>
    /// Client confirmation endpoint (for instant payment verification).
    /// Requires an authenticated user who owns the booking (or an admin);
    /// verification is re-checked server-side against PayFast.
    /// </summary>
    [HttpPost("confirm")]
    [Authorize]
    public async Task<IActionResult> ConfirmPayment([FromBody] PayFastIpnPayloadDto payload)
    {
        var booking = await _context.Bookings.AsNoTracking()
            .FirstOrDefaultAsync(b => (b.PayFastTransactionId == payload.TransactionId || b.BookingRef == payload.BookingRef) && !b.IsDeleted);

        if (booking is null)
            return NotFound(new { message = $"Booking for transaction '{payload.TransactionId}' not found." });

        var userEmail = GetAuthenticatedEmail();
        var isAdmin = User.IsInRole("SuperAdmin") || User.IsInRole("Admin");
        if (!isAdmin && !string.Equals(booking.CustomerEmail, userEmail, StringComparison.OrdinalIgnoreCase))
            return StatusCode(403, new { message = "You are not authorized to confirm payment for this booking." });

        var processed = await _paymentService.ProcessIpnCallbackAsync(payload);
        return Ok(new { success = processed });
    }

    /// <summary>
    /// Administrative Refund Route.
    /// </summary>
    [HttpPost("refund")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> ProcessRefund([FromBody] ProcessRefundRequestDto dto)
    {
        var adminId = GetAuthenticatedUserId();
        if (adminId is null)
        {
            return Unauthorized(new { message = "Unable to resolve the administrator identity from the token." });
        }
        var adminEmail = GetAuthenticatedEmail() ?? "unknown";

        try
        {
            var res = await _paymentService.ExecuteRefundAsync(dto, adminId.Value, adminEmail);
            return Ok(res);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
