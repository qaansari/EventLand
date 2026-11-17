namespace EventLand.Application.Interfaces;

/// <summary>
/// Abstraction over the SignalR SeatingHub that Infrastructure services can inject
/// without creating a circular dependency on the Api project.
/// </summary>
public interface ISeatingNotificationService
{
    Task BroadcastSeatsHeldAsync(int eventId, List<int> seatIds, string email, CancellationToken cancellationToken = default);
    Task BroadcastSeatsReleasedAsync(int eventId, List<int> seatIds, CancellationToken cancellationToken = default);
    Task BroadcastSeatStatusChangedAsync(int eventId, int seatId, string status, CancellationToken cancellationToken = default);
    Task BroadcastBatchDeltasAsync(int eventId, List<SeatStateDelta> deltas, CancellationToken cancellationToken = default);
}
