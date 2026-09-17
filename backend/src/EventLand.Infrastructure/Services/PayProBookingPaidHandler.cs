namespace EventLand.Infrastructure.Services;

using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Modules.PayPro.Entities;
using EventLand.Modules.PayPro.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

/// <summary>
/// Bridge handler executing domain side effects when a PayPro order is marked Paid.
/// Confirms the linked booking, finalizes seats, updates payment transactions, and issues digital tickets.
/// </summary>
public class PayProBookingPaidHandler : IPayProOrderPaidHandler
{
    private readonly IApplicationDbContext _context;
    private readonly IBookingService _bookingService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<PayProBookingPaidHandler> _logger;

    public PayProBookingPaidHandler(
        IApplicationDbContext context,
        IBookingService bookingService,
        INotificationService notificationService,
        ILogger<PayProBookingPaidHandler> logger)
    {
        _context = context;
        _bookingService = bookingService;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task OnOrderPaidAsync(Order order, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Processing PayProBookingPaidHandler for Order {OrderNumber} (PayProId {PayProId})",
            order.OrderNumber, order.PayProId);

        // Find linked booking either by explicit BookingId or by matching BookingRef == OrderNumber
        var booking = await _context.Bookings
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .Include(b => b.PaymentTransactions)
            .FirstOrDefaultAsync(b => (!b.IsDeleted) &&
                                      ((order.BookingId.HasValue && b.Id == order.BookingId.Value) ||
                                       b.BookingRef == order.OrderNumber),
                cancellationToken);

        if (booking == null)
        {
            _logger.LogInformation("No direct booking found for PayPro Order {OrderNumber}. Order paid recorded.", order.OrderNumber);
            return;
        }

        // Idempotency: skip if booking is already marked Paid
        if (booking.PaymentStatus == PaymentStatus.Paid)
        {
            _logger.LogInformation("Booking {BookingRef} is already marked as Paid. Skipping side effects.", booking.BookingRef);
            return;
        }

        var now = DateTimeOffset.UtcNow;

        booking.PaymentStatus = PaymentStatus.Paid;
        booking.Status = BookingStatus.Confirmed;
        booking.PaidAt = order.DatePaid.HasValue ? new DateTimeOffset(order.DatePaid.Value, TimeSpan.Zero) : now;
        booking.VerifiedAt = now;
        booking.BankTransactionRef = order.PayProId ?? order.OrderNumber;

        // Permanently confirm reserved seats
        foreach (var bs in booking.BookingSeats)
        {
            if (bs.Seat != null && bs.Seat.Status != SeatStatus.Booked)
            {
                bs.Seat.Status = SeatStatus.Booked;
            }
        }

        // Record or update PaymentTransaction
        var existingTx = booking.PaymentTransactions.FirstOrDefault(pt => pt.Status == PaymentStatus.Pending);
        if (existingTx != null)
        {
            existingTx.Status = PaymentStatus.Paid;
            existingTx.PaidAt = now;
            existingTx.ProviderTransactionId = order.PayProId;
            existingTx.ProviderOrderId = order.OrderNumber;
            existingTx.PaymentMethod = order.PaymentMode ?? "PayPro";
            existingTx.RawProviderResponse = order.RawCreateResponse;
        }
        else
        {
            _context.PaymentTransactions.Add(new PaymentTransaction
            {
                BookingId = booking.Id,
                Provider = "paypro",
                ProviderTransactionId = order.PayProId,
                ProviderOrderId = order.OrderNumber,
                PaymentMethod = order.PaymentMode ?? "paypro",
                Amount = order.AmountPaid ?? order.Amount,
                Currency = "PKR",
                Status = PaymentStatus.Paid,
                InternalReference = $"TXN-{booking.BookingRef}",
                ProviderReference = order.PayProId,
                PaidAt = now,
                RawProviderResponse = order.RawCreateResponse
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Send confirmation email / e-ticket
        try
        {
            var bookingDto = await _bookingService.GetBookingByIdAsync(booking.Id);
            if (bookingDto != null)
            {
                await _notificationService.SendTicketConfirmationEmailAsync(bookingDto);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send confirmation email for Booking {BookingRef}", booking.BookingRef);
        }

        _logger.LogInformation("Successfully finalized Booking {BookingRef} from PayPro payment.", booking.BookingRef);
    }
}
