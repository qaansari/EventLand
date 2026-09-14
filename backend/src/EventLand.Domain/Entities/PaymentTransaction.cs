namespace EventLand.Domain.Entities;

using System;
using EventLand.Domain.Common;
using EventLand.Domain.Enums;

/// <summary>
/// Audit trail and idempotency record for all payment gateway transactions (PayPro, etc.).
/// </summary>
public class PaymentTransaction : BaseEntity
{
    public int            BookingId             { get; set; }
    public Booking        Booking               { get; set; } = null!;

    public string         Provider              { get; set; } = string.Empty; // e.g. "paypro"
    public string?        ProviderTransactionId { get; set; }                 // Gateway's unique transaction/invoice reference (PayPro cPayId / ConnectPayId)
    public string?        ProviderOrderId       { get; set; }                 // Gateway order reference / OrderNumber
    public string         PaymentMethod         { get; set; } = string.Empty; // e.g. "paypro", "easypaisa_jazzcash"
    public decimal        Amount                { get; set; }
    public string         Currency              { get; set; } = "PKR";

    public PaymentStatus  Status                { get; set; } = PaymentStatus.Pending;
    public string         InternalReference     { get; set; } = string.Empty; // e.g. "TXN-EVL-XXXXXX"
    public string?        ProviderReference     { get; set; }                 // e.g. PayPro cPayId / InvoiceId

    public DateTimeOffset? PaidAt               { get; set; }
    public DateTimeOffset? FailedAt             { get; set; }
    public DateTimeOffset? ExpiresAt            { get; set; }
    public string?        FailureReason         { get; set; }
    public string?        RawProviderResponse   { get; set; }
    public string?        MetadataJson          { get; set; }
}
