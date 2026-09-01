namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Bank account details for manual direct bank transfer payments.
/// Managed exclusively by Super Admin and displayed on the checkout page.
/// </summary>
public class BankAccount : BaseEntity
{
    public string  BankName         { get; set; } = string.Empty;
    public string  AccountTitle     { get; set; } = string.Empty;
    public string  AccountNumber     { get; set; } = string.Empty;
    public string  Iban             { get; set; } = string.Empty;
    public string? BranchCode       { get; set; }
    public string? BranchName       { get; set; }
    public string? QrCodeImageUrl   { get; set; }
    public string? Instructions     { get; set; }
    public bool    IsActive         { get; set; } = true;
    public int     DisplayOrder     { get; set; } = 1;

    // Maintenance & Downtime Notification fields
    public string?         MaintenanceNotice   { get; set; }
    public DateTimeOffset? MaintenanceStartUtc { get; set; }
    public DateTimeOffset? MaintenanceEndUtc   { get; set; }
    public bool            IsMaintenanceMode   { get; set; } = false;
}
