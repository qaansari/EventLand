namespace EventLand.Domain.Entities;

using System;
using EventLand.Domain.Common;
using EventLand.Domain.Enums;
using EventLand.Domain.StateMachines;

/// <summary>
/// Audit record for ticket booking refunds initiated by Admins/Organizers or system rules.
/// </summary>
public class RefundRecord : BaseEntity
{
    public int BookingId { get; set; }
    public Booking Booking { get; set; } = null!;

    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public RefundStatus Status { get; set; } = RefundStatus.Requested;

    public string? ProviderRefundRef { get; set; }

    public int? ProcessedByAdminId { get; set; }
    public int? ProcessedByUserId
    {
        get => ProcessedByAdminId;
        set => ProcessedByAdminId = value;
    }
    public string? ProcessedByEmail { get; set; }

    public DateTimeOffset ProcessedAt { get; set; } = DateTimeOffset.UtcNow;

    // Aggregate Behavior Methods
    public void Approve(int? adminId, string? adminEmail, DateTimeOffset now, string? notes = null)
    {
        if (Status == RefundStatus.Approved) return;
        RefundStateMachine.ValidateTransition(Status, RefundStatus.Approved, RefundStateMachine.TriggerApprove);
        Status = RefundStatus.Approved;
        ProcessedByAdminId = adminId;
        ProcessedByEmail = adminEmail;
        ProcessedAt = now;
        if (!string.IsNullOrWhiteSpace(notes)) Reason = notes;
    }

    public void Reject(int? adminId, string? adminEmail, DateTimeOffset now, string reason)
    {
        if (Status == RefundStatus.Rejected) return;
        RefundStateMachine.ValidateTransition(Status, RefundStatus.Rejected, RefundStateMachine.TriggerReject);
        Status = RefundStatus.Rejected;
        ProcessedByAdminId = adminId;
        ProcessedByEmail = adminEmail;
        ProcessedAt = now;
        Reason = reason;
    }

    public void Process(int? adminId, string? adminEmail, DateTimeOffset now, string? providerRefundRef = null)
    {
        if (Status == RefundStatus.Processed) return;
        RefundStateMachine.ValidateTransition(Status, RefundStatus.Processed, RefundStateMachine.TriggerProcess);
        Status = RefundStatus.Processed;
        ProcessedByAdminId = adminId;
        ProcessedByEmail = adminEmail;
        ProcessedAt = now;
        if (!string.IsNullOrWhiteSpace(providerRefundRef)) ProviderRefundRef = providerRefundRef;
    }

    public void Fail(string failureReason, DateTimeOffset now)
    {
        if (Status == RefundStatus.Failed) return;
        RefundStateMachine.ValidateTransition(Status, RefundStatus.Failed, RefundStateMachine.TriggerFail);
        Status = RefundStatus.Failed;
        ProcessedAt = now;
        Reason = failureReason;
    }

    public void Retry(int? adminId, string? adminEmail, DateTimeOffset now)
    {
        if (Status == RefundStatus.Approved) return;
        RefundStateMachine.ValidateTransition(Status, RefundStatus.Approved, RefundStateMachine.TriggerRetry);
        Status = RefundStatus.Approved;
        ProcessedByAdminId = adminId;
        ProcessedByEmail = adminEmail;
        ProcessedAt = now;
    }

    public static RefundRecord CreateRequested(int bookingId, decimal amount, string reason, int? adminId, string? adminEmail, DateTimeOffset now) =>
        new()
        {
            BookingId = bookingId,
            Amount = amount,
            Reason = reason,
            Status = RefundStatus.Requested,
            ProcessedByAdminId = adminId,
            ProcessedByEmail = adminEmail,
            ProcessedAt = now
        };

    public static RefundRecord CreateProcessed(int bookingId, decimal amount, string reason, int? adminId, string? adminEmail, DateTimeOffset now, string? providerRef = null) =>
        new()
        {
            BookingId = bookingId,
            Amount = amount,
            Reason = reason,
            Status = RefundStatus.Processed,
            ProcessedByAdminId = adminId,
            ProcessedByEmail = adminEmail,
            ProcessedAt = now,
            ProviderRefundRef = providerRef
        };
}
