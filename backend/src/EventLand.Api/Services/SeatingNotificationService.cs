namespace EventLand.Api.Services;

using System.Collections.Concurrent;
using EventLand.Application.Interfaces;
using EventLand.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

/// <summary>
/// Implements <see cref="ISeatingNotificationService"/> with 250ms debounced delta batching
/// to prevent SignalR broadcast storms during high-concurrency ticket drops.
/// </summary>
public sealed class SeatingNotificationService : ISeatingNotificationService, IAsyncDisposable
{
    private readonly IHubContext<SeatingHub, ISeatingHubClient> _hubContext;
    private readonly ConcurrentDictionary<int, ConcurrentQueue<SeatStateDelta>> _batchedDeltas = new();
    private readonly Timer _batchTimer;
    private long _versionCounter = 0;

    public SeatingNotificationService(IHubContext<SeatingHub, ISeatingHubClient> hubContext)
    {
        _hubContext = hubContext;
        // Periodic batch flusher every 250ms
        _batchTimer = new Timer(async _ => await FlushBatchDeltasAsync(), null, TimeSpan.FromMilliseconds(250), TimeSpan.FromMilliseconds(250));
    }

    public Task BroadcastSeatsReleasedAsync(int eventId, List<int> seatIds, CancellationToken cancellationToken = default)
    {
        EnqueueSeatChanges(eventId, seatIds, "Available");
        return _hubContext.Clients
            .Group(SeatingHub.GetGroupName(eventId))
            .SeatsReleased(eventId, seatIds);
    }

    public Task BroadcastSeatsHeldAsync(int eventId, List<int> seatIds, string email, CancellationToken cancellationToken = default)
    {
        EnqueueSeatChanges(eventId, seatIds, "TemporarilyHeld");
        return _hubContext.Clients
            .Group(SeatingHub.GetGroupName(eventId))
            .SeatsHeld(eventId, seatIds, email);
    }

    public Task BroadcastSeatStatusChangedAsync(int eventId, int seatId, string status, CancellationToken cancellationToken = default)
    {
        EnqueueSeatChanges(eventId, new List<int> { seatId }, status);
        return _hubContext.Clients
            .Group(SeatingHub.GetGroupName(eventId))
            .SeatStatusChanged(eventId, seatId, status);
    }

    public Task BroadcastBatchDeltasAsync(int eventId, List<SeatStateDelta> deltas, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients
            .Group(SeatingHub.GetGroupName(eventId))
            .SeatBatchStatusChanged(eventId, deltas);
    }

    private void EnqueueSeatChanges(int eventId, IEnumerable<int> seatIds, string newState)
    {
        var queue = _batchedDeltas.GetOrAdd(eventId, _ => new ConcurrentQueue<SeatStateDelta>());
        foreach (var seatId in seatIds)
        {
            var version = Interlocked.Increment(ref _versionCounter);
            queue.Enqueue(new SeatStateDelta(seatId, newState, version));
        }
    }

    private async Task FlushBatchDeltasAsync()
    {
        foreach (var kvp in _batchedDeltas)
        {
            var eventId = kvp.Key;
            var queue = kvp.Value;

            if (queue.IsEmpty) continue;

            var batch = new List<SeatStateDelta>();
            while (queue.TryDequeue(out var delta) && batch.Count < 500)
            {
                batch.Add(delta);
            }

            if (batch.Count > 0)
            {
                try
                {
                    await _hubContext.Clients
                        .Group(SeatingHub.GetGroupName(eventId))
                        .SeatBatchStatusChanged(eventId, batch);
                }
                catch
                {
                    // Ignore broadcast errors during shutdown
                }
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        await _batchTimer.DisposeAsync();
        await FlushBatchDeltasAsync();
    }
}
