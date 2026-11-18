namespace EventLand.Infrastructure.Services;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Common;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

public class BankAccountService : IBankAccountService
{
    private const string StatusCacheKey = "bank:operational-status";
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly ILogger<BankAccountService> _logger;
    private readonly TimeProvider _timeProvider;

    public BankAccountService(
        IApplicationDbContext context,
        ICacheService cacheService,
        ILogger<BankAccountService> logger,
        TimeProvider? timeProvider = null)
    {
        _context = context;
        _cacheService = cacheService;
        _logger = logger;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    public async Task<BankAccountDto?> GetActiveBankAccountAsync()
    {
        var account = await _context.BankAccounts
            .AsNoTracking()
            .Where(b => b.IsActive && b.IsEnabled && !b.IsDeleted)
            .OrderBy(b => b.DisplayOrder)
            .ThenByDescending(b => b.Id)
            .FirstOrDefaultAsync();

        return account is null ? null : MapToDto(account);
    }

    public async Task<BankOperationalStatus> GetActiveBankOperationalStatusAsync()
    {
        var account = await _context.BankAccounts
            .AsNoTracking()
            .Where(b => b.IsActive && b.IsEnabled && !b.IsDeleted)
            .OrderBy(b => b.DisplayOrder)
            .ThenByDescending(b => b.Id)
            .FirstOrDefaultAsync();

        if (account == null)
            return BankOperationalStatus.Disabled("No active bank account configured for direct transfer.");

        return account.GetOperationalStatus(_timeProvider.GetUtcNow());
    }

    public async Task<BankStatusDto> GetCachedBankStatusAsync()
    {
        var cached = await _cacheService.GetAsync<BankStatusDto>(StatusCacheKey);
        if (cached != null)
            return cached;

        var opStatus = await GetActiveBankOperationalStatusAsync();
        var now = _timeProvider.GetUtcNow();

        int? retryAfterSeconds = null;
        if (opStatus.UntilUtc.HasValue)
        {
            retryAfterSeconds = Math.Max(1, (int)(opStatus.UntilUtc.Value - now).TotalSeconds);
        }

        var dto = new BankStatusDto(
            IsOperational: opStatus.IsOperational,
            Status: opStatus.State.ToString(),
            MaintenanceType: opStatus.MaintenanceType == BankMaintenanceType.None ? null : opStatus.MaintenanceType.ToString(),
            Notice: opStatus.Reason,
            UntilUtc: opStatus.UntilUtc,
            RetryAfterSeconds: retryAfterSeconds
        );

        await _cacheService.SetAsync(StatusCacheKey, dto, TimeSpan.FromSeconds(30));
        return dto;
    }

    public async Task<List<BankAccountDto>> GetAllBankAccountsAsync()
    {
        var accounts = await _context.BankAccounts
            .AsNoTracking()
            .Where(b => !b.IsDeleted)
            .OrderBy(b => b.DisplayOrder)
            .ThenByDescending(b => b.Id)
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
        var now = _timeProvider.GetUtcNow();

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
            IsEnabled = dto.IsEnabled,
            DisplayOrder = dto.DisplayOrder
        };

        // Validate and apply maintenance window using aggregate invariant rules
        entity.SetMaintenanceWindow(dto.MaintenanceStartUtc, dto.MaintenanceEndUtc, dto.MaintenanceNotice, dto.IsMaintenanceMode, now);

        _context.BankAccounts.Add(entity);
        await _context.SaveChangesAsync();
        await _cacheService.RemoveAsync(StatusCacheKey);

        _logger.LogInformation("Created new BankAccount ID {Id} ({BankName} - {AccountTitle})", entity.Id, entity.BankName, entity.AccountTitle);
        return MapToDto(entity);
    }

    public async Task<BankAccountDto> UpdateBankAccountAsync(int id, UpdateBankAccountDto dto)
    {
        var now = _timeProvider.GetUtcNow();

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
        if (dto.IsEnabled.HasValue) entity.IsEnabled = dto.IsEnabled.Value;
        if (dto.DisplayOrder.HasValue) entity.DisplayOrder = dto.DisplayOrder.Value;

        // Invariant check on write: maintenance window
        entity.SetMaintenanceWindow(
            dto.MaintenanceStartUtc ?? entity.MaintenanceStartUtc,
            dto.MaintenanceEndUtc ?? entity.MaintenanceEndUtc,
            dto.MaintenanceNotice ?? entity.MaintenanceNotice,
            dto.IsMaintenanceMode ?? entity.IsMaintenanceMode,
            now
        );

        await _context.SaveChangesAsync();
        await _cacheService.RemoveAsync(StatusCacheKey);

        _logger.LogInformation("Updated BankAccount ID {Id} ({BankName})", entity.Id, entity.BankName);
        return MapToDto(entity);
    }

    public async Task<bool> DeleteBankAccountAsync(int id)
    {
        var entity = await _context.BankAccounts
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);

        if (entity is null) return false;

        entity.IsDeleted = true;
        entity.DeletedAt = _timeProvider.GetUtcNow();
        await _context.SaveChangesAsync();
        await _cacheService.RemoveAsync(StatusCacheKey);

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
        await _cacheService.RemoveAsync(StatusCacheKey);

        return MapToDto(entity);
    }

    public async Task<BankAccountDto> ToggleEnabledAsync(int id)
    {
        var entity = await _context.BankAccounts
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);

        if (entity is null)
            throw new KeyNotFoundException($"Bank account with ID '{id}' not found.");

        entity.IsEnabled = !entity.IsEnabled;
        await _context.SaveChangesAsync();
        await _cacheService.RemoveAsync(StatusCacheKey);

        _logger.LogInformation("Toggled IsEnabled for BankAccount ID {Id} to {IsEnabled}", id, entity.IsEnabled);
        return MapToDto(entity);
    }

    private BankAccountDto MapToDto(BankAccount b)
    {
        var now = _timeProvider.GetUtcNow();
        var opStatus = b.GetOperationalStatus(now);
        bool isUnderMaintenance = !opStatus.IsOperational && opStatus.State == BankOperationalState.UnderMaintenance;

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
            b.IsEnabled,
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
