namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;
using EventLand.Domain.Enums;

/// <summary>
/// Core event entity. Uses a short 4-digit integer ID scheme (e.g. 1001, 6478).
/// </summary>
public class Event : BaseEntity
{
    public string  Title          { get; set; } = string.Empty;
    public string  Category       { get; set; } = string.Empty;
    public EventStatus  Status    { get; set; } = EventStatus.Live;
    public bool    IsFeatured     { get; set; } = false;
    public bool    IsPublished    { get; set; } = true;

    // Location
    public string  City           { get; set; } = string.Empty;
    public string  Venue          { get; set; } = string.Empty;
    public string? Address        { get; set; }

    // Structured dates
    public DateTimeOffset StartDateUtc { get; set; }
    public DateTimeOffset EndDateUtc   { get; set; }

    // Pricing summary
    public string  PriceRange     { get; set; } = string.Empty;
    public decimal StartingPrice  { get; set; }
    public TicketingType TicketingType { get; set; } = TicketingType.Categorized;

    // Media & display
    public string  Banner         { get; set; } = string.Empty;
    public string  Description    { get; set; } = string.Empty;
    public string? ScarcityText   { get; set; }

    // Organizer (FK)
    public int     OrganizerId    { get; set; }
    public Organizer Organizer    { get; set; } = null!;

    // Navigation collections
    public ICollection<EventShow>   Shows        { get; set; } = new List<EventShow>();
    public ICollection<TicketTier>  TicketTiers  { get; set; } = new List<TicketTier>();
    public ICollection<SeatingZone> SeatingZones { get; set; } = new List<SeatingZone>();
    public ICollection<Booking>     Bookings     { get; set; } = new List<Booking>();
    public ICollection<EventTag>    EventTags    { get; set; } = new List<EventTag>();
}
