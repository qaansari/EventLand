namespace EventLand.Modules.PayPro.Services;

using System.Threading;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Dtos;
using EventLand.Modules.PayPro.Entities;

public interface IOrderService
{
    /// <summary>
    /// Creates or retrieves an existing order with idempotency guarantees.
    /// Appends callback_url to Click2PayUrl for card payments.
    /// </summary>
    Task<CreatePayProOrderResponseDto> CreateOrderAsync(
        CreatePayProOrderRequestDto request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Queries the status of an order locally and from PayPro, updating records if changed.
    /// </summary>
    Task<PayProOrderStatusResult> GetOrderStatusAsync(
        string orderNumber,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates local order state to Paid and triggers domain side effects idempotently.
    /// </summary>
    Task<bool> MarkOrderPaidAsync(
        string orderNumber,
        decimal? amountPaid = null,
        string? paymentMode = null,
        DateTime? datePaid = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves local order by order number.
    /// </summary>
    Task<Order?> GetOrderByNumberAsync(
        string orderNumber,
        CancellationToken cancellationToken = default);
}
