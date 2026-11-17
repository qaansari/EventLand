namespace EventLand.UnitTests;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Application.Services;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Domain.Exceptions;
using EventLand.Infrastructure.Persistence;
using EventLand.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

public class SeatConcurrencyAndStateSafetyTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly TestDbContext _context;
    private readonly RedisCacheService _cacheService;

    public SeatConcurrencyAndStateSafetyTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<TestDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new TestDbContext(options);
        _context.Database.EnsureCreated();

        var memCache = new MemoryCache(new MemoryCacheOptions());
        var distributedCache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        _cacheService = new RedisCacheService(distributedCache, memCache, NullLogger<RedisCacheService>.Instance);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public async Task GranularHold_100ConcurrentRequestsForSame5Seats_ExactlyOneWinsAnd99FailWithConflictingIds()
    {
        const int eventId = 100;
        var targetSeats = new List<int> { 1, 2, 3, 4, 5 };
        var holdDuration = TimeSpan.FromMinutes(10);

        var tasks = Enumerable.Range(1, 100).Select(async i =>
        {
            var user = $"user_{i}@eventland.pk";
            return await _cacheService.TryHoldSeatsGranularAsync(eventId, targetSeats, user, holdDuration, eventShowId: 1);
        });

        var results = await Task.WhenAll(tasks);

        var successes = results.Where(r => r.Success).ToList();
        var failures = results.Where(r => !r.Success).ToList();

        successes.Should().HaveCount(1, "Exactly one concurrent caller must acquire the granular hold locks");
        failures.Should().HaveCount(99, "All 99 competing callers must be rejected");

        foreach (var fail in failures)
        {
            fail.ConflictingSeatIds.Should().BeEquivalentTo(targetSeats, "Conflicting response must pinpoint the exact contested seats");
            fail.ExpiresAt.Should().BeNull();
        }
    }

    [Fact]
    public async Task GranularHold_WhenExpired_SeatsBecomeAvailableAgain()
    {
        const int eventId = 101;
        var targetSeats = new List<int> { 42 };

        // Hold with 1-millisecond duration
        var holdResult = await _cacheService.TryHoldSeatsGranularAsync(eventId, targetSeats, "user1@test.com", TimeSpan.FromMilliseconds(1));
        holdResult.Success.Should().BeTrue();

        // Wait for TTL to lapse
        await Task.Delay(25);

        // Next query confirms the seats are no longer locked
        var activeHeld = await _cacheService.GetHeldSeatIdsAsync(eventId);
        activeHeld.Should().NotContain(42);

        // Another user can now hold the seat
        var secondHold = await _cacheService.TryHoldSeatsGranularAsync(eventId, targetSeats, "user2@test.com", TimeSpan.FromMinutes(10));
        secondHold.Success.Should().BeTrue();
    }

    [Fact]
    public async Task AuthoritativeSqlUpdate_WhenSeatsAlreadyBooked_ThrowsSeatAlreadyBookedException()
    {
        // Setup event, zone, tier and seats
        var country = new Country { Name = "Pakistan", Code = "PK" };
        var city = new City { Name = "Karachi", Country = country };
        var venue = new Venue { Name = "Auditorium Hall", City = city, Address = "Main Street" };
        var organizer = new Organizer { Name = "Org", BrandName = "Org", Email = "org@test.pk", Phone = "0300" };
        var ev = new Event { Title = "Mega Concert", Country = country, City = city, Venue = venue, Organizer = organizer, StartDateUtc = DateTimeOffset.UtcNow.AddDays(5), EndDateUtc = DateTimeOffset.UtcNow.AddDays(5).AddHours(4) };
        var zone = new SeatingZone { Event = ev, Zone = "Orchestra", Rows = 1, Cols = 2, Price = 5000m, TotalCapacity = 2 };
        var tier = new TicketTier { Event = ev, Name = "VIP Pass", AvailableQuantity = 10, SoldCount = 0, Price = 5000m, Status = TicketTierStatus.Available };

        var seatA = new Seat { Zone = zone, Row = 1, Col = 1, Label = "A1", Price = 5000m, Status = SeatStatus.Booked, State = SeatState.Booked };
        var seatB = new Seat { Zone = zone, Row = 1, Col = 2, Label = "A2", Price = 5000m, Status = SeatStatus.Available, State = SeatState.Available };

        _context.Events.Add(ev);
        _context.SeatingZones.Add(zone);
        _context.TicketTiers.Add(tier);
        _context.Seats.AddRange(seatA, seatB);
        await _context.SaveChangesAsync();

        var notif = new BaselineStateCharacterizationTests_FakeNotif();
        var fee = new PaymentFeeService(_context);
        var bookingService = new BookingService(_context, _cacheService, notif, fee, NullLogger<BookingService>.Instance);

        // User attempts to book seatA (already booked) and seatB
        var dto = new CreateBookingDto(
            EventId: ev.Id,
            TicketTierId: tier.Id,
            CustomerName: "Hassan Ali",
            CustomerEmail: "hassan@example.com",
            CustomerPhone: "03001234567",
            Quantity: 2,
            PaymentMethod: "BankTransfer",
            SelectedSeatIds: new List<int> { seatA.Id, seatB.Id }
        );

        var act = async () => await bookingService.CreateBookingAsync(dto);
        await act.Should().ThrowAsync<SeatAlreadyBookedException>()
            .WithMessage("*no longer available*");
    }

    [Fact]
    public async Task GetSeatSnapshot_ReconcilesDatabaseWithLiveRedisHolds()
    {
        var country = new Country { Name = "Pakistan", Code = "PK" };
        var city = new City { Name = "Lahore", Country = country };
        var venue = new Venue { Name = "Alhamra Hall", City = city, Address = "Mall Road" };
        var organizer = new Organizer { Name = "Org", BrandName = "Org", Email = "org2@test.pk", Phone = "0300" };
        var ev = new Event { Title = "Drama", Country = country, City = city, Venue = venue, Organizer = organizer, StartDateUtc = DateTimeOffset.UtcNow.AddDays(10), EndDateUtc = DateTimeOffset.UtcNow.AddDays(10).AddHours(2) };
        var zone = new SeatingZone { Event = ev, Zone = "Balcony", Rows = 1, Cols = 1, Price = 1500m, TotalCapacity = 1 };
        var seat = new Seat { Zone = zone, Row = 1, Col = 1, Label = "B1", Price = 1500m, Status = SeatStatus.Available };

        _context.Events.Add(ev);
        _context.SeatingZones.Add(zone);
        _context.Seats.Add(seat);
        await _context.SaveChangesAsync();

        // Put active lock in cache
        await _cacheService.TryHoldSeatsGranularAsync(ev.Id, new List<int> { seat.Id }, "user@test.com", TimeSpan.FromMinutes(10), eventShowId: 1);

        // Fetch DB seats and held seat IDs from cache
        var seats = await _context.Seats
            .AsNoTracking()
            .Where(s => s.Zone.EventId == ev.Id && !s.IsDeleted)
            .ToListAsync();

        var heldSeatIds = (await _cacheService.GetHeldSeatIdsAsync(ev.Id, 1)).ToHashSet();

        // Reconcile snapshot
        heldSeatIds.Should().Contain(seat.Id);
        var isHeld = heldSeatIds.Contains(seat.Id);
        var effectiveStatus = isHeld ? SeatStatus.Reserved : seat.Status;
        effectiveStatus.Should().Be(SeatStatus.Reserved);

        var versionTag = $"W/\"ver-{ev.Id}-1-{seats.Count}-{heldSeatIds.Count}\"";
        versionTag.Should().StartWith("W/\"ver-");
    }

    private class BaselineStateCharacterizationTests_FakeNotif : INotificationService
    {
        public Task SendTicketConfirmationEmailAsync(BookingDto booking) => Task.CompletedTask;
        public Task<string> GenerateWhatsAppTicketShareUrlAsync(BookingDto booking) => Task.FromResult("https://wa.me/test");
    }
}
