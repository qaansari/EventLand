namespace EventLand.Domain.Exceptions;

public class SeatAlreadyBookedException : InvalidOperationException
{
    public int EventId { get; }
    public IReadOnlyList<int> SeatIds { get; }

    public SeatAlreadyBookedException(int eventId, IEnumerable<int> seatIds, string? message = null)
        : base(message ?? $"One or more requested seats in event {eventId} are already booked or no longer available.")
    {
        EventId = eventId;
        SeatIds = seatIds.ToList().AsReadOnly();
    }
}
