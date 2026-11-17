namespace EventLand.Domain.StateMachines;

using EventLand.Domain.Enums;
using EventLand.Domain.Exceptions;

public static class BookingStateMachine
{
    public const string TriggerSubmitBankProof = "SubmitBankProof";
    public const string TriggerBeginPayProPayment = "BeginPayProPayment";
    public const string TriggerPayProSuccess = "PayProSuccess";
    public const string TriggerPayProFailedOrCancelled = "PayProFailedOrCancelled";
    public const string TriggerConfirmPayment = "ConfirmPayment";
    public const string TriggerRejectPayment = "RejectPayment";
    public const string TriggerExpireHold = "ExpireHold";
    public const string TriggerCancelBooking = "CancelBooking";
    public const string TriggerProcessRefund = "ProcessRefund";

    private static readonly HashSet<(BookingState From, BookingState To, string Trigger)> AllowedTransitions = new()
    {
        (BookingState.PendingHold, BookingState.AwaitingBankVerification, TriggerSubmitBankProof),
        (BookingState.PendingHold, BookingState.PaymentProcessing, TriggerBeginPayProPayment),
        (BookingState.PendingHold, BookingState.Confirmed, TriggerConfirmPayment),
        (BookingState.PendingHold, BookingState.Confirmed, TriggerPayProSuccess),
        (BookingState.PendingHold, BookingState.Rejected, TriggerRejectPayment),
        (BookingState.PendingHold, BookingState.Cancelled, TriggerCancelBooking),
        (BookingState.PendingHold, BookingState.Expired, TriggerExpireHold),

        (BookingState.AwaitingBankVerification, BookingState.Confirmed, TriggerConfirmPayment),
        (BookingState.AwaitingBankVerification, BookingState.Rejected, TriggerRejectPayment),
        (BookingState.AwaitingBankVerification, BookingState.Cancelled, TriggerCancelBooking),

        (BookingState.PaymentProcessing, BookingState.Confirmed, TriggerPayProSuccess),
        (BookingState.PaymentProcessing, BookingState.Confirmed, TriggerConfirmPayment),
        (BookingState.PaymentProcessing, BookingState.PendingHold, TriggerPayProFailedOrCancelled),
        (BookingState.PaymentProcessing, BookingState.Cancelled, TriggerCancelBooking),
        (BookingState.PaymentProcessing, BookingState.Expired, TriggerExpireHold),

        (BookingState.Confirmed, BookingState.Cancelled, TriggerCancelBooking),
        (BookingState.Confirmed, BookingState.Refunded, TriggerProcessRefund)
    };

    public static bool CanTransition(BookingState current, BookingState target, string trigger)
    {
        // Idempotency: re-triggering the same terminal state
        if (current == target)
            return true;

        return AllowedTransitions.Contains((current, target, trigger));
    }

    public static void ValidateTransition(BookingState current, BookingState target, string trigger)
    {
        if (!CanTransition(current, target, trigger))
        {
            throw new InvalidStateTransitionException(
                entityName: "Booking",
                fromState: current.ToString(),
                toState: target.ToString(),
                trigger: trigger);
        }
    }
}
