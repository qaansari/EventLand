namespace EventLand.Infrastructure.Services;

using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Domain.StateMachines;
using EventLand.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

/// <summary>
/// Periodically expires pending bookings whose direct payment hold window has elapsed.
/// Uses atomic Compare-And-Set (CAS) ExecuteUpdateAsync to prevent race conditions with concurrent payment confirmations.
/// </summary>
public sealed class PendingBookingExpiryService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PendingBookingExpiryService> _logger;
    private readonly ISeatingNotificationService _seatingNotifications;
    private readonly TimeProvider _timeProvider;
    private readonly EventLand.Application.Common.EventLandTelemetry? _telemetry;

    public PendingBookingExpiryService(
        IServiceScopeFactory scopeFactory,
        ILogger<PendingBookingExpiryService> logger,
        ISeatingNotificationService seatingNotifications,
        TimeProvider? timeProvider = null,
        EventLand.Application.Common.EventLandTelemetry? telemetry = null)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _seatingNotifications = seatingNotifications;
        _timeProvider = timeProvider ?? TimeProvider.System;
        _telemetry = telemetry;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("PendingBookingExpiryService started. Check interval: {Interval}", Interval);

        try
        {
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            return;
        }

        using var timer = new PeriodicTimer(Interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while expiring pending bookings. Will retry on next tick.");
            }

            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("PendingBookingExpiryService stopping.");
    }

    public async Task<int> RunOnceAsync(CancellationToken cancellationToken = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var cacheService = scope.ServiceProvider.GetService<ICacheService>();

        var cutoff = _timeProvider.GetUtcNow();

        var allowedHoldStates = new[] { BookingState.PendingHold, BookingState.PaymentProcessing };

        // Find candidate bookings where hold window has elapsed
        var candidates = await context.Bookings
            .AsNoTracking()
            .Where(b => allowedHoldStates.Contains(b.State)
                     && b.PaymentExpiresAt != null
                     && b.PaymentExpiresAt <= cutoff
                     && !b.IsDeleted)
            .OrderBy(b => b.PaymentExpiresAt)
            .Take(200)
            .Select(b => new
            {
                b.Id,
                b.EventId,
                b.TicketTierId,
                b.Quantity,
                b.State
            })
            .ToListAsync(cancellationToken);

        if (candidates.Count == 0) return 0;

        int successfullyExpiredCount = 0;
        var seatsByEvent = new Dictionary<int, List<int>>();

        foreach (var candidate in candidates)
        {
            // Atomic Compare-And-Set (CAS): Update state only if still PendingHold or PaymentProcessing
            var rowsAffected = await context.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE Bookings SET State = {(int)BookingState.Expired}, Status = {(int)BookingStatus.Cancelled}, PaymentStatus = {(int)PaymentStatus.Expired}, UpdatedAt = {cutoff}, UpdatedBy = 'System:ExpiryService' WHERE Id = {candidate.Id} AND (State = {(int)BookingState.PendingHold} OR State = {(int)BookingState.PaymentProcessing}) AND PaymentExpiresAt <= {cutoff}",
                cancellationToken);

            // If rowsAffected == 0, another concurrent transaction (e.g. admin confirmation or payment webhook) won the race
            if (rowsAffected == 0)
                continue;

            successfullyExpiredCount++;

            // Record state audit history and enqueue outbox notification
            context.BookingStateHistories.Add(new BookingStateHistory
            {
                BookingId = candidate.Id,
                FromState = candidate.State,
                ToState = BookingState.Expired,
                Trigger = BookingStateMachine.TriggerExpireHold,
                ChangedBy = "System:ExpiryService",
                Reason = "Hold window lapsed without payment",
                CreatedAt = cutoff,
                UpdatedAt = cutoff
            });

            context.OutboxMessages.Add(new OutboxMessage
            {
                Id = Guid.NewGuid(),
                EventType = "BookingExpiredEvent",
                PayloadJson = $"{{\"BookingId\":{candidate.Id},\"EventId\":{candidate.EventId},\"Quantity\":{candidate.Quantity}}}",
                CreatedAt = cutoff,
                UpdatedAt = cutoff
            });

            // Revert inventory atomically checking bounds
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE TicketTiers SET SoldCount = CASE WHEN SoldCount >= {candidate.Quantity} THEN SoldCount - {candidate.Quantity} ELSE 0 END WHERE Id = {candidate.TicketTierId}",
                cancellationToken);

            // Release seats if assigned
            var seatIds = await context.BookingSeats
                .Where(bs => bs.BookingId == candidate.Id)
                .Select(bs => bs.SeatId)
                .ToListAsync(cancellationToken);

            if (seatIds.Count > 0)
            {
                await context.Seats
                    .Where(s => seatIds.Contains(s.Id))
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(seat => seat.Status, SeatStatus.Available)
                        .SetProperty(seat => seat.UpdatedAt, cutoff),
                        cancellationToken);

                if (!seatsByEvent.TryGetValue(candidate.EventId, out var eventSeats))
                {
                    eventSeats = new List<int>();
                    seatsByEvent[candidate.EventId] = eventSeats;
                }
                eventSeats.AddRange(seatIds);
            }
        }

        if (successfullyExpiredCount > 0)
        {
            await context.SaveChangesAsync(cancellationToken);

            if (cacheService != null)
            {
                var cacheTasks = seatsByEvent.Select(async kvp =>
                {
                    try
                    {
                        await cacheService.ReleaseSeatsAsync(kvp.Key, kvp.Value, null);
                        await cacheService.ClearEventCacheAsync(kvp.Key);
                        await _seatingNotifications.BroadcastSeatsReleasedAsync(kvp.Key, kvp.Value, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Could not release cache locks for EventId {EventId}", kvp.Key);
                    }
                });
                await Task.WhenAll(cacheTasks);
            }

            _logger.LogInformation("Expired {Count} pending bookings atomically exceeding hold window. Seats returned to pool.", successfullyExpiredCount);
        }

        sw.Stop();
        _telemetry?.RecordExpiryBatch(successfullyExpiredCount, sw.Elapsed.TotalMilliseconds);

        return successfullyExpiredCount;
    }
}
