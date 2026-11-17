namespace EventLand.UnitTests;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Application.Services;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

public class BaselineStateCharacterizationTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly TestDbContext _context;
    private readonly BookingService _bookingService;
    private readonly NullCacheService _cacheService;

    public BaselineStateCharacterizationTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<TestDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new TestDbContext(options);
        _context.Database.EnsureCreated();

        _cacheService = new NullCacheService();
        var notificationService = new NullNotificationService();
        var paymentFeeService = new PaymentFeeService(_context);

        _bookingService = new BookingService(
            _context,
            _cacheService,
            notificationService,
            paymentFeeService,
            NullLogger<BookingService>.Instance);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private async Task<(Event ev, TicketTier tier)> SeedEventAndTierAsync(int qty = 100, decimal price = 2500m)
    {
        var country = new Country { Name = "Pakistan", Code = "PK" };
        var city = new City { Name = "Karachi", Country = country };
        var venue = new Venue { Name = "Arts Council", City = city, Address = "M.R. Kiyani Road" };
        var organizer = new Organizer
        {
            Name = "EventLand Productions",
            BrandName = "EventLand",
            CompanyType = "Pvt. Ltd",
            RegisteredAddress = "Karachi",
            InstagramUrl = "https://instagram.com/eventland"
        };

        _context.Countries.Add(country);
        _context.Cities.Add(city);
        _context.Venues.Add(venue);
        _context.Organizers.Add(organizer);
        await _context.SaveChangesAsync();

        var ev = new Event
        {
            Title = "Characterization Test Concert",
            CountryId = country.Id,
            CityId = city.Id,
            VenueId = venue.Id,
            OrganizerId = organizer.Id,
            StartDateUtc = DateTimeOffset.UtcNow.AddDays(5),
            EndDateUtc = DateTimeOffset.UtcNow.AddDays(5).AddHours(4),
            Status = EventStatus.Live,
            IsPublished = true,
            PriceRange = "PKR 2,500",
            StartingPrice = price
        };
        _context.Events.Add(ev);
        await _context.SaveChangesAsync();

        var tier = new TicketTier
        {
            EventId = ev.Id,
            Name = "General Admission",
            Price = price,
            AvailableQuantity = qty,
            SoldCount = 0,
            Status = TicketTierStatus.Available
        };
        _context.TicketTiers.Add(tier);
        await _context.SaveChangesAsync();

        return (ev, tier);
    }

    [Fact]
    public async Task CreateBooking_PinsInitialPendingStateAnd30MinHold()
    {
        var (ev, tier) = await SeedEventAndTierAsync();

        var dto = new CreateBookingDto(
            EventId: ev.Id,
            TicketTierId: tier.Id,
            CustomerName: "Ali Khan",
            CustomerEmail: "ali@example.com",
            CustomerPhone: "03001234567",
            Quantity: 2,
            PaymentMethod: "BankTransfer",
            SelectedSeatIds: null
        );

        var booking = await _bookingService.CreateBookingAsync(dto);

        booking.Should().NotBeNull();
        booking.Status.Should().Be("Pending");
        booking.PaymentStatus.Should().Be("Pending");
        booking.PaymentMethod.Should().Be("BankTransfer");
        booking.Quantity.Should().Be(2);
        booking.TotalAmount.Should().BeGreaterThan(0);
        booking.PaymentExpiresAt.Should().NotBeNull();
        booking.PaymentExpiresAt.Value.Should().BeAfter(DateTimeOffset.UtcNow.AddMinutes(29));

        // DB inventory check
        _context.ChangeTracker.Clear();
        var updatedTier = await _context.TicketTiers.FindAsync(tier.Id);
        updatedTier!.SoldCount.Should().Be(2);
    }

    [Fact]
    public async Task SubmitPaymentProof_TransitionsToPendingVerification()
    {
        var (ev, tier) = await SeedEventAndTierAsync();
        var created = await _bookingService.CreateBookingAsync(new CreateBookingDto(
            ev.Id, tier.Id, "Sarah Ahmed", "sarah@example.com", "03123456789", 1, "BankTransfer", null));

        var proofDto = new SubmitBankPaymentProofDto(
            BankTransactionRef: "TXN-987654",
            PaymentProofUrl: "https://example.com/slip.jpg",
            SenderAccountTitle: "Sarah Ahmed",
            SenderBankName: "HBL",
            SenderAccountLast4: "4321"
        );

        var updated = await _bookingService.SubmitPaymentProofAsync(created.Id, proofDto);

        updated.PaymentStatus.Should().Be("PendingVerification");
        updated.Status.Should().Be("Pending");
        updated.BankTransactionRef.Should().Be("TXN-987654");
    }

    [Fact]
    public async Task ConfirmBankPayment_TransitionsToConfirmedAndPaid()
    {
        var (ev, tier) = await SeedEventAndTierAsync();
        var created = await _bookingService.CreateBookingAsync(new CreateBookingDto(
            ev.Id, tier.Id, "Tariq Aziz", "tariq@example.com", "03331234567", 1, "BankTransfer", null));

        var confirmed = await _bookingService.ConfirmBankPaymentAsync(
            created.Id, new ConfirmBankPaymentDto(Notes: "Verified receipt"), 1, "admin@eventland.pk");

        confirmed.Status.Should().Be("Confirmed");
        confirmed.PaymentStatus.Should().Be("Paid");
        confirmed.PaidAt.Should().NotBeNull();
        confirmed.VerifiedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task RejectBankPayment_TransitionsToCancelledAndFailed_AndRestoresInventory()
    {
        var (ev, tier) = await SeedEventAndTierAsync();
        var created = await _bookingService.CreateBookingAsync(new CreateBookingDto(
            ev.Id, tier.Id, "Hamza Tariq", "hamza@example.com", "03451234567", 3, "BankTransfer", null));

        var rejected = await _bookingService.RejectBankPaymentAsync(
            created.Id, new RejectBankPaymentDto(Reason: "Fake receipt uploaded"), 1, "admin@eventland.pk");

        rejected.Status.Should().Be("Cancelled");
        rejected.PaymentStatus.Should().Be("Failed");

        var updatedTier = await _context.TicketTiers.FindAsync(tier.Id);
        updatedTier!.SoldCount.Should().Be(0); // Restored!
    }

    [Fact]
    public async Task ValidateGateTicket_DetectsUnpaid_AndDoubleCheckIn()
    {
        var (ev, tier) = await SeedEventAndTierAsync();
        var created = await _bookingService.CreateBookingAsync(new CreateBookingDto(
            ev.Id, tier.Id, "Bilal Qureshi", "bilal@example.com", "03011234567", 1, "BankTransfer", null));

        // 1. Unpaid ticket test
        var unpaidResult = await _bookingService.ValidateGateTicketAsync(
            new ValidateGateTicketRequestDto(created.BookingRef, ev.Id, null));
        unpaidResult.IsValid.Should().BeFalse();
        unpaidResult.Status.Should().Be("UNPAID");

        // 2. Confirm booking
        await _bookingService.ConfirmBankPaymentAsync(
            created.Id, new ConfirmBankPaymentDto(Notes: "Verified"), 1, "admin@eventland.pk");

        // 3. First gate scan -> Approved
        var firstScan = await _bookingService.ValidateGateTicketAsync(
            new ValidateGateTicketRequestDto(created.BookingRef, ev.Id, null), 1, "gate@eventland.pk");
        firstScan.IsValid.Should().BeTrue();
        firstScan.Status.Should().Be("APPROVED");

        // 4. Second gate scan -> ALREADY_CHECKED_IN
        var secondScan = await _bookingService.ValidateGateTicketAsync(
            new ValidateGateTicketRequestDto(created.BookingRef, ev.Id, null), 1, "gate@eventland.pk");
        secondScan.IsValid.Should().BeFalse();
        secondScan.Status.Should().Be("ALREADY_CHECKED_IN");
    }

    private class NullCacheService : ICacheService
    {
        public Task<T?> GetAsync<T>(string key) => Task.FromResult<T?>(default);
        public Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null) => Task.CompletedTask;
        public Task RemoveAsync(string key) => Task.CompletedTask;
        public Task RemoveByPrefixAsync(string prefixKey) => Task.CompletedTask;
        public Task ClearEventCacheAsync(int? eventId = null) => Task.CompletedTask;
        public Task<SeatHoldResult> TryHoldSeatsGranularAsync(int eventId, List<int> seatIds, string ownerToken, TimeSpan holdDuration, int? eventShowId = null) => Task.FromResult(new SeatHoldResult(true, new List<int>(), DateTimeOffset.UtcNow.Add(holdDuration)));
        public Task<bool> HoldSeatsAsync(int eventId, List<int> seatIds, string email, TimeSpan holdDuration, int? eventShowId = null) => Task.FromResult(true);
        public Task ReleaseSeatsAsync(int eventId, List<int> seatIds, int? eventShowId = null, string? expectedOwnerEmail = null) => Task.CompletedTask;
        public Task<List<int>> GetHeldSeatIdsAsync(int eventId, int? eventShowId = null) => Task.FromResult(new List<int>());
    }

    private class NullNotificationService : INotificationService
    {
        public Task SendTicketConfirmationEmailAsync(BookingDto booking) => Task.CompletedTask;
        public Task<string> GenerateWhatsAppTicketShareUrlAsync(BookingDto booking) => Task.FromResult("https://wa.me/test");
    }
}
