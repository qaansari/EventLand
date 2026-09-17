namespace EventLand.Modules.PayPro.Services;

using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Client;
using EventLand.Modules.PayPro.Entities;
using EventLand.Modules.PayPro.Options;
using EventLand.Modules.PayPro.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public class ReconciliationService : IReconciliationService
{
    private readonly IPayProApiClient _apiClient;
    private readonly IPayProDbContext _dbContext;
    private readonly IOrderService _orderService;
    private readonly PayProOptions _options;
    private readonly ILogger<ReconciliationService> _logger;

    public ReconciliationService(
        IPayProApiClient apiClient,
        IPayProDbContext dbContext,
        IOrderService orderService,
        IOptions<PayProOptions> options,
        ILogger<ReconciliationService> logger)
    {
        _apiClient = apiClient;
        _dbContext = dbContext;
        _orderService = orderService;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ReconciliationSummary> ReconcilePendingOrdersAsync(
        int? olderThanMinutes = null,
        CancellationToken cancellationToken = default)
    {
        var minAge = olderThanMinutes ?? _options.ReconciliationMinPendingMinutes;
        var thresholdTime = DateTime.UtcNow.AddMinutes(-minAge);

        // Utilizes the composite index (Status, UpdatedAtUtc)
        var pendingOrders = await _dbContext.Orders
            .Where(o => (o.Status == OrderStatus.Pending || o.Status == OrderStatus.Unpaid) &&
                        o.UpdatedAtUtc <= thresholdTime)
            .OrderBy(o => o.UpdatedAtUtc)
            .Take(100) // Batch of up to 100 per sweep to prevent excessive latency
            .ToListAsync(cancellationToken);

        int checkedCount = 0;
        int paidCount = 0;
        int blockedCount = 0;
        int failedCount = 0;

        _logger.LogInformation("Starting PayPro reconciliation sweep for {Count} pending orders older than {Minutes}m",
            pendingOrders.Count, minAge);

        foreach (var order in pendingOrders)
        {
            if (cancellationToken.IsCancellationRequested) break;
            checkedCount++;

            try
            {
                var queryResult = await _apiClient.GetGeneralOrderStatusAsync(
                    orderNumber: order.OrderNumber,
                    cpayId: order.PayProId,
                    cancellationToken: cancellationToken);

                if (!queryResult.IsSuccess)
                {
                    _logger.LogDebug("Reconciliation: Query failed or no data for order {OrderNumber}", order.OrderNumber);
                    continue;
                }

                if (queryResult.IsPaid)
                {
                    _logger.LogInformation("Reconciliation: Order {OrderNumber} confirmed PAID via remote inquiry.", order.OrderNumber);
                    await _orderService.MarkOrderPaidAsync(
                        orderNumber: order.OrderNumber,
                        amountPaid: queryResult.AmountPaid > 0 ? queryResult.AmountPaid : order.Amount,
                        paymentMode: queryResult.PaymentVia,
                        datePaid: queryResult.DatePaid ?? DateTime.UtcNow,
                        cancellationToken: cancellationToken);
                    paidCount++;
                }
                else if (queryResult.IsBlocked)
                {
                    _logger.LogInformation("Reconciliation: Order {OrderNumber} confirmed BLOCKED.", order.OrderNumber);
                    order.Status = OrderStatus.Blocked;
                    order.UpdatedAtUtc = DateTime.UtcNow;
                    await _dbContext.SaveChangesAsync(cancellationToken);
                    blockedCount++;
                }
                else
                {
                    // Update timestamp to push out of immediate query window
                    order.UpdatedAtUtc = DateTime.UtcNow;
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                failedCount++;
                _logger.LogError(ex, "Reconciliation failed for Order {OrderNumber}: {Message}", order.OrderNumber, ex.Message);
            }
        }

        var summary = new ReconciliationSummary(checkedCount, paidCount, blockedCount, failedCount);
        _logger.LogInformation("PayPro reconciliation sweep complete: Checked={Checked}, Paid={Paid}, Blocked={Blocked}, Failed={Failed}",
            checkedCount, paidCount, blockedCount, failedCount);

        return summary;
    }

    public async Task<ReconciliationSummary> ReconcilePaidOrdersRangeAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting PayPro GPO range reconciliation sweep ({Start} to {End})",
            startDate.ToString("yyyy-MM-dd"), endDate.ToString("yyyy-MM-dd"));

        var gpoResult = await _apiClient.GetPaidOrdersAsync(startDate, endDate, cancellationToken);
        if (!gpoResult.IsSuccess || gpoResult.PaidOrders.Count == 0)
        {
            return new ReconciliationSummary(0, 0, 0, gpoResult.IsSuccess ? 0 : 1);
        }

        int checkedCount = 0;
        int paidCount = 0;
        int failedCount = 0;

        foreach (var paidOrder in gpoResult.PaidOrders)
        {
            checkedCount++;
            try
            {
                var success = await _orderService.MarkOrderPaidAsync(
                    orderNumber: paidOrder.OrderId,
                    amountPaid: paidOrder.AmountPaid > 0 ? paidOrder.AmountPaid : paidOrder.OrderAmount,
                    paymentMode: paidOrder.PaymentMode,
                    datePaid: paidOrder.DatePaid ?? DateTime.UtcNow,
                    cancellationToken: cancellationToken);

                if (success) paidCount++;
            }
            catch (Exception ex)
            {
                failedCount++;
                _logger.LogError(ex, "GPO reconciliation error for Order {OrderId}", paidOrder.OrderId);
            }
        }

        return new ReconciliationSummary(checkedCount, paidCount, 0, failedCount);
    }
}
