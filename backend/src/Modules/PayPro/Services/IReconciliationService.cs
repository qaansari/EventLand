namespace EventLand.Modules.PayPro.Services;

using System.Threading;
using System.Threading.Tasks;

public record ReconciliationSummary(
    int CheckedCount,
    int UpdatedToPaidCount,
    int UpdatedToBlockedCount,
    int FailedCount
);

public interface IReconciliationService
{
    /// <summary>
    /// Sweeps pending and unpaid orders older than threshold minutes and syncs their status with PayPro.
    /// </summary>
    Task<ReconciliationSummary> ReconcilePendingOrdersAsync(
        int? olderThanMinutes = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Reconciles against PayPro's Get-Paid-Orders (gpo) date range sweep.
    /// </summary>
    Task<ReconciliationSummary> ReconcilePaidOrdersRangeAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default);
}
