namespace EventLand.Application.Common;

/// <summary>
/// Phase 10 Rollout Feature Flags.
/// Allows operational toggling and decoupled rollback for critical state machine subsystems.
/// </summary>
public class FeatureFlags
{
    public const string SectionName = "FeatureFlags";

    /// <summary>
    /// When true, enforces BookingState enum and BookingStateMachine transitions.
    /// Rollback Note: Set to false to bypass strict transitions and fall back to legacy status/paymentStatus pairs.
    /// </summary>
    public bool BookingUseUnifiedState { get; set; } = true;

    /// <summary>
    /// When true, enforces Redis atomic CAS holds and SeatState tracking.
    /// Rollback Note: Set to false to fall back to in-memory non-distributed seat reservation holds.
    /// </summary>
    public bool SeatsUseAtomicHolds { get; set; } = true;

    /// <summary>
    /// When true, gate admission scanner requires and validates cryptographic HMAC-SHA256 signatures on QR payloads.
    /// Rollback Note: Set to false during emergency gate connectivity failures to admit unsigned legacy QR ticket codes.
    /// </summary>
    public bool GateRequireSignedTickets { get; set; } = true;

    /// <summary>
    /// When true, PayPro return and webhook reconciliation enforces single-transaction idempotency and strict bank ledger alignment.
    /// Rollback Note: Set to false if upstream payment switch sends non-standard legacy payloads during switch maintenance.
    /// </summary>
    public bool PaymentsStrictReconciliation { get; set; } = true;
}

public interface IFeatureFlagService
{
    bool IsEnabled(string flagName);
    FeatureFlags Flags { get; }
}

public class FeatureFlagService : IFeatureFlagService
{
    private readonly FeatureFlags _flags;

    public FeatureFlagService(Microsoft.Extensions.Options.IOptions<FeatureFlags> options)
    {
        _flags = options?.Value ?? new FeatureFlags();
    }

    public FeatureFlags Flags => _flags;

    public bool IsEnabled(string flagName)
    {
        return flagName switch
        {
            "Booking:UseUnifiedState" => _flags.BookingUseUnifiedState,
            "Seats:UseAtomicHolds" => _flags.SeatsUseAtomicHolds,
            "Gate:RequireSignedTickets" => _flags.GateRequireSignedTickets,
            "Payments:StrictReconciliation" => _flags.PaymentsStrictReconciliation,
            _ => false
        };
    }
}
