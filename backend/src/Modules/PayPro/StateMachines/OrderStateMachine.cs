namespace EventLand.Modules.PayPro.StateMachines;

using EventLand.Modules.PayPro.Entities;

/// <summary>
/// Explicit state machine governing PayPro Order lifecycle transitions.
/// Terminal states (Paid, Blocked, Failed) cannot regress to Pending or Unpaid.
/// </summary>
public static class OrderStateMachine
{
    public const string TriggerMarkUnpaid = "MarkUnpaid";
    public const string TriggerMarkPaid = "MarkPaid";
    public const string TriggerMarkBlocked = "MarkBlocked";
    public const string TriggerMarkFailed = "MarkFailed";

    private static readonly HashSet<(OrderStatus From, OrderStatus To, string Trigger)> AllowedTransitions = new()
    {
        (OrderStatus.Pending, OrderStatus.Unpaid, TriggerMarkUnpaid),
        (OrderStatus.Pending, OrderStatus.Paid, TriggerMarkPaid),
        (OrderStatus.Pending, OrderStatus.Blocked, TriggerMarkBlocked),
        (OrderStatus.Pending, OrderStatus.Failed, TriggerMarkFailed),

        (OrderStatus.Unpaid, OrderStatus.Paid, TriggerMarkPaid),
        (OrderStatus.Unpaid, OrderStatus.Blocked, TriggerMarkBlocked),
        (OrderStatus.Unpaid, OrderStatus.Failed, TriggerMarkFailed)
    };

    public static bool CanTransition(OrderStatus current, OrderStatus target, string trigger)
    {
        if (current == target)
            return true;

        return AllowedTransitions.Contains((current, target, trigger));
    }

    public static void ValidateTransition(OrderStatus current, OrderStatus target, string trigger)
    {
        if (!CanTransition(current, target, trigger))
        {
            throw new InvalidOperationException(
                $"Invalid Order state transition from '{current}' to '{target}' via trigger '{trigger}'.");
        }
    }
}
