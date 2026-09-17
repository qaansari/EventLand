namespace EventLand.Modules.PayPro.BackgroundJobs;

using System;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Options;
using EventLand.Modules.PayPro.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public class PayProReconciliationJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<PayProOptions> _optionsMonitor;
    private readonly ILogger<PayProReconciliationJob> _logger;

    public PayProReconciliationJob(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<PayProOptions> optionsMonitor,
        ILogger<PayProReconciliationJob> logger)
    {
        _scopeFactory = scopeFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("PayProReconciliationJob started.");

        // Initial delay before first sweep
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var options = _optionsMonitor.CurrentValue;
            var interval = TimeSpan.FromMinutes(Math.Max(2, options.ReconciliationIntervalMinutes));

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var reconService = scope.ServiceProvider.GetRequiredService<IReconciliationService>();

                _logger.LogInformation("Triggering scheduled PayPro reconciliation sweep...");
                var summary = await reconService.ReconcilePendingOrdersAsync(
                    olderThanMinutes: options.ReconciliationMinPendingMinutes,
                    cancellationToken: stoppingToken);

                _logger.LogInformation(
                    "Reconciliation sweep completed: {Checked} checked, {Paid} paid, {Blocked} blocked, {Failed} failed.",
                    summary.CheckedCount, summary.UpdatedToPaidCount, summary.UpdatedToBlockedCount, summary.FailedCount);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error occurred during PayPro reconciliation sweep");
            }

            try
            {
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("PayProReconciliationJob stopped.");
    }
}
