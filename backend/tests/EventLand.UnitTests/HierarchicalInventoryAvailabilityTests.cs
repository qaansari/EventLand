namespace EventLand.UnitTests;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Application.Services;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Domain.Services;
using EventLand.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

public class HierarchicalInventoryAvailabilityTests : IAsyncLifetime
{
    private SqliteConnection _connection = null!;
    private TestDbContext _context = null!;
    private ICacheService _cacheService = null!;
    private INotificationService _notificationService = null!;
    private IPaymentFeeService _paymentFeeService = null!;
    private BookingService _bookingService = null!;

    public async Task InitializeAsync()
    {
        _connection = new SqliteConnection("DataSource=:memory:;Cache=Shared");
        await _connection.OpenAsync();

        using var command = _connection.CreateCommand();
        command.CommandText = "PRAGMA busy_timeout = 5000;";
        await command.ExecuteNonQueryAsync();

        var options = new DbContextOptionsBuilder<TestDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new TestDbContext(options);
        await _context.Database.EnsureCreatedAsync();

        _cacheService = new NullCacheService();
        _notificationService = new NullNotificationService();
        _paymentFeeService = new PaymentFeeService(_context);

        _bookingService = new BookingService(
            _context,
            _cacheService,
            _notificationService,
            _paymentFeeService,
            NullLogger<BookingService>.Instance,
            gateQrSignatureService: null,
            timeProvider: TimeProvider.System
        );
    }

    public async Task DisposeAsync()
    {
        await _context.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private async Task<(Event ev, EventShow show, TicketTier tier)> SeedHierarchyAsync(
        int totalQuantity = 10,
        int soldCount = 0,
        bool isPublished = true,
        EventStatus eventStatus = EventStatus.Live,
        bool isShowClosed = false,
        TicketTierStatus tierStatus = TicketTierStatus.Available,
        DateTimeOffset? eventEnd = null,
        DateTimeOffset? showEnd = null)
    {
        var country = new Country { Name = "Pakistan", Code = "PK" };
        var city = new City { Name = "Lahore", Country = country };
        var venue = new Venue { Name = "Alhamra Hall", Address = "Mall Rd", City = city };
        var organizer = new Organizer { Name = "Arts Council", Email = "contact@artscouncil.pk", Phone = "03001234567" };

        _context.Countries.Add(country);
        _context.Cities.Add(city);
        _context.Venues.Add(venue);
        _context.Organizers.Add(organizer);
        await _context.SaveChangesAsync();

        var ev = new Event
        {
            Title = "Sufi Music Festival 2026",
            CountryId = country.Id,
            CityId = city.Id,
            VenueId = venue.Id,
            OrganizerId = organizer.Id,
            Status = eventStatus,
            IsPublished = isPublished,
            StartDateUtc = DateTimeOffset.UtcNow.AddDays(5),
            EndDateUtc = eventEnd ?? DateTimeOffset.UtcNow.AddDays(7)
        };
        _context.Events.Add(ev);
        await _context.SaveChangesAsync();

        var show = new EventShow
        {
            EventId = ev.Id,
            ShowTitle = "Opening Gala Night",
            StartTimeUtc = DateTimeOffset.UtcNow.AddDays(5).AddHours(18),
            EndTimeUtc = showEnd ?? DateTimeOffset.UtcNow.AddDays(5).AddHours(22),
            IsClosed = isShowClosed
        };
        _context.EventShows.Add(show);
        await _context.SaveChangesAsync();

        var tier = new TicketTier
        {
            EventId = ev.Id,
            EventShowId = show.Id,
            Name = "VIP Pass",
            Price = 5000m,
            AvailableQuantity = totalQuantity,
            SoldCount = soldCount,
            Status = tierStatus,
            MaxPerOrder = 10
        };
        _context.TicketTiers.Add(tier);
        await _context.SaveChangesAsync();

        return (ev, show, tier);
    }

    [Fact]
    public void AvailabilityPolicy_EvaluatesAllHierarchyStatusesCorrectly()
    {
        var now = DateTimeOffset.UtcNow;

        // 1. Bookable
        var ev = new Event { Title = "Live Event", IsPublished = true, Status = EventStatus.Live, EndDateUtc = now.AddDays(1) };
        var show = new EventShow { ShowTitle = "Evening Show", IsClosed = false, EndTimeUtc = now.AddHours(5) };
        var tier = new TicketTier { Name = "General", Status = TicketTierStatus.Available, AvailableQuantity = 100, SoldCount = 10 };
        var result1 = AvailabilityPolicy.Evaluate(ev, show, tier, now);
        result1.Status.Should().Be(AvailabilityStatus.Bookable);
        result1.IsBookable.Should().BeTrue();
        result1.Code.Should().Be("AVAILABLE");

        // 2. NotPublished (Event unpublished)
        ev.IsPublished = false;
        var result2 = AvailabilityPolicy.Evaluate(ev, show, tier, now);
        result2.Status.Should().Be(AvailabilityStatus.NotPublished);
        result2.IsBookable.Should().BeFalse();
        result2.Code.Should().Be("NOT_PUBLISHED");
        ev.IsPublished = true;

        // 3. NotPublished (Event deleted)
        ev.IsDeleted = true;
        var result3 = AvailabilityPolicy.Evaluate(ev, show, tier, now);
        result3.Status.Should().Be(AvailabilityStatus.NotPublished);
        result3.Code.Should().Be("EVENT_NOT_FOUND");
        ev.IsDeleted = false;

        // 4. NotYetOnSale (Upcoming event)
        ev.Status = EventStatus.Upcoming;
        var result4 = AvailabilityPolicy.Evaluate(ev, show, tier, now);
        result4.Status.Should().Be(AvailabilityStatus.NotYetOnSale);
        result4.Code.Should().Be("NOT_YET_ON_SALE");
        ev.Status = EventStatus.Live;

        // 5. EventClosed
        ev.CloseEvent();
        var result5 = AvailabilityPolicy.Evaluate(ev, show, tier, now);
        result5.Status.Should().Be(AvailabilityStatus.EventClosed);
        result5.Code.Should().Be("EVENT_CLOSED");
        ev.ReopenEvent();

        // 6. ShowDeleted
        show.IsDeleted = true;
        var result6 = AvailabilityPolicy.Evaluate(ev, show, tier, now);
        result6.Status.Should().Be(AvailabilityStatus.ShowDeleted);
        result6.Code.Should().Be("SHOW_DELETED");
        show.IsDeleted = false;

        // 7. ShowClosed
        show.CloseShow();
        var result7 = AvailabilityPolicy.Evaluate(ev, show, tier, now);
        result7.Status.Should().Be(AvailabilityStatus.ShowClosed);
        result7.Code.Should().Be("SHOW_CLOSED");
        show.ReopenShow();

        // 8. TierClosed
        tier.CloseTier();
        var result8 = AvailabilityPolicy.Evaluate(ev, show, tier, now);
        result8.Status.Should().Be(AvailabilityStatus.TierClosed);
        result8.Code.Should().Be("TIER_CLOSED");
        tier.ReopenTier();

        // 9. SoldOut (capacity reached)
        tier.SoldCount = 100;
        var result9 = AvailabilityPolicy.Evaluate(ev, show, tier, now);
        result9.Status.Should().Be(AvailabilityStatus.SoldOut);
        result9.Code.Should().Be("SOLD_OUT");

        // 10. SaleEnded (Event concluded)
        tier.SoldCount = 10;
        ev.EndDateUtc = now.AddMinutes(-5);
        var result10 = AvailabilityPolicy.Evaluate(ev, show, tier, now);
        result10.Status.Should().Be(AvailabilityStatus.SaleEnded);
        result10.Code.Should().Be("SALE_ENDED");
    }

    [Fact]
    public void Event_DynamicStatusProjection_ReflectsInventoryState()
    {
        var ev = new Event { Title = "Concert", Status = EventStatus.Live, IsPublished = true };
        var tier1 = new TicketTier { Name = "Standard", AvailableQuantity = 100, SoldCount = 0, Status = TicketTierStatus.Available };
        var tier2 = new TicketTier { Name = "VIP", AvailableQuantity = 50, SoldCount = 0, Status = TicketTierStatus.Available };
        ev.TicketTiers.Add(tier1);
        ev.TicketTiers.Add(tier2);

        // Initial state: 0 / 150 sold -> Live
        ev.RecomputeDynamicStatus(0.8);
        ev.Status.Should().Be(EventStatus.Live);

        // 110 / 150 sold (73.3%) -> still Live
        tier1.SoldCount = 80;
        tier2.SoldCount = 30;
        ev.RecomputeDynamicStatus(0.8);
        ev.Status.Should().Be(EventStatus.Live);

        // 120 / 150 sold (80%) -> SellingFast!
        tier1.SoldCount = 90;
        tier2.SoldCount = 30;
        ev.RecomputeDynamicStatus(0.8);
        ev.Status.Should().Be(EventStatus.SellingFast);

        // 150 / 150 sold (100%) -> SoldOut!
        tier1.SoldCount = 100;
        tier2.SoldCount = 50;
        ev.RecomputeDynamicStatus(0.8);
        ev.Status.Should().Be(EventStatus.SoldOut);

        // Intentionally closed event does not get overwritten by recomputation
        ev.CloseEvent();
        ev.RecomputeDynamicStatus(0.8);
        ev.Status.Should().Be(EventStatus.Closed);
    }

    [Fact]
    public async Task CreateBooking_RejectsWhenAvailabilityPolicyFails()
    {
        // 1. Unpublished Event
        var (evUnpub, show1, tier1) = await SeedHierarchyAsync(isPublished: false);
        var actUnpub = async () => await _bookingService.CreateBookingAsync(new CreateBookingDto(
            evUnpub.Id, tier1.Id, "Buyer", "buyer@example.com", "03001234567", 1, "BankTransfer", null, EventShowId: show1.Id));
        await actUnpub.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*unpublished*");

        // 2. Closed Show
        var (evShowClosed, showClosed, tier2) = await SeedHierarchyAsync(isShowClosed: true);
        var actShowClosed = async () => await _bookingService.CreateBookingAsync(new CreateBookingDto(
            evShowClosed.Id, tier2.Id, "Buyer", "buyer@example.com", "03001234567", 1, "BankTransfer", null, EventShowId: showClosed.Id));
        await actShowClosed.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*closed*");

        // 3. Sold Out Tier
        var (evSoldOut, show3, tierSoldOut) = await SeedHierarchyAsync(totalQuantity: 5, soldCount: 5);
        var actSoldOut = async () => await _bookingService.CreateBookingAsync(new CreateBookingDto(
            evSoldOut.Id, tierSoldOut.Id, "Buyer", "buyer@example.com", "03001234567", 1, "BankTransfer", null, EventShowId: show3.Id));
        await actSoldOut.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*sold out*");
    }

    [Fact]
    public async Task ConcurrentBooking_LastTicketRace_ExactlyOneSucceeds()
    {
        // Tier with exactly 1 ticket remaining
        var (ev, show, tier) = await SeedHierarchyAsync(totalQuantity: 1, soldCount: 0);

        const int concurrentAttempts = 10;
        var tasks = Enumerable.Range(1, concurrentAttempts).Select(async i =>
        {
            // Each concurrent worker gets its own DbContext on the shared in-memory connection
            var options = new DbContextOptionsBuilder<TestDbContext>()
                .UseSqlite(_connection)
                .Options;

            using var workerContext = new TestDbContext(options);
            var workerBookingService = new BookingService(
                workerContext,
                _cacheService,
                _notificationService,
                _paymentFeeService,
                NullLogger<BookingService>.Instance,
                gateQrSignatureService: null,
                timeProvider: TimeProvider.System
            );

            try
            {
                var dto = new CreateBookingDto(
                    EventId: ev.Id,
                    TicketTierId: tier.Id,
                    CustomerName: $"User {i}",
                    CustomerEmail: $"user{i}@example.com",
                    CustomerPhone: "03001234567",
                    Quantity: 1,
                    PaymentMethod: "BankTransfer",
                    SelectedSeatIds: null,
                    EventShowId: show.Id
                );

                var booking = await workerBookingService.CreateBookingAsync(dto);
                return (Success: true, Booking: booking, Error: (string?)null);
            }
            catch (Exception ex)
            {
                return (Success: false, Booking: (BookingDto?)null, Error: ex.Message);
            }
        });

        var results = await Task.WhenAll(tasks);

        var successCount = results.Count(r => r.Success);
        var failureCount = results.Count(r => !r.Success);

        successCount.Should().Be(1, "Exactly one concurrent customer can claim the final remaining ticket");
        failureCount.Should().Be(concurrentAttempts - 1, "All other concurrent attempts must be rejected with inventory exhaustion");

        // Verify DB invariant: SoldCount must be exactly 1, not over-sold
        _context.ChangeTracker.Clear();
        var verifiedTier = await _context.TicketTiers.FindAsync(tier.Id);
        verifiedTier!.SoldCount.Should().Be(1);
    }

    [Fact]
    public async Task DynamicStatusRecomputation_UpdatesEventToSellingFastAndSoldOut()
    {
        // Event with 10 total tickets
        var (ev, show, tier) = await SeedHierarchyAsync(totalQuantity: 10, soldCount: 0);

        // 1. Book 8 tickets (80% capacity)
        var booking1 = await _bookingService.CreateBookingAsync(new CreateBookingDto(
            ev.Id, tier.Id, "Bulk Buyer", "bulk@example.com", "03001234567", 8, "BankTransfer", null, EventShowId: show.Id));

        _context.ChangeTracker.Clear();
        var dbEventAfter8 = await _context.Events.FindAsync(ev.Id);
        dbEventAfter8!.Status.Should().Be(EventStatus.SellingFast);

        // 2. Book remaining 2 tickets (100% capacity)
        var booking2 = await _bookingService.CreateBookingAsync(new CreateBookingDto(
            ev.Id, tier.Id, "Final Buyer", "final@example.com", "03001234567", 2, "BankTransfer", null, EventShowId: show.Id));

        _context.ChangeTracker.Clear();
        var dbEventAfter10 = await _context.Events.FindAsync(ev.Id);
        dbEventAfter10!.Status.Should().Be(EventStatus.SoldOut);

        // 3. Reject the second booking -> SoldCount restores to 8 -> Status moves back to SellingFast
        await _bookingService.RejectBankPaymentAsync(booking2.Id, new RejectBankPaymentDto(Reason: "Invalid proof"), 1, "admin@eventland.pk");

        _context.ChangeTracker.Clear();
        var dbEventAfterReject = await _context.Events.FindAsync(ev.Id);
        dbEventAfterReject!.Status.Should().Be(EventStatus.SellingFast);
    }

    private class NullCacheService : ICacheService
    {
        public Task<T?> GetAsync<T>(string key) => Task.FromResult<T?>(default);
        public Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null) => Task.CompletedTask;
        public Task RemoveAsync(string key) => Task.CompletedTask;
        public Task RemoveByPrefixAsync(string prefixKey) => Task.CompletedTask;
        public Task ClearEventCacheAsync(int? eventId = null) => Task.CompletedTask;
        public Task<SeatHoldResult> TryHoldSeatsGranularAsync(int eventId, List<int> seatIds, string ownerToken, TimeSpan holdDuration, int? eventShowId = null) =>
            Task.FromResult(new SeatHoldResult(true, new List<int>(), DateTimeOffset.UtcNow.Add(holdDuration)));
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
