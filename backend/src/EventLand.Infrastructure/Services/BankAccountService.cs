namespace EventLand.Infrastructure.Services;

using EventLand.Application.Common;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

public class BankAccountService : IBankAccountService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<BankAccountService> _logger;

    public BankAccountService(IApplicationDbContext context, ILogger<BankAccountService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<BankAccountDto?> GetActiveBankAccountAsync()
    {
        var account = await _context.BankAccounts
            .AsNoTracking()
            .Where(b => b.IsActive && !b.IsDeleted)
            .OrderBy(b => b.DisplayOrder)
            .ThenByDescending(b => b.CreatedAt)
            .FirstOrDefaultAsync();

        if (account is null)
        {
            // Return first non-deleted if none explicitly marked active
            account = await _context.BankAccounts
                .AsNoTracking()
                .Where(b => !b.IsDeleted)
                .FirstOrDefaultAsync();
        }

        return account is null ? null : MapToDto(account);
    }

    public async Task<List<BankAccountDto>> GetAllBankAccountsAsync()
    {
        var accounts = await _context.BankAccounts
            .AsNoTracking()
            .Where(b => !b.IsDeleted)
            .OrderBy(b => b.DisplayOrder)
            .ThenByDescending(b => b.CreatedAt)
            .ToListAsync();

        return accounts.Select(MapToDto).ToList();
    }

    public async Task<BankAccountDto?> GetBankAccountByIdAsync(int id)
    {
        var account = await _context.BankAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);

        return account is null ? null : MapToDto(account);
    }

    public async Task<BankAccountDto> CreateBankAccountAsync(CreateBankAccountDto dto)
    {
        if (dto.IsActive)
        {
            // If new account is marked active, deactivate others
            var existingActive = await _context.BankAccounts
                .Where(b => b.IsActive && !b.IsDeleted)
                .ToListAsync();

            foreach (var a in existingActive)
            {
                a.IsActive = false;
            }
        }

        var entity = new BankAccount
        {
            BankName = dto.BankName.Trim(),
            AccountTitle = dto.AccountTitle.Trim(),
            AccountNumber = dto.AccountNumber.Trim(),
            Iban = dto.Iban.Trim(),
            BranchCode = dto.BranchCode?.Trim(),
            BranchName = dto.BranchName?.Trim(),
            QrCodeImageUrl = FileUrlHelper.ExtractFileName(dto.QrCodeImageUrl?.Trim()),
            Instructions = dto.Instructions?.Trim(),
            IsActive = dto.IsActive,
            DisplayOrder = dto.DisplayOrder,
            MaintenanceNotice = string.IsNullOrWhiteSpace(dto.MaintenanceNotice) ? null : dto.MaintenanceNotice.Trim(),
            MaintenanceStartUtc = dto.MaintenanceStartUtc,
            MaintenanceEndUtc = dto.MaintenanceEndUtc,
            IsMaintenanceMode = dto.IsMaintenanceMode
        };

        _context.BankAccounts.Add(entity);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created new BankAccount ID {Id} ({BankName} - {AccountTitle})", entity.Id, entity.BankName, entity.AccountTitle);
        return MapToDto(entity);
    }

    public async Task<BankAccountDto> UpdateBankAccountAsync(int id, UpdateBankAccountDto dto)
    {
        var entity = await _context.BankAccounts
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);

        if (entity is null)
            throw new KeyNotFoundException($"Bank account with ID '{id}' not found.");

        if (dto.IsActive == true && !entity.IsActive)
        {
            var existingActive = await _context.BankAccounts
                .Where(b => b.Id != id && b.IsActive && !b.IsDeleted)
                .ToListAsync();

            foreach (var a in existingActive)
            {
                a.IsActive = false;
            }
        }

        entity.BankName = dto.BankName.Trim();
        entity.AccountTitle = dto.AccountTitle.Trim();
        entity.AccountNumber = dto.AccountNumber.Trim();
        entity.Iban = dto.Iban.Trim();
        if (dto.BranchCode != null) entity.BranchCode = dto.BranchCode.Trim();
        if (dto.BranchName != null) entity.BranchName = dto.BranchName.Trim();
        if (dto.QrCodeImageUrl != null) entity.QrCodeImageUrl = FileUrlHelper.ExtractFileName(dto.QrCodeImageUrl.Trim());
        if (dto.Instructions != null) entity.Instructions = dto.Instructions.Trim();
        if (dto.IsActive.HasValue) entity.IsActive = dto.IsActive.Value;
        if (dto.DisplayOrder.HasValue) entity.DisplayOrder = dto.DisplayOrder.Value;

        // Maintenance fields
        entity.MaintenanceNotice = string.IsNullOrWhiteSpace(dto.MaintenanceNotice) ? null : dto.MaintenanceNotice.Trim();
        entity.MaintenanceStartUtc = dto.MaintenanceStartUtc;
        entity.MaintenanceEndUtc = dto.MaintenanceEndUtc;
        if (dto.IsMaintenanceMode.HasValue) entity.IsMaintenanceMode = dto.IsMaintenanceMode.Value;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Updated BankAccount ID {Id} ({BankName})", entity.Id, entity.BankName);
        return MapToDto(entity);
    }

    public async Task<bool> DeleteBankAccountAsync(int id)
    {
        var entity = await _context.BankAccounts
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);

        if (entity is null) return false;

        entity.IsDeleted = true;
        entity.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Soft-deleted BankAccount ID {Id}", id);
        return true;
    }

    public async Task<BankAccountDto> ToggleActiveAsync(int id)
    {
        var entity = await _context.BankAccounts
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);

        if (entity is null)
            throw new KeyNotFoundException($"Bank account with ID '{id}' not found.");

        var newActiveState = !entity.IsActive;

        if (newActiveState)
        {
            var existingActive = await _context.BankAccounts
                .Where(b => b.Id != id && b.IsActive && !b.IsDeleted)
                .ToListAsync();

            foreach (var a in existingActive)
            {
                a.IsActive = false;
            }
        }

        entity.IsActive = newActiveState;
        await _context.SaveChangesAsync();

        return MapToDto(entity);
    }

    private static BankAccountDto MapToDto(BankAccount b)
    {
        var now = DateTimeOffset.UtcNow;
        var hasNotice = !string.IsNullOrWhiteSpace(b.MaintenanceNotice);

        // Check if currently under maintenance
        bool isUnderMaintenance = false;
        if (hasNotice)
        {
            if (b.IsMaintenanceMode)
            {
                isUnderMaintenance = true;
            }
            else if (b.MaintenanceStartUtc.HasValue && b.MaintenanceEndUtc.HasValue)
            {
                isUnderMaintenance = (now >= b.MaintenanceStartUtc.Value && now <= b.MaintenanceEndUtc.Value);
            }
            else if (b.MaintenanceStartUtc.HasValue && !b.MaintenanceEndUtc.HasValue)
            {
                isUnderMaintenance = (now >= b.MaintenanceStartUtc.Value);
            }
            else if (b.MaintenanceEndUtc.HasValue)
            {
                isUnderMaintenance = (now <= b.MaintenanceEndUtc.Value);
            }
        }

        return new BankAccountDto(
            b.Id,
            b.BankName,
            b.AccountTitle,
            b.AccountNumber,
            b.Iban,
            b.BranchCode,
            b.BranchName,
            FileUrlHelper.FormatBankAccountQrCodeUrl(b.QrCodeImageUrl),
            b.Instructions,
            b.IsActive,
            b.DisplayOrder,
            b.MaintenanceNotice,
            b.MaintenanceStartUtc,
            b.MaintenanceEndUtc,
            b.IsMaintenanceMode,
            isUnderMaintenance,
            b.CreatedAt,
            b.UpdatedAt
        );
    }
}
