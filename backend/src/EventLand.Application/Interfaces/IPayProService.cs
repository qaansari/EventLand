namespace EventLand.Application.Interfaces;

using System.Threading;
using System.Threading.Tasks;
using EventLand.Application.Dtos;
using EventLand.Domain.Entities;

public interface IPayProService
{
    /// <summary>
    /// Creates a PayPro 1Pay invoice for a pending booking and returns checkout URL & voucher code.
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
