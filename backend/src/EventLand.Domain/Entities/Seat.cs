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

    public SeatState State { get; set; } = SeatState.Available;

    private SeatStatus _status = SeatStatus.Available;
    public SeatStatus Status
    {
        get => _status;
        set
        {
            _status = value;
            State = value switch
            {
                SeatStatus.Available => SeatState.Available,
                SeatStatus.Reserved => SeatState.TemporarilyHeld,
                SeatStatus.Booked => SeatState.Booked,
                SeatStatus.Blocked => SeatState.Blocked,
                _ => SeatState.Available
            };
        }
    }

    // Navigation
    public ICollection<BookingSeat> BookingSeats { get; set; } = new List<BookingSeat>();
}
