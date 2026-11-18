namespace EventLand.Application.Common;

using System;
using System.Diagnostics;
using System.Diagnostics.Metrics;

/// <summary>
/// Centralized telemetry definitions (Metrics &amp; ActivitySource) for EventLand.
/// Follows OpenTelemetry semantic conventions and .NET System.Diagnostics.Metrics BCL standards.
/// </summary>
public sealed class EventLandTelemetry : IDisposable
{
    public const string MeterName = "EventLand.Api";
    public const string ActivitySourceName = "EventLand.Api";
    public const string Version = "1.0.0";

    public Meter Meter { get; }
    public ActivitySource ActivitySource { get; }

    // Core business counters & histograms
    private readonly Counter<long> _bookingTransitionsCounter;
    private readonly Counter<long> _seatHoldConflictsCounter;
    private readonly Counter<long> _webhookDuplicatesCounter;
    private readonly Histogram<int> _expiryBatchSizeHistogram;
    private readonly Histogram<double> _expiryBatchDurationHistogram;
    private readonly Counter<long> _gateScansCounter;
    private readonly Counter<long> _refundTransitionsCounter;

    public EventLandTelemetry()
    {
        Meter = new Meter(MeterName, Version);
        ActivitySource = new ActivitySource(ActivitySourceName, Version);

        _bookingTransitionsCounter = Meter.CreateCounter<long>(
            name: "eventland_booking_transitions_total",
            unit: "{transition}",
            description: "Total number of booking state machine transitions executed.");

        _seatHoldConflictsCounter = Meter.CreateCounter<long>(
            name: "eventland_seat_hold_conflicts_total",
            unit: "{conflict}",
            description: "Total number of seat hold acquisition conflicts encountered.");

        _webhookDuplicatesCounter = Meter.CreateCounter<long>(
            name: "eventland_webhook_duplicates_total",
            unit: "{duplicate}",
            description: "Total number of duplicate or replayed payment provider webhooks received.");

        _expiryBatchSizeHistogram = Meter.CreateHistogram<int>(
            name: "eventland_expiry_batch_size",
            unit: "{booking}",
            description: "Distribution of expired pending bookings reclaimed per sweep batch.");

        _expiryBatchDurationHistogram = Meter.CreateHistogram<double>(
            name: "eventland_expiry_batch_duration_ms",
            unit: "ms",
            description: "Execution latency in milliseconds for pending booking expiry cleanup sweeps.");

        _gateScansCounter = Meter.CreateCounter<long>(
            name: "eventland_gate_scans_total",
            unit: "{scan}",
            description: "Total ticket validation scans processed at venue gates.");

        _refundTransitionsCounter = Meter.CreateCounter<long>(
            name: "eventland_refund_transitions_total",
            unit: "{transition}",
            description: "Total number of refund state machine transitions executed.");
    }

    public void RecordBookingTransition(string fromState, string toState, bool success)
    {
        _bookingTransitionsCounter.Add(1,
            new KeyValuePair<string, object?>("from_state", fromState),
            new KeyValuePair<string, object?>("to_state", toState),
            new KeyValuePair<string, object?>("success", success));
    }

    public void RecordSeatHoldConflict(int eventId, int requestedSeatsCount)
    {
        _seatHoldConflictsCounter.Add(1,
            new KeyValuePair<string, object?>("event_id", eventId),
            new KeyValuePair<string, object?>("requested_count", requestedSeatsCount));
    }

    public void RecordWebhookDuplicate(string provider, string transactionId)
    {
        _webhookDuplicatesCounter.Add(1,
            new KeyValuePair<string, object?>("provider", provider));
    }

    public void RecordExpiryBatch(int count, double durationMs)
    {
        _expiryBatchSizeHistogram.Record(count);
        _expiryBatchDurationHistogram.Record(durationMs);
    }

    public void RecordGateScan(string result, string deviceId)
    {
        _gateScansCounter.Add(1,
            new KeyValuePair<string, object?>("result", result),
            new KeyValuePair<string, object?>("device_id", deviceId));
    }

    public void RecordRefundTransition(string fromStatus, string toStatus, bool success)
    {
        _refundTransitionsCounter.Add(1,
            new KeyValuePair<string, object?>("from_status", fromStatus),
            new KeyValuePair<string, object?>("to_status", toStatus),
            new KeyValuePair<string, object?>("success", success));
    }

    public Activity? StartActivity(string name, ActivityKind kind = ActivityKind.Internal)
    {
        return ActivitySource.StartActivity(name, kind);
    }

    public void Dispose()
    {
        Meter.Dispose();
        ActivitySource.Dispose();
    }
}
