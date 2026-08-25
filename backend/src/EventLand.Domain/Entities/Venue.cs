namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Venue entity representing event complexes / sites.
/// </summary>
public class Venue : BaseEntity
{
    public int CityId { get; set; }
    public City City { get; set; } = null!;

    public string Name { get; set; } = string.Empty; // e.g. "Arts Council of Pakistan"
    public string Address { get; set; } = string.Empty; // e.g. "M.R. Kiyani Road, Saddar, Karachi"
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<Auditorium> Auditoriums { get; set; } = new List<Auditorium>();
    public ICollection<Event> Events { get; set; } = new List<Event>();
}
