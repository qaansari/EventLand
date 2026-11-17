namespace EventLand.Domain.Enums;

public enum BookingState
{
    PendingHold = 0,
    AwaitingBankVerification = 1,
    PaymentProcessing = 2,
    Confirmed = 3,
    Expired = 4,
    Rejected = 5,
    Cancelled = 6,
    Refunded = 7
}
