namespace EventLand.Application.Dtos;

public record BankAccountDto(
    int Id,
    string BankName,
    string AccountTitle,
    string AccountNumber,
    string Iban,
    string? BranchCode,
    string? BranchName,
    string? QrCodeImageUrl,
    string? Instructions,
    bool IsActive,
    int DisplayOrder,
    string? MaintenanceNotice,
    DateTimeOffset? MaintenanceStartUtc,
    DateTimeOffset? MaintenanceEndUtc,
    bool IsMaintenanceMode,
    bool IsUnderMaintenance,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt
);

public record CreateBankAccountDto(
    string BankName,
    string AccountTitle,
    string AccountNumber,
    string Iban,
    string? BranchCode = null,
    string? BranchName = null,
    string? QrCodeImageUrl = null,
    string? Instructions = null,
    bool IsActive = true,
    int DisplayOrder = 1,
    string? MaintenanceNotice = null,
    DateTimeOffset? MaintenanceStartUtc = null,
    DateTimeOffset? MaintenanceEndUtc = null,
    bool IsMaintenanceMode = false
);

public record UpdateBankAccountDto(
    string BankName,
    string AccountTitle,
    string AccountNumber,
    string Iban,
    string? BranchCode = null,
    string? BranchName = null,
    string? QrCodeImageUrl = null,
    string? Instructions = null,
    bool? IsActive = null,
    int? DisplayOrder = null,
    string? MaintenanceNotice = null,
    DateTimeOffset? MaintenanceStartUtc = null,
    DateTimeOffset? MaintenanceEndUtc = null,
    bool? IsMaintenanceMode = null
);
