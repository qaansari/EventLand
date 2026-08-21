namespace EventLand.Domain.Entities;

/// <summary>
/// Many-to-many join entity between Event and Tag.
/// Composite PK: (EventId, TagId).
/// </summary>
public class EventTag
{
    public int   EventId { get; set; }
    public Event Event   { get; set; } = null!;

    public int   TagId   { get; set; }
    public Tag   Tag     { get; set; } = null!;
}
