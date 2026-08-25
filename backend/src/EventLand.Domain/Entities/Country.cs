namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Country entity representing geographical nations.
/// </summary>
public class Country : BaseEntity
{
    public string Name { get; set; } = string.Empty; // e.g. "Pakistan"
    public string Code { get; set; } = string.Empty; // e.g. "PK"
    public bool IsActive { get; set; } = true;

    public ICollection<City> Cities { get; set; } = new List<City>();
    public ICollection<Event> Events { get; set; } = new List<Event>();
}
