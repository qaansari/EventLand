namespace EventLand.Application.Interfaces;

/// <summary>
/// Abstraction over the SignalR SeatingHub that Infrastructure services can inject
/// without creating a circular dependency on the Api project.
/// </summary>
public interface ISeatingNotificationService
{
    /// <summary>Broadcast that the given seats have been released for an event.</summary>
    Task BroadcastSeatsReleasedAsync(int eventId, List<int> seatIds, CancellationToken cancellationToken = default);
}
