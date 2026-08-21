namespace EventLand.Application.Interfaces;

public interface ISeatingHubClient
{
    Task SeatsHeld(int eventId, List<int> seatIds, string email);
    Task SeatsReleased(int eventId, List<int> seatIds);
    Task SeatStatusChanged(int eventId, int seatId, string status);
}
