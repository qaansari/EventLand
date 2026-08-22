namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// A ticket tier (e.g. Standard, VIP, Gold) belonging to a specific event.
/// Uses 4-digit integer ID scheme.
/// </summary>
public class TicketTier : BaseEntity
{
    public int    EventId           { get; set; }
    public Event  Event             { get; set; } = null!;

    public int?       EventShowId   { get; set; }
    public EventShow? EventShow     { get; set; }

    public string Name              { get; set; } = string.Empty;
    public string Description       { get; set; } = string.Empty;
    public decimal Price            { get; set; }

    // Inventory
    public int AvailableQuantity    { get; set; } = 100;
    public int SoldCount            { get; set; } = 0;

    // Purchase limits
    public int MaxPerOrder          { get; set; } = 10;

    // Display order
    public int SortOrder            { get; set; } = 0;

    // Navigation
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
