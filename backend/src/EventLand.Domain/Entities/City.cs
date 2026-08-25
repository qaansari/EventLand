namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// City entity linked to a Country.
/// </summary>
public class City : BaseEntity
{
    public int CountryId { get; set; }
    public Country Country { get; set; } = null!;

    public string Name { get; set; } = string.Empty; // e.g. "Karachi", "Lahore", "Islamabad"
    public bool IsActive { get; set; } = true;

    public ICollection<Venue> Venues { get; set; } = new List<Venue>();
    public ICollection<Event> Events { get; set; } = new List<Event>();
}
