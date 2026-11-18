namespace EventLand.Domain.Exceptions;

public class CaptchaVerificationException : Exception
{
    public string Code { get; } = "BOT_CHALLENGE_REQUIRED";

    public CaptchaVerificationException(string message = "Security verification failed. Please complete the captcha challenge.")
        : base(message)
    {
    }

    public CaptchaVerificationException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
