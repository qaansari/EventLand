namespace EventLand.Modules.PayPro.Entities;

/// <summary>
/// Status lifecycle of a PayPro Order.
/// </summary>
public enum OrderStatus
{
    Pending = 0,
    Unpaid  = 1,
    Paid    = 2,
    Blocked = 3,
    Failed  = 4
}
