namespace EventLand.Domain.StateMachines;

using EventLand.Domain.Enums;
using EventLand.Domain.Exceptions;

/// <summary>
/// Explicit state machine governing gate ticket scan and admission transitions.
/// </summary>
public static class TicketScanStateMachine
{
    public const string TriggerAdmit = "Admit";
    public const string TriggerReset = "Reset";
    public const string TriggerRevoke = "Revoke";
    public const string TriggerMarkInvalidSlot = "MarkInvalidSlot";

    private static readonly HashSet<(TicketScanState From, TicketScanState To, string Trigger)> AllowedTransitions = new()
    {
        (TicketScanState.Issued, TicketScanState.ScannedAndAdmitted, TriggerAdmit),
        (TicketScanState.Issued, TicketScanState.InvalidShowSlot, TriggerMarkInvalidSlot),
        (TicketScanState.Issued, TicketScanState.Revoked, TriggerRevoke),

        (TicketScanState.ScannedAndAdmitted, TicketScanState.Issued, TriggerReset),
        (TicketScanState.ScannedAndAdmitted, TicketScanState.Revoked, TriggerRevoke),

        (TicketScanState.InvalidShowSlot, TicketScanState.Revoked, TriggerRevoke)
    };

    public static bool CanTransition(TicketScanState current, TicketScanState target, string trigger)
    {
        if (current == target)
            return true;

        return AllowedTransitions.Contains((current, target, trigger));
    }

    public static void ValidateTransition(TicketScanState current, TicketScanState target, string trigger)
    {
        if (!CanTransition(current, target, trigger))
        {
            throw new InvalidStateTransitionException(
                entityName: "TicketScan",
                fromState: current.ToString(),
                toState: target.ToString(),
                trigger: trigger);
        }
    }
}
