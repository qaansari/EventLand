namespace EventLand.Domain.Enums;

public enum CaptchaTokenState
{
    Unverified = 0,
    Verifying = 1,
    Verified = 2,
    Consumed = 3,
    Expired = 4,
    Rejected = 5
}
