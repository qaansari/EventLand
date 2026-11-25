namespace EventLand.Domain.Entities;

using System;
using EventLand.Domain.Common;
using EventLand.Domain.Enums;
using EventLand.Domain.Exceptions;

/// <summary>
/// Audit trail and idempotency record for all payment gateway transactions (PayPro, etc.).
/// </summary>
public class PaymentTransaction : BaseEntity
{
    public int BookingId { get; set; }
    public Booking Booking { get; set; } = null!;

    public string Provider { get; set; } = string.Empty; // e.g. "paypro"
    public string? ProviderTransactionId { get; set; }                 // Gateway's unique transaction/invoice reference (PayPro cPayId / ConnectPayId)
    public string? ProviderOrderId { get; set; }                 // Gateway order reference / OrderNumber
    public string PaymentMethod { get; set; } = string.Empty; // e.g. "paypro", "easypaisa_jazzcash"
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "PKR";

    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public string InternalReference { get; set; } = string.Empty; // e.g. "TXN-EVL-XXXXXX"
    public string? ProviderReference { get; set; }                 // e.g. PayPro cPayId / InvoiceId

    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset? FailedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public string? FailureReason { get; set; }
    public string? RawProviderResponse { get; set; }
    public string? MetadataJson { get; set; }

    public void MarkPaid(
        DateTimeOffset paidAt,
        string? providerTransactionId = null,
        string? providerOrderId = null,
        string? paymentMethod = null,
        string? rawResponse = null)
    {
        if (Status == PaymentStatus.Paid)
            return;

        if (Status is PaymentStatus.Failed or PaymentStatus.Expired or PaymentStatus.Refunded)
        {
            throw new InvalidStateTransitionException(
                entityName: "PaymentTransaction",
                fromState: Status.ToString(),
                toState: PaymentStatus.Paid.ToString(),
                trigger: "MarkPaid");
        }

        Status = PaymentStatus.Paid;
        PaidAt = paidAt;
        if (!string.IsNullOrWhiteSpace(providerTransactionId))
            ProviderTransactionId = providerTransactionId;
        if (!string.IsNullOrWhiteSpace(providerOrderId))
            ProviderOrderId = providerOrderId;
        if (!string.IsNullOrWhiteSpace(paymentMethod))
            PaymentMethod = paymentMethod;
        if (!string.IsNullOrWhiteSpace(rawResponse))
            RawProviderResponse = rawResponse;
        UpdatedAt = paidAt;
    }

    public void MarkFailed(DateTimeOffset failedAt, string? reason = null)
    {
        if (Status == PaymentStatus.Failed)
            return;

        if (Status is PaymentStatus.Paid or PaymentStatus.Refunded)
        {
            throw new InvalidStateTransitionException(
                entityName: "PaymentTransaction",
                fromState: Status.ToString(),
                toState: PaymentStatus.Failed.ToString(),
                trigger: "MarkFailed");
        }

        Status = PaymentStatus.Failed;
        FailedAt = failedAt;
        FailureReason = reason;
        UpdatedAt = failedAt;
    }

    public void MarkExpired(DateTimeOffset now)
    {
        if (Status == PaymentStatus.Expired)
            return;

        if (Status is PaymentStatus.Paid or PaymentStatus.Refunded)
        {
            throw new InvalidStateTransitionException(
                entityName: "PaymentTransaction",
                fromState: Status.ToString(),
                toState: PaymentStatus.Expired.ToString(),
                trigger: "MarkExpired");
        }

        Status = PaymentStatus.Expired;
        UpdatedAt = now;
    }
}
