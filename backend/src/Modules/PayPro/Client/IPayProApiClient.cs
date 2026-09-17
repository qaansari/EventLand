namespace EventLand.Modules.PayPro.Client;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Dtos;

/// <summary>
/// Low-level typed HTTP client communicating with all 11 PayPro V2 REST endpoints.
/// </summary>
public interface IPayProApiClient
{
    /// <summary>1. POST /v2/ppro/auth - Authenticates merchant and retrieves valid session token.</summary>
    Task<PayProAuthResult> AuthenticateAsync(CancellationToken cancellationToken = default);

    /// <summary>2. POST /v2/ppro/co - Creates a single order / invoice.</summary>
    Task<PayProCreateOrderResult> CreateOrderAsync(PayProOrderInput order, CancellationToken cancellationToken = default);

    /// <summary>3. POST /v2/ppro/cmo - Creates multiple orders / invoices in a single batch.</summary>
    Task<PayProBatchOrderResult> CreateMultipleOrdersAsync(IEnumerable<PayProOrderInput> orders, CancellationToken cancellationToken = default);

    /// <summary>4. POST /v2/ppro/cc - Registers a single consumer with fixed ConsumerID.</summary>
    Task<PayProConsumerResult> CreateConsumerAsync(PayProConsumerInput consumer, CancellationToken cancellationToken = default);

    /// <summary>5. POST /v2/ppro/cmc - Registers multiple consumers in a single batch.</summary>
    Task<PayProBatchConsumerResult> CreateMultipleConsumersAsync(IEnumerable<PayProConsumerInput> consumers, CancellationToken cancellationToken = default);

    /// <summary>6. POST /v2/ppro/uc - Updates an existing single consumer.</summary>
    Task<PayProConsumerResult> UpdateConsumerAsync(PayProConsumerInput consumer, CancellationToken cancellationToken = default);

    /// <summary>7. POST /v2/ppro/umc - Updates multiple consumers in a single batch.</summary>
    Task<PayProBatchConsumerResult> UpdateMultipleConsumersAsync(IEnumerable<PayProConsumerInput> consumers, CancellationToken cancellationToken = default);

    /// <summary>8. POST/GET /v2/ppro/moap - Marks single or multiple orders as Paid.</summary>
    Task<PayProMarkOrderResult> MarkOrdersAsPaidAsync(IEnumerable<string> orderNumbers, CancellationToken cancellationToken = default);

    /// <summary>9. POST/GET /v2/ppro/moab - Marks single or multiple orders as Blocked.</summary>
    Task<PayProMarkOrderResult> MarkOrdersAsBlockedAsync(IEnumerable<string> orderNumbers, CancellationToken cancellationToken = default);

    /// <summary>10. GET/POST /v2/ppro/ggos or /ggosboi - Queries order status by OrderNumber or PayProId.</summary>
    Task<PayProOrderStatusResult> GetGeneralOrderStatusAsync(string? orderNumber = null, string? cpayId = null, CancellationToken cancellationToken = default);

    /// <summary>11. GET/POST /v2/ppro/gpo - Fetches all paid orders between a specified date range.</summary>
    Task<PayProPaidOrdersReportResult> GetPaidOrdersAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
}
