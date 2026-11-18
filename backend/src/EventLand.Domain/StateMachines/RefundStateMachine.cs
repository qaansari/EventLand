namespace EventLand.Domain.StateMachines;

using System.Collections.Generic;
using EventLand.Domain.Enums;
using EventLand.Domain.Exceptions;

public static class RefundStateMachine
{
    public const string TriggerApprove = "Approve";
    public const string TriggerReject = "Reject";
    public const string TriggerProcess = "Process";
    public const string TriggerFail = "Fail";
    public const string TriggerRetry = "Retry";

    private static readonly HashSet<(RefundStatus From, RefundStatus To, string Trigger)> AllowedTransitions = new()
    {
        (RefundStatus.Requested, RefundStatus.Approved, TriggerApprove),
        (RefundStatus.Requested, RefundStatus.Rejected, TriggerReject),
        (RefundStatus.Approved, RefundStatus.Processed, TriggerProcess),
        (RefundStatus.Approved, RefundStatus.Failed, TriggerFail),
        (RefundStatus.Failed, RefundStatus.Approved, TriggerRetry)
    };

    public static bool CanTransition(RefundStatus from, RefundStatus to, string trigger)
    {
        return AllowedTransitions.Contains((from, to, trigger));
    }

    public static void ValidateTransition(RefundStatus from, RefundStatus to, string trigger)
    {
        if (from == to) return; // Idempotent no-op

        if (!CanTransition(from, to, trigger))
        {
            throw new InvalidStateTransitionException(
                "RefundRecord",
                from.ToString(),
                to.ToString(),
                trigger);
        }
    }
}
