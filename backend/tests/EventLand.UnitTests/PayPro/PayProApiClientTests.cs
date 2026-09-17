namespace EventLand.UnitTests.PayPro;

using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Client;
using EventLand.Modules.PayPro.Dtos;
using EventLand.Modules.PayPro.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

public class PayProApiClientTests
{
    private readonly IOptions<PayProOptions> _options = Options.Create(new PayProOptions
    {
        BaseUrl = "https://demoapi.paypro.com.pk",
        ClientId = "8mZHsWr6QZpcmpe",
        ClientSecret = "BpfL4ioclo4D8dN",
        Username = "Event_land",
        Password = "Demo@EV26"
    });

    [Fact]
    public async Task AuthenticateAsync_ReturnsToken_WhenSuccessful()
    {
        var handler = new MockHttpMessageHandler(req =>
        {
            var res = new HttpResponseMessage(HttpStatusCode.OK);
            res.Headers.Add("Token", "test-token-xyz");
            res.Headers.Add("TokenExpiry", "1440");
            res.Content = new StringContent("{}", Encoding.UTF8, "application/json");
            return Task.FromResult(res);
        });

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://demoapi.paypro.com.pk") };
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var tokenProvider = new PayProAuthTokenProvider(httpClient, _options, memoryCache, NullLogger<PayProAuthTokenProvider>.Instance);

        var token = await tokenProvider.GetTokenAsync();

        Assert.Equal("test-token-xyz", token);
    }

    [Fact]
    public async Task CreateOrderAsync_Success_ReturnsClick2PayAndPayProId()
    {
        var mockResponse = @"[
            { ""Status"": ""00"" },
            {
                ""OrderAmount"": ""2500"",
                ""Description"": ""Order number EVL-101 created successfully"",
                ""Click2Pay"": ""https://marketplace.paypro.com.pk/pyb-demo/?bid=MDExMDIyMDU2MDAwMDE="",
                ""PayProId"": ""01102205600001"",
                ""BillUrl"": ""https://cpay.pk:1010/jCl1czXrFN"",
                ""OrderNumber"": ""EVL-101""
            }
        ]";

        var handler = new MockHttpMessageHandler(req =>
        {
            if (req.RequestUri!.PathAndQuery.Contains("/auth"))
            {
                var authRes = new HttpResponseMessage(HttpStatusCode.OK);
                authRes.Headers.Add("Token", "test-token-abc");
                return Task.FromResult(authRes);
            }

            var res = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(mockResponse, Encoding.UTF8, "application/json")
            };
            return Task.FromResult(res);
        });

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://demoapi.paypro.com.pk") };
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var tokenProvider = new PayProAuthTokenProvider(httpClient, _options, memoryCache, NullLogger<PayProAuthTokenProvider>.Instance);
        var client = new PayProApiClient(httpClient, tokenProvider, _options, NullLogger<PayProApiClient>.Instance);

        var input = new PayProOrderInput(
            OrderNumber: "EVL-101",
            Amount: 2500,
            CustomerName: "Ali Khan",
            CustomerMobile: "03001234567",
            CustomerEmail: "ali@example.com"
        );

        var result = await client.CreateOrderAsync(input);

        Assert.True(result.IsSuccess);
        Assert.Equal("00", result.Status);
        Assert.Equal("01102205600001", result.PayProId);
        Assert.Contains("marketplace.paypro.com.pk", result.Click2PayUrl);
        Assert.Equal("EVL-101", result.OrderNumber);
    }

    [Fact]
    public async Task CreateOrderAsync_WhenPayProReturns01_ReturnsFailureResult()
    {
        var mockResponse = @"[
            { ""Status"": ""01"" },
            { ""Description"": ""Invalid Data. The username cannot be empty"" }
        ]";

        var handler = new MockHttpMessageHandler(req =>
        {
            var res = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(mockResponse, Encoding.UTF8, "application/json")
            };
            return Task.FromResult(res);
        });

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://demoapi.paypro.com.pk") };
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        memoryCache.Set($"PayPro_Token_{_options.Value.ClientId}", "cached-token");
        var tokenProvider = new PayProAuthTokenProvider(httpClient, _options, memoryCache, NullLogger<PayProAuthTokenProvider>.Instance);
        var client = new PayProApiClient(httpClient, tokenProvider, _options, NullLogger<PayProApiClient>.Instance);

        var input = new PayProOrderInput("EVL-102", 1000, "User", "03001112233", "user@test.com");
        var result = await client.CreateOrderAsync(input);

        Assert.False(result.IsSuccess);
        Assert.Equal("01", result.Status);
        Assert.Contains("Invalid Data", result.Description);
    }

    [Fact]
    public async Task CreateMultipleOrdersAsync_ReturnsBatchResults()
    {
        var mockResponse = @"[
            { ""Status"": ""00"" },
            { ""OrderNumber"": ""ORD-1"", ""PayProId"": ""011001"", ""Click2Pay"": ""https://pay/1"", ""OrderAmount"": ""1000"", ""Description"": ""Created"" },
            { ""OrderNumber"": ""ORD-2"", ""PayProId"": ""011002"", ""Click2Pay"": ""https://pay/2"", ""OrderAmount"": ""2000"", ""Description"": ""Created"" }
        ]";

        var handler = new MockHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(mockResponse, Encoding.UTF8, "application/json")
        });

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://demoapi.paypro.com.pk") };
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        memoryCache.Set($"PayPro_Token_{_options.Value.ClientId}", "token");
        var tokenProvider = new PayProAuthTokenProvider(httpClient, _options, memoryCache, NullLogger<PayProAuthTokenProvider>.Instance);
        var client = new PayProApiClient(httpClient, tokenProvider, _options, NullLogger<PayProApiClient>.Instance);

        var orders = new[]
        {
            new PayProOrderInput("ORD-1", 1000, "Cust 1", "03001111111", "c1@test.com"),
            new PayProOrderInput("ORD-2", 2000, "Cust 2", "03002222222", "c2@test.com")
        };

        var result = await client.CreateMultipleOrdersAsync(orders);

        Assert.True(result.IsOverallSuccess);
        Assert.Equal(2, result.Orders.Count);
        Assert.Equal("ORD-1", result.Orders[0].OrderNumber);
        Assert.Equal("ORD-2", result.Orders[1].OrderNumber);
    }

    [Fact]
    public async Task GetGeneralOrderStatusAsync_ReturnsPaidStatus()
    {
        var mockResponse = @"[
            { ""Status"": ""00"" },
            {
                ""PaymentVia"": ""BAF"",
                ""DatePaid"": ""2026-09-15T12:00:00"",
                ""AmountPayable"": 2500.00,
                ""OrderNumber"": ""EVL-999"",
                ""CustomerName"": ""Ali Khan"",
                ""OrderStatus"": ""PAID"",
                ""OrderAmountPaid"": 2500.00
            }
        ]";

        var handler = new MockHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(mockResponse, Encoding.UTF8, "application/json")
        });

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://demoapi.paypro.com.pk") };
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        memoryCache.Set($"PayPro_Token_{_options.Value.ClientId}", "token");
        var tokenProvider = new PayProAuthTokenProvider(httpClient, _options, memoryCache, NullLogger<PayProAuthTokenProvider>.Instance);
        var client = new PayProApiClient(httpClient, tokenProvider, _options, NullLogger<PayProApiClient>.Instance);

        var result = await client.GetGeneralOrderStatusAsync(orderNumber: "EVL-999");

        Assert.True(result.IsSuccess);
        Assert.True(result.IsPaid);
        Assert.Equal("PAID", result.Status);
        Assert.Equal(2500m, result.AmountPaid);
        Assert.Equal("BAF", result.PaymentVia);
    }

    [Fact]
    public async Task GetPaidOrdersAsync_ParsesPaidOrdersList()
    {
        var mockResponse = @"[
            { ""Status"": ""00"" },
            {
                ""OrderId"": ""EVL-888"",
                ""PayProId"": ""01102204100012"",
                ""Order Amount"": 5000.00,
                ""Amount Paid"": 5000.00,
                ""Date Paid"": ""2026-09-10T15:00:00"",
                ""TransactionStatus"": ""PAID"",
                ""Payment Mode"": ""1Link"",
                ""Total Penalty"": 0.0
            }
        ]";

        var handler = new MockHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(mockResponse, Encoding.UTF8, "application/json")
        });

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://demoapi.paypro.com.pk") };
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        memoryCache.Set($"PayPro_Token_{_options.Value.ClientId}", "token");
        var tokenProvider = new PayProAuthTokenProvider(httpClient, _options, memoryCache, NullLogger<PayProAuthTokenProvider>.Instance);
        var client = new PayProApiClient(httpClient, tokenProvider, _options, NullLogger<PayProApiClient>.Instance);

        var result = await client.GetPaidOrdersAsync(DateTime.UtcNow.AddDays(-7), DateTime.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Single(result.PaidOrders);
        Assert.Equal("EVL-888", result.PaidOrders[0].OrderId);
        Assert.Equal(5000m, result.PaidOrders[0].AmountPaid);
    }

    [Fact]
    public async Task Consumer_CreateAndBatch_ReturnsSuccess()
    {
        var mockResponse = @"[
            { ""Status"": ""00"" },
            { ""ConsumerID"": ""01107867861"", ""Description"": ""Consumer created successfully"" }
        ]";

        var handler = new MockHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(mockResponse, Encoding.UTF8, "application/json")
        });

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://demoapi.paypro.com.pk") };
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        memoryCache.Set($"PayPro_Token_{_options.Value.ClientId}", "token");
        var tokenProvider = new PayProAuthTokenProvider(httpClient, _options, memoryCache, NullLogger<PayProAuthTokenProvider>.Instance);
        var client = new PayProApiClient(httpClient, tokenProvider, _options, NullLogger<PayProApiClient>.Instance);

        var consumer = new PayProConsumerInput("7867861", "User One", "03001234567", "u1@test.com", "Karachi");
        var result = await client.CreateConsumerAsync(consumer);

        Assert.True(result.IsSuccess);
        Assert.Equal("00", result.Status);
    }
}
