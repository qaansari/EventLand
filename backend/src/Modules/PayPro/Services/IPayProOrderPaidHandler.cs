namespace EventLand.Modules.PayPro.Services;

using System.Threading;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Entities;

/// <summary>
/// Hook invoked when a PayPro order is confirmed as Paid (via webhook, redirect return, or reconciliation).
/// </summary>
public interface IPayProOrderPaidHandler
{
    Task OnOrderPaidAsync(Order order, CancellationToken cancellationToken = default);
}

/// <summary>
/// Default no-op handler when no external domain handler is registered.
/// </summary>
public class DefaultPayProOrderPaidHandler : IPayProOrderPaidHandler
{
    public Task OnOrderPaidAsync(Order order, CancellationToken cancellationToken = default) => Task.CompletedTask;
}
