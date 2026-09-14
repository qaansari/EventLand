namespace EventLand.Application.Interfaces;

using System.Threading;
using System.Threading.Tasks;
using EventLand.Application.Dtos;
using EventLand.Domain.Entities;

public interface IPayProService
{
    /// <summary>
    /// Initiates or retrieves an existing active PayPro V2 payment session for a booking.
    /// Implements server-side amount calculation and idempotency protection.
    /// </summary>
    Task<CreatePaymentResponseDto> CreatePaymentAsync(
        string bookingRef,
        string? paymentMethod = "paypro",
        string? returnUrl = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the authoritative payment status for a booking or payment ID, reconciling with PayPro V2 server-side.
    /// </summary>
    Task<PaymentStatusResponseDto> GetPaymentStatusAsync(
        string bookingRef,
        int? paymentId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a PayPro invoice for a pending booking and returns checkout URL & voucher code.
    /// </summary>
    Task<PayProCheckoutResponseDto> CreateInvoiceAsync(
        Booking booking,
        PaymentConfig paymentConfig,
        string? returnUrl,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates and processes an Instant Payment Notification (IPN) webhook callback from PayPro.
    /// Performs server-side verification, amount integrity checks, and idempotent ticket issuance.
    /// </summary>
    Task<PayProIpnResponseDto> ProcessIpnCallbackAsync(
        PayProIpnRequestDto ipnDto,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Queries the PayPro API to verify the authoritative status of a given invoice ID.
    /// </summary>
    Task<bool> VerifyInvoiceStatusAsync(
        string invoiceId,
        decimal expectedAmount,
        CancellationToken cancellationToken = default);
}
