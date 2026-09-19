namespace EventLand.UnitTests;

using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Application.Common.Models;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Infrastructure.Persistence;
using EventLand.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

public class FakeNotificationService : INotificationService
{
    public Task SendBookingConfirmedNotificationAsync(BookingDto booking, string recipient) => Task.CompletedTask;
    public Task SendOrganizerNewBookingNotificationAsync(BookingDto booking, string recipient) => Task.CompletedTask;
    public Task SendBookingCancelledNotificationAsync(BookingDto booking, string recipient) => Task.CompletedTask;
    public Task SendTicketConfirmationEmailAsync(BookingDto booking) => Task.CompletedTask;
    public Task SendTicketQrCodeSmsAsync(BookingDto booking) => Task.CompletedTask;
    public Task<string> GenerateWhatsAppTicketShareUrlAsync(BookingDto booking) => Task.FromResult("https://wa.me/test");
}

public class FakeHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

    public FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
    {
        _responder = responder;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(_responder(request));
    }
}

public class PayProServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;

    public PayProServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    public void Dispose()
    {
        _connection.Close();
        _connection.Dispose();
    }

    private TestDbContext CreateContext()
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "PRAGMA foreign_keys = OFF;";
        cmd.ExecuteNonQuery();

        var options = new DbContextOptionsBuilder<TestDbContext>()
            .UseSqlite(_connection)
            .Options;

        var context = new TestDbContext(options);
        context.Database.EnsureCreated();

        if (!context.TicketTiers.Any())
        {
            context.TicketTiers.Add(new TicketTier
            {
                Id = 1,
                EventId = 1,
                Name = "General",
                Price = 1000m,
                AvailableQuantity = 100
            });
            context.SaveChanges();
        }

        return context;
    }

    [Fact]
    public void PayProOptions_MissingKeys_ReportsInvalidWithoutExposingSecrets()
    {
        var options = new PayProOptions
        {
            Environment = "Demo",
            BaseUrl = "",
            Username = "",
            ClientId = "",
            ClientSecret = ""
        };

        var (isValid, missingKeys) = options.Validate();

        Assert.False(isValid);
        Assert.Equal(4, missingKeys.Count);
        Assert.Contains("PayPro:BaseUrl", missingKeys);
        Assert.Contains("PayPro:Username", missingKeys);
        Assert.Contains("PayPro:ClientId", missingKeys);
        Assert.Contains("PayPro:ClientSecret", missingKeys);
    }

    [Fact]
    public void PayProOptions_CompleteKeys_ReportsValid()
    {
        var options = new PayProOptions
        {
            Environment = "Demo",
            BaseUrl = "http://demoapi.paypro.com.pk/",
            Username = "Event_land",
            Password = "DemoPassword123",
            ClientId = "8mZHsWr6QZpcmpe",
            ClientSecret = "BpfL4ioclo4D8dN"
        };

        var (isValid, missingKeys) = options.Validate();

        Assert.True(isValid);
        Assert.Empty(missingKeys);
        Assert.True(options.IsDemo);
    }

    [Fact]
    public async Task PayProClient_GetAuthToken_CachesToken()
    {
        var options = Options.Create(new PayProOptions
        {
            Environment = "Demo",
            BaseUrl = "http://demoapi.paypro.com.pk/",
            Username = "Event_land",
            ClientId = "client123",
            ClientSecret = "secret456"
        });

        int networkCallCount = 0;
        var fakeHandler = new FakeHttpMessageHandler(req =>
        {
            networkCallCount++;
            var res = new HttpResponseMessage(HttpStatusCode.OK);
            res.Headers.Add("token", "dummy_auth_token_xyz");
            return res;
        });

        var httpClient = new HttpClient(fakeHandler);
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var clientLogger = NullLogger<PayProClient>.Instance;

        var client = new PayProClient(httpClient, options, memoryCache, clientLogger);

        var token1 = await client.GetAuthTokenAsync();
        var token2 = await client.GetAuthTokenAsync();

        Assert.Equal("dummy_auth_token_xyz", token1);
        Assert.Equal("dummy_auth_token_xyz", token2);
        Assert.Equal(1, networkCallCount); // Verified cache hit!
    }

    [Fact]
    public async Task PayProClient_CreateOrderAsync_ParsesV2ResponseCorrectly()
    {
        var options = Options.Create(new PayProOptions
        {
            Environment = "Demo",
            BaseUrl = "http://demoapi.paypro.com.pk/",
            Username = "Event_land",
            ClientId = "client123",
            ClientSecret = "secret456"
        });

        var fakeHandler = new FakeHttpMessageHandler(req =>
        {
            if (req.RequestUri!.AbsolutePath.Contains("/auth"))
            {
                var authRes = new HttpResponseMessage(HttpStatusCode.OK);
                authRes.Headers.Add("token", "test_token_123");
                return authRes;
            }

            var orderJson = @"[
                { ""Status"": ""00"" },
                {
                    ""OrderAmount"": ""10379.00"",
                    ""Description"": ""Order EVL-998877 created successfully"",
                    ""Click2Pay"": ""https://marketplace.paypro.com.pk/pyb-demo/?bid=MDExMDIyMDU2MDAwMDE%3d"",
                    ""ConnectPayId"": ""01102205600001"",
                    ""PayProId"": ""01102205600001"",
                    ""BillUrl"": ""https://cpay.pk:1010/jCl1czXrFN"",
                    ""OrderNumber"": ""EVL-998877""
                }
            ]";

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(orderJson)
            };
        });

        var httpClient = new HttpClient(fakeHandler);
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var clientLogger = NullLogger<PayProClient>.Instance;
        var client = new PayProClient(httpClient, options, memoryCache, clientLogger);

        var result = await client.CreateOrderAsync("EVL-998877", 10379m, "Ali Khan", "ali@test.com", "03001234567", null);

        Assert.True(result.IsSuccess);
        Assert.Equal("00", result.Status);
        Assert.Equal("01102205600001", result.PayProId);
        Assert.Contains("marketplace.paypro.com.pk", result.Click2PayUrl);
    }

    [Fact]
    public async Task CreatePaymentAsync_ValidBooking_PersistsTransactionAndReturnsSafeDto()
    {
        using var context = CreateContext();

        var booking = new Booking
        {
            Id = 101,
            EventId = 1,
            TicketTierId = 1,
            BookingRef = "EVL-998877",
            CustomerName = "Ali Khan",
            CustomerEmail = "ali@test.com",
            CustomerPhone = "03001234567",
            SubtotalAmount = 10000m,
            PlatformFee = 99m,
            PaymentProcessingFee = 280m,
            TotalAmount = 10379m,
            PaymentStatus = PaymentStatus.Pending,
            PaymentMethod = PaymentMethod.PayPro
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var options = Options.Create(new PayProOptions
        {
            Environment = "Demo",
            BaseUrl = "http://demoapi.paypro.com.pk/",
            Username = "Event_land",
            ClientId = "client123",
            ClientSecret = "secret456"
        });

        var fakeHandler = new FakeHttpMessageHandler(req =>
        {
            if (req.RequestUri!.AbsolutePath.Contains("/auth"))
            {
                var authRes = new HttpResponseMessage(HttpStatusCode.OK);
                authRes.Headers.Add("token", "test_token_123");
                return authRes;
            }

            var orderJson = @"[
                { ""Status"": ""00"" },
                {
                    ""OrderAmount"": ""10379.00"",
                    ""Click2Pay"": ""https://marketplace.paypro.com.pk/pyb-demo/?bid=MDExMDIyMDU2MDAwMDE%3d"",
                    ""ConnectPayId"": ""01102205600001"",
                    ""PayProId"": ""01102205600001"",
                    ""OrderNumber"": ""EVL-998877""
                }
            ]";

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(orderJson)
            };
        });

        var httpClient = new HttpClient(fakeHandler);
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var payProClient = new PayProClient(httpClient, options, memoryCache, NullLogger<PayProClient>.Instance);

        var notifService = new FakeNotificationService();
        var logger = NullLogger<PayProService>.Instance;

        var service = new PayProService(payProClient, options, context, context, notifService, logger);

        var result = await service.CreatePaymentAsync(booking.BookingRef, "paypro", "https://eventland.pk/order/success");

        Assert.True(result.Success);
        Assert.Equal("EVL-998877", result.BookingRef);
        Assert.Equal(10379m, result.Amount);
        Assert.Equal("01102205600001", result.VoucherCode);
        Assert.Contains("marketplace.paypro.com.pk", result.PaymentUrl);

        // Verify PaymentTransaction created in database
        var tx = await context.PaymentTransactions.FirstOrDefaultAsync(t => t.BookingId == booking.Id);
        Assert.NotNull(tx);
        Assert.Equal("01102205600001", tx.ProviderTransactionId);
        Assert.Equal("EVL-998877", tx.ProviderOrderId);
        Assert.Equal(10379m, tx.Amount);
        Assert.Equal(PaymentStatus.Pending, tx.Status);
    }

    [Fact]
    public async Task CreatePaymentAsync_DuplicateCall_IsIdempotentAndReusesPendingSession()
    {
        using var context = CreateContext();

        var booking = new Booking
        {
            Id = 102,
            EventId = 1,
            TicketTierId = 1,
            BookingRef = "EVL-IDEMPOTENT-1",
            CustomerName = "Zaid",
            CustomerEmail = "zaid@test.com",
            CustomerPhone = "03001234567",
            SubtotalAmount = 5000m,
            TotalAmount = 5000m,
            PaymentStatus = PaymentStatus.Pending,
            PaymentMethod = PaymentMethod.PayPro
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var options = Options.Create(new PayProOptions());
        int createOrderCallCount = 0;

        var fakeHandler = new FakeHttpMessageHandler(req =>
        {
            if (req.RequestUri!.AbsolutePath.Contains("/co"))
            {
                createOrderCallCount++;
            }
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(@"[{""Status"":""00""},{""Click2Pay"":""https://pay.demo"",""PayProId"":""112233""}]")
            };
        });

        var httpClient = new HttpClient(fakeHandler);
        var payProClient = new PayProClient(httpClient, options, new MemoryCache(new MemoryCacheOptions()), NullLogger<PayProClient>.Instance);
        var service = new PayProService(payProClient, options, context, context, new FakeNotificationService(), NullLogger<PayProService>.Instance);

        // First payment attempt
        var first = await service.CreatePaymentAsync(booking.BookingRef);
        // Second immediate attempt (e.g. double click)
        var second = await service.CreatePaymentAsync(booking.BookingRef);

        Assert.True(first.Success);
        Assert.True(second.Success);
        Assert.Equal(first.PaymentId, second.PaymentId); // Reused identical payment ID!
        Assert.Equal(1, createOrderCallCount); // Gateway called only ONCE!
    }

    [Fact]
    public async Task ProcessIpnCallbackAsync_ValidPaidIpn_MarksBookingPaidAndConfirmed()
    {
        using var context = CreateContext();

        var booking = new Booking
        {
            Id = 201,
            EventId = 1,
            TicketTierId = 1,
            BookingRef = "EVL-774411",
            CustomerName = "Sara Ahmed",
            CustomerEmail = "sara@test.com",
            CustomerPhone = "03121234567",
            SubtotalAmount = 5000m,
            PlatformFee = 49m,
            PaymentProcessingFee = 40m,
            TotalAmount = 5089m,
            PaymentStatus = PaymentStatus.Pending,
            Status = BookingStatus.Pending
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var options = Options.Create(new PayProOptions { Environment = "Demo" });

        var fakeHandler = new FakeHttpMessageHandler(req =>
        {
            var statusJson = @"[
                { ""Status"": ""00"" },
                {
                    ""OrderStatus"": ""PAID"",
                    ""OrderAmountPaid"": 5089.00,
                    ""AmountPayable"": 5089.00,
                    ""OrderNumber"": ""EVL-774411"",
                    ""DatePaid"": ""2026-03-14T08:00:00""
                }
            ]";
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(statusJson) };
        });

        var httpClient = new HttpClient(fakeHandler);
        var payProClient = new PayProClient(httpClient, options, new MemoryCache(new MemoryCacheOptions()), NullLogger<PayProClient>.Instance);
        var service = new PayProService(payProClient, options, context, context, new FakeNotificationService(), NullLogger<PayProService>.Instance);

        var ipnDto = new PayProIpnRequestDto(
            InvoiceId: "01102205600001",
            BookingRef: "EVL-774411",
            AmountPayable: 5089m,
            AmountPaid: 5089m,
            Status: "PAID",
            TransactionId: "TXN-PP-12345",
            PaymentDate: DateTimeOffset.UtcNow,
            Signature: "dummy_sig"
        );

        var result = await service.ProcessIpnCallbackAsync(ipnDto);

        Assert.True(result.Success);
        Assert.Equal("PAID", result.Status);

        var updated = await context.Bookings.FindAsync(booking.Id);
        Assert.NotNull(updated);
        Assert.Equal(PaymentStatus.Paid, updated.PaymentStatus);
        Assert.Equal(BookingStatus.Confirmed, updated.Status);
        Assert.NotNull(updated.PaidAt);
    }

    [Fact]
    public async Task ProcessIpnCallbackAsync_DuplicateCallback_IsIdempotent()
    {
        using var context = CreateContext();

        var booking = new Booking
        {
            Id = 301,
            EventId = 1,
            TicketTierId = 1,
            BookingRef = "EVL-552233",
            CustomerName = "Usman Tariq",
            CustomerEmail = "usman@test.com",
            CustomerPhone = "03331234567",
            SubtotalAmount = 10000m,
            PlatformFee = 99m,
            PaymentProcessingFee = 80m,
            TotalAmount = 10179m,
            PaymentStatus = PaymentStatus.Paid, // ALREADY PAID!
            Status = BookingStatus.Confirmed
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var options = Options.Create(new PayProOptions());
        var httpClient = new HttpClient(new FakeHttpMessageHandler(r => new HttpResponseMessage(HttpStatusCode.OK)));
        var payProClient = new PayProClient(httpClient, options, new MemoryCache(new MemoryCacheOptions()), NullLogger<PayProClient>.Instance);
        var service = new PayProService(payProClient, options, context, context, new FakeNotificationService(), NullLogger<PayProService>.Instance);

        var ipnDto = new PayProIpnRequestDto(
            InvoiceId: "01102205600001",
            BookingRef: "EVL-552233",
            AmountPayable: 10179m,
            AmountPaid: 10179m,
            Status: "PAID",
            TransactionId: "TXN-PP-DUP-999",
            PaymentDate: DateTimeOffset.UtcNow,
            Signature: "sig"
        );

        var result = await service.ProcessIpnCallbackAsync(ipnDto);

        // Idempotency: Returns success but reports ALREADY_PROCESSED
        Assert.True(result.Success);
        Assert.Equal("ALREADY_PROCESSED", result.Status);
    }

    [Fact]
    public async Task ProcessIpnCallbackAsync_AmountMismatch_RejectsUnderpaidCallback()
    {
        using var context = CreateContext();

        var booking = new Booking
        {
            Id = 401,
            EventId = 1,
            TicketTierId = 1,
            BookingRef = "EVL-112233",
            CustomerName = "Hassan Raza",
            CustomerEmail = "hassan@test.com",
            CustomerPhone = "03211234567",
            SubtotalAmount = 15000m,
            PlatformFee = 149m,
            PaymentProcessingFee = 420m,
            TotalAmount = 15569m,
            PaymentStatus = PaymentStatus.Pending,
            Status = BookingStatus.Pending
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var options = Options.Create(new PayProOptions());
        var httpClient = new HttpClient(new FakeHttpMessageHandler(r => new HttpResponseMessage(HttpStatusCode.OK)));
        var payProClient = new PayProClient(httpClient, options, new MemoryCache(new MemoryCacheOptions()), NullLogger<PayProClient>.Instance);
        var service = new PayProService(payProClient, options, context, context, new FakeNotificationService(), NullLogger<PayProService>.Instance);

        // Underpaid by attacker attempting price manipulation
        var ipnDto = new PayProIpnRequestDto(
            InvoiceId: "01102205600001",
            BookingRef: "EVL-112233",
            AmountPayable: 15569m,
            AmountPaid: 500m, // UNDERPAID!
            Status: "PAID",
            TransactionId: "TXN-UNDERPAID",
            PaymentDate: DateTimeOffset.UtcNow,
            Signature: "sig"
        );

        var result = await service.ProcessIpnCallbackAsync(ipnDto);

        Assert.False(result.Success);
        Assert.Equal("AMOUNT_MISMATCH", result.Status);

        var unchanged = await context.Bookings.FindAsync(booking.Id);
        Assert.NotNull(unchanged);
        Assert.Equal(PaymentStatus.Pending, unchanged.PaymentStatus);
    }
}
