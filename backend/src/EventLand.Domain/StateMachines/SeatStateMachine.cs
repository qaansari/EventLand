namespace EventLand.Domain.StateMachines;

using EventLand.Domain.Enums;
using EventLand.Domain.Exceptions;

/// <summary>
/// Explicit state machine governing seat lifecycle transitions across
/// Available, TemporarilyHeld, Booked, Blocked, and Maintenance states.
/// </summary>
public static class SeatStateMachine
{
    public const string TriggerReserve = "Reserve";
    public const string TriggerBook = "Book";
    public const string TriggerRelease = "Release";
    public const string TriggerBlock = "Block";
    public const string TriggerUnblock = "Unblock";
    public const string TriggerEnterMaintenance = "EnterMaintenance";
    public const string TriggerExitMaintenance = "ExitMaintenance";

    private static readonly HashSet<(SeatState From, SeatState To, string Trigger)> AllowedTransitions = new()
    {
        (SeatState.Available, SeatState.TemporarilyHeld, TriggerReserve),
        (SeatState.Available, SeatState.Booked, TriggerBook),
        (SeatState.Available, SeatState.Blocked, TriggerBlock),
        (SeatState.Available, SeatState.Maintenance, TriggerEnterMaintenance),

        (SeatState.TemporarilyHeld, SeatState.Booked, TriggerBook),
        (SeatState.TemporarilyHeld, SeatState.Available, TriggerRelease),

        (SeatState.Booked, SeatState.Available, TriggerRelease),

        (SeatState.Blocked, SeatState.Available, TriggerUnblock),
        (SeatState.Blocked, SeatState.Maintenance, TriggerEnterMaintenance),

        (SeatState.Maintenance, SeatState.Available, TriggerExitMaintenance),
        (SeatState.Maintenance, SeatState.Blocked, TriggerBlock)
    };

    public static bool CanTransition(SeatState current, SeatState target, string trigger)
    {
        if (current == target)
            return true;

        return AllowedTransitions.Contains((current, target, trigger));
    }

    public static void ValidateTransition(SeatState current, SeatState target, string trigger)
    {
        if (!CanTransition(current, target, trigger))
        {
            throw new InvalidStateTransitionException(
                entityName: "Seat",
                fromState: current.ToString(),
                toState: target.ToString(),
                trigger: trigger);
        }
    }
}
