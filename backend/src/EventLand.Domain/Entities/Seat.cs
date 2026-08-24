namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;
using EventLand.Domain.Enums;

/// <summary>
/// An individual seat within a SeatingZone grid.
/// Uses 4-digit integer ID scheme.
/// </summary>
public class Seat : BaseEntity
{
    public int         ZoneId { get; set; }
    public SeatingZone Zone   { get; set; } = null!;

    public int    Row    { get; set; }
    public int    Col    { get; set; }
    public string Label  { get; set; } = string.Empty; // e.g. "A1", "B5"
    public decimal? Price { get; set; }

    public SeatStatus Status { get; set; } = SeatStatus.Available;

    // Navigation
    public ICollection<BookingSeat> BookingSeats { get; set; } = new List<BookingSeat>();
}
