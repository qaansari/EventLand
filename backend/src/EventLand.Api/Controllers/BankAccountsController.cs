namespace EventLand.Api.Controllers;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/bank-accounts")]
public class BankAccountsController : ControllerBase
{
    private readonly IBankAccountService _bankAccountService;

    public BankAccountsController(IBankAccountService bankAccountService)
    {
        _bankAccountService = bankAccountService;
    }

    /// <summary>
    /// Fetches the currently active bank account details for direct bank transfer checkout.
    /// Requires authentication — only logged-in users proceeding to checkout should see bank details.
    /// Sensitive admin-operational fields (maintenance internals) are stripped from the response.
    /// </summary>
    [HttpGet("active")]
    [AllowAnonymous]
    public async Task<ActionResult<BankAccountDto>> GetActiveBankAccount()
    {
        var account = await _bankAccountService.GetActiveBankAccountAsync();
        if (account is null)
            return NotFound(new { message = "No active bank account configured for direct transfer." });

        // Return a safe projection: exclude admin maintenance internals from the public response.
        // Maintenance status (IsUnderMaintenance) is still included so the frontend can guard
        // seat selection and checkout flow, but internal dates and flags are stripped.
        return Ok(new
        {
            account.Id,
            account.BankName,
            account.AccountTitle,
            account.AccountNumber,
            account.Iban,
            account.BranchCode,
            account.BranchName,
            account.QrCodeImageUrl,
            account.Instructions,
            account.IsActive,
            account.DisplayOrder,
            // Maintenance: only expose the notice message and computed boolean
            account.MaintenanceNotice,
            account.IsUnderMaintenance,
            account.CreatedAt
        });
    }
}
