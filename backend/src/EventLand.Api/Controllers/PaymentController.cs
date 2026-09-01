namespace EventLand.Api.Controllers;

using System;
using System.Security.Claims;
using System.Threading.Tasks;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
    private readonly ApplicationDbContext _context;
    private readonly ICacheService? _cacheService;

    public PaymentController(ApplicationDbContext context, ICacheService? cacheService = null)
    {
        _context = context;
        _cacheService = cacheService;
    }

    private string? GetAuthenticatedEmail() =>
        User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");

    private int? GetAuthenticatedUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(raw, out var id) ? id : (int?)null;
    }

    private bool IsAdmin() =>
        User.IsInRole("SuperAdmin") || User.IsInRole("Admin") ||
        User.IsInRole("superadmin") || User.IsInRole("admin");

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
        if (!IsAdmin())
        {
            var callerEmail = GetAuthenticatedEmail();
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
        var adminId = GetAuthenticatedUserId();
        var adminEmail = GetAuthenticatedEmail() ?? "admin@eventland.pk";

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
}
