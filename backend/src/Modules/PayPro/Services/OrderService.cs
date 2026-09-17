namespace EventLand.Modules.PayPro.Services;

using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Client;
using EventLand.Modules.PayPro.Dtos;
using EventLand.Modules.PayPro.Entities;
using EventLand.Modules.PayPro.Options;
using EventLand.Modules.PayPro.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public class OrderService : IOrderService
{
    private readonly IPayProApiClient _apiClient;
    private readonly IPayProDbContext _dbContext;
    private readonly IPayProOrderPaidHandler _paidHandler;
    private readonly PayProOptions _options;
    private readonly ILogger<OrderService> _logger;

    public OrderService(
        IPayProApiClient apiClient,
        IPayProDbContext dbContext,
        IPayProOrderPaidHandler paidHandler,
        IOptions<PayProOptions> options,
        ILogger<OrderService> logger)
    {
        _apiClient = apiClient;
        _dbContext = dbContext;
        _paidHandler = paidHandler;
        _options = options.Value;
        _logger = logger;
    }

    private string AppendCallbackUrl(string? click2PayUrl, string? returnUrl)
    {
        if (string.IsNullOrWhiteSpace(click2PayUrl)) return string.Empty;
        var targetReturnUrl = !string.IsNullOrWhiteSpace(returnUrl) ? returnUrl : _options.ReturnUrl;
        if (string.IsNullOrWhiteSpace(targetReturnUrl)) return click2PayUrl;

        var separator = click2PayUrl.Contains('?') ? "&" : "?";
        return $"{click2PayUrl}{separator}callback_url={Uri.EscapeDataString(targetReturnUrl)}";
    }

    public async Task<CreatePayProOrderResponseDto> CreateOrderAsync(
        CreatePayProOrderRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var orderNumber = !string.IsNullOrWhiteSpace(request.OrderNumber)
            ? request.OrderNumber.Trim()
            : (!string.IsNullOrWhiteSpace(request.BookingRef) ? request.BookingRef.Trim() : $"ORD-{Guid.NewGuid():N}"[..18]);

        // 1. Check if order with that number already exists locally (Idempotency)
        var existingOrder = await _dbContext.Orders
            .Include(o => o.Consumer)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, cancellationToken);

        if (existingOrder != null)
        {
            if (existingOrder.Status == OrderStatus.Paid)
            {
                return new CreatePayProOrderResponseDto(
                    Success: true,
                    OrderNumber: existingOrder.OrderNumber,
                    PayProId: existingOrder.PayProId,
                    Click2PayUrl: existingOrder.Click2PayUrl,
                    BillUrl: existingOrder.BillUrl,
                    Amount: existingOrder.Amount,
                    Status: "Paid",
                    Message: "Order is already marked as paid."
                );
            }

            if (!string.IsNullOrWhiteSpace(existingOrder.Click2PayUrl) || !string.IsNullOrWhiteSpace(existingOrder.PayProId))
            {
                _logger.LogInformation("Reusing existing PayPro order {OrderNumber} (PayProId {PayProId})",
                    orderNumber, existingOrder.PayProId);

                return new CreatePayProOrderResponseDto(
                    Success: true,
                    OrderNumber: existingOrder.OrderNumber,
                    PayProId: existingOrder.PayProId,
                    Click2PayUrl: existingOrder.Click2PayUrl,
                    BillUrl: existingOrder.BillUrl,
                    Amount: existingOrder.Amount,
                    Status: existingOrder.Status.ToString(),
                    Message: "Active PayPro order session reused."
                );
            }

            // If existing order has no PayProId, check PayPro via ggos before attempting creation to avoid duplicate remote invoices
            var statusCheck = await _apiClient.GetGeneralOrderStatusAsync(orderNumber: orderNumber, cancellationToken: cancellationToken);
            if (statusCheck.IsSuccess && !string.IsNullOrWhiteSpace(statusCheck.PayProId))
            {
                existingOrder.PayProId = statusCheck.PayProId;
                existingOrder.Status = statusCheck.IsPaid ? OrderStatus.Paid : OrderStatus.Unpaid;
                existingOrder.UpdatedAtUtc = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);

                return new CreatePayProOrderResponseDto(
                    Success: true,
                    OrderNumber: existingOrder.OrderNumber,
                    PayProId: existingOrder.PayProId,
                    Click2PayUrl: existingOrder.Click2PayUrl,
                    BillUrl: existingOrder.BillUrl,
                    Amount: existingOrder.Amount,
                    Status: existingOrder.Status.ToString(),
                    Message: "Reconciled existing remote order session."
                );
            }
        }

        // 2. Resolve or find Consumer if provided
        int? consumerDbId = null;
        if (!string.IsNullOrWhiteSpace(request.ConsumerId))
        {
            var consumer = await _dbContext.Consumers
                .FirstOrDefaultAsync(c => c.ConsumerId == request.ConsumerId, cancellationToken);
            consumerDbId = consumer?.Id;
        }

        // 3. Call PayPro API to create order
        var orderInput = new PayProOrderInput(
            OrderNumber: orderNumber,
            Amount: request.Amount,
            CustomerName: request.CustomerName,
            CustomerMobile: request.CustomerMobile,
            CustomerEmail: request.CustomerEmail,
            CustomerAddress: "",
            DueDate: request.DueDate ?? DateTime.UtcNow.AddMinutes(30),
            IssueDate: DateTime.UtcNow,
            ExpireAfterSeconds: 0,
            ReusableConsumerId: request.ConsumerId
        );

        var createResult = await _apiClient.CreateOrderAsync(orderInput, cancellationToken);

        if (!createResult.IsSuccess)
        {
            _logger.LogWarning("Failed to create PayPro order {OrderNumber}: {Desc}", orderNumber, createResult.Description);
            return new CreatePayProOrderResponseDto(
                Success: false,
                OrderNumber: orderNumber,
                PayProId: null,
                Click2PayUrl: null,
                BillUrl: null,
                Amount: request.Amount,
                Status: "Failed",
                Message: createResult.Description ?? "PayPro order creation failed."
            );
        }

        // Append callback_url to Click2PayUrl for card payments
        var finalClick2Pay = AppendCallbackUrl(createResult.Click2PayUrl, request.ReturnUrl);

        // 4. Persist to database
        if (existingOrder == null)
        {
            existingOrder = new Order
            {
                OrderNumber = orderNumber,
                PayProId = createResult.PayProId,
                ConsumerId = consumerDbId,
                Amount = request.Amount,
                Status = OrderStatus.Unpaid,
                IssueDate = DateTime.UtcNow.Date,
                DueDate = (request.DueDate ?? DateTime.UtcNow.AddMinutes(30)).Date,
                Click2PayUrl = finalClick2Pay,
                BillUrl = createResult.BillUrl,
                RawCreateResponse = createResult.RawResponseJson,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };
            _dbContext.Orders.Add(existingOrder);
        }
        else
        {
            existingOrder.PayProId = createResult.PayProId;
            existingOrder.Click2PayUrl = finalClick2Pay;
            existingOrder.BillUrl = createResult.BillUrl;
            existingOrder.RawCreateResponse = createResult.RawResponseJson;
            existingOrder.Status = OrderStatus.Unpaid;
            existingOrder.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new CreatePayProOrderResponseDto(
            Success: true,
            OrderNumber: orderNumber,
            PayProId: createResult.PayProId,
            Click2PayUrl: finalClick2Pay,
            BillUrl: createResult.BillUrl,
            Amount: request.Amount,
            Status: "Unpaid",
            Message: "Order created successfully."
        );
    }

    public async Task<PayProOrderStatusResult> GetOrderStatusAsync(
        string orderNumber,
        CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, cancellationToken);

        var queryResult = await _apiClient.GetGeneralOrderStatusAsync(
            orderNumber: orderNumber,
            cpayId: order?.PayProId,
            cancellationToken: cancellationToken);

        if (order != null && queryResult.IsSuccess)
        {
            bool changed = false;

            if (queryResult.IsPaid && order.Status != OrderStatus.Paid)
            {
                order.Status = OrderStatus.Paid;
                order.AmountPaid = queryResult.AmountPaid > 0 ? queryResult.AmountPaid : order.Amount;
                order.PaymentMode = queryResult.PaymentVia;
                order.DatePaid = queryResult.DatePaid ?? DateTime.UtcNow;
                order.UpdatedAtUtc = DateTime.UtcNow;
                changed = true;

                await _paidHandler.OnOrderPaidAsync(order, cancellationToken);
            }
            else if (queryResult.IsBlocked && order.Status != OrderStatus.Blocked)
            {
                order.Status = OrderStatus.Blocked;
                order.UpdatedAtUtc = DateTime.UtcNow;
                changed = true;
            }

            if (!string.IsNullOrWhiteSpace(queryResult.PayProId) && order.PayProId != queryResult.PayProId)
            {
                order.PayProId = queryResult.PayProId;
                changed = true;
            }

            if (changed)
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        return queryResult;
    }

    public async Task<bool> MarkOrderPaidAsync(
        string orderNumber,
        decimal? amountPaid = null,
        string? paymentMode = null,
        DateTime? datePaid = null,
        CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, cancellationToken);

        if (order == null)
        {
            _logger.LogWarning("MarkOrderPaidAsync: Order {OrderNumber} not found in DB.", orderNumber);
            return false;
        }

        // Idempotency: if already paid, return true without double-applying side effects
        if (order.Status == OrderStatus.Paid)
        {
            _logger.LogInformation("MarkOrderPaidAsync: Order {OrderNumber} is already marked as Paid.", orderNumber);
            return true;
        }

        order.Status = OrderStatus.Paid;
        order.AmountPaid = amountPaid ?? order.Amount;
        order.PaymentMode = paymentMode ?? order.PaymentMode ?? "PayPro";
        order.DatePaid = datePaid ?? DateTime.UtcNow;
        order.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            await _paidHandler.OnOrderPaidAsync(order, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing OnOrderPaidAsync handler for Order {OrderNumber}", orderNumber);
        }

        return true;
    }

    public async Task<Order?> GetOrderByNumberAsync(
        string orderNumber,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Orders
            .Include(o => o.Consumer)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, cancellationToken);
    }
}
