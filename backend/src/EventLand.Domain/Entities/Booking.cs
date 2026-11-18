namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;
using EventLand.Domain.Enums;
using EventLand.Domain.StateMachines;

/// <summary>
/// A ticket booking placed by a customer for a specific event and ticket tier.
/// Encapsulates explicit lifecycle state machine transitions, audit history, and optimistic concurrency.
/// </summary>
public class Booking : BaseEntity
{
    // Event + Tier references
    public int EventId { get; set; }
    public Event Event { get; set; } = null!;

    public int TicketTierId { get; set; }
    public TicketTier TicketTier { get; set; } = null!;

    // Owning user account (nullable: preserves guest-checkout capability at the DB level)
    public int? UserId { get; set; }
    public User? User { get; set; }

    // Human-readable booking reference
    public string BookingRef { get; set; } = string.Empty;

    // Customer info
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;

    // Ticket details & Authoritative Pricing Snapshot
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal SubtotalAmount { get; set; } // Raw ticket price before fees (Quantity * UnitPrice or Sum of seats)
    public decimal PlatformFee { get; set; } // EventLand platform tier fee (49/99/149/199 PKR)
    public decimal PaymentProcessingFee { get; set; } // Payment gateway processing fee
    public decimal FeePercentageAtPurchase { get; set; } // Snapshot of % fee at checkout (e.g. 2.80% or 0.80%)
    public decimal TotalAmount { get; set; } // Final total payable: Subtotal + PlatformFee + ProcessingFee

    // Explicit State Machine Lifecycle (Single Source of Truth)
    public BookingState State { get; set; } = BookingState.PendingHold;

    // Backward-compatible computed accessors with dual-way sync
    private BookingStatus _status = BookingStatus.Pending;
    public BookingStatus Status
    {
        get => _status;
        set
        {
            _status = value;
            SyncStateFromLegacy();
        }
    }

    private PaymentStatus _paymentStatus = PaymentStatus.Pending;
    public PaymentStatus PaymentStatus
    {
        get => _paymentStatus;
        set
        {
            _paymentStatus = value;
            SyncStateFromLegacy();
        }
    }

    private void SyncStateFromLegacy()
    {
        if (_status == BookingStatus.Confirmed && _paymentStatus == PaymentStatus.Paid)
            State = BookingState.Confirmed;
        else if (_paymentStatus == PaymentStatus.Refunded)
            State = BookingState.Refunded;
        else if (_paymentStatus == PaymentStatus.Expired)
            State = BookingState.Expired;
        else if (_paymentStatus == PaymentStatus.PendingVerification)
            State = BookingState.AwaitingBankVerification;
        else if (_status == BookingStatus.Cancelled)
            State = BookingState.Cancelled;
        else if (_status == BookingStatus.Pending && _paymentStatus == PaymentStatus.Pending)
            State = BookingState.PendingHold;
    }

    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.None;
    public DateTimeOffset? PaidAt { get; set; }

    // Direct Bank Transfer & Verification fields
    public string? BankTransactionRef { get; set; }
    public string? PaymentProofUrl { get; set; }
    public string? SenderAccountTitle { get; set; }
    public string? SenderBankName { get; set; }
    public string? SenderAccountLast4 { get; set; }
    public int? VerifiedByAdminId { get; set; }
    public string? VerifiedByAdminEmail { get; set; }
    public DateTimeOffset? VerifiedAt { get; set; }

    // 30-Minute hold expiry window
    public DateTimeOffset? PaymentExpiresAt { get; set; }

    // Refund tracking
    public DateTimeOffset? RefundedAt { get; set; }
    public string? RefundReason { get; set; }

    // Gate validation & check-in tracking (Audit #7)
    public bool IsCheckedIn { get; set; } = false;
    public TicketScanState ScanState { get; set; } = TicketScanState.Issued;
    public DateTimeOffset? CheckedInAt { get; set; }
    public string? CheckedInBy { get; set; }
    public string? CheckedInDeviceId { get; set; }
    public long? GateScanSequence { get; set; }
    public string? GateNotes { get; set; }

    // Optimistic Concurrency Token
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    // Audit State History
    public ICollection<BookingStateHistory> StateHistories { get; set; } = new List<BookingStateHistory>();

    // Navigation
    public ICollection<BookingSeat> BookingSeats { get; set; } = new List<BookingSeat>();
    public ICollection<PaymentTransaction> PaymentTransactions { get; set; } = new List<PaymentTransaction>();

    // ── Rich Aggregate Behavior Methods ───────────────────────────────────────

    public void SubmitBankProof(
        string transactionRef,
        string proofUrl,
        string? accountTitle,
        string? bankName,
        string? last4,
        DateTimeOffset now,
        string? actor = null)
    {
        if (State == BookingState.AwaitingBankVerification && BankTransactionRef == transactionRef)
            return; // Idempotent re-submission of identical proof

        BookingStateMachine.ValidateTransition(State, BookingState.AwaitingBankVerification, BookingStateMachine.TriggerSubmitBankProof);

        var fromState = State;
        State = BookingState.AwaitingBankVerification;
        _status = BookingStatus.Pending;
        _paymentStatus = PaymentStatus.PendingVerification;

        BankTransactionRef = transactionRef;
        PaymentProofUrl = proofUrl;
        SenderAccountTitle = accountTitle;
        SenderBankName = bankName;
        SenderAccountLast4 = last4;
        UpdatedAt = now;
        UpdatedBy = actor;

        RecordTransition(fromState, State, BookingStateMachine.TriggerSubmitBankProof, actor, "Customer uploaded payment proof");
    }

    public void BeginPayProPayment(DateTimeOffset now, string? actor = null)
    {
        if (State == BookingState.PaymentProcessing)
            return; // Idempotent

        BookingStateMachine.ValidateTransition(State, BookingState.PaymentProcessing, BookingStateMachine.TriggerBeginPayProPayment);

        var fromState = State;
        State = BookingState.PaymentProcessing;
        _status = BookingStatus.Pending;
        _paymentStatus = PaymentStatus.Pending;
        UpdatedAt = now;
        UpdatedBy = actor;

        RecordTransition(fromState, State, BookingStateMachine.TriggerBeginPayProPayment, actor, "Customer initiated PayPro checkout");
    }

    public void PayProSuccess(DateTimeOffset now, string? actor = null, string? transactionRef = null)
    {
        if (State == BookingState.Confirmed)
            return; // Idempotent

        BookingStateMachine.ValidateTransition(State, BookingState.Confirmed, BookingStateMachine.TriggerPayProSuccess);

        var fromState = State;
        State = BookingState.Confirmed;
        ScanState = TicketScanState.Issued;
        _status = BookingStatus.Confirmed;
        _paymentStatus = PaymentStatus.Paid;
        PaidAt = now;
        if (!string.IsNullOrEmpty(transactionRef))
            BankTransactionRef = transactionRef;
        UpdatedAt = now;
        UpdatedBy = actor;

        RecordTransition(fromState, State, BookingStateMachine.TriggerPayProSuccess, actor, "PayPro payment completed successfully");
    }

    public void PayProFailedOrCancelled(DateTimeOffset now, string? actor = null, string? reason = null)
    {
        if (State == BookingState.PendingHold)
            return; // Idempotent return to hold

        BookingStateMachine.ValidateTransition(State, BookingState.PendingHold, BookingStateMachine.TriggerPayProFailedOrCancelled);

        var fromState = State;
        State = BookingState.PendingHold;
        _status = BookingStatus.Pending;
        _paymentStatus = PaymentStatus.Pending;
        UpdatedAt = now;
        UpdatedBy = actor;

        RecordTransition(fromState, State, BookingStateMachine.TriggerPayProFailedOrCancelled, actor, reason ?? "PayPro checkout failed or was cancelled by user");
    }

    public void ConfirmPayment(int? adminId, string? adminEmail, DateTimeOffset now, string? actor = null)
    {
        if (State == BookingState.Confirmed)
            return; // Idempotent confirmation

        BookingStateMachine.ValidateTransition(State, BookingState.Confirmed, BookingStateMachine.TriggerConfirmPayment);

        var fromState = State;
        State = BookingState.Confirmed;
        ScanState = TicketScanState.Issued;
        _status = BookingStatus.Confirmed;
        _paymentStatus = PaymentStatus.Paid;
        VerifiedByAdminId = adminId;
        VerifiedByAdminEmail = adminEmail;
        VerifiedAt = now;
        PaidAt ??= now;
        UpdatedAt = now;
        UpdatedBy = actor ?? adminEmail;

        RecordTransition(fromState, State, BookingStateMachine.TriggerConfirmPayment, actor ?? adminEmail, "Payment confirmed by administrator");
    }

    public void RejectPayment(int? adminId, string? adminEmail, string reason, DateTimeOffset now, string? actor = null)
    {
        if (State == BookingState.Rejected)
            return; // Idempotent rejection

        BookingStateMachine.ValidateTransition(State, BookingState.Rejected, BookingStateMachine.TriggerRejectPayment);

        var fromState = State;
        State = BookingState.Rejected;
        ScanState = TicketScanState.Revoked;
        _status = BookingStatus.Cancelled;
        _paymentStatus = PaymentStatus.Failed;
        VerifiedByAdminId = adminId;
        VerifiedByAdminEmail = adminEmail;
        VerifiedAt = now;
        UpdatedAt = now;
        UpdatedBy = actor ?? adminEmail;

        RecordTransition(fromState, State, BookingStateMachine.TriggerRejectPayment, actor ?? adminEmail, reason);
    }

    public void ExpireHold(DateTimeOffset now, string? actor = null, string reason = "30-minute hold lapsed without payment")
    {
        if (State == BookingState.Expired)
            return; // Idempotent

        BookingStateMachine.ValidateTransition(State, BookingState.Expired, BookingStateMachine.TriggerExpireHold);

        var fromState = State;
        State = BookingState.Expired;
        _status = BookingStatus.Cancelled;
        _paymentStatus = PaymentStatus.Expired;
        UpdatedAt = now;
        UpdatedBy = actor ?? "System:ExpiryService";

        RecordTransition(fromState, State, BookingStateMachine.TriggerExpireHold, actor ?? "System:ExpiryService", reason);
    }

    public void CancelBooking(DateTimeOffset now, string? actor = null, string reason = "Cancelled by customer/organizer")
    {
        if (State == BookingState.Cancelled)
            return; // Idempotent

        BookingStateMachine.ValidateTransition(State, BookingState.Cancelled, BookingStateMachine.TriggerCancelBooking);

        var fromState = State;
        State = BookingState.Cancelled;
        ScanState = TicketScanState.Revoked;
        _status = BookingStatus.Cancelled;
        _paymentStatus = PaymentStatus.Failed;
        UpdatedAt = now;
        UpdatedBy = actor;

        RecordTransition(fromState, State, BookingStateMachine.TriggerCancelBooking, actor, reason);
    }

    public void ProcessRefund(DateTimeOffset now, string reason, string? actor = null)
    {
        if (State == BookingState.Refunded)
            return; // Idempotent

        BookingStateMachine.ValidateTransition(State, BookingState.Refunded, BookingStateMachine.TriggerProcessRefund);

        var fromState = State;
        State = BookingState.Refunded;
        ScanState = TicketScanState.Revoked;
        _status = BookingStatus.Cancelled;
        _paymentStatus = PaymentStatus.Refunded;
        RefundedAt = now;
        RefundReason = reason;
        UpdatedAt = now;
        UpdatedBy = actor;

        RecordTransition(fromState, State, BookingStateMachine.TriggerProcessRefund, actor, reason);
    }

    public void CheckInAdmit(DateTimeOffset now, string? actor, string? deviceId = null, long? sequence = null, string? gateName = null)
    {
        if (IsCheckedIn)
            return; // Idempotent check-in

        IsCheckedIn = true;
        ScanState = TicketScanState.ScannedAndAdmitted;
        CheckedInAt = now;
        CheckedInBy = actor;
        CheckedInDeviceId = deviceId;
        GateScanSequence = sequence;
        if (!string.IsNullOrWhiteSpace(gateName))
            GateNotes = gateName;
        UpdatedAt = now;
        UpdatedBy = actor;
    }

    public void ResetCheckIn(DateTimeOffset now, string? actor, string? reason = null)
    {
        IsCheckedIn = false;
        ScanState = State == BookingState.Confirmed ? TicketScanState.Issued : TicketScanState.Revoked;
        CheckedInAt = null;
        CheckedInBy = null;
        CheckedInDeviceId = null;
        GateScanSequence = null;
        if (!string.IsNullOrWhiteSpace(reason))
            GateNotes = $"Reset: {reason}";
        UpdatedAt = now;
        UpdatedBy = actor;
    }

    private void RecordTransition(BookingState from, BookingState to, string trigger, string? changedBy, string? reason)
    {
        StateHistories.Add(new BookingStateHistory
        {
            BookingId = Id,
            FromState = from,
            ToState = to,
            Trigger = trigger,
            ChangedBy = changedBy,
            Reason = reason,
            CreatedAt = UpdatedAt,
            UpdatedAt = UpdatedAt
        });
    }
}
