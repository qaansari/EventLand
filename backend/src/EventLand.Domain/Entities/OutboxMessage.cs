namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

public enum OutboxStatus
{
    Pending = 0,
    Processed = 1,
    Failed = 2,
    DeadLettered = 3
}

public class OutboxMessage : BaseEntity<Guid>
{
    public const int DefaultMaxRetries = 5;

    public string EventType { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public DateTimeOffset? ProcessedAtUtc { get; set; }
    public string? Error { get; set; }
    public int RetryCount { get; set; } = 0;

    public OutboxStatus GetStatus(int maxRetries = DefaultMaxRetries)
    {
        if (ProcessedAtUtc.HasValue)
            return OutboxStatus.Processed;
        if (RetryCount >= maxRetries)
            return OutboxStatus.DeadLettered;
        if (RetryCount > 0 || !string.IsNullOrEmpty(Error))
            return OutboxStatus.Failed;
        return OutboxStatus.Pending;
    }

    public void MarkProcessed(DateTimeOffset now)
    {
        ProcessedAtUtc = now;
        Error = null;
        UpdatedAt = now;
    }

    public void RecordFailure(string error, DateTimeOffset now)
    {
        RetryCount++;
        Error = error;
        UpdatedAt = now;
    }
}
