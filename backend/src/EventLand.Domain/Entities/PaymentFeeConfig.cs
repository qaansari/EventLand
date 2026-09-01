namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Dynamic payment gateway commission fee configuration per payment method.
/// Rates are percentage based (e.g. 2.53 = 2.53%).
/// </summary>
public class PaymentFeeConfig : BaseEntity
{
    /// <summary>
    /// Unique code identifier for payment method category (e.g., "bank_wallet", "card_domestic", "card_international").
    /// </summary>
    public string PaymentMethodCode { get; set; } = string.Empty;

    /// <summary>
    /// Human readable display label for checkout and admin panel (e.g., "Online Bank Transfer & Wallets").
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// PayFast gateway commission percentage charged on top of ticket subtotal.
    /// </summary>
    public decimal CommissionPercentage { get; set; }

    /// <summary>
    /// Description / note about the payment method fee.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Whether this payment method category is currently enabled.
    /// </summary>
    public bool IsActive { get; set; } = true;
}
