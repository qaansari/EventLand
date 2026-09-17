namespace EventLand.Api.Controllers;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Api.Extensions;
using EventLand.Modules.PayPro.Client;
using EventLand.Modules.PayPro.Dtos;
using EventLand.Modules.PayPro.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/paypro")]
public class PayProAdminController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IConsumerService _consumerService;
    private readonly IReconciliationService _reconciliationService;
    private readonly IPayProApiClient _apiClient;

    public PayProAdminController(
        IOrderService orderService,
        IConsumerService consumerService,
        IReconciliationService reconciliationService,
        IPayProApiClient apiClient)
    {
        _orderService = orderService;
        _consumerService = consumerService;
        _reconciliationService = reconciliationService;
        _apiClient = apiClient;
    }

    /// <summary>
    /// Creates a PayPro order / invoice.
    /// </summary>
    [HttpPost("orders")]
    [Authorize]
    public async Task<IActionResult> CreateOrder([FromBody] CreatePayProOrderRequestDto dto)
    {
        if (dto == null || dto.Amount <= 0)
        {
            return BadRequest(new { message = "Valid order details and positive amount are required." });
        }

        var result = await _orderService.CreateOrderAsync(dto, HttpContext.RequestAborted);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Checks live order status from PayPro (proxying ggos/ggosboi).
    /// </summary>
    [HttpGet("orders/{orderNumber}/status")]
    [AllowAnonymous]
    public async Task<IActionResult> GetOrderStatus(string orderNumber)
    {
        if (string.IsNullOrWhiteSpace(orderNumber))
        {
            return BadRequest(new { message = "Order number is required." });
        }

        var statusResult = await _orderService.GetOrderStatusAsync(orderNumber, HttpContext.RequestAborted);
        return Ok(statusResult);
    }

    /// <summary>
    /// Administrative endpoint: Marks single or multiple orders as Paid in PayPro (moap).
    /// </summary>
    [HttpPost("orders/mark-paid")]
    [Authorize(Roles = "SuperAdmin,Admin,superadmin,admin")]
    public async Task<IActionResult> MarkOrdersAsPaid([FromBody] List<string> orderNumbers)
    {
        if (orderNumbers == null || orderNumbers.Count == 0)
        {
            return BadRequest(new { message = "At least one order number is required." });
        }

        var result = await _apiClient.MarkOrdersAsPaidAsync(orderNumbers, HttpContext.RequestAborted);
        return Ok(result);
    }

    /// <summary>
    /// Administrative endpoint: Marks single or multiple orders as Blocked in PayPro (moab).
    /// </summary>
    [HttpPost("orders/mark-blocked")]
    [Authorize(Roles = "SuperAdmin,Admin,superadmin,admin")]
    public async Task<IActionResult> MarkOrdersAsBlocked([FromBody] List<string> orderNumbers)
    {
        if (orderNumbers == null || orderNumbers.Count == 0)
        {
            return BadRequest(new { message = "At least one order number is required." });
        }

        var result = await _apiClient.MarkOrdersAsBlockedAsync(orderNumbers, HttpContext.RequestAborted);
        return Ok(result);
    }

    /// <summary>
    /// Administrative reporting view backed by PayPro Get-Paid-Orders (gpo) with pagination.
    /// </summary>
    [HttpGet("reports/paid-orders")]
    [Authorize(Roles = "SuperAdmin,Admin,superadmin,admin")]
    public async Task<IActionResult> GetPaidOrdersReport(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 15)
    {
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end = endDate ?? DateTime.UtcNow;

        var reportResult = await _apiClient.GetPaidOrdersAsync(start, end, HttpContext.RequestAborted);
        if (!reportResult.IsSuccess)
        {
            return BadRequest(new { message = reportResult.Description ?? "Failed to fetch paid orders report" });
        }

        var allItems = reportResult.PaidOrders;
        var totalItems = allItems.Count;
        var totalAmountPaid = allItems.Sum(o => o.AmountPaid);

        var pagedItems = allItems
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

        return Ok(new PaginatedPaidOrdersResponse(
            Items: pagedItems,
            PageNumber: pageNumber,
            PageSize: pageSize,
            TotalItems: totalItems,
            TotalPages: Math.Max(1, totalPages),
            TotalAmountPaid: totalAmountPaid
        ));
    }

    /// <summary>
    /// Lists all registered PayPro consumers with optional search.
    /// </summary>
    [HttpGet("consumers")]
    [Authorize(Roles = "SuperAdmin,Admin,superadmin,admin")]
    public async Task<IActionResult> GetConsumers([FromQuery] string? search)
    {
        var consumers = await _consumerService.GetAllConsumersAsync(search, HttpContext.RequestAborted);
        return Ok(consumers);
    }

    /// <summary>
    /// Creates a single PayPro consumer (ppro/cc).
    /// </summary>
    [HttpPost("consumers")]
    [Authorize(Roles = "SuperAdmin,Admin,superadmin,admin")]
    public async Task<IActionResult> CreateConsumer([FromBody] ConsumerRequestDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.ConsumerId) || string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "ConsumerID and Name are required." });
        }

        var result = await _consumerService.CreateConsumerAsync(dto, HttpContext.RequestAborted);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Creates multiple PayPro consumers in batch (ppro/cmc).
    /// </summary>
    [HttpPost("consumers/batch")]
    [Authorize(Roles = "SuperAdmin,Admin,superadmin,admin")]
    public async Task<IActionResult> CreateBatchConsumers([FromBody] BatchConsumersRequestDto dto)
    {
        if (dto?.Consumers == null || dto.Consumers.Count == 0)
        {
            return BadRequest(new { message = "At least one consumer is required in the batch." });
        }

        var result = await _consumerService.CreateMultipleConsumersAsync(dto.Consumers, HttpContext.RequestAborted);
        return Ok(result);
    }

    /// <summary>
    /// Updates an existing PayPro consumer (ppro/uc).
    /// </summary>
    [HttpPut("consumers/{consumerId}")]
    [Authorize(Roles = "SuperAdmin,Admin,superadmin,admin")]
    public async Task<IActionResult> UpdateConsumer(string consumerId, [FromBody] ConsumerRequestDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Consumer Name is required." });
        }

        var payload = dto with { ConsumerId = consumerId };
        var result = await _consumerService.UpdateConsumerAsync(payload, HttpContext.RequestAborted);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Manually triggers a reconciliation sweep.
    /// </summary>
    [HttpPost("reconcile")]
    [Authorize(Roles = "SuperAdmin,Admin,superadmin,admin")]
    public async Task<IActionResult> TriggerReconciliation([FromQuery] int? olderThanMinutes = null)
    {
        var summary = await _reconciliationService.ReconcilePendingOrdersAsync(olderThanMinutes, HttpContext.RequestAborted);
        return Ok(summary);
    }
}
