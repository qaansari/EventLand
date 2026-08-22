namespace EventLand.Domain.Entities;

/// <summary>
/// Many-to-many join entity between Booking and Seat.
/// Composite PK: (BookingId, SeatId).
/// </summary>
public class BookingSeat
{
    public int     BookingId { get; set; }
    public Booking Booking   { get; set; } = null!;

    public int     SeatId    { get; set; }
    public Seat    Seat      { get; set; } = null!;

    public int?       EventShowId { get; set; }
    public EventShow? EventShow   { get; set; }
}
