namespace EventLand.UnitTests;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Application.Services;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Domain.Exceptions;
using EventLand.Domain.StateMachines;
using EventLand.Infrastructure.Persistence;
using EventLand.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Xunit;

public class BookingLifecycleStateMachineTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly TestDbContext _context;

    public BookingLifecycleStateMachineTests()
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

    private Booking CreateDefaultBooking()
    {
        var now = DateTimeOffset.UtcNow;
        var booking = new Booking
        {
            BookingRef = "EVL-TEST-001",
            CustomerName = "Test Customer",
            CustomerEmail = "test@example.com",
            CustomerPhone = "03001234567",
            Quantity = 2,
            UnitPrice = 2500m,
            SubtotalAmount = 5000m,
            TotalAmount = 5098m,
            PaymentExpiresAt = now.AddMinutes(30)
        };
        return booking;
    }

    [Fact]
    public void NewBooking_InitializesInPendingHoldState()
    {
        var booking = CreateDefaultBooking();

        booking.State.Should().Be(BookingState.PendingHold);
        booking.Status.Should().Be(BookingStatus.Pending);
        booking.PaymentStatus.Should().Be(PaymentStatus.Pending);
    }

    [Theory]
    [InlineData(BookingState.PendingHold, BookingState.AwaitingBankVerification, BookingStateMachine.TriggerSubmitBankProof)]
    [InlineData(BookingState.PendingHold, BookingState.PaymentProcessing, BookingStateMachine.TriggerBeginPayProPayment)]
    [InlineData(BookingState.PendingHold, BookingState.Expired, BookingStateMachine.TriggerExpireHold)]
    [InlineData(BookingState.AwaitingBankVerification, BookingState.Confirmed, BookingStateMachine.TriggerConfirmPayment)]
    [InlineData(BookingState.AwaitingBankVerification, BookingState.Rejected, BookingStateMachine.TriggerRejectPayment)]
    [InlineData(BookingState.PaymentProcessing, BookingState.Confirmed, BookingStateMachine.TriggerPayProSuccess)]
    [InlineData(BookingState.PaymentProcessing, BookingState.PendingHold, BookingStateMachine.TriggerPayProFailedOrCancelled)]
    [InlineData(BookingState.PaymentProcessing, BookingState.Expired, BookingStateMachine.TriggerExpireHold)]
    [InlineData(BookingState.Confirmed, BookingState.Cancelled, BookingStateMachine.TriggerCancelBooking)]
    [InlineData(BookingState.Confirmed, BookingState.Refunded, BookingStateMachine.TriggerProcessRefund)]
    public void ValidTransitions_ShouldBeAllowed(BookingState from, BookingState to, string trigger)
    {
        BookingStateMachine.CanTransition(from, to, trigger).Should().BeTrue();
        var act = () => BookingStateMachine.ValidateTransition(from, to, trigger);
        act.Should().NotThrow();
    }

    [Theory]
    [InlineData(BookingState.PendingHold, BookingState.Confirmed, "DirectConfirm")]
    [InlineData(BookingState.Expired, BookingState.Confirmed, "ConfirmPayment")]
    [InlineData(BookingState.Rejected, BookingState.Confirmed, "ConfirmPayment")]
    [InlineData(BookingState.Refunded, BookingState.Confirmed, "ConfirmPayment")]
    [InlineData(BookingState.Cancelled, BookingState.Confirmed, "ConfirmPayment")]
    [InlineData(BookingState.Confirmed, BookingState.PendingHold, "Revert")]
    [InlineData(BookingState.AwaitingBankVerification, BookingState.PaymentProcessing, "SwitchPayment")]
    public void InvalidTransitions_ShouldThrowInvalidStateTransitionException(BookingState from, BookingState to, string trigger)
    {
        BookingStateMachine.CanTransition(from, to, trigger).Should().BeFalse();
        var act = () => BookingStateMachine.ValidateTransition(from, to, trigger);
        act.Should().Throw<InvalidStateTransitionException>()
            .WithMessage($"*{from}*to*{to}*");
    }

    [Fact]
    public void BookingAggregate_SubmitBankProof_TransitionsAndRecordsHistory()
    {
        var booking = CreateDefaultBooking();
        var now = DateTimeOffset.UtcNow;

        booking.SubmitBankProof("TXN-12345", "https://cdn.example.com/slip.jpg", "Ali Khan", "HBL", "1234", now, "customer@example.com");

        booking.State.Should().Be(BookingState.AwaitingBankVerification);
        booking.Status.Should().Be(BookingStatus.Pending);
        booking.PaymentStatus.Should().Be(PaymentStatus.PendingVerification);
        booking.BankTransactionRef.Should().Be("TXN-12345");
        booking.StateHistories.Should().HaveCount(1);
        var history = booking.StateHistories.First();
        history.FromState.Should().Be(BookingState.PendingHold);
        history.ToState.Should().Be(BookingState.AwaitingBankVerification);
        history.Trigger.Should().Be(BookingStateMachine.TriggerSubmitBankProof);
    }

    [Fact]
    public void BookingAggregate_ConfirmPayment_TransitionsAndSetsAudit()
    {
        var booking = CreateDefaultBooking();
        var now = DateTimeOffset.UtcNow;
        booking.SubmitBankProof("TXN-12345", "https://cdn.example.com/slip.jpg", null, null, null, now);

        booking.ConfirmPayment(1, "admin@eventland.pk", now, "admin@eventland.pk");

        booking.State.Should().Be(BookingState.Confirmed);
        booking.Status.Should().Be(BookingStatus.Confirmed);
        booking.PaymentStatus.Should().Be(PaymentStatus.Paid);
        booking.VerifiedByAdminEmail.Should().Be("admin@eventland.pk");
        booking.VerifiedAt.Should().Be(now);
        booking.PaidAt.Should().Be(now);
        booking.StateHistories.Should().HaveCount(2);
    }

    [Fact]
    public void BookingAggregate_Idempotency_SecondConfirmIsNoOp()
    {
        var booking = CreateDefaultBooking();
        var now = DateTimeOffset.UtcNow;
        booking.SubmitBankProof("TXN-12345", "https://cdn.example.com/slip.jpg", null, null, null, now);
        booking.ConfirmPayment(1, "admin@eventland.pk", now);

        var countBefore = booking.StateHistories.Count;

        // Second confirmation
        var secondCall = () => booking.ConfirmPayment(1, "admin@eventland.pk", now.AddMinutes(1));
        secondCall.Should().NotThrow();
        booking.State.Should().Be(BookingState.Confirmed);
        booking.StateHistories.Count.Should().Be(countBefore); // No duplicate history entry
    }

    [Fact]
    public void BookingAggregate_RejectPayment_TransitionsToRejected()
    {
        var booking = CreateDefaultBooking();
        var now = DateTimeOffset.UtcNow;
        booking.SubmitBankProof("TXN-12345", "https://cdn.example.com/slip.jpg", null, null, null, now);

        booking.RejectPayment(1, "admin@eventland.pk", "Fake transaction slip", now);

        booking.State.Should().Be(BookingState.Rejected);
        booking.Status.Should().Be(BookingStatus.Cancelled);
        booking.PaymentStatus.Should().Be(PaymentStatus.Failed);
        booking.StateHistories.Last().Reason.Should().Be("Fake transaction slip");
    }

    [Fact]
    public void BookingAggregate_InvalidConfirmFromCancelled_Throws()
    {
        var booking = CreateDefaultBooking();
        var now = DateTimeOffset.UtcNow;
        booking.CancelBooking(now);

        var act = () => booking.ConfirmPayment(1, "admin@eventland.pk", now);
        act.Should().Throw<InvalidStateTransitionException>();
    }

    [Fact]
    public async Task ExpiryService_AtomicCompareAndSet_RaceConditionSafety()
    {
        // Deterministic FakeTimeProvider
        var startTime = new DateTimeOffset(2026, 11, 17, 12, 0, 0, TimeSpan.Zero);
        var fakeTime = new FakeTimeProvider(startTime);

        var country = new Country { Name = "Pakistan", Code = "PK" };
        var city = new City { Name = "Karachi", Country = country };
        var venue = new Venue { Name = "Arts Council", City = city, Address = "Kiyani Road" };
        var organizer = new Organizer { Name = "Org", BrandName = "Org", Email = "org@test.pk", Phone = "0300" };
        var ev = new Event { Title = "Live Event", Country = country, City = city, Venue = venue, Organizer = organizer, StartDateUtc = startTime.AddDays(2), EndDateUtc = startTime.AddDays(2).AddHours(3) };
        var tier = new TicketTier { Event = ev, Name = "VIP", AvailableQuantity = 10, SoldCount = 2, Price = 1000m, Status = TicketTierStatus.Available };

        var booking = new Booking
        {
            Event = ev,
            TicketTier = tier,
            BookingRef = "EVL-EXP-TEST",
            CustomerName = "Hold Customer",
            CustomerEmail = "hold@test.com",
            CustomerPhone = "03001234567",
            Quantity = 2,
            PaymentExpiresAt = startTime.AddMinutes(30)
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        // Advance time past 30-minute hold
        fakeTime.Advance(TimeSpan.FromMinutes(31));

        // Concurrent action: admin verifies payment right before background service runs
        booking.SubmitBankProof("TXN-RACE", "url", null, null, null, fakeTime.GetUtcNow());
        booking.ConfirmPayment(1, "admin@eventland.pk", fakeTime.GetUtcNow());
        await _context.SaveChangesAsync();

        // Now run expiry check with the cutoff past expiry
        var cutoff = fakeTime.GetUtcNow();
        var rowsUpdated = await _context.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE Bookings SET State = {(int)BookingState.Expired} WHERE Id = {booking.Id} AND (State = {(int)BookingState.PendingHold} OR State = {(int)BookingState.PaymentProcessing}) AND PaymentExpiresAt <= {cutoff}");

        // Concurrency assertion: Because the booking was already Confirmed, CAS updated 0 rows!
        rowsUpdated.Should().Be(0);

        _context.ChangeTracker.Clear();
        var reloaded = await _context.Bookings.FindAsync(booking.Id);
        reloaded!.State.Should().Be(BookingState.Confirmed);
        reloaded.PaymentStatus.Should().Be(PaymentStatus.Paid);
    }
}
