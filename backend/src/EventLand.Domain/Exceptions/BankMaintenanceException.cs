namespace EventLand.Domain.Exceptions;

using System;

public class BankMaintenanceException : Exception
{
    public string Code { get; } = "BANK_MAINTENANCE";
    public DateTimeOffset? RetryAfterUtc { get; }
    public int? RetryAfterSeconds { get; }

    public BankMaintenanceException(string message, DateTimeOffset? retryAfterUtc = null)
        : base(message)
    {
        RetryAfterUtc = retryAfterUtc;
        if (retryAfterUtc.HasValue)
        {
            var diff = retryAfterUtc.Value - DateTimeOffset.UtcNow;
            RetryAfterSeconds = Math.Max(1, (int)diff.TotalSeconds);
        }
    }
}
