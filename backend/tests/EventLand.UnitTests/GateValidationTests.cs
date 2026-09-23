namespace EventLand.UnitTests;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Application.Services;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Xunit;

public class GateValidationTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<TestDbContext> _dbOptions;

    public GateValidationTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _dbOptions = new DbContextOptionsBuilder<TestDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var initContext = new TestDbContext(_dbOptions);
        initContext.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _connection.Close();
        _connection.Dispose();
    }

    private (TestDbContext context, BookingService service) CreateService()
    {
        var context = new TestDbContext(_dbOptions);
        var fakeCache = new FakeCacheService();
        var fakeNotif = new FakeGateNotificationService();
        var fakeFee = new FakeGatePaymentFeeService();
        var fakeLogger = new FakeLogger<BookingService>();

        var service = new BookingService(
            context,
            fakeCache,
            fakeNotif,
            fakeFee,
            fakeLogger
        );
        return (context, service);
    }

    private async Task<(Event ev, TicketTier tier)> SeedEventAndTierAsync(TestDbContext context, int eventId = 1, int tierId = 1, string title = "Tech Fest")
    {
        if (!await context.Countries.AnyAsync(c => c.Id == 1))
        {
            var country = new Country { Id = 1, Name = "Pakistan", Code = "PK" };
            var city = new City { Id = 1, CountryId = 1, Name = "Karachi" };
            var venue = new Venue { Id = 1, CityId = 1, Name = "Arts Council", Address = "Karachi" };
            var organizer = new Organizer { Id = 1, Name = "Org", Email = "org@example.com" };
            context.Countries.Add(country);
            context.Cities.Add(city);
            context.Venues.Add(venue);
            context.Organizers.Add(organizer);
            await context.SaveChangesAsync();
        }

        var ev = new Event
        {
            Id = eventId,
            Title = title,
            CountryId = 1,
            CityId = 1,
            VenueId = 1,
            OrganizerId = 1,
            StartDateUtc = DateTimeOffset.UtcNow.AddDays(1),
            EndDateUtc = DateTimeOffset.UtcNow.AddDays(2),
            StartingPrice = 1000,
            Status = EventStatus.Live,
            IsPublished = true
        };
        context.Events.Add(ev);

        var tier = new TicketTier
        {
            Id = tierId,
            EventId = eventId,
            Name = "VIP Pass",
            Price = 2500,
            AvailableQuantity = 100
        };
        context.TicketTiers.Add(tier);
        await context.SaveChangesAsync();

        return (ev, tier);
    }

    [Fact]
    public async Task ValidateGateTicketAsync_WhenEmptyCode_ReturnsInvalid()
    {
        var (_, service) = CreateService();

        var result = await service.ValidateGateTicketAsync(new ValidateGateTicketRequestDto("   "));

        Assert.False(result.IsValid);
        Assert.Equal("INVALID", result.Status);
    }

    [Fact]
    public async Task ValidateGateTicketAsync_WhenNotFound_ReturnsNotFound()
    {
        var (_, service) = CreateService();

        var result = await service.ValidateGateTicketAsync(new ValidateGateTicketRequestDto("EVL-999999"));

        Assert.False(result.IsValid);
        Assert.Equal("NOT_FOUND", result.Status);
    }

    [Fact]
    public async Task ValidateGateTicketAsync_WhenUnpaid_ReturnsUnpaid()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 10, 100, "Lahore Music Fest");

        var booking = new Booking
        {
            Id = 101,
            BookingRef = "EVL-101",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Ahmed Ali",
            CustomerEmail = "ahmed@example.com",
            PaymentStatus = PaymentStatus.Pending,
            Status = BookingStatus.Pending,
            Quantity = 2
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var result = await service.ValidateGateTicketAsync(new ValidateGateTicketRequestDto("EVL-101"));

        Assert.False(result.IsValid);
        Assert.Equal("UNPAID", result.Status);
        Assert.Contains("confirmed payment", result.Message);
    }

    [Fact]
    public async Task ValidateGateTicketAsync_WhenCancelled_ReturnsCancelled()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 20, 200, "Karachi Qawwali Night");

        var booking = new Booking
        {
            Id = 102,
            BookingRef = "EVL-102",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Sara Khan",
            CustomerEmail = "sara@example.com",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Cancelled,
            Quantity = 1
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var result = await service.ValidateGateTicketAsync(new ValidateGateTicketRequestDto("EVL-102"));

        Assert.False(result.IsValid);
        Assert.Equal("CANCELLED", result.Status);
    }

    [Fact]
    public async Task ValidateGateTicketAsync_WhenWrongEvent_ReturnsEventMismatch()
    {
        var (context, service) = CreateService();
        var (ev1, tier1) = await SeedEventAndTierAsync(context, 30, 300, "Concert A");
        var (ev2, _) = await SeedEventAndTierAsync(context, 31, 301, "Concert B");

        var booking = new Booking
        {
            Id = 103,
            BookingRef = "EVL-103",
            EventId = ev1.Id,
            TicketTierId = tier1.Id,
            CustomerName = "Zain Malik",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Confirmed,
            Quantity = 1
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        // Scanner is scoped to Event B
        var result = await service.ValidateGateTicketAsync(new ValidateGateTicketRequestDto("EVL-103", EventId: ev2.Id));

        Assert.False(result.IsValid);
        Assert.Equal("EVENT_MISMATCH", result.Status);
    }

    [Fact]
    public async Task ValidateGateTicketAsync_WhenValidPaid_ApprovesAndMarksCheckedIn()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 40, 400, "Islamabad Tech Summit");

        var booking = new Booking
        {
            Id = 104,
            BookingRef = "EVL-104",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Qamar Ansari",
            CustomerEmail = "qamar@example.com",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Confirmed,
            Quantity = 1,
            IsCheckedIn = false
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var request = new ValidateGateTicketRequestDto(
            TicketCode: "EVL-104",
            CheckIn: true,
            GateName: "Gate VIP-1"
        );

        var result = await service.ValidateGateTicketAsync(request, 999, "gatekeeper@eventland.pk");

        Assert.True(result.IsValid);
        Assert.Equal("APPROVED", result.Status);
        Assert.Contains("ENTRY APPROVED", result.Message);
        Assert.Equal("Qamar Ansari", result.CustomerName);
        Assert.Equal("gatekeeper@eventland.pk", result.CheckedInBy);

        // Verify DB persistence
        var dbBooking = await context.Bookings.FindAsync(104);
        Assert.NotNull(dbBooking);
        Assert.True(dbBooking.IsCheckedIn);
        Assert.NotNull(dbBooking.CheckedInAt);
        Assert.Equal("gatekeeper@eventland.pk", dbBooking.CheckedInBy);
        Assert.Equal("Gate VIP-1", dbBooking.GateNotes);
    }

    [Fact]
    public async Task ValidateGateTicketAsync_WhenAlreadyCheckedIn_DetectsDoubleEntry()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 50, 500, "Food Festival");

        var booking = new Booking
        {
            Id = 105,
            BookingRef = "EVL-105",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Bilal Khan",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Confirmed,
            Quantity = 1,
            IsCheckedIn = true,
            CheckedInAt = DateTimeOffset.UtcNow.AddMinutes(-10),
            CheckedInBy = "admin@eventland.pk",
            GateNotes = "Main Gate"
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var result = await service.ValidateGateTicketAsync(new ValidateGateTicketRequestDto("EVL-105"));

        Assert.False(result.IsValid);
        Assert.Equal("ALREADY_CHECKED_IN", result.Status);
        Assert.Contains("DUPLICATE ENTRY DETECTED", result.Message);
    }

    [Fact]
    public async Task ResetGateCheckInAsync_SuccessfullyResetsCheckIn()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 60, 600, "Tech Gala");

        var booking = new Booking
        {
            Id = 106,
            BookingRef = "EVL-106",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Usman Tariq",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Confirmed,
            IsCheckedIn = true,
            CheckedInAt = DateTimeOffset.UtcNow,
            CheckedInBy = "gatekeeper@eventland.pk"
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var resetResult = await service.ResetGateCheckInAsync(
            new ResetGateCheckInRequestDto("EVL-106", "Accidental scan"),
            1,
            "superadmin@eventland.pk"
        );

        Assert.True(resetResult.IsValid);
        Assert.Equal("RESET", resetResult.Status);

        var dbBooking = await context.Bookings.FindAsync(106);
        Assert.NotNull(dbBooking);
        Assert.False(dbBooking.IsCheckedIn);
        Assert.Null(dbBooking.CheckedInAt);
        Assert.Null(dbBooking.CheckedInBy);
        Assert.Contains("Accidental scan", dbBooking.GateNotes);
    }

    [Theory]
    [InlineData("EVL-10023", "EVL-10023")]
    [InlineData("EVENTLAND TICKET PASS\nID: EVL-55555\nEVENT: Fest\nVERIFY: url", "EVL-55555")]
    [InlineData("https://eventlandpk.vercel.app/verify/EVL-77889?scan=1", "EVL-77889")]
    [InlineData("/verify/EVL-99112", "EVL-99112")]
    [InlineData("?verify=EVL-44332", "EVL-44332")]
    public void ExtractBookingRef_CorrectlyParsesVariousFormats(string input, string expected)
    {
        var parsed = BookingService.ExtractBookingRef(input);
        Assert.Equal(expected, parsed);
    }
}

public class FakeGateNotificationService : INotificationService
{
    public Task SendTicketConfirmationEmailAsync(BookingDto booking) => Task.CompletedTask;
    public Task<string> GenerateWhatsAppTicketShareUrlAsync(BookingDto booking) => Task.FromResult("https://wa.me/test");
}

public class FakeGatePaymentFeeService : IPaymentFeeService
{
    public decimal CalculatePlatformFee(decimal subtotal) => 49m;
    public decimal CalculateProcessingFee(decimal subtotal, decimal percentageFee, decimal fixedFee = 0) => 0m;
    public Task<FeeCalculationResult> CalculateTotalAsync(decimal subtotal, string paymentMethod, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new FeeCalculationResult(
            Subtotal: subtotal,
            PlatformFee: 49m,
            ProcessingFee: 0m,
            TotalAmount: subtotal + 49m,
            Currency: "PKR",
            PaymentMethod: paymentMethod,
            DisplayName: "Test",
            FeePercentageAtPurchase: 0m
        ));
    }
}
