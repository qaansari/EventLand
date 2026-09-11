namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Dynamic payment method configuration for payment providers and gateways (e.g. PayPro).
/// Never stores API secrets or credentials.
/// </summary>
public class PaymentConfig : BaseEntity
{
    public string  Provider       { get; set; } = string.Empty; // e.g. "paypro"
    public string  PaymentMethod  { get; set; } = string.Empty; // e.g. "easypaisa_jazzcash", "qr_code"
    public string  DisplayName    { get; set; } = string.Empty; // e.g. "EasyPaisa / JazzCash", "PayPro QR Code"
    public decimal PercentageFee  { get; set; }                 // e.g. 2.80% or 0.80%
    public decimal FixedFee       { get; set; }                 // e.g. 0.00
    public string  Currency       { get; set; } = "PKR";
    public bool    IsActive       { get; set; } = true;
    public int     SortOrder      { get; set; } = 0;
    public string? MetadataJson   { get; set; }
}
