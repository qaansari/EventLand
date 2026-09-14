namespace EventLand.Application.Interfaces;

using System.Threading;
using System.Threading.Tasks;
using EventLand.Application.Dtos;

/// <summary>
/// Direct low-level HTTP transport client for the PayPro API V2.
/// Handles authentication handshake, token caching, order creation, and status queries.
/// </summary>
public interface IPayProClient
{
    /// <summary>
    /// Acquires a valid PayPro V2 session token, utilizing server-side memory caching.
    /// </summary>
    Task<string?> GetAuthTokenAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a single payment order via PayPro V2 POST /v2/ppro/co.
    /// </summary>
    Task<PayProCreateOrderResult> CreateOrderAsync(
        string orderNumber,
        decimal amount,
        string customerName,
        string customerEmail,
        string customerPhone,
        DateTimeOffset? dueDate,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Queries the authoritative payment status of an order via PayPro V2.
    /// Checks /v2/ppro/ggosboi by OrderNumber or /v2/ppro/ggos by PayProId.
    /// </summary>
    Task<PayProOrderStatusResult> QueryOrderStatusAsync(
        string orderNumber,
        string? payProId = null,
        CancellationToken cancellationToken = default);
}
