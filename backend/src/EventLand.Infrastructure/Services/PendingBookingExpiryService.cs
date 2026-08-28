namespace EventLand.Infrastructure.Services;

using EventLand.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

/// <summary>
/// Periodically expires pending bookings whose payment window has elapsed.
/// Runs every 60 seconds and delegates to <see cref="IPayProPaymentService.CheckAndExpirePendingBookingsAsync"/>.
/// Exceptions are logged and swallowed so the host keeps running.
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
        _logger.LogInformation("PendingBookingExpiryService started. Interval: {Interval}", Interval);

        // Small initial delay so startup seeding/migrations can finish first.
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
        var paymentService = scope.ServiceProvider.GetRequiredService<IPayProPaymentService>();

        try
        {
            await paymentService.CheckAndExpirePendingBookingsAsync();
            _logger.LogDebug("Pending booking expiry sweep completed at {UtcNow:O}.", DateTimeOffset.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to expire pending bookings.");
        }
    }
}
