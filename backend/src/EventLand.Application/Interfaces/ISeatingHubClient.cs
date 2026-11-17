namespace EventLand.Application.Interfaces;

public record SeatStateDelta(int SeatId, string NewState, long Version);

public interface ISeatingHubClient
{
    Task SeatsHeld(int eventId, List<int> seatIds, string email);
    Task SeatsReleased(int eventId, List<int> seatIds);
    Task SeatStatusChanged(int eventId, int seatId, string status);
    Task SeatBatchStatusChanged(int eventId, List<SeatStateDelta> deltas);
}
