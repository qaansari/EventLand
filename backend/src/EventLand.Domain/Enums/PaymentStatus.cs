namespace EventLand.Domain.Enums;

public enum PaymentStatus
{
    Pending    = 0,
    Paid       = 1,
    Failed     = 2,
    Refunded   = 3,
    Expired    = 4,
    Processing = 5
}
