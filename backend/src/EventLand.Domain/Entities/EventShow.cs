namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Represents a specific show slot/timing for an event (e.g. Matinee, Evening Show, Day 1, Day 2).
/// Uses 4-digit integer ID scheme.
/// </summary>
public class EventShow : BaseEntity
{
    public int EventId                  { get; set; }
    public Event Event                  { get; set; } = null!;

    public string ShowTitle             { get; set; } = string.Empty;
    public DateTimeOffset StartTimeUtc  { get; set; }
    public DateTimeOffset EndTimeUtc    { get; set; }

    // Navigation — Ticket Tiers available for this specific show
    public ICollection<TicketTier> TicketTiers { get; set; } = new List<TicketTier>();
}
