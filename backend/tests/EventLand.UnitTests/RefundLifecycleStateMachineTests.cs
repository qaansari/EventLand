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
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Xunit;

public class RefundLifecycleStateMachineTests : IAsyncLifetime
{
    private SqliteConnection _connection = null!;
    private TestDbContext _context = null!;
    private FakeTimeProvider _fakeTimeProvider = null!;
    private TestCacheService _cacheService = null!;
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

        _fakeTimeProvider = new FakeTimeProvider(new DateTimeOffset(2026, 11, 18, 12, 0, 0, TimeSpan.Zero));
        _cacheService = new TestCacheService();

        var paymentFeeService = new PaymentFeeService(_context);
        var notificationService = new TestNotificationService();

        _bookingService = new BookingService(
            _context,
            _cacheService,
            notificationService,
            paymentFeeService,
            NullLogger<BookingService>.Instance,
            gateQrSignatureService: null,
            timeProvider: _fakeTimeProvider
        );
    }

    public async Task DisposeAsync()
    {
        await _context.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private async Task<(Event ev, TicketTier tier, Seat seat)> SeedEventTierAndSeatAsync()
    {
        var country = new Country { Name = "Pakistan", Code = "PK" };
        var city = new City { Name = "Lahore", Country = country };
        var venue = new Venue { Name = "Alhamra Hall 1", Address = "Mall Rd", City = city };
        var organizer = new Organizer { Name = "Concert Org", Email = "org@example.com", Phone = "03001234567" };

        _context.Countries.Add(country);
        _context.Cities.Add(city);
        _context.Venues.Add(venue);
        _context.Organizers.Add(organizer);
        await _context.SaveChangesAsync();

        var ev = new Event
        {
            Title = "Grand Concert",
            CountryId = country.Id,
            CityId = city.Id,
            VenueId = venue.Id,
            OrganizerId = organizer.Id,
            Status = EventStatus.Live,
            IsPublished = true,
            StartDateUtc = _fakeTimeProvider.GetUtcNow().AddDays(3),
            EndDateUtc = _fakeTimeProvider.GetUtcNow().AddDays(4)
        };
        _context.Events.Add(ev);
        await _context.SaveChangesAsync();

        var tier = new TicketTier
        {
            EventId = ev.Id,
            Name = "VIP Pass",
            Price = 5000m,
            AvailableQuantity = 10,
            SoldCount = 1,
            Status = TicketTierStatus.Available
        };
        _context.TicketTiers.Add(tier);

        var zone = new SeatingZone
        {
            EventId = ev.Id,
            Zone = "Row A",
            Rows = 1,
            Cols = 10,
            Price = 5000m,
            TotalCapacity = 10
        };
        _context.SeatingZones.Add(zone);
        await _context.SaveChangesAsync();

        var seat = new Seat
        {
            ZoneId = zone.Id,
            Row = 1,
            Col = 1,
            Label = "A1",
            Price = 5000m,
            Status = SeatStatus.Booked
        };
        _context.Seats.Add(seat);
        await _context.SaveChangesAsync();

        return (ev, tier, seat);
    }

    private async Task<Booking> SeedConfirmedBookingAsync(Event ev, TicketTier tier, Seat seat)
    {
        var booking = new Booking
        {
            EventId = ev.Id,
            TicketTierId = tier.Id,
            BookingRef = "EVL-777888",
            CustomerName = "Asad Mehmood",
            CustomerEmail = "asad@example.com",
            CustomerPhone = "03001234567",
            Quantity = 1,
            UnitPrice = 5000m,
            SubtotalAmount = 5000m,
            PlatformFee = 50m,
            TotalAmount = 5050m,
            State = BookingState.Confirmed,
            Status = BookingStatus.Confirmed,
            PaymentStatus = PaymentStatus.Paid,
            PaymentMethod = PaymentMethod.BankTransfer,
            PaidAt = _fakeTimeProvider.GetUtcNow().AddHours(-2),
            ScanState = TicketScanState.Issued
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        var bookingSeat = new BookingSeat
        {
            BookingId = booking.Id,
            SeatId = seat.Id
        };
        _context.BookingSeats.Add(bookingSeat);
        await _context.SaveChangesAsync();

        return booking;
    }

    [Fact]
    public void RefundStateMachine_ValidatesTransitionsCorrectly()
    {
        // Valid forward flow: Requested -> Approved -> Processed
        RefundStateMachine.CanTransition(RefundStatus.Requested, RefundStatus.Approved, RefundStateMachine.TriggerApprove).Should().BeTrue();
        RefundStateMachine.CanTransition(RefundStatus.Approved, RefundStatus.Processed, RefundStateMachine.TriggerProcess).Should().BeTrue();

        // Valid reject flow: Requested -> Rejected
        RefundStateMachine.CanTransition(RefundStatus.Requested, RefundStatus.Rejected, RefundStateMachine.TriggerReject).Should().BeTrue();

        // Valid failure & retry flow: Approved -> Failed -> Approved
        RefundStateMachine.CanTransition(RefundStatus.Approved, RefundStatus.Failed, RefundStateMachine.TriggerFail).Should().BeTrue();
        RefundStateMachine.CanTransition(RefundStatus.Failed, RefundStatus.Approved, RefundStateMachine.TriggerRetry).Should().BeTrue();

        // Invalid transitions
        RefundStateMachine.CanTransition(RefundStatus.Requested, RefundStatus.Processed, RefundStateMachine.TriggerProcess).Should().BeFalse();
        RefundStateMachine.CanTransition(RefundStatus.Approved, RefundStatus.Rejected, RefundStateMachine.TriggerReject).Should().BeFalse();
        RefundStateMachine.CanTransition(RefundStatus.Processed, RefundStatus.Approved, RefundStateMachine.TriggerApprove).Should().BeFalse();
        RefundStateMachine.CanTransition(RefundStatus.Rejected, RefundStatus.Approved, RefundStateMachine.TriggerApprove).Should().BeFalse();

        // ValidateTransition throws InvalidStateTransitionException on invalid path
        var actInvalid = () => RefundStateMachine.ValidateTransition(RefundStatus.Requested, RefundStatus.Processed, RefundStateMachine.TriggerProcess);
        actInvalid.Should().Throw<InvalidStateTransitionException>()
            .WithMessage("*cannot transition from 'Requested' to 'Processed'*");
    }

    [Fact]
    public void RefundRecord_AggregateBehaviorMethods_EnforceTransitionGuards()
    {
        var now = _fakeTimeProvider.GetUtcNow();
        var record = RefundRecord.CreateRequested(1, 5000m, "Customer requested", 1, "admin@eventland.pk", now);

        record.Status.Should().Be(RefundStatus.Requested);
        record.Amount.Should().Be(5000m);

        // 1. Approve
        record.Approve(1, "admin@eventland.pk", now.AddMinutes(5), "Approved by Finance");
        record.Status.Should().Be(RefundStatus.Approved);
        record.Reason.Should().Be("Approved by Finance");

        // 2. Process
        record.Process(1, "admin@eventland.pk", now.AddMinutes(10), "REF-HBL-999");
        record.Status.Should().Be(RefundStatus.Processed);
        record.ProviderRefundRef.Should().Be("REF-HBL-999");

        // 3. Attempting to approve an already processed refund throws
        var actInvalid = () => record.Approve(1, "admin@eventland.pk", now.AddMinutes(15));
        actInvalid.Should().Throw<InvalidStateTransitionException>();
    }

    [Fact]
    public async Task ProcessBankRefundAsync_ExecutesAtomically_AndIsIdempotent()
    {
        var (ev, tier, seat) = await SeedEventTierAndSeatAsync();
        var booking = await SeedConfirmedBookingAsync(ev, tier, seat);

        var refundDto = new ProcessBankRefundRequestDto(
            BookingId: booking.Id,
            Amount: 5050m,
            Reason: "Event date moved",
            ProviderRefundRef: "BANK-TXN-REFUND-001"
        );

        // 1. First execution: Full refund execution
        var result1 = await _bookingService.ProcessBankRefundAsync(refundDto, 1, "superadmin@eventland.pk");

        result1.Success.Should().BeTrue();
        result1.Amount.Should().Be(5050m);
        result1.Status.Should().Be("Processed");

        // DB Invariant Assertions:
        _context.ChangeTracker.Clear();
        var dbBooking = await _context.Bookings.FindAsync(booking.Id);
        dbBooking!.State.Should().Be(BookingState.Refunded);
        dbBooking.PaymentStatus.Should().Be(PaymentStatus.Refunded);
        dbBooking.ScanState.Should().Be(TicketScanState.Revoked);
        dbBooking.RefundedAt.Should().NotBeNull();
        dbBooking.RefundReason.Should().Be("Event date moved");

        // Inventory restored: SoldCount decremented
        var dbTier = await _context.TicketTiers.FindAsync(tier.Id);
        dbTier!.SoldCount.Should().Be(0);

        // Seat returned to Available
        var dbSeat = await _context.Seats.FindAsync(seat.Id);
        dbSeat!.Status.Should().Be(SeatStatus.Available);
        dbSeat.State.Should().Be(SeatState.Available);

        // Refund record created
        var dbRefund = await _context.RefundRecords.FirstOrDefaultAsync(r => r.BookingId == booking.Id);
        dbRefund.Should().NotBeNull();
        dbRefund!.Status.Should().Be(RefundStatus.Processed);
        dbRefund.Amount.Should().Be(5050m);
        dbRefund.ProviderRefundRef.Should().Be("BANK-TXN-REFUND-001");

        // Outbox message enqueued
        var outboxMsg = await _context.OutboxMessages.FirstOrDefaultAsync(m => m.EventType == "BookingRefundedEvent");
        outboxMsg.Should().NotBeNull();
        outboxMsg!.PayloadJson.Should().Contain(booking.BookingRef);

        // Gate scan verification: Ticket is revoked!
        var scanResult = await _bookingService.ValidateGateTicketAsync(
            new ValidateGateTicketRequestDto(booking.BookingRef, ev.Id, null));
        scanResult.IsValid.Should().BeFalse();
        scanResult.Status.Should().Be("REFUNDED");

        // 2. Second execution (Double-Click Replay): Idempotent repeat call
        var result2 = await _bookingService.ProcessBankRefundAsync(refundDto, 1, "superadmin@eventland.pk");

        result2.Success.Should().BeTrue();
        result2.RefundId.Should().Be(dbRefund.Id);
        result2.Message.Should().Contain("already been refunded");

        // Assert exactly ONE refund record exists in DB (not duplicated)
        var totalRefundCount = await _context.RefundRecords.CountAsync(r => r.BookingId == booking.Id);
        totalRefundCount.Should().Be(1);

        // Tier SoldCount is STILL 0, not decremented below zero
        var dbTierAfterReplay = await _context.TicketTiers.FindAsync(tier.Id);
        dbTierAfterReplay!.SoldCount.Should().Be(0);
    }

    [Fact]
    public async Task ProcessBankRefundAsync_RejectsNonConfirmedBooking()
    {
        var (ev, tier, seat) = await SeedEventTierAndSeatAsync();

        // Create booking in PendingHold state
        var pendingBooking = new Booking
        {
            EventId = ev.Id,
            TicketTierId = tier.Id,
            BookingRef = "EVL-PENDING-001",
            CustomerName = "Pending User",
            CustomerEmail = "pending@example.com",
            CustomerPhone = "03001234567",
            Quantity = 1,
            UnitPrice = 5000m,
            TotalAmount = 5050m,
            State = BookingState.PendingHold,
            Status = BookingStatus.Pending,
            PaymentStatus = PaymentStatus.Pending,
            PaymentMethod = PaymentMethod.BankTransfer
        };
        _context.Bookings.Add(pendingBooking);
        await _context.SaveChangesAsync();

        var act = async () => await _bookingService.ProcessBankRefundAsync(
            new ProcessBankRefundRequestDto(pendingBooking.Id, 5050m, "Customer cancel"));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Only confirmed bookings can be refunded*");
    }

    [Fact]
    public async Task ProcessBankRefundAsync_RejectsAmountExceedingCapturedTotal()
    {
        var (ev, tier, seat) = await SeedEventTierAndSeatAsync();
        var booking = await SeedConfirmedBookingAsync(ev, tier, seat); // TotalAmount = 5050m

        var act = async () => await _bookingService.ProcessBankRefundAsync(
            new ProcessBankRefundRequestDto(booking.Id, Amount: 10000m, "Attempting excessive refund"));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cannot exceed the booking total amount*");
    }

    private class TestCacheService : ICacheService
    {
        public Task<T?> GetAsync<T>(string key) => Task.FromResult<T?>(default);
        public Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null) => Task.CompletedTask;
        public Task<bool> TrySetOnceAsync(string key, TimeSpan expiration) => Task.FromResult(true);
        public Task RemoveAsync(string key) => Task.CompletedTask;
        public Task RemoveByPrefixAsync(string prefixKey) => Task.CompletedTask;
        public Task ClearEventCacheAsync(int? eventId = null) => Task.CompletedTask;
        public Task<SeatHoldResult> TryHoldSeatsGranularAsync(int eventId, List<int> seatIds, string ownerToken, TimeSpan holdDuration, int? eventShowId = null) =>
            Task.FromResult(new SeatHoldResult(true, new List<int>(), DateTimeOffset.UtcNow.Add(holdDuration)));
        public Task<bool> HoldSeatsAsync(int eventId, List<int> seatIds, string email, TimeSpan holdDuration, int? eventShowId = null) => Task.FromResult(true);
        public Task ReleaseSeatsAsync(int eventId, List<int> seatIds, int? eventShowId = null, string? expectedOwnerEmail = null) => Task.CompletedTask;
        public Task<List<int>> GetHeldSeatIdsAsync(int eventId, int? eventShowId = null) => Task.FromResult(new List<int>());
    }

    private class TestNotificationService : INotificationService
    {
        public Task SendTicketConfirmationEmailAsync(BookingDto booking) => Task.CompletedTask;
        public Task<string> GenerateWhatsAppTicketShareUrlAsync(BookingDto booking) => Task.FromResult("https://wa.me/test");
    }
}
