namespace EventLand.Api.Services;

using EventLand.Application.Interfaces;
using EventLand.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

/// <summary>
/// Implements <see cref=""ISeatingNotificationService""/> by wrapping the typed SignalR hub context.
/// Registered in the Api project so Infrastructure services can broadcast seat-release events
/// without referencing the Api assembly directly.
/// </summary>
public sealed class SeatingNotificationService : ISeatingNotificationService
{
    private readonly IHubContext<SeatingHub, ISeatingHubClient> _hubContext;

    public SeatingNotificationService(IHubContext<SeatingHub, ISeatingHubClient> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task BroadcastSeatsReleasedAsync(int eventId, List<int> seatIds, CancellationToken cancellationToken = default)
        => _hubContext.Clients
            .Group(SeatingHub.GetGroupName(eventId))
            .SeatsReleased(eventId, seatIds);
}
