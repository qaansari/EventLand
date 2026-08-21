namespace EventLand.Domain.Enums;

public enum SeatStatus
{
    Available = 0,
    Reserved  = 1,   // Temporarily held (e.g. in checkout session)
    Booked    = 2    // Confirmed booking
}
