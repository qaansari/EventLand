namespace EventLand.Domain.Entities;

using System;
using EventLand.Domain.Enums;

public record BankOperationalStatus(
    BankOperationalState State,
    bool IsOperational,
    BankMaintenanceType MaintenanceType = BankMaintenanceType.None,
    DateTimeOffset? UntilUtc = null,
    string? Reason = null
)
{
    public static BankOperationalStatus Active() =>
        new(BankOperationalState.Active, true, BankMaintenanceType.None, null, "Active and accepting payments.");

    public static BankOperationalStatus Disabled(string? reason = null) =>
        new(BankOperationalState.Disabled, false, BankMaintenanceType.None, null, reason ?? "Bank account is currently disabled.");

    public static BankOperationalStatus Inactive(string? reason = null) =>
        new(BankOperationalState.Inactive, false, BankMaintenanceType.None, null, reason ?? "Bank account is inactive.");

    public static BankOperationalStatus UnderManualMaintenance(string? notice = null) =>
        new(BankOperationalState.UnderMaintenance, false, BankMaintenanceType.Manual, null, notice ?? "Direct bank transfers are temporarily paused for maintenance.");

    public static BankOperationalStatus UnderScheduledMaintenance(DateTimeOffset untilUtc, string? notice = null) =>
        new(BankOperationalState.UnderMaintenance, false, BankMaintenanceType.Scheduled, untilUtc, notice ?? $"Direct bank transfers are under scheduled maintenance until {untilUtc:O}.");
}
