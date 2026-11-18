namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Bank account details for manual direct bank transfer payments.
/// Managed exclusively by Super Admin and displayed on the checkout page.
/// </summary>
public class BankAccount : BaseEntity
{
    public string BankName { get; set; } = string.Empty;
    public string AccountTitle { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string Iban { get; set; } = string.Empty;
    public string? BranchCode { get; set; }
    public string? BranchName { get; set; }
    public string? QrCodeImageUrl { get; set; }
    public string? Instructions { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsEnabled { get; set; } = true;
    public int DisplayOrder { get; set; } = 1;

    // Maintenance & Downtime Notification fields
    public string? MaintenanceNotice { get; set; }
    public DateTimeOffset? MaintenanceStartUtc { get; set; }
    public DateTimeOffset? MaintenanceEndUtc { get; set; }
    public bool IsMaintenanceMode { get; set; } = false;

    /// <summary>
    /// Pure domain evaluator returning authoritative operational status at the given point in time.
    /// </summary>
    public BankOperationalStatus GetOperationalStatus(DateTimeOffset now)
    {
        if (!IsEnabled)
            return BankOperationalStatus.Disabled();

        if (!IsActive)
            return BankOperationalStatus.Inactive();

        // 1. Manual maintenance flag takes priority
        if (IsMaintenanceMode)
            return BankOperationalStatus.UnderManualMaintenance(MaintenanceNotice);

        // 2. Scheduled maintenance window check
        if (MaintenanceStartUtc.HasValue && MaintenanceEndUtc.HasValue)
        {
            if (now >= MaintenanceStartUtc.Value && now <= MaintenanceEndUtc.Value)
            {
                return BankOperationalStatus.UnderScheduledMaintenance(MaintenanceEndUtc.Value, MaintenanceNotice);
            }
        }
        else if (MaintenanceStartUtc.HasValue && !MaintenanceEndUtc.HasValue)
        {
            if (now >= MaintenanceStartUtc.Value)
            {
                return BankOperationalStatus.UnderManualMaintenance(MaintenanceNotice);
            }
        }
        else if (MaintenanceEndUtc.HasValue)
        {
            if (now <= MaintenanceEndUtc.Value)
            {
                return BankOperationalStatus.UnderScheduledMaintenance(MaintenanceEndUtc.Value, MaintenanceNotice);
            }
        }

        return BankOperationalStatus.Active();
    }

    /// <summary>
    /// Validates and sets maintenance configuration with strict invariant validation.
    /// </summary>
    public void SetMaintenanceWindow(DateTimeOffset? startUtc, DateTimeOffset? endUtc, string? notice, bool? isMaintenanceMode, DateTimeOffset now)
    {
        if ((startUtc.HasValue && !endUtc.HasValue) || (!startUtc.HasValue && endUtc.HasValue))
            throw new ArgumentException("Both maintenance start and end times must be provided, or neither.", nameof(startUtc));

        if (startUtc.HasValue && endUtc.HasValue)
        {
            if (startUtc.Value >= endUtc.Value)
                throw new ArgumentException("Maintenance start time must be earlier than maintenance end time.", nameof(startUtc));

            if (endUtc.Value <= now)
                throw new ArgumentException("Maintenance end time must be in the future.", nameof(endUtc));
        }

        MaintenanceStartUtc = startUtc;
        MaintenanceEndUtc = endUtc;
        MaintenanceNotice = string.IsNullOrWhiteSpace(notice) ? null : notice.Trim();
        if (isMaintenanceMode.HasValue)
        {
            IsMaintenanceMode = isMaintenanceMode.Value;
        }
    }
}
