namespace EventLand.Application.Interfaces;

using EventLand.Application.Dtos;

public interface IBankAccountService
{
    Task<BankAccountDto?> GetActiveBankAccountAsync();
    Task<List<BankAccountDto>> GetAllBankAccountsAsync();
    Task<BankAccountDto?> GetBankAccountByIdAsync(int id);
    Task<BankAccountDto> CreateBankAccountAsync(CreateBankAccountDto dto);
    Task<BankAccountDto> UpdateBankAccountAsync(int id, UpdateBankAccountDto dto);
    Task<bool> DeleteBankAccountAsync(int id);
    Task<BankAccountDto> ToggleActiveAsync(int id);
}
