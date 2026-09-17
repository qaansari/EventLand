namespace EventLand.Modules.PayPro.Webhooks;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Dtos;
using EventLand.Modules.PayPro.Entities;
using EventLand.Modules.PayPro.Options;
using EventLand.Modules.PayPro.Persistence;
using EventLand.Modules.PayPro.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

[ApiController]
[Route("paypro")]
[AllowAnonymous]
[EnableRateLimiting("paypro-callback")]
public class PayProCallbackController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IPayProDbContext _dbContext;
    private readonly PayProOptions _options;
    private readonly ILogger<PayProCallbackController> _logger;

    public PayProCallbackController(
        IOrderService orderService,
        IPayProDbContext dbContext,
        IOptions<PayProOptions> options,
        ILogger<PayProCallbackController> logger)
    {
        _orderService = orderService;
        _dbContext = dbContext;
        _options = options.Value;
        _logger = logger;
    }

    private static bool SecureCompare(string? a, string? b)
    {
        if (a == null || b == null) return false;
        var bytesA = Encoding.UTF8.GetBytes(a);
        var bytesB = Encoding.UTF8.GetBytes(b);
        return CryptographicOperations.FixedTimeEquals(bytesA, bytesB);
    }

    private static string RedactPasswordInJson(string? rawJson, string actualPassword)
    {
        if (string.IsNullOrWhiteSpace(rawJson)) return "{}";
        if (string.IsNullOrWhiteSpace(actualPassword)) return rawJson;

        try
        {
            // Replace password value safely in raw json representation
            return Regex.Replace(
                rawJson,
                "\"password\"\\s*:\\s*\"[^\"]*\"",
                "\"password\":\"[REDACTED]\"",
                RegexOptions.IgnoreCase);
        }
        catch
        {
            return "{\"redacted\":true}";
        }
    }

    /// <summary>
    /// Official PayPro Inbound Webhook API (POST /paypro/uis).
    /// PayPro calls this endpoint whenever payments occur via Banking channel / 1Link / OTC / Card.
    /// </summary>
    [HttpPost("uis")]
    [Consumes("application/json")]
    [Produces("application/json")]
    public async Task<IActionResult> HandlePayProCallback(
        [FromBody] PayProCallbackRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        var ct = HttpContext?.RequestAborted ?? cancellationToken;
        var receivedAt = DateTime.UtcNow;
        var responseItems = new List<PayProCallbackResponseItem>();
        bool isSuccess = false;

        // 1. Basic payload validation
        if (dto == null || string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
        {
            _logger.LogWarning("PayPro callback rejected: missing or empty credentials in payload.");
            responseItems.Add(new PayProCallbackResponseItem("01", "", "Invalid Data: username and password cannot be empty"));
            await LogCallbackAsync("{\"error\":\"empty_credentials\"}", responseItems, false, receivedAt, ct);
            return Ok(responseItems);
        }

        // 2. Constant-time credential authentication
        var isUsernameValid = SecureCompare(dto.Username, _options.Username);
        var isPasswordValid = SecureCompare(dto.Password, _options.Password);

        if (!isUsernameValid || !isPasswordValid)
        {
            _logger.LogWarning("PayPro callback unauthorized: username or password mismatch.");
            responseItems.Add(new PayProCallbackResponseItem("02", "", "User not authorized / service failure"));
            var sanitizedBody = RedactPasswordInJson(JsonSerializer.Serialize(dto), dto.Password);
            await LogCallbackAsync(sanitizedBody, responseItems, false, receivedAt, ct);
            return Ok(responseItems);
        }

        // 3. Parse invoice IDs
        if (string.IsNullOrWhiteSpace(dto.CsvInvoiceIds))
        {
            _logger.LogWarning("PayPro callback: empty csvinvoiceids.");
            responseItems.Add(new PayProCallbackResponseItem("01", "", "Invalid Data: csvinvoiceids is required"));
            var sanitizedBody = RedactPasswordInJson(JsonSerializer.Serialize(dto), dto.Password);
            await LogCallbackAsync(sanitizedBody, responseItems, false, receivedAt, ct);
            return Ok(responseItems);
        }

        var invoiceIds = dto.CsvInvoiceIds
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (invoiceIds.Count == 0)
        {
            responseItems.Add(new PayProCallbackResponseItem("01", "", "Invalid Data: no valid invoice IDs parsed"));
            var sanitizedBody = RedactPasswordInJson(JsonSerializer.Serialize(dto), dto.Password);
            await LogCallbackAsync(sanitizedBody, responseItems, false, receivedAt, ct);
            return Ok(responseItems);
        }

        // 4. Process each invoice ID idempotently
        isSuccess = true;
        foreach (var invoiceId in invoiceIds)
        {
            try
            {
                var existingOrder = await _orderService.GetOrderByNumberAsync(invoiceId, ct);
                if (existingOrder == null)
                {
                    _logger.LogWarning("PayPro callback: Invoice {InvoiceId} not found in database.", invoiceId);
                    responseItems.Add(new PayProCallbackResponseItem("03", invoiceId, "No records found for that invoice"));
                    continue;
                }

                // If already paid, report success idempotently
                if (existingOrder.Status == OrderStatus.Paid)
                {
                    _logger.LogInformation("PayPro callback: Invoice {InvoiceId} is already marked as Paid (idempotent replay).", invoiceId);
                    responseItems.Add(new PayProCallbackResponseItem("00", invoiceId, "Invoice already marked as paid"));
                    continue;
                }

                // Mark order as paid
                var marked = await _orderService.MarkOrderPaidAsync(
                    orderNumber: invoiceId,
                    amountPaid: existingOrder.Amount,
                    paymentMode: "PayPro_Callback",
                    datePaid: DateTime.UtcNow,
                    cancellationToken: ct);

                if (marked)
                {
                    _logger.LogInformation("PayPro callback: Successfully marked Invoice {InvoiceId} as Paid.", invoiceId);
                    responseItems.Add(new PayProCallbackResponseItem("00", invoiceId, "Invoice successfully marked as paid"));
                }
                else
                {
                    isSuccess = false;
                    responseItems.Add(new PayProCallbackResponseItem("02", invoiceId, "Service failure processing payment"));
                }
            }
            catch (Exception ex)
            {
                isSuccess = false;
                _logger.LogError(ex, "Exception processing callback for Invoice {InvoiceId}", invoiceId);
                responseItems.Add(new PayProCallbackResponseItem("02", invoiceId, "Service failure processing invoice"));
            }
        }

        // 5. Redact password and log callback to PayProCallbackLogs table
        var rawPayloadString = JsonSerializer.Serialize(dto);
        var safePayloadString = RedactPasswordInJson(rawPayloadString, dto.Password);
        await LogCallbackAsync(safePayloadString, responseItems, isSuccess, receivedAt, ct);

        // Always return 200 OK with the array of status items as expected by PayPro
        return Ok(responseItems);
    }

    private async Task LogCallbackAsync(
        string safeRequestBody,
        IEnumerable<PayProCallbackResponseItem> responseItems,
        bool success,
        DateTime receivedAt,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var log = new PayProCallbackLog
            {
                ReceivedAtUtc = receivedAt,
                RequestBody = safeRequestBody,
                ResponseBody = JsonSerializer.Serialize(responseItems),
                Success = success
            };

            _dbContext.PayProCallbackLogs.Add(log);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist PayProCallbackLog");
        }
    }
}
