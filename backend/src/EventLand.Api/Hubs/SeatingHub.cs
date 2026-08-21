namespace EventLand.Api.Hubs;

using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

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

    public static string GetGroupName(int eventId) => $"event_seating_{eventId}";
}
