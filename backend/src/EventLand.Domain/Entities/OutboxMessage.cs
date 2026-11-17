namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

public class OutboxMessage : BaseEntity<Guid>
{
    public string EventType { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public DateTimeOffset? ProcessedAtUtc { get; set; }
    public string? Error { get; set; }
    public int RetryCount { get; set; } = 0;
}
