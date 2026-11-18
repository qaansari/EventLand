namespace EventLand.Domain.Enums;

public enum BankOperationalState
{
    Active = 0,
    Disabled = 1,
    Inactive = 2,
    UnderMaintenance = 3
}

public enum BankMaintenanceType
{
    None = 0,
    Manual = 1,
    Scheduled = 2
}
