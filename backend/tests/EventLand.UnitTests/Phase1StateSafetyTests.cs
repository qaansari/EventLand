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
using EventLand.Domain.Exceptions;
using EventLand.Domain.StateMachines;
using EventLand.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

public class Phase1StateSafetyTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly TestDbContext _context;

    public Phase1StateSafetyTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<TestDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new TestDbContext(options);
        _context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private async Task<(Event ev, TicketTier tier, Seat seat, Booking booking)> SeedBookingScenarioAsync(
        BookingState initialState = BookingState.PendingHold,
        SeatState initialSeatState = SeatState.TemporarilyHeld)
    {
        var country = new Country { Id = 1, Name = "Pakistan", Code = "PK" };
        var city = new City { Id = 1, CountryId = 1, Name = "Karachi" };
        var venue = new Venue { Id = 1, CityId = 1, Name = "Arts Council", Address = "MR Kayani Rd" };
        var organizer = new Organizer { Id = 1, Name = "Arts Council", Email = "org@test.pk" };
        var ev = new Event
        {
            Id = 1,
            OrganizerId = 1,
            CountryId = 1,
            CityId = 1,
            VenueId = 1,
            Title = "Test Event",
            StartDateUtc = DateTimeOffset.UtcNow.AddDays(5),
            EndDateUtc = DateTimeOffset.UtcNow.AddDays(6),
            Status = EventStatus.Live,
            IsPublished = true
        };
        var tier = new TicketTier
        {
            Id = 1,
            EventId = 1,
            Name = "VIP",
            Price = 2000,
            AvailableQuantity = 100,
            SoldCount = 1,
            Status = TicketTierStatus.Available
        };
        var zone = new SeatingZone
        {
            Id = 1,
            EventId = 1,
            Zone = "Main Hall",
            Rows = 5,
            Cols = 5,
            Price = 2000
        };
        var seat = new Seat
        {
            Id = 1001,
            ZoneId = 1,
            Row = 1,
            Col = 1,
            Label = "A1",
            State = initialSeatState
        };

        var booking = new Booking
        {
            Id = 10,
            BookingRef = "EL-TEST-001",
            EventId = 1,
            TicketTierId = 1,
            Quantity = 1,
            TotalAmount = 2000,
            CustomerName = "Ali",
            CustomerEmail = "ali@test.pk",
            CustomerPhone = "+923001234567",
            PaymentMethod = PaymentMethod.BankTransfer,
            PaymentExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-5)
        };

        if (initialState == BookingState.Expired)
        {
            booking.ExpireHold(DateTimeOffset.UtcNow.AddMinutes(-1));
        }
        else if (initialState == BookingState.AwaitingBankVerification)
        {
            booking.SubmitBankProof("TID-123", "https://proof.test/1.png", "Ali", "HBL", "1234", DateTimeOffset.UtcNow);
        }

        _context.Countries.Add(country);
        _context.Cities.Add(city);
        _context.Venues.Add(venue);
        _context.Organizers.Add(organizer);
        _context.Events.Add(ev);
        _context.TicketTiers.Add(tier);
        _context.SeatingZones.Add(zone);
        _context.Seats.Add(seat);
        _context.Bookings.Add(booking);
        _context.BookingSeats.Add(new BookingSeat { BookingId = booking.Id, SeatId = seat.Id });
        await _context.SaveChangesAsync();

        return (ev, tier, seat, booking);
    }

    [Fact]
    public async Task AdminService_UpdateBookingStatus_RejectsIllegalExpiredToConfirmedTransition()
    {
        await SeedBookingScenarioAsync(BookingState.Expired, SeatState.Available);
        var adminService = new AdminService(_context, new FakeCacheService(), NullLogger<AdminService>.Instance);

        var act = async () => await adminService.UpdateBookingStatusAsync(
            10, new UpdateBookingStatusDto("Confirmed", "Paid"));

        await act.Should().ThrowAsync<InvalidStateTransitionException>();
        var unchanged = await _context.Bookings.AsNoTracking().FirstAsync(b => b.Id == 10);
        unchanged.State.Should().Be(BookingState.Expired);
    }

    [Fact]
    public async Task AdminService_UpdateBookingStatus_ConfirmTransitionsViaStateMachineAndBooksSeat()
    {
        await SeedBookingScenarioAsync(BookingState.AwaitingBankVerification, SeatState.TemporarilyHeld);
        var adminService = new AdminService(_context, new FakeCacheService(), NullLogger<AdminService>.Instance);

        var dto = await adminService.UpdateBookingStatusAsync(
            10, new UpdateBookingStatusDto("Confirmed", "Paid"));

        dto.Status.Should().Be("Confirmed");
        dto.PaymentStatus.Should().Be("Paid");

        var seat = await _context.Seats.AsNoTracking().FirstAsync(s => s.Id == 1001);
        seat.Status.Should().Be(SeatStatus.Booked);
        seat.State.Should().Be(SeatState.Booked);

        var history = await _context.BookingStateHistories.Where(h => h.BookingId == 10).ToListAsync();
        history.Should().Contain(h => h.ToState == BookingState.Confirmed);
    }

    [Fact]
    public async Task AdminService_UpdateBookingStatus_RejectRestoresInventoryAndReleasesSeat()
    {
        await SeedBookingScenarioAsync(BookingState.AwaitingBankVerification, SeatState.TemporarilyHeld);
        var adminService = new AdminService(_context, new FakeCacheService(), NullLogger<AdminService>.Instance);

        var dto = await adminService.UpdateBookingStatusAsync(
            10, new UpdateBookingStatusDto("Cancelled", "Failed"));

        dto.Status.Should().Be("Cancelled");
        dto.PaymentStatus.Should().Be("Failed");

        var seat = await _context.Seats.AsNoTracking().FirstAsync(s => s.Id == 1001);
        seat.Status.Should().Be(SeatStatus.Available);
        seat.State.Should().Be(SeatState.Available);

        var tier = await _context.TicketTiers.AsNoTracking().FirstAsync(t => t.Id == 1);
        tier.SoldCount.Should().Be(0);
    }

    [Fact]
    public void SeatStateMachine_BlocksIllegalTransitionsAndSyncsStatusAndState()
    {
        var seat = new Seat();
        var now = DateTimeOffset.UtcNow;

        seat.Block(now);
        seat.State.Should().Be(SeatState.Blocked);
        seat.Status.Should().Be(SeatStatus.Blocked);

        var bookBlocked = () => seat.Book(now);
        bookBlocked.Should().Throw<InvalidStateTransitionException>();

        seat.EnterMaintenance(now);
        seat.State.Should().Be(SeatState.Maintenance);
        seat.Status.Should().Be(SeatStatus.Blocked);

        seat.ExitMaintenance(now);
        seat.State.Should().Be(SeatState.Available);
        seat.Status.Should().Be(SeatStatus.Available);
    }

    [Fact]
    public async Task PendingBookingExpiryService_ResetsBothSeatStatusAndSeatState()
    {
        await SeedBookingScenarioAsync(BookingState.PendingHold, SeatState.TemporarilyHeld);

        var services = new ServiceCollection();
        services.AddSingleton<IApplicationDbContext>(_context);
        services.AddSingleton(_context);
        var provider = services.BuildServiceProvider();

        var expiryService = new PendingBookingExpiryService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<PendingBookingExpiryService>.Instance,
            new NullSeatingNotificationService());

        await expiryService.RunOnceAsync(CancellationToken.None);

        _context.ChangeTracker.Clear();
        var booking = await _context.Bookings.AsNoTracking().FirstAsync(b => b.Id == 10);
        booking.State.Should().Be(BookingState.Expired);

        var seat = await _context.Seats.AsNoTracking().FirstAsync(s => s.Id == 1001);
        seat.Status.Should().Be(SeatStatus.Available);
        seat.State.Should().Be(SeatState.Available);
    }

    private class NullSeatingNotificationService : ISeatingNotificationService
    {
        public Task BroadcastSeatsHeldAsync(int eventId, List<int> seatIds, string email, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task BroadcastSeatsReleasedAsync(int eventId, List<int> seatIds, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task BroadcastSeatStatusChangedAsync(int eventId, int seatId, string status, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task BroadcastBatchDeltasAsync(int eventId, List<SeatStateDelta> deltas, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
