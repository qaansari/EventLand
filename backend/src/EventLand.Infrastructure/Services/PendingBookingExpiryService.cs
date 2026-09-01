namespace EventLand.Infrastructure.Services;

using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

/// <summary>
/// Periodically expires pending bookings whose 30-minute direct bank transfer payment window has elapsed.
/// Runs every 60 seconds, returns held seats to the pool, and updates booking status to Cancelled/Expired.
/// </summary>
public sealed class PendingBookingExpiryService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PendingBookingExpiryService> _logger;

    public PendingBookingExpiryService(
        IServiceScopeFactory scopeFactory,
        ILogger<PendingBookingExpiryService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
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

    private async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var cacheService = scope.ServiceProvider.GetService<ICacheService>();

        var cutoff = DateTimeOffset.UtcNow;

        // Batch limit: process at most 200 expired bookings per tick to bound memory usage.
        // Remaining expired bookings will be picked up on subsequent ticks.
        var expiredBookings = await context.Bookings
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .Where(b => b.PaymentStatus == PaymentStatus.Pending && b.PaymentExpiresAt != null && b.PaymentExpiresAt <= cutoff && !b.IsDeleted)
            .OrderBy(b => b.PaymentExpiresAt) // Process oldest expired first
            .Take(200)
            .ToListAsync(cancellationToken);

        if (expiredBookings.Count == 0) return;

        foreach (var booking in expiredBookings)
        {
            booking.PaymentStatus = PaymentStatus.Expired;
            booking.Status = BookingStatus.Cancelled;

            if (booking.TicketTier != null)
            {
                booking.TicketTier.SoldCount = Math.Max(0, booking.TicketTier.SoldCount - booking.Quantity);
            }

            foreach (var bs in booking.BookingSeats)
            {
                if (bs.Seat != null)
                {
                    bs.Seat.Status = SeatStatus.Available;
                }
            }

            var seatIds = booking.BookingSeats.Select(bs => bs.SeatId).ToList();
            if (seatIds.Count > 0 && cacheService != null)
            {
                try
                {
                    await cacheService.ReleaseSeatsAsync(booking.EventId, seatIds, null);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not release cache lock for booking {BookingRef}", booking.BookingRef);
                }
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Expired {Count} pending bookings exceeding 30-minute hold window. Seats returned to pool.", expiredBookings.Count);
    }
}
