namespace EventLand.Modules.PayPro.Client;

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Dtos;
using EventLand.Modules.PayPro.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

/// <summary>
/// Production implementation of PayPro API V2 client.
/// Manages token authorization, retries on 401, formats payloads according to official specifications,
/// and securely communicates with PayPro.
/// </summary>
public class PayProApiClient : IPayProApiClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null,
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _httpClient;
    private readonly IPayProAuthTokenProvider _tokenProvider;
    private readonly PayProOptions _options;
    private readonly ILogger<PayProApiClient> _logger;

    public PayProApiClient(
        HttpClient httpClient,
        IPayProAuthTokenProvider tokenProvider,
        IOptions<PayProOptions> options,
        ILogger<PayProApiClient> logger)
    {
        _httpClient = httpClient;
        _tokenProvider = tokenProvider;
        _options = options.Value;
        _logger = logger;

        if (_httpClient.Timeout == TimeSpan.FromSeconds(100))
        {
            _httpClient.Timeout = TimeSpan.FromSeconds(15);
        }
    }

    private string CleanPakistaniPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        var clean = phone.Trim().Replace("+92", "0").Replace("-", "").Replace(" ", "");
        return (clean.StartsWith("03") && clean.Length == 11) ? clean : string.Empty;
    }

    private object MapOrderToPayload(PayProOrderInput order)
    {
        var issueDateStr = (order.IssueDate ?? DateTime.UtcNow).ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
        var dueDateStr = (order.DueDate ?? DateTime.UtcNow.AddMinutes(30)).ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

        var dict = new Dictionary<string, object?>
        {
            ["OrderNumber"] = order.OrderNumber,
            ["OrderAmount"] = order.Amount.ToString("0.00", CultureInfo.InvariantCulture),
            ["OrderDueDate"] = dueDateStr,
            ["OrderType"] = "Service",
            ["IssueDate"] = issueDateStr,
            ["OrderExpireAfterSeconds"] = order.ExpireAfterSeconds.ToString(),
            ["CustomerName"] = string.IsNullOrWhiteSpace(order.CustomerName) ? "Customer" : order.CustomerName.Trim(),
            ["CustomerMobile"] = CleanPakistaniPhone(order.CustomerMobile),
            ["CustomerEmail"] = order.CustomerEmail?.Trim() ?? string.Empty,
            ["CustomerAddress"] = order.CustomerAddress?.Trim() ?? string.Empty
        };

        if (!string.IsNullOrWhiteSpace(order.ReusableConsumerId))
        {
            dict["ReusableConsumerId"] = order.ReusableConsumerId;
        }

        return dict;
    }

    private async Task<HttpResponseMessage> SendWithAuthRetryAsync(
        Func<string, HttpRequestMessage> requestFactory,
        CancellationToken cancellationToken)
    {
        var token = await _tokenProvider.GetTokenAsync(false, cancellationToken);
        var request = requestFactory(token);

        var response = await _httpClient.SendAsync(request, cancellationToken);

        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            _logger.LogWarning("Received 401 Unauthorized from PayPro. Forcing token refresh and retrying once.");
            _tokenProvider.InvalidateToken();
            var freshToken = await _tokenProvider.GetTokenAsync(true, cancellationToken);

            var retryRequest = requestFactory(freshToken);
            return await _httpClient.SendAsync(retryRequest, cancellationToken);
        }

        return response;
    }

    /// <inheritdoc />
    public async Task<PayProAuthResult> AuthenticateAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var token = await _tokenProvider.GetTokenAsync(false, cancellationToken);
            return new PayProAuthResult(true, token, 1440, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to authenticate with PayPro: {Message}", ex.Message);
            return new PayProAuthResult(false, null, 0, ex.Message);
        }
    }

    /// <inheritdoc />
    public async Task<PayProCreateOrderResult> CreateOrderAsync(
        PayProOrderInput order,
        CancellationToken cancellationToken = default)
    {
        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var url = $"{baseUrl}/v2/ppro/co";

        var payload = new object[]
        {
            new { MerchantId = _options.Username },
            MapOrderToPayload(order)
        };

        var response = await SendWithAuthRetryAsync(token =>
        {
            var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(payload, options: JsonOptions)
            };
            if (!string.IsNullOrWhiteSpace(token)) req.Headers.Add("Token", token);
            return req;
        }, cancellationToken);

        var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogInformation("PayPro create order response: HTTP {Status} for Order {OrderNumber}",
            (int)response.StatusCode, order.OrderNumber);

        if (!response.IsSuccessStatusCode)
        {
            return new PayProCreateOrderResult(
                IsSuccess: false,
                Status: $"HTTP_{response.StatusCode}",
                OrderNumber: order.OrderNumber,
                PayProId: null,
                ConnectPayId: null,
                Click2PayUrl: null,
                BillUrl: null,
                Amount: order.Amount,
                Description: $"PayPro returned HTTP {response.StatusCode}",
                RawResponseJson: contentString
            );
        }

        try
        {
            using var doc = JsonDocument.Parse(contentString);
            if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
            {
                var statusObj = doc.RootElement[0];
                var status = statusObj.TryGetProperty("Status", out var sProp) ? sProp.GetString() ?? "" : "";

                if (status == "00" && doc.RootElement.GetArrayLength() > 1)
                {
                    var dataObj = doc.RootElement[1];
                    var click2Pay = dataObj.TryGetProperty("Click2Pay", out var c2p) ? c2p.GetString() : null;
                    var payProId = dataObj.TryGetProperty("PayProId", out var ppi) ? ppi.GetString() : null;
                    var connectPayId = dataObj.TryGetProperty("ConnectPayId", out var cpi) ? cpi.GetString() : null;
                    var billUrl = dataObj.TryGetProperty("BillUrl", out var bu) ? bu.GetString() : null;
                    var desc = dataObj.TryGetProperty("Description", out var d) ? d.GetString() : null;

                    return new PayProCreateOrderResult(
                        IsSuccess: true,
                        Status: status,
                        OrderNumber: order.OrderNumber,
                        PayProId: payProId ?? connectPayId,
                        ConnectPayId: connectPayId ?? payProId,
                        Click2PayUrl: click2Pay,
                        BillUrl: billUrl,
                        Amount: order.Amount,
                        Description: desc ?? "Order created successfully",
                        RawResponseJson: contentString
                    );
                }

                var failDesc = doc.RootElement.GetArrayLength() > 1 && doc.RootElement[1].TryGetProperty("Description", out var fd)
                    ? fd.GetString()
                    : PayProApiException.MapStatusDescription(status);

                return new PayProCreateOrderResult(
                    IsSuccess: false,
                    Status: status,
                    OrderNumber: order.OrderNumber,
                    PayProId: null,
                    ConnectPayId: null,
                    Click2PayUrl: null,
                    BillUrl: null,
                    Amount: order.Amount,
                    Description: failDesc,
                    RawResponseJson: contentString
                );
            }
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse PayPro create order response JSON");
        }

        return new PayProCreateOrderResult(
            IsSuccess: false,
            Status: "INVALID_RESPONSE",
            OrderNumber: order.OrderNumber,
            PayProId: null,
            ConnectPayId: null,
            Click2PayUrl: null,
            BillUrl: null,
            Amount: order.Amount,
            Description: "Unexpected response shape from PayPro",
            RawResponseJson: contentString
        );
    }

    /// <inheritdoc />
    public async Task<PayProBatchOrderResult> CreateMultipleOrdersAsync(
        IEnumerable<PayProOrderInput> orders,
        CancellationToken cancellationToken = default)
    {
        var orderList = orders.ToList();
        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var url = $"{baseUrl}/v2/ppro/cmo";

        var payload = new List<object>
        {
            new { MerchantId = _options.Username }
        };
        payload.AddRange(orderList.Select(MapOrderToPayload));

        var response = await SendWithAuthRetryAsync(token =>
        {
            var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(payload, options: JsonOptions)
            };
            if (!string.IsNullOrWhiteSpace(token)) req.Headers.Add("Token", token);
            return req;
        }, cancellationToken);

        var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
        var parsedOrders = new List<PayProCreateOrderResult>();

        try
        {
            using var doc = JsonDocument.Parse(contentString);
            if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
            {
                var statusObj = doc.RootElement[0];
                var status = statusObj.TryGetProperty("Status", out var sProp) ? sProp.GetString() ?? "" : "";

                for (int i = 1; i < doc.RootElement.GetArrayLength(); i++)
                {
                    var item = doc.RootElement[i];
                    var ordNum = item.TryGetProperty("OrderNumber", out var on) ? on.GetString() ?? "" : "";
                    var click2Pay = item.TryGetProperty("Click2Pay", out var c2p) ? c2p.GetString() : null;
                    var payProId = item.TryGetProperty("PayProId", out var ppi) ? ppi.GetString() : null;
                    var connectPayId = item.TryGetProperty("ConnectPayId", out var cpi) ? cpi.GetString() : null;
                    var billUrl = item.TryGetProperty("BillUrl", out var bu) ? bu.GetString() : null;
                    var desc = item.TryGetProperty("Description", out var d) ? d.GetString() : null;
                    var amt = item.TryGetProperty("OrderAmount", out var oa) && decimal.TryParse(oa.GetString(), out var a) ? a : 0m;

                    parsedOrders.Add(new PayProCreateOrderResult(
                        IsSuccess: status == "00",
                        Status: status,
                        OrderNumber: ordNum,
                        PayProId: payProId ?? connectPayId,
                        ConnectPayId: connectPayId ?? payProId,
                        Click2PayUrl: click2Pay,
                        BillUrl: billUrl,
                        Amount: amt,
                        Description: desc,
                        RawResponseJson: item.GetRawText()
                    ));
                }

                return new PayProBatchOrderResult(
                    IsOverallSuccess: status == "00",
                    Status: status,
                    Orders: parsedOrders,
                    Description: status == "00" ? "Batch orders processed" : PayProApiException.MapStatusDescription(status),
                    RawResponseJson: contentString
                );
            }
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse PayPro batch orders response");
        }

        return new PayProBatchOrderResult(false, "INVALID_RESPONSE", parsedOrders, "Could not parse PayPro response", contentString);
    }

    /// <inheritdoc />
    public async Task<PayProConsumerResult> CreateConsumerAsync(
        PayProConsumerInput consumer,
        CancellationToken cancellationToken = default)
    {
        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var url = $"{baseUrl}/v2/ppro/cc";

        var payload = new object[]
        {
            new { MerchantId = _options.Username },
            new
            {
                ConsumerID = consumer.ConsumerId,
                Name = consumer.Name,
                Mobile = CleanPakistaniPhone(consumer.Mobile),
                Email = consumer.Email ?? string.Empty,
                Address = consumer.Address ?? string.Empty
            }
        };

        var response = await SendWithAuthRetryAsync(token =>
        {
            var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(payload, options: JsonOptions)
            };
            if (!string.IsNullOrWhiteSpace(token)) req.Headers.Add("Token", token);
            return req;
        }, cancellationToken);

        var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
        return ParseSingleConsumerResponse(contentString, consumer.ConsumerId);
    }

    /// <inheritdoc />
    public async Task<PayProBatchConsumerResult> CreateMultipleConsumersAsync(
        IEnumerable<PayProConsumerInput> consumers,
        CancellationToken cancellationToken = default)
    {
        var consumerList = consumers.ToList();
        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var url = $"{baseUrl}/v2/ppro/cmc";

        var payload = new List<object>
        {
            new { MerchantId = _options.Username }
        };
        payload.AddRange(consumerList.Select(c => new
        {
            ConsumerID = c.ConsumerId,
            Name = c.Name,
            Mobile = CleanPakistaniPhone(c.Mobile),
            Email = c.Email ?? string.Empty,
            Address = c.Address ?? string.Empty
        }));

        var response = await SendWithAuthRetryAsync(token =>
        {
            var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(payload, options: JsonOptions)
            };
            if (!string.IsNullOrWhiteSpace(token)) req.Headers.Add("Token", token);
            return req;
        }, cancellationToken);

        var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
        return ParseBatchConsumerResponse(contentString, consumerList);
    }

    /// <inheritdoc />
    public async Task<PayProConsumerResult> UpdateConsumerAsync(
        PayProConsumerInput consumer,
        CancellationToken cancellationToken = default)
    {
        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var url = $"{baseUrl}/v2/ppro/uc";

        var payload = new object[]
        {
            new { MerchantId = _options.Username },
            new
            {
                ConsumerID = consumer.ConsumerId,
                Name = consumer.Name,
                Mobile = CleanPakistaniPhone(consumer.Mobile),
                Email = consumer.Email ?? string.Empty,
                Address = consumer.Address ?? string.Empty
            }
        };

        var response = await SendWithAuthRetryAsync(token =>
        {
            var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(payload, options: JsonOptions)
            };
            if (!string.IsNullOrWhiteSpace(token)) req.Headers.Add("Token", token);
            return req;
        }, cancellationToken);

        var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
        return ParseSingleConsumerResponse(contentString, consumer.ConsumerId);
    }

    /// <inheritdoc />
    public async Task<PayProBatchConsumerResult> UpdateMultipleConsumersAsync(
        IEnumerable<PayProConsumerInput> consumers,
        CancellationToken cancellationToken = default)
    {
        var consumerList = consumers.ToList();
        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var url = $"{baseUrl}/v2/ppro/umc";

        var payload = new List<object>
        {
            new { MerchantId = _options.Username }
        };
        payload.AddRange(consumerList.Select(c => new
        {
            ConsumerID = c.ConsumerId,
            Name = c.Name,
            Mobile = CleanPakistaniPhone(c.Mobile),
            Email = c.Email ?? string.Empty,
            Address = c.Address ?? string.Empty
        }));

        var response = await SendWithAuthRetryAsync(token =>
        {
            var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(payload, options: JsonOptions)
            };
            if (!string.IsNullOrWhiteSpace(token)) req.Headers.Add("Token", token);
            return req;
        }, cancellationToken);

        var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
        return ParseBatchConsumerResponse(contentString, consumerList);
    }

    private PayProConsumerResult ParseSingleConsumerResponse(string contentString, string fallbackConsumerId)
    {
        try
        {
            using var doc = JsonDocument.Parse(contentString);
            if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
            {
                var first = doc.RootElement[0];
                var status = first.TryGetProperty("Status", out var s) ? s.GetString() ?? "" : "";
                var desc = doc.RootElement.GetArrayLength() > 1 && doc.RootElement[1].TryGetProperty("Description", out var d)
                    ? d.GetString()
                    : PayProApiException.MapStatusDescription(status);

                return new PayProConsumerResult(
                    IsSuccess: status == "00",
                    Status: status,
                    ConsumerId: fallbackConsumerId,
                    Description: desc,
                    RawResponseJson: contentString
                );
            }
        }
        catch (JsonException) { }

        return new PayProConsumerResult(false, "INVALID_RESPONSE", fallbackConsumerId, "Unable to parse PayPro response", contentString);
    }

    private PayProBatchConsumerResult ParseBatchConsumerResponse(string contentString, List<PayProConsumerInput> inputs)
    {
        var results = new List<PayProConsumerResult>();
        try
        {
            using var doc = JsonDocument.Parse(contentString);
            if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
            {
                var first = doc.RootElement[0];
                var status = first.TryGetProperty("Status", out var s) ? s.GetString() ?? "" : "";

                for (int i = 1; i < doc.RootElement.GetArrayLength(); i++)
                {
                    var item = doc.RootElement[i];
                    var cId = item.TryGetProperty("ConsumerID", out var ci) ? ci.GetString() ?? "" : (i - 1 < inputs.Count ? inputs[i - 1].ConsumerId : "");
                    var desc = item.TryGetProperty("Description", out var d) ? d.GetString() : PayProApiException.MapStatusDescription(status);

                    results.Add(new PayProConsumerResult(
                        IsSuccess: status == "00",
                        Status: status,
                        ConsumerId: cId,
                        Description: desc,
                        RawResponseJson: item.GetRawText()
                    ));
                }

                return new PayProBatchConsumerResult(status == "00", status, results, status == "00" ? "Batch consumers processed" : PayProApiException.MapStatusDescription(status), contentString);
            }
        }
        catch (JsonException) { }

        return new PayProBatchConsumerResult(false, "INVALID_RESPONSE", results, "Could not parse PayPro response", contentString);
    }

    /// <inheritdoc />
    public async Task<PayProMarkOrderResult> MarkOrdersAsPaidAsync(
        IEnumerable<string> orderNumbers,
        CancellationToken cancellationToken = default)
    {
        var csv = string.Join(",", orderNumbers);
        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var url = $"{baseUrl}/v2/ppro/moap";

        var payload = new
        {
            Username = _options.Username,
            CsvOrderNumbers = csv
        };

        var response = await SendWithAuthRetryAsync(token =>
        {
            var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(payload, options: JsonOptions)
            };
            if (!string.IsNullOrWhiteSpace(token)) req.Headers.Add("Token", token);
            return req;
        }, cancellationToken);

        var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
        return ParseMarkOrderResponse(contentString, csv);
    }

    /// <inheritdoc />
    public async Task<PayProMarkOrderResult> MarkOrdersAsBlockedAsync(
        IEnumerable<string> orderNumbers,
        CancellationToken cancellationToken = default)
    {
        var csv = string.Join(",", orderNumbers);
        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var url = $"{baseUrl}/v2/ppro/moab";

        var payload = new
        {
            Username = _options.Username,
            CsvOrderNumbers = csv
        };

        var response = await SendWithAuthRetryAsync(token =>
        {
            var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(payload, options: JsonOptions)
            };
            if (!string.IsNullOrWhiteSpace(token)) req.Headers.Add("Token", token);
            return req;
        }, cancellationToken);

        var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
        return ParseMarkOrderResponse(contentString, csv);
    }

    private PayProMarkOrderResult ParseMarkOrderResponse(string contentString, string csv)
    {
        try
        {
            using var doc = JsonDocument.Parse(contentString);
            if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
            {
                var first = doc.RootElement[0];
                var status = first.TryGetProperty("Status", out var s) ? s.GetString() ?? "" : "";
                var desc = doc.RootElement.GetArrayLength() > 1 && doc.RootElement[1].TryGetProperty("Description", out var d)
                    ? d.GetString()
                    : PayProApiException.MapStatusDescription(status);

                return new PayProMarkOrderResult(status == "00", status, csv, desc, contentString);
            }
        }
        catch (JsonException) { }

        return new PayProMarkOrderResult(false, "INVALID_RESPONSE", csv, "Failed to parse response", contentString);
    }

    /// <inheritdoc />
    public async Task<PayProOrderStatusResult> GetGeneralOrderStatusAsync(
        string? orderNumber = null,
        string? cpayId = null,
        CancellationToken cancellationToken = default)
    {
        var baseUrl = _options.BaseUrl.TrimEnd('/');

        // 1. Primary: query by OrderNumber using POST /v2/ppro/ggosboi if available
        if (!string.IsNullOrWhiteSpace(orderNumber))
        {
            try
            {
                var ggosboiUrl = $"{baseUrl}/v2/ppro/ggosboi";
                var payload = new
                {
                    userName = _options.Username,
                    Order_Id = orderNumber
                };

                var response = await SendWithAuthRetryAsync(token =>
                {
                    var req = new HttpRequestMessage(HttpMethod.Post, ggosboiUrl)
                    {
                        Content = JsonContent.Create(payload, options: JsonOptions)
                    };
                    if (!string.IsNullOrWhiteSpace(token)) req.Headers.Add("Token", token);
                    return req;
                }, cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
                    var parsed = ParseOrderStatusDoc(contentString, orderNumber, cpayId);
                    if (parsed.IsSuccess) return parsed;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("ggosboi status inquiry failed for {OrderNumber}: {Message}. Trying ggos fallback.", orderNumber, ex.Message);
            }
        }

        // 2. Secondary: query by cpayId (PayProId) using /v2/ppro/ggos
        var targetCpayId = cpayId;
        if (!string.IsNullOrWhiteSpace(targetCpayId))
        {
            try
            {
                var ggosUrl = $"{baseUrl}/v2/ppro/ggos";
                var payload = new
                {
                    userName = _options.Username,
                    cpayId = targetCpayId
                };

                var response = await SendWithAuthRetryAsync(token =>
                {
                    // In PayPro doc ggos can accept GET or POST with body
                    var req = new HttpRequestMessage(HttpMethod.Post, ggosUrl)
                    {
                        Content = JsonContent.Create(payload, options: JsonOptions)
                    };
                    if (!string.IsNullOrWhiteSpace(token)) req.Headers.Add("Token", token);
                    return req;
                }, cancellationToken);

                var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
                return ParseOrderStatusDoc(contentString, orderNumber ?? targetCpayId, targetCpayId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("ggos status inquiry failed for {CpayId}: {Message}", targetCpayId, ex.Message);
            }
        }

        return new PayProOrderStatusResult(
            IsSuccess: false,
            Status: "UNKNOWN",
            OrderNumber: orderNumber ?? "",
            PayProId: cpayId,
            AmountPayable: 0,
            AmountPaid: 0,
            PaymentVia: null,
            DatePaid: null,
            CustomerName: null,
            CustomerBank: null,
            Description: "Neither orderNumber nor cpayId provided or inquiry failed",
            RawResponseJson: null
        );
    }

    private PayProOrderStatusResult ParseOrderStatusDoc(string contentString, string fallbackOrderNumber, string? fallbackPayProId)
    {
        try
        {
            using var doc = JsonDocument.Parse(contentString);
            if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
            {
                var first = doc.RootElement[0];
                var status = first.TryGetProperty("Status", out var s) ? s.GetString() ?? "" : "";

                if (status == "00" && doc.RootElement.GetArrayLength() > 1)
                {
                    var second = doc.RootElement[1];
                    var ordStatus = second.TryGetProperty("OrderStatus", out var os) ? os.GetString() ?? "" : "";
                    var ordNum = second.TryGetProperty("OrderNumber", out var on) ? on.GetString() ?? fallbackOrderNumber : fallbackOrderNumber;
                    var amtPayable = second.TryGetProperty("AmountPayable", out var ap) && ap.TryGetDecimal(out var pyVal) ? pyVal : 0m;
                    var amtPaid = second.TryGetProperty("OrderAmountPaid", out var op) && op.TryGetDecimal(out var pdVal) ? pdVal : 0m;
                    var paymentVia = second.TryGetProperty("PaymentVia", out var pv) ? pv.GetString() : null;
                    var custName = second.TryGetProperty("CustomerName", out var cn) ? cn.GetString() : null;
                    var custBank = second.TryGetProperty("CustomerBank", out var cb) ? cb.GetString() : null;
                    var datePaidStr = second.TryGetProperty("DatePaid", out var dp) ? dp.GetString() : null;
                    DateTime? datePaid = DateTime.TryParse(datePaidStr, out var d) ? d : null;

                    return new PayProOrderStatusResult(
                        IsSuccess: true,
                        Status: ordStatus.ToUpperInvariant(),
                        OrderNumber: ordNum,
                        PayProId: fallbackPayProId,
                        AmountPayable: amtPayable,
                        AmountPaid: amtPaid,
                        PaymentVia: paymentVia,
                        DatePaid: datePaid,
                        CustomerName: custName,
                        CustomerBank: custBank,
                        Description: "Status retrieved successfully",
                        RawResponseJson: contentString
                    );
                }

                return new PayProOrderStatusResult(
                    IsSuccess: false,
                    Status: status,
                    OrderNumber: fallbackOrderNumber,
                    PayProId: fallbackPayProId,
                    AmountPayable: 0,
                    AmountPaid: 0,
                    PaymentVia: null,
                    DatePaid: null,
                    CustomerName: null,
                    CustomerBank: null,
                    Description: PayProApiException.MapStatusDescription(status),
                    RawResponseJson: contentString
                );
            }
        }
        catch (JsonException) { }

        return new PayProOrderStatusResult(false, "INVALID_RESPONSE", fallbackOrderNumber, fallbackPayProId, 0, 0, null, null, null, null, "Could not parse status response", contentString);
    }

    /// <inheritdoc />
    public async Task<PayProPaidOrdersReportResult> GetPaidOrdersAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var url = $"{baseUrl}/v2/ppro/gpo";

        var payload = new
        {
            Username = _options.Username,
            startDate = startDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            endDate = endDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
        };

        var response = await SendWithAuthRetryAsync(token =>
        {
            // gpo accepts POST or GET with JSON body
            var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(payload, options: JsonOptions)
            };
            if (!string.IsNullOrWhiteSpace(token)) req.Headers.Add("Token", token);
            return req;
        }, cancellationToken);

        var contentString = await response.Content.ReadAsStringAsync(cancellationToken);
        var orders = new List<PayProPaidOrderRecord>();

        try
        {
            using var doc = JsonDocument.Parse(contentString);
            if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
            {
                var first = doc.RootElement[0];
                var status = first.TryGetProperty("Status", out var s) ? s.GetString() ?? "" : "";

                for (int i = 1; i < doc.RootElement.GetArrayLength(); i++)
                {
                    var item = doc.RootElement[i];
                    var ordId = item.TryGetProperty("OrderId", out var oi) ? oi.GetString() ?? "" : "";
                    var payProId = item.TryGetProperty("PayProId", out var ppi) ? ppi.GetString() : null;
                    var consumerId = item.TryGetProperty("ConsumerId", out var ci) ? ci.GetString() : null;
                    var ordAmt = item.TryGetProperty("Order Amount", out var oa) && oa.TryGetDecimal(out var oav) ? oav : 0m;
                    var amtPaid = item.TryGetProperty("Amount Paid", out var ap) && ap.TryGetDecimal(out var apv) ? apv : 0m;
                    var datePaidStr = item.TryGetProperty("Date Paid", out var dp) ? dp.GetString() : null;
                    var dateCreatedStr = item.TryGetProperty("Date Created", out var dc) ? dc.GetString() : null;
                    var orderDueDateStr = item.TryGetProperty("Order Due Date", out var odd) ? odd.GetString() : null;
                    var txnStatus = item.TryGetProperty("TransactionStatus", out var ts) ? ts.GetString() : null;
                    var payMode = item.TryGetProperty("Payment Mode", out var pm) ? pm.GetString() : null;
                    var email = item.TryGetProperty("Customer Email", out var ce) ? ce.GetString() : null;
                    var mobile = item.TryGetProperty("Customer Mobile", out var cm) ? cm.GetString() : null;
                    var address = item.TryGetProperty("Customer Address", out var ca) ? ca.GetString() : null;
                    var penalty = item.TryGetProperty("Total Penalty", out var tp) && tp.TryGetDecimal(out var tpv) ? tpv : 0m;

                    orders.Add(new PayProPaidOrderRecord(
                        OrderId: ordId,
                        PayProId: payProId,
                        ConsumerId: consumerId,
                        OrderAmount: ordAmt,
                        AmountPaid: amtPaid,
                        DatePaid: DateTime.TryParse(datePaidStr, out var dpVal) ? dpVal : null,
                        DateCreated: DateTime.TryParse(dateCreatedStr, out var dcVal) ? dcVal : null,
                        OrderDueDate: DateTime.TryParse(orderDueDateStr, out var oddVal) ? oddVal : null,
                        TransactionStatus: txnStatus,
                        PaymentMode: payMode,
                        CustomerEmail: email,
                        CustomerMobile: mobile,
                        CustomerAddress: address,
                        TotalPenalty: penalty
                    ));
                }

                return new PayProPaidOrdersReportResult(
                    IsSuccess: status == "00",
                    Status: status,
                    PaidOrders: orders,
                    TotalCount: orders.Count,
                    Description: status == "00" ? "Paid orders fetched successfully" : PayProApiException.MapStatusDescription(status),
                    RawResponseJson: contentString
                );
            }
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse gpo response");
        }

        return new PayProPaidOrdersReportResult(false, "INVALID_RESPONSE", orders, 0, "Failed to parse PayPro response", contentString);
    }
}
