namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// A named seating zone within a mapped event.
/// Uses 4-digit integer ID scheme.
/// </summary>
public class SeatingZone : BaseEntity
{
    public int   EventId        { get; set; }
    public Event Event          { get; set; } = null!;

    public string Zone          { get; set; } = string.Empty;
    public int    Rows          { get; set; }
    public int    Cols          { get; set; }
    public decimal Price        { get; set; }

    public int TotalCapacity    { get; set; }
    public int SortOrder        { get; set; } = 0;

    // Navigation — one seat per cell in the grid
    public ICollection<Seat> Seats { get; set; } = new List<Seat>();
}
