namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Auditorium entity representing specific halls, auditoriums, or stage layouts within a Venue.
/// </summary>
public class Auditorium : BaseEntity
{
    public int VenueId { get; set; }
    public Venue Venue { get; set; } = null!;

    public string Name { get; set; } = string.Empty; // e.g. "AC Auditorium II"
    public string LayoutCode { get; set; } = string.Empty; // e.g. "AC_II_ACP_KARACHI"
    public int TotalCapacity { get; set; }
    public string Description { get; set; } = string.Empty;
    public string LayoutJson { get; set; } = string.Empty; // Seating chart JSON blueprint
    public bool IsActive { get; set; } = true;

    public ICollection<Event> Events { get; set; } = new List<Event>();
}
