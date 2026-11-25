namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;
using EventLand.Domain.Exceptions;

/// <summary>
/// Represents a specific show slot/timing for an event (e.g. Matinee, Evening Show, Day 1, Day 2).
/// Uses 4-digit integer ID scheme.
/// </summary>
public class EventShow : BaseEntity
{
    public int EventId { get; set; }
    public Event Event { get; set; } = null!;

    public string ShowTitle { get; set; } = string.Empty;
    public DateTimeOffset StartTimeUtc { get; set; }
    public DateTimeOffset EndTimeUtc { get; set; }

    public bool IsClosed { get; set; } = false;

    // Navigation — Ticket Tiers available for this specific show
    public ICollection<TicketTier> TicketTiers { get; set; } = new List<TicketTier>();

    // Behavior Methods
    public void CloseShow()
    {
        IsClosed = true;
    }

    public void ReopenShow(DateTimeOffset? now = null)
    {
        var currentTime = now ?? DateTimeOffset.UtcNow;
        if (EndTimeUtc != default && EndTimeUtc < currentTime)
        {
            throw new InvalidStateTransitionException(
                entityName: "EventShow",
                fromState: IsClosed ? "Closed" : "Concluded",
                toState: "Open",
                trigger: "ReopenShow");
        }

        IsClosed = false;
    }
}
