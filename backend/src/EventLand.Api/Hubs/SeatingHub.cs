namespace EventLand.Api.Hubs;

using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

[Authorize]
public class SeatingHub : Hub<ISeatingHubClient>
{
    public async Task JoinEventGroup(int eventId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GetGroupName(eventId));
    }

    public async Task LeaveEventGroup(int eventId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetGroupName(eventId));
    }

    /// <summary>
    /// Alias used by the React SignalR client. Accepts string ids and an optional
    /// show id (currently unused for grouping but accepted for forward compatibility).
    /// </summary>
    public Task JoinEvent(string eventId, string? showId = null)
    {
        if (int.TryParse(eventId, out var id))
        {
            return JoinEventGroup(id);
        }
        return Task.CompletedTask;
    }

    /// <summary>Alias for <see cref="LeaveEventGroup(int)"/> used by the React client.</summary>
    public Task LeaveEvent(string eventId, string? showId = null)
    {
        if (int.TryParse(eventId, out var id))
        {
            return LeaveEventGroup(id);
        }
        return Task.CompletedTask;
    }

    public static string GetGroupName(int eventId) => $"event_seating_{eventId}";
}
