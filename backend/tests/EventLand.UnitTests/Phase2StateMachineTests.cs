namespace EventLand.UnitTests;

using System;
using System.Linq;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Domain.Exceptions;
using EventLand.Domain.StateMachines;
using EventLand.Modules.PayPro.Entities;
using FluentAssertions;
using Xunit;

public class Phase2StateMachineTests
{
    [Fact]
    public void TicketScanStateMachine_GuardsUnconfirmedAndRevokedAdmissionAndLogsReset()
    {
        var now = DateTimeOffset.UtcNow;
        var booking = new Booking
        {
            BookingRef = "EL-SCAN-1",
            PaymentMethod = PaymentMethod.BankTransfer
        };

        // Cannot admit PendingHold booking
        var admitPending = () => booking.CheckInAdmit(now, "gate@test.pk");
        admitPending.Should().Throw<InvalidStateTransitionException>();

        // Confirm, admit, and reset
        booking.ConfirmPayment(1, "admin@test.pk", now);
        booking.CheckInAdmit(now, "gate@test.pk", "DEV-1", 1, "Main Gate");
        booking.IsCheckedIn.Should().BeTrue();
        booking.ScanState.Should().Be(TicketScanState.ScannedAndAdmitted);

        booking.ResetCheckIn(now.AddMinutes(1), "sup@test.pk", "Wrong device scan");
        booking.IsCheckedIn.Should().BeFalse();
        booking.ScanState.Should().Be(TicketScanState.Issued);
        booking.StateHistories.Should().Contain(h => h.Trigger == "GateResetCheckIn");

        // Refund revokes ticket; subsequent check-in must fail
        booking.ProcessRefund(now.AddMinutes(2), "Customer refund", "admin@test.pk");
        booking.ScanState.Should().Be(TicketScanState.Revoked);
        var admitRevoked = () => booking.CheckInAdmit(now.AddMinutes(3), "gate@test.pk");
        admitRevoked.Should().Throw<InvalidStateTransitionException>();
    }

    [Fact]
    public void OrderStateMachine_EnforcesValidTransitionsAndBlocksTerminalRegressions()
    {
        var now = DateTime.UtcNow;
        var order = new Order
        {
            OrderNumber = "ORD-1001",
            Amount = 2500m
        };

        order.MarkUnpaid("PP-1001", "{}", now);
        order.Status.Should().Be(OrderStatus.Unpaid);

        order.MarkPaid(2500m, "EasyPaisa", now, now);
        order.Status.Should().Be(OrderStatus.Paid);

        // Idempotent repeat MarkPaid
        order.MarkPaid(2500m, "EasyPaisa", now, now);
        order.Status.Should().Be(OrderStatus.Paid);

        // Cannot regress Paid -> Unpaid or Paid -> Blocked
        var regressToUnpaid = () => order.MarkUnpaid("PP-1001", "{}", now);
        regressToUnpaid.Should().Throw<InvalidOperationException>();

        var regressToBlocked = () => order.MarkBlocked(now);
        regressToBlocked.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void PaymentTransaction_BlocksTerminalStateOverwrites()
    {
        var now = DateTimeOffset.UtcNow;
        var tx = new PaymentTransaction
        {
            Provider = "paypro",
            Amount = 1500m
        };

        tx.MarkFailed(now, "Insufficient funds");
        tx.Status.Should().Be(PaymentStatus.Failed);

        var payFailed = () => tx.MarkPaid(now.AddSeconds(10));
        payFailed.Should().Throw<InvalidStateTransitionException>();

        var tx2 = new PaymentTransaction { Provider = "paypro", Amount = 1500m };
        tx2.MarkPaid(now, "PP-999");
        tx2.Status.Should().Be(PaymentStatus.Paid);

        var failPaid = () => tx2.MarkFailed(now.AddSeconds(10), "Late webhook");
        failPaid.Should().Throw<InvalidStateTransitionException>();
    }

    [Fact]
    public void TicketTier_BlocksAvailableWhenSoldOut()
    {
        var tier = new TicketTier
        {
            Name = "VIP",
            AvailableQuantity = 10,
            SoldCount = 10,
            Status = TicketTierStatus.SoldOut
        };

        var act = () => tier.SetStatus(TicketTierStatus.Available);
        act.Should().Throw<InvalidStateTransitionException>();

        tier.CloseTier();
        tier.Status.Should().Be(TicketTierStatus.Closed);

        tier.ReopenTier();
        tier.Status.Should().Be(TicketTierStatus.SoldOut);
    }

    [Fact]
    public void EventShow_BlocksReopenAfterEndTimeElapsed()
    {
        var now = DateTimeOffset.UtcNow;
        var show = new EventShow
        {
            ShowTitle = "Past Show",
            StartTimeUtc = now.AddDays(-2),
            EndTimeUtc = now.AddDays(-1),
            IsClosed = true
        };

        var act = () => show.ReopenShow(now);
        act.Should().Throw<InvalidStateTransitionException>();
    }

    [Fact]
    public void OutboxMessage_DerivesPendingFailedDeadLetteredAndProcessedStatuses()
    {
        var now = DateTimeOffset.UtcNow;
        var msg = new OutboxMessage { EventType = "BookingConfirmedEvent", PayloadJson = "{}" };

        msg.GetStatus().Should().Be(OutboxStatus.Pending);

        msg.RecordFailure("Timeout", now);
        msg.GetStatus().Should().Be(OutboxStatus.Failed);

        for (int i = 1; i < OutboxMessage.DefaultMaxRetries; i++)
        {
            msg.RecordFailure("Timeout", now.AddSeconds(i));
        }

        msg.GetStatus().Should().Be(OutboxStatus.DeadLettered);

        msg.MarkProcessed(now.AddMinutes(1));
        msg.GetStatus().Should().Be(OutboxStatus.Processed);
    }
}
