namespace EventLand.Infrastructure.Services;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Application.Common.Models;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

/// <summary>
/// Production-ready PayPro API V2 client adhering to the official Postman collection contract.
/// Communicates with Demo (http://demoapi.paypro.com.pk/) or Live endpoints.
/// </summary>
public class PayProClient : IPayProClient
{
    private const string TokenCacheKey = "PayPro_V2_Auth_Token";
    private readonly HttpClient _httpClient;
    private readonly PayProOptions _options;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<PayProClient> _logger;

    public PayProClient(
        HttpClient httpClient,
        IOptions<PayProOptions> options,
        IMemoryCache memoryCache,
        ILogger<PayProClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _memoryCache = memoryCache;
        _logger = logger;

        _httpClient.Timeout = TimeSpan.FromSeconds(15);
    }

    /// <inheritdoc />
    public async Task<string?> GetAuthTokenAsync(CancellationToken cancellationToken = default)
    {
        if (_memoryCache.TryGetValue(TokenCacheKey, out string? cachedToken) && !string.IsNullOrWhiteSpace(cachedToken))
        {
            return cachedToken;
        }

        var (isValid, missingKeys) = _options.Validate();
        if (!isValid)
        {
            _logger.LogWarning("PayPro V2 authentication skipped: configuration is incomplete [{MissingKeys}].", string.Join(", ", missingKeys));
            return null;
        }

        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var authUrl = $"{baseUrl}/v2/ppro/auth";

        var payload = new
        {
            clientid = _options.ClientId,
            clientsecret = _options.ClientSecret
        };

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, authUrl)
            {
                Content = JsonContent.Create(payload)
            };

            var response = await _httpClient.SendAsync(request, cancellationToken);
            string? token = null;

            // 1. Check response headers ("token" or "Token")
            if (response.Headers.TryGetValues("token", out var tokenVals))
            {
                token = tokenVals.FirstOrDefault();
            }
            else if (response.Headers.TryGetValues("Token", out var capTokenVals))
            {
                token = capTokenVals.FirstOrDefault();
            }

            // 2. Check JSON response body if token wasn't in header
            if (string.IsNullOrWhiteSpace(token) && response.IsSuccessStatusCode)
            {
                try
                {
                    var doc = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
                    if (doc.TryGetProperty("token", out var tProp) || doc.TryGetProperty("Token", out tProp))
                    {
                        token = tProp.GetString();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Could not parse PayPro auth body as JSON.");
                }
            }

            if (!string.IsNullOrWhiteSpace(token))
            {
                // Cache valid token for 55 minutes
                _memoryCache.Set(TokenCacheKey, token, TimeSpan.FromMinutes(55));
                _logger.LogInformation("Successfully acquired PayPro V2 session token (Cached for 55 minutes).");
                return token;
            }

            _logger.LogWarning("PayPro V2 auth endpoint returned HTTP {StatusCode} without a token.", (int)response.StatusCode);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while calling PayPro V2 auth endpoint: {Message}", ex.Message);
            return null;
        }
    }

    /// <inheritdoc />
    public async Task<PayProCreateOrderResult> CreateOrderAsync(
        string orderNumber,
        decimal amount,
        string customerName,
        string customerEmail,
        string customerPhone,
        DateTimeOffset? dueDate,
        CancellationToken cancellationToken = default)
    {
        var token = await GetAuthTokenAsync(cancellationToken);
        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var orderUrl = $"{baseUrl}/v2/ppro/co";

        var issueDateStr = DateTime.UtcNow.ToString("dd/MM/yyyy");
        var dueDateStr = (dueDate?.UtcDateTime ?? DateTime.UtcNow.AddMinutes(30)).ToString("dd/MM/yyyy");

        // Format phone to 03XXXXXXXXX if Pakistani format or pass empty if non-standard
        var cleanPhone = (customerPhone ?? "").Trim().Replace("+92", "0").Replace("-", "").Replace(" ", "");
        if (!cleanPhone.StartsWith("03") || cleanPhone.Length != 11)
        {
            cleanPhone = "";
        }

        // Exact V2 Request Structure: Array of 2 JSON objects
        var payload = new object[]
        {
            new { MerchantId = _options.Username },
            new
            {
                OrderNumber = orderNumber,
                OrderAmount = amount.ToString("0.00"),
                OrderDueDate = dueDateStr,
                OrderType = "Service",
                IssueDate = issueDateStr,
                OrderExpireAfterSeconds = "0",
                CustomerName = string.IsNullOrWhiteSpace(customerName) ? "Customer" : customerName.Trim(),
                CustomerMobile = cleanPhone,
                CustomerEmail = customerEmail ?? "",
                CustomerAddress = ""
            }
        };

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, orderUrl)
            {
                Content = JsonContent.Create(payload)
            };

            if (!string.IsNullOrWhiteSpace(token))
            {
                request.Headers.Add("token", token);
            }

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var contentString = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("PayPro V2 create order HTTP {StatusCode}: {Response}", (int)response.StatusCode, contentString);
                return new PayProCreateOrderResult(
                    IsSuccess: false,
                    Status: "HTTP_ERROR",
                    OrderNumber: orderNumber,
                    PayProId: null,
                    ConnectPayId: null,
                    Click2PayUrl: null,
                    BillUrl: null,
                    OrderAmount: amount,
                    Description: $"PayPro API error (HTTP {response.StatusCode})"
                );
            }

            // Parse response: Expected array [ { "Status": "00" }, { "Click2Pay": "...", ... } ]
            using var doc = JsonDocument.Parse(contentString);
            if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
            {
                var first = doc.RootElement[0];
                var status = first.TryGetProperty("Status", out var sProp) ? sProp.GetString() ?? "" : "";

                if (status == "00" && doc.RootElement.GetArrayLength() > 1)
                {
                    var second = doc.RootElement[1];
                    var click2Pay = second.TryGetProperty("Click2Pay", out var c2p) ? c2p.GetString() : null;
                    var payProId = second.TryGetProperty("PayProId", out var ppi) ? ppi.GetString() : null;
                    var connectPayId = second.TryGetProperty("ConnectPayId", out var cpi) ? cpi.GetString() : null;
                    var billUrl = second.TryGetProperty("BillUrl", out var bu) ? bu.GetString() : null;
                    var desc = second.TryGetProperty("Description", out var d) ? d.GetString() : null;

                    return new PayProCreateOrderResult(
                        IsSuccess: true,
                        Status: "00",
                        OrderNumber: orderNumber,
                        PayProId: payProId ?? connectPayId,
                        ConnectPayId: connectPayId ?? payProId,
                        Click2PayUrl: click2Pay,
                        BillUrl: billUrl,
                        OrderAmount: amount,
                        Description: desc ?? "Order created successfully"
                    );
                }

                var failDesc = doc.RootElement.GetArrayLength() > 1 && doc.RootElement[1].TryGetProperty("Description", out var fd)
                    ? fd.GetString()
                    : $"Status {status}";

                return new PayProCreateOrderResult(
                    IsSuccess: false,
                    Status: status,
                    OrderNumber: orderNumber,
                    PayProId: null,
                    ConnectPayId: null,
                    Click2PayUrl: null,
                    BillUrl: null,
                    OrderAmount: amount,
                    Description: failDesc
                );
            }

            return new PayProCreateOrderResult(
                IsSuccess: false,
                Status: "INVALID_RESPONSE",
                OrderNumber: orderNumber,
                PayProId: null,
                ConnectPayId: null,
                Click2PayUrl: null,
                BillUrl: null,
                OrderAmount: amount,
                Description: "Unexpected response format from PayPro"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call PayPro V2 create order: {Message}", ex.Message);
            return new PayProCreateOrderResult(
                IsSuccess: false,
                Status: "EXCEPTION",
                OrderNumber: orderNumber,
                PayProId: null,
                ConnectPayId: null,
                Click2PayUrl: null,
                BillUrl: null,
                OrderAmount: amount,
                Description: ex.Message
            );
        }
    }

    /// <inheritdoc />
    public async Task<PayProOrderStatusResult> QueryOrderStatusAsync(
        string orderNumber,
        string? payProId = null,
        CancellationToken cancellationToken = default)
    {
        var token = await GetAuthTokenAsync(cancellationToken);
        var baseUrl = _options.BaseUrl.TrimEnd('/');

        // 1. First attempt: Query by Order_Id using POST /v2/ppro/ggosboi
        try
        {
            var ggosboiUrl = $"{baseUrl}/v2/ppro/ggosboi";
            var payload = new
            {
                userName = _options.Username,
                Order_Id = orderNumber
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, ggosboiUrl)
            {
                Content = JsonContent.Create(payload)
            };

            if (!string.IsNullOrWhiteSpace(token))
            {
                request.Headers.Add("token", token);
            }

            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
                using var doc = JsonDocument.Parse(contentString);

                if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
                {
                    var first = doc.RootElement[0];
                    var status = first.TryGetProperty("Status", out var sProp) ? sProp.GetString() ?? "" : "";

                    if (status == "00" && doc.RootElement.GetArrayLength() > 1)
                    {
                        var second = doc.RootElement[1];
                        var orderStatus = second.TryGetProperty("OrderStatus", out var os) ? os.GetString() ?? "" : "";
                        var amtPaid = second.TryGetProperty("OrderAmountPaid", out var ap) && ap.TryGetDecimal(out var pVal) ? pVal : 0m;
                        var amtPayable = second.TryGetProperty("AmountPayable", out var ay) && ay.TryGetDecimal(out var pyVal) ? pyVal : 0m;
                        var datePaidStr = second.TryGetProperty("DatePaid", out var dp) ? dp.GetString() : null;
                        DateTimeOffset? datePaid = DateTimeOffset.TryParse(datePaidStr, out var parsedDate) ? parsedDate : null;

                        return new PayProOrderStatusResult(
                            IsSuccess: true,
                            Status: orderStatus.ToUpperInvariant(),
                            AmountPaid: amtPaid,
                            AmountPayable: amtPayable,
                            OrderNumber: orderNumber,
                            PayProId: payProId,
                            DatePaid: datePaid,
                            Description: "Status retrieved via ggosboi"
                        );
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("PayPro ggosboi status query failed: {Message}. Attempting ggos fallback.", ex.Message);
        }

        // 2. Fallback: Query by cpayId using GET/POST /v2/ppro/ggos if payProId is present
        if (!string.IsNullOrWhiteSpace(payProId))
        {
            try
            {
                var ggosUrl = $"{baseUrl}/v2/ppro/ggos";
                var ggosPayload = new
                {
                    userName = _options.Username,
                    cpayId = payProId
                };

                using var request = new HttpRequestMessage(HttpMethod.Post, ggosUrl)
                {
                    Content = JsonContent.Create(ggosPayload)
                };

                if (!string.IsNullOrWhiteSpace(token))
                {
                    request.Headers.Add("token", token);
                }

                var response = await _httpClient.SendAsync(request, cancellationToken);
                if (response.IsSuccessStatusCode)
                {
                    var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
                    using var doc = JsonDocument.Parse(contentString);

                    if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
                    {
                        var first = doc.RootElement[0];
                        var status = first.TryGetProperty("Status", out var sProp) ? sProp.GetString() ?? "" : "";

                        if (status == "00" && doc.RootElement.GetArrayLength() > 1)
                        {
                            var second = doc.RootElement[1];
                            var orderStatus = second.TryGetProperty("OrderStatus", out var os) ? os.GetString() ?? "" : "";
                            var amtPaid = second.TryGetProperty("OrderAmountPaid", out var ap) && ap.TryGetDecimal(out var pVal) ? pVal : 0m;
                            var amtPayable = second.TryGetProperty("AmountPayable", out var ay) && ay.TryGetDecimal(out var pyVal) ? pyVal : 0m;
                            var datePaidStr = second.TryGetProperty("DatePaid", out var dp) ? dp.GetString() : null;
                            DateTimeOffset? datePaid = DateTimeOffset.TryParse(datePaidStr, out var parsedDate) ? parsedDate : null;

                            return new PayProOrderStatusResult(
                                IsSuccess: true,
                                Status: orderStatus.ToUpperInvariant(),
                                AmountPaid: amtPaid,
                                AmountPayable: amtPayable,
                                OrderNumber: orderNumber,
                                PayProId: payProId,
                                DatePaid: datePaid,
                                Description: "Status retrieved via ggos"
                            );
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("PayPro ggos status query failed: {Message}", ex.Message);
            }
        }

        return new PayProOrderStatusResult(
            IsSuccess: false,
            Status: "UNKNOWN",
            AmountPaid: 0,
            AmountPayable: 0,
            OrderNumber: orderNumber,
            PayProId: payProId,
            DatePaid: null,
            Description: "Unable to determine order status from PayPro V2"
        );
    }
}
