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
            Environment = "Test",
            BaseUrl = "",
            ApiUrl = "",
            Username = "",
            Password = "",
            ClientId = "",
            ClientSecret = ""
        };

        var (isValid, missingKeys) = options.Validate();

        Assert.False(isValid);
        Assert.Equal(6, missingKeys.Count);
        Assert.Contains("PayPro:BaseUrl", missingKeys);
        Assert.Contains("PayPro:Username", missingKeys);
        Assert.Contains("PayPro:Password", missingKeys);
        Assert.Contains("PayPro:ClientId", missingKeys);
        Assert.Contains("PayPro:ClientSecret", missingKeys);
    }

    [Fact]
    public void PayProOptions_CompleteKeys_ReportsValid()
    {
        var options = new PayProOptions
        {
            Environment = "Test",
            BaseUrl = "https://demoapi.paypro.com.pk",
            ApiUrl = "https://demoapi.paypro.com.pk",
            Username = "Event_land",
            Password = "Demo@EV26",
            ClientId = "8mZHsWr6QZpcmpe",
            ClientSecret = "BpfL4ioclo4D8dN"
        };

        var (isValid, missingKeys) = options.Validate();

        Assert.True(isValid);
        Assert.Empty(missingKeys);
        Assert.True(options.IsTest);
    }

    [Fact]
    public async Task CreateInvoiceAsync_ValidBooking_PersistsTransactionAndReturnsConnectUrl()
    {
        using var context = CreateContext();

        var booking = new Booking
        {
            Id = 101,
            BookingRef = "EVL-998877",
            CustomerName = "Ali Khan",
            CustomerEmail = "ali@test.com",
            CustomerPhone = "03001234567",
            SubtotalAmount = 10000m,
            PlatformFee = 99m,
            PaymentProcessingFee = 280m,
            TotalAmount = 10379m,
            PaymentStatus = PaymentStatus.Pending,
            PaymentMethod = PaymentMethod.PayProEasyPaisaJazzCash
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var config = new PaymentConfig
        {
            Id = 101,
            Provider = "paypro",
            PaymentMethod = "easypaisa_jazzcash",
            DisplayName = "EasyPaisa / JazzCash",
            PercentageFee = 2.8m,
            FixedFee = 0m,
            Currency = "PKR",
            IsActive = true
        };

        var payProOptions = Options.Create(new PayProOptions
        {
            Environment = "Test",
            BaseUrl = "https://demoapi.paypro.com.pk",
            ApiUrl = "https://demoapi.paypro.com.pk",
            Username = "Event_land",
            Password = "Demo@EV26",
            ClientId = "8mZHsWr6QZpcmpe",
            ClientSecret = "BpfL4ioclo4D8dN"
        });

        var fakeHandler = new FakeHttpMessageHandler(req =>
        {
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("[{\"Click2Pay\":\"https://demoapi.paypro.com.pk/1pay/invoice/PP-EVL-998877\",\"cPayId\":\"94820101\"}]")
            };
        });

        var httpClient = new HttpClient(fakeHandler);
        var notifService = new FakeNotificationService();
        var logger = NullLogger<PayProService>.Instance;

        var service = new PayProService(httpClient, payProOptions, context, notifService, logger);

        var result = await service.CreateInvoiceAsync(booking, config, "https://eventland.pk/order/success");

        Assert.True(result.Success);
        Assert.Equal("EVL-998877", result.BookingRef);
        Assert.Equal(10379m, result.TotalAmount);
        Assert.Equal("PP-EVL-998877", result.InvoiceId);
        Assert.Contains("PP-EVL-998877", result.ConnectUrl);
        Assert.NotNull(result.OtcVoucherCode);

        // Verify PaymentTransaction created in database
        var tx = await context.PaymentTransactions.FirstOrDefaultAsync(t => t.BookingId == booking.Id);
        Assert.NotNull(tx);
        Assert.Equal("PP-EVL-998877", tx.ProviderTransactionId);
        Assert.Equal(10379m, tx.Amount);
        Assert.Equal(PaymentStatus.Pending, tx.Status);
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

        var payProOptions = Options.Create(new PayProOptions
        {
            Environment = "Test",
            BaseUrl = "https://demoapi.paypro.com.pk",
            ApiUrl = "https://demoapi.paypro.com.pk",
            Username = "Event_land",
            Password = "Demo@EV26",
            ClientId = "8mZHsWr6QZpcmpe",
            ClientSecret = "BpfL4ioclo4D8dN"
        });

        var fakeHandler = new FakeHttpMessageHandler(req =>
        {
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"status\":\"PAID\"}")
            };
        });

        var httpClient = new HttpClient(fakeHandler);
        var notifService = new FakeNotificationService();
        var logger = NullLogger<PayProService>.Instance;

        var service = new PayProService(httpClient, payProOptions, context, notifService, logger);

        var ipnDto = new PayProIpnRequestDto(
            InvoiceId: "PP-EVL-774411",
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

        var payProOptions = Options.Create(new PayProOptions());
        var httpClient = new HttpClient(new FakeHttpMessageHandler(r => new HttpResponseMessage(HttpStatusCode.OK)));
        var notifService = new FakeNotificationService();
        var logger = NullLogger<PayProService>.Instance;

        var service = new PayProService(httpClient, payProOptions, context, notifService, logger);

        var ipnDto = new PayProIpnRequestDto(
            InvoiceId: "PP-EVL-552233",
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

        var payProOptions = Options.Create(new PayProOptions());
        var httpClient = new HttpClient(new FakeHttpMessageHandler(r => new HttpResponseMessage(HttpStatusCode.OK)));
        var notifService = new FakeNotificationService();
        var logger = NullLogger<PayProService>.Instance;

        var service = new PayProService(httpClient, payProOptions, context, notifService, logger);

        // Underpaid by attacker attempting price manipulation
        var ipnDto = new PayProIpnRequestDto(
            InvoiceId: "PP-EVL-112233",
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
