namespace EventLand.Application.Services;

using System.Threading;
using System.Threading.Tasks;

public record FeeCalculationResult(
    decimal Subtotal,
    decimal PlatformFee,
    decimal ProcessingFee,
    decimal TotalAmount,
    string  Currency,
    string  PaymentMethod,
    string  DisplayName,
    decimal FeePercentageAtPurchase
);

public interface IPaymentFeeService
{
    /// <summary>
    /// Computes the Event Land platform fee tier based on raw ticket subtotal.
    /// Exact boundary rules:
    ///   subtotal <= 5,000            => 49 PKR
    ///   5,000 < subtotal <= 10,000   => 99 PKR
    ///   10,000 < subtotal <= 15,000  => 149 PKR
    ///   subtotal > 15,000            => 199 PKR
    /// </summary>
    decimal CalculatePlatformFee(decimal subtotal);

    /// <summary>
    /// Computes the payment gateway processing fee based on subtotal, percentage fee, and fixed fee.
    /// Uses deterministic decimal arithmetic with AwayFromZero midpoint rounding.
    /// </summary>
    decimal CalculateProcessingFee(decimal subtotal, decimal percentageFee, decimal fixedFee = 0);

    /// <summary>
    /// Calculates the full authoritative pricing breakdown for a subtotal and specified payment method code.
    /// </summary>
    Task<FeeCalculationResult> CalculateTotalAsync(
        decimal subtotal,
        string paymentMethod,
        CancellationToken cancellationToken = default);
}
