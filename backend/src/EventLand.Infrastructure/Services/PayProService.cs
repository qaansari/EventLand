namespace EventLand.Infrastructure.Services;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Common.Models;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

/// <summary>
/// Event Land PayPro Service orchestrating payment creation, status reconciliation,
/// idempotency protection, and ticket issuance with the PayPro V2 API.
/// </summary>
public class PayProService : IPayProService
{
    private readonly IPayProClient _payProClient;
    private readonly PayProOptions _options;
    private readonly IApplicationDbContext _context;
    private readonly ICacheService? _cacheService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<PayProService> _logger;

    public PayProService(
        IPayProClient payProClient,
        IOptions<PayProOptions> options,
        IApplicationDbContext context,
        INotificationService notificationService,
        ILogger<PayProService> logger,
        ICacheService? cacheService = null)
    {
        _payProClient = payProClient;
        _options = options.Value;
        _context = context;
        _notificationService = notificationService;
        _logger = logger;
        _cacheService = cacheService;
    }

    /// <inheritdoc />
    public async Task<CreatePaymentResponseDto> CreatePaymentAsync(
        string bookingRef,
        string? paymentMethod = "paypro",
        string? returnUrl = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(bookingRef))
            throw new ArgumentException("Booking reference cannot be empty.", nameof(bookingRef));

        var booking = await _context.Bookings
            .Include(b => b.PaymentTransactions)
            .FirstOrDefaultAsync(b => b.BookingRef == bookingRef && !b.IsDeleted, cancellationToken);

        if (booking is null)
            throw new KeyNotFoundException($"Booking '{bookingRef}' not found.");

        if (booking.PaymentStatus == PaymentStatus.Paid)
        {
            var existingPaidTx = booking.PaymentTransactions.FirstOrDefault(pt => pt.Status == PaymentStatus.Paid);
            return new CreatePaymentResponseDto(
                Success: true,
                BookingRef: booking.BookingRef,
                PaymentId: existingPaidTx?.Id ?? 0,
                Status: "Paid",
                Amount: booking.TotalAmount,
                Currency: "PKR",
                PaymentUrl: null,
                VoucherCode: existingPaidTx?.ProviderTransactionId,
                ExpiresAt: booking.PaymentExpiresAt,
                Message: "Booking is already paid."
            );
        }

        if (booking.Status == BookingStatus.Cancelled)
            throw new InvalidOperationException($"Booking '{bookingRef}' is cancelled and cannot accept payment.");

        if (booking.PaymentExpiresAt.HasValue && booking.PaymentExpiresAt.Value <= DateTimeOffset.UtcNow)
            throw new InvalidOperationException("The reservation hold window for this booking has expired. Please create a new booking.");

        // IDEMPOTENCY CHECK: Reuse existing active pending payment attempt to prevent duplicate orders
        var now = DateTimeOffset.UtcNow;
        var existingActiveTx = booking.PaymentTransactions
            .Where(pt => pt.Status == PaymentStatus.Pending && (!pt.ExpiresAt.HasValue || pt.ExpiresAt.Value > now))
            .OrderByDescending(pt => pt.CreatedAt)
            .FirstOrDefault();

        if (existingActiveTx != null)
        {
            string? cachedUrl = null;
            string? cachedVoucher = existingActiveTx.ProviderTransactionId;

            if (!string.IsNullOrWhiteSpace(existingActiveTx.MetadataJson))
            {
                try
                {
                    using var metaDoc = JsonDocument.Parse(existingActiveTx.MetadataJson);
                    if (metaDoc.RootElement.TryGetProperty("click2Pay", out var c2p)) cachedUrl = c2p.GetString();
                    if (metaDoc.RootElement.TryGetProperty("voucherCode", out var vc) && !string.IsNullOrWhiteSpace(vc.GetString())) cachedVoucher = vc.GetString();
                }
                catch { /* ignore json parse failure */ }
            }

            _logger.LogInformation("Reusing active PayPro session for Booking {BookingRef} (Payment ID {PaymentId}).",
                booking.BookingRef, existingActiveTx.Id);

            return new CreatePaymentResponseDto(
                Success: true,
                BookingRef: booking.BookingRef,
                PaymentId: existingActiveTx.Id,
                Status: "Pending",
                Amount: existingActiveTx.Amount,
                Currency: existingActiveTx.Currency,
                PaymentUrl: cachedUrl,
                VoucherCode: cachedVoucher,
                ExpiresAt: existingActiveTx.ExpiresAt ?? booking.PaymentExpiresAt,
                Message: "Active PayPro checkout session retrieved."
            );
        }

        // Call PayPro V2 Create Order
        var orderNumber = booking.BookingRef;
        var orderResult = await _payProClient.CreateOrderAsync(
            orderNumber: orderNumber,
            amount: booking.TotalAmount,
            customerName: booking.CustomerName,
            customerEmail: booking.CustomerEmail,
            customerPhone: booking.CustomerPhone,
            dueDate: booking.PaymentExpiresAt,
            cancellationToken: cancellationToken);

        string paymentUrl = orderResult.Click2PayUrl ?? string.Empty;
        string voucherCode = orderResult.ConnectPayId ?? orderResult.PayProId ?? string.Empty;

        // Fallback for Demo simulation if PayPro credentials are not yet configured or gateway is offline
        if (!orderResult.IsSuccess || string.IsNullOrWhiteSpace(paymentUrl))
        {
            var (isConfigValid, _) = _options.Validate();
            if (!isConfigValid || _options.IsDemo)
            {
                var baseUrl = _options.BaseUrl.TrimEnd('/');
                paymentUrl = $"{baseUrl}/invoice/PP-{booking.BookingRef}?amt={booking.TotalAmount:F2}&ref={booking.BookingRef}";
                if (!string.IsNullOrWhiteSpace(returnUrl))
                {
                    paymentUrl += $"&return_url={Uri.EscapeDataString(returnUrl)}";
                }
                if (string.IsNullOrWhiteSpace(voucherCode))
                {
                    voucherCode = $"9{RandomNumberGenerator.GetInt32(1000000, 9999999)}";
                }
                _logger.LogInformation("Operating in PayPro Demo mode. Generated deterministic PayPro checkout link for Booking {BookingRef}.", booking.BookingRef);
            }
            else
            {
                _logger.LogError("PayPro V2 order creation failed for Booking {BookingRef}: {Description}", booking.BookingRef, orderResult.Description);
                throw new InvalidOperationException($"Unable to initiate PayPro payment: {orderResult.Description}");
            }
        }

        var internalRef = $"TXN-EVL-{RandomNumberGenerator.GetInt32(100000, 1000000)}";
        var transaction = new PaymentTransaction
        {
            BookingId = booking.Id,
            Provider = "PayPro",
            ProviderTransactionId = voucherCode,
            ProviderOrderId = orderNumber,
            PaymentMethod = paymentMethod ?? "paypro",
            Amount = booking.TotalAmount,
            Currency = "PKR",
            Status = PaymentStatus.Pending,
            InternalReference = internalRef,
            ProviderReference = voucherCode,
            ExpiresAt = booking.PaymentExpiresAt ?? DateTimeOffset.UtcNow.AddMinutes(30),
            MetadataJson = JsonSerializer.Serialize(new
            {
                bookingRef = booking.BookingRef,
                click2Pay = paymentUrl,
                voucherCode = voucherCode,
                billUrl = orderResult.BillUrl,
                environment = _options.Environment
            })
        };

        _context.PaymentTransactions.Add(transaction);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created new PayPro PaymentTransaction {PaymentId} for Booking {BookingRef}. Amount: {Amount} PKR.",
            transaction.Id, booking.BookingRef, booking.TotalAmount);

        return new CreatePaymentResponseDto(
            Success: true,
            BookingRef: booking.BookingRef,
            PaymentId: transaction.Id,
            Status: "Pending",
            Amount: booking.TotalAmount,
            Currency: "PKR",
            PaymentUrl: paymentUrl,
            VoucherCode: voucherCode,
            ExpiresAt: transaction.ExpiresAt,
            Message: "PayPro checkout session created successfully."
        );
    }

    /// <inheritdoc />
    public async Task<PaymentStatusResponseDto> GetPaymentStatusAsync(
        string bookingRef,
        int? paymentId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Bookings
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .Include(b => b.PaymentTransactions)
            .Where(b => !b.IsDeleted);

        Booking? booking;
        if (paymentId.HasValue && paymentId.Value > 0)
        {
            booking = await query.FirstOrDefaultAsync(b => b.PaymentTransactions.Any(pt => pt.Id == paymentId.Value), cancellationToken);
        }
        else
        {
            booking = await query.FirstOrDefaultAsync(b => b.BookingRef == bookingRef, cancellationToken);
        }

        if (booking is null)
            throw new KeyNotFoundException($"Booking or payment not found.");

        var tx = booking.PaymentTransactions
            .OrderByDescending(pt => pt.CreatedAt)
            .FirstOrDefault();

        // If already confirmed, return status immediately
        if (booking.PaymentStatus == PaymentStatus.Paid)
        {
            return BuildStatusResponse(booking, tx, isPaid: true);
        }

        // Reconcile with PayPro V2
        var statusResult = await _payProClient.QueryOrderStatusAsync(
            orderNumber: booking.BookingRef,
            payProId: tx?.ProviderTransactionId,
            cancellationToken: cancellationToken);

        if (statusResult.IsSuccess && (statusResult.Status is "PAID" or "SETTLED" or "SUCCESS"))
        {
            // Amount integrity validation
            if (statusResult.AmountPaid > 0 && statusResult.AmountPaid < booking.TotalAmount)
            {
                _logger.LogError("PayPro reported payment of PKR {Paid}, but required amount is PKR {Total} for Booking {BookingRef}.",
                    statusResult.AmountPaid, booking.TotalAmount, booking.BookingRef);
            }
            else
            {
                await ApplySuccessfulPaymentAsync(booking, tx, statusResult.DatePaid ?? DateTimeOffset.UtcNow, cancellationToken);
                return BuildStatusResponse(booking, tx, isPaid: true);
            }
        }

        return BuildStatusResponse(booking, tx, isPaid: false);
    }

    /// <inheritdoc />
    public async Task<PayProCheckoutResponseDto> CreateInvoiceAsync(
        Booking booking,
        PaymentConfig paymentConfig,
        string? returnUrl,
        CancellationToken cancellationToken = default)
    {
        var result = await CreatePaymentAsync(
            bookingRef: booking.BookingRef,
            paymentMethod: paymentConfig.PaymentMethod,
            returnUrl: returnUrl,
            cancellationToken: cancellationToken);

        return new PayProCheckoutResponseDto(
            Success: result.Success,
            BookingRef: result.BookingRef,
            PaymentMethod: paymentConfig.PaymentMethod,
            TotalAmount: result.Amount,
            Currency: result.Currency,
            InvoiceId: result.VoucherCode,
            ConnectUrl: result.PaymentUrl,
            OtcVoucherCode: result.VoucherCode,
            ExpiresAt: result.ExpiresAt,
            Message: result.Message,
            PaymentId: result.PaymentId
        );
    }

    /// <inheritdoc />
    public async Task<PayProIpnResponseDto> ProcessIpnCallbackAsync(
        PayProIpnRequestDto ipnDto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(ipnDto.BookingRef) && string.IsNullOrWhiteSpace(ipnDto.InvoiceId))
        {
            _logger.LogWarning("Rejected PayPro IPN callback: missing BookingRef and InvoiceId.");
            return new PayProIpnResponseDto(false, "REJECTED", "Missing booking reference or invoice identifier.");
        }

        var booking = await _context.Bookings
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .Include(b => b.PaymentTransactions)
            .FirstOrDefaultAsync(b =>
                (b.BookingRef == ipnDto.BookingRef ||
                 b.PaymentTransactions.Any(pt => pt.ProviderTransactionId == ipnDto.InvoiceId || pt.ProviderOrderId == ipnDto.BookingRef))
                && !b.IsDeleted,
                cancellationToken);

        if (booking is null)
        {
            _logger.LogWarning("Rejected PayPro IPN: Booking ref '{BookingRef}' (Invoice: '{InvoiceId}') not found.",
                ipnDto.BookingRef, ipnDto.InvoiceId);
            return new PayProIpnResponseDto(false, "NOT_FOUND", "Booking not found.");
        }

        // IDEMPOTENCY CHECK: If already paid, return 200 OK immediately
        if (booking.PaymentStatus == PaymentStatus.Paid)
        {
            _logger.LogInformation("PayPro IPN duplicate callback received for already-paid Booking {BookingRef}.", booking.BookingRef);
            return new PayProIpnResponseDto(true, "ALREADY_PROCESSED", "Booking is already paid and confirmed.");
        }

        var statusStr = ipnDto.Status?.Trim().ToUpperInvariant() ?? "UNKNOWN";
        var isPaidStatus = statusStr is "PAID" or "SUCCESS" or "SETTLED";

        if (!isPaidStatus)
        {
            _logger.LogWarning("PayPro IPN reported non-success status '{Status}' for Booking {BookingRef}.", statusStr, booking.BookingRef);
            return new PayProIpnResponseDto(false, statusStr, $"Payment was not successful (Status: {statusStr}).");
        }

        // AMOUNT INTEGRITY CHECK
        if (ipnDto.AmountPaid > 0 && ipnDto.AmountPaid < booking.TotalAmount)
        {
            _logger.LogError("PayPro IPN amount mismatch for Booking {BookingRef}: expected PKR {ExpectedAmount}, received PKR {AmountPaid}.",
                booking.BookingRef, booking.TotalAmount, ipnDto.AmountPaid);

            return new PayProIpnResponseDto(false, "AMOUNT_MISMATCH",
                $"Amount paid ({ipnDto.AmountPaid}) is less than required amount ({booking.TotalAmount}).");
        }

        // Verify status server-side
        var statusResult = await _payProClient.QueryOrderStatusAsync(
            orderNumber: booking.BookingRef,
            payProId: ipnDto.InvoiceId,
            cancellationToken: cancellationToken);

        if (!statusResult.IsSuccess && !_options.IsDemo)
        {
            _logger.LogError("PayPro IPN callback rejected: Remote status query failed for Order {OrderNumber}.", booking.BookingRef);
            return new PayProIpnResponseDto(false, "VERIFICATION_FAILED", "Upstream payment provider verification failed.");
        }

        var tx = booking.PaymentTransactions.FirstOrDefault(pt => pt.ProviderTransactionId == ipnDto.InvoiceId || pt.ProviderOrderId == booking.BookingRef);
        await ApplySuccessfulPaymentAsync(booking, tx, ipnDto.PaymentDate ?? DateTimeOffset.UtcNow, cancellationToken);

        return new PayProIpnResponseDto(true, "PAID", "Payment confirmed and tickets issued successfully.");
    }

    /// <inheritdoc />
    public async Task<bool> VerifyInvoiceStatusAsync(
        string invoiceId,
        decimal expectedAmount,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(invoiceId)) return false;

        var result = await _payProClient.QueryOrderStatusAsync(
            orderNumber: invoiceId,
            payProId: invoiceId,
            cancellationToken: cancellationToken);

        if (!result.IsSuccess)
        {
            return _options.IsDemo; // In demo test mode, allow verification to proceed
        }

        return result.Status is "PAID" or "SETTLED" or "SUCCESS";
    }

    private async Task ApplySuccessfulPaymentAsync(
        Booking booking,
        PaymentTransaction? tx,
        DateTimeOffset paidAt,
        CancellationToken cancellationToken)
    {
        booking.PaymentStatus = PaymentStatus.Paid;
        booking.Status = BookingStatus.Confirmed;
        booking.PaidAt = paidAt;

        // Permanently lock seats to Booked
        foreach (var bs in booking.BookingSeats)
        {
            if (bs.Seat != null)
            {
                bs.Seat.Status = SeatStatus.Booked;
            }
        }

        if (tx != null)
        {
            tx.Status = PaymentStatus.Paid;
            tx.PaidAt = paidAt;
        }
        else
        {
            booking.PaymentTransactions.Add(new PaymentTransaction
            {
                BookingId = booking.Id,
                Provider = "PayPro",
                ProviderTransactionId = $"PP-{booking.BookingRef}",
                ProviderOrderId = booking.BookingRef,
                PaymentMethod = booking.PaymentMethod.ToString().ToLowerInvariant(),
                Amount = booking.TotalAmount,
                Currency = "PKR",
                Status = PaymentStatus.Paid,
                InternalReference = $"TXN-EVL-{RandomNumberGenerator.GetInt32(100000, 1000000)}",
                PaidAt = paidAt
            });
        }

        var seatIds = booking.BookingSeats.Select(bs => bs.SeatId).ToList();
        if (seatIds.Any() && _cacheService != null)
        {
            await _cacheService.ReleaseSeatsAsync(booking.EventId, seatIds, null);
            await _cacheService.ClearEventCacheAsync(booking.EventId);
        }

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Payment confirmed and applied for Booking {BookingRef}. PaymentStatus=Paid, BookingStatus=Confirmed.", booking.BookingRef);

        // Idempotent ticket notification dispatch
        _ = Task.Run(async () =>
        {
            try
            {
                var dto = new BookingDto(
                    booking.Id,
                    booking.EventId,
                    booking.Event?.Title ?? "Event",
                    booking.TicketTierId,
                    booking.TicketTier?.Name ?? "Ticket Tier",
                    booking.BookingRef,
                    booking.CustomerName,
                    booking.CustomerEmail,
                    booking.CustomerPhone,
                    booking.Quantity,
                    booking.UnitPrice,
                    booking.TotalAmount,
                    booking.Status.ToString(),
                    booking.PaymentStatus.ToString(),
                    booking.PaymentMethod.ToString(),
                    booking.PaidAt,
                    booking.CreatedAt,
                    new List<BookingSeatDto>(),
                    booking.BankTransactionRef,
                    null, null, null, null,
                    booking.VerifiedAt,
                    booking.PaymentExpiresAt,
                    null, null
                );

                await _notificationService.SendTicketConfirmationEmailAsync(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to dispatch ticket confirmation email for Booking {BookingRef}", booking.BookingRef);
            }
        });
    }

    private static PaymentStatusResponseDto BuildStatusResponse(Booking booking, PaymentTransaction? tx, bool isPaid)
    {
        string? voucherCode = tx?.ProviderTransactionId;
        string? paymentUrl = null;

        if (!string.IsNullOrWhiteSpace(tx?.MetadataJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(tx.MetadataJson);
                if (doc.RootElement.TryGetProperty("voucherCode", out var vc)) voucherCode = vc.GetString() ?? voucherCode;
                if (doc.RootElement.TryGetProperty("click2Pay", out var c2p)) paymentUrl = c2p.GetString();
            }
            catch { /* ignore */ }
        }

        return new PaymentStatusResponseDto(
            PaymentId: tx?.Id ?? 0,
            BookingRef: booking.BookingRef,
            Status: booking.Status.ToString(),
            PaymentStatus: booking.PaymentStatus.ToString(),
            IsPaid: isPaid,
            TicketReady: isPaid,
            TotalAmount: booking.TotalAmount,
            Currency: "PKR",
            PaymentMethod: tx?.PaymentMethod ?? booking.PaymentMethod.ToString(),
            VoucherCode: voucherCode,
            PaymentUrl: paymentUrl,
            PaidAt: booking.PaidAt,
            ExpiresAt: tx?.ExpiresAt ?? booking.PaymentExpiresAt
        );
    }
}
