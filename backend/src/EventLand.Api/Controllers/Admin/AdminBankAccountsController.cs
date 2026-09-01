namespace EventLand.Api.Controllers.Admin;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/bank-accounts")]
[Authorize(Roles = "admin,superadmin,Admin,SuperAdmin")]
public class AdminBankAccountsController : ControllerBase
{
    private readonly IBankAccountService _bankAccountService;

    public AdminBankAccountsController(IBankAccountService bankAccountService)
    {
        _bankAccountService = bankAccountService;
    }

    [HttpGet]
    public async Task<ActionResult<List<BankAccountDto>>> GetAllBankAccounts()
    {
        var accounts = await _bankAccountService.GetAllBankAccountsAsync();
        return Ok(accounts);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BankAccountDto>> GetBankAccountById(int id)
    {
        var account = await _bankAccountService.GetBankAccountByIdAsync(id);
        if (account is null)
            return NotFound(new { message = $"Bank account with ID '{id}' not found." });

        return Ok(account);
    }

    [HttpPost]
    public async Task<ActionResult<BankAccountDto>> CreateBankAccount([FromBody] CreateBankAccountDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var created = await _bankAccountService.CreateBankAccountAsync(dto);
        return CreatedAtAction(nameof(GetBankAccountById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<BankAccountDto>> UpdateBankAccount(int id, [FromBody] UpdateBankAccountDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var updated = await _bankAccountService.UpdateBankAccountAsync(id, dto);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteBankAccount(int id)
    {
        var success = await _bankAccountService.DeleteBankAccountAsync(id);
        if (!success)
            return NotFound(new { message = $"Bank account with ID '{id}' not found." });

        return NoContent();
    }

    [HttpPut("{id:int}/toggle-active")]
    public async Task<ActionResult<BankAccountDto>> ToggleActive(int id)
    {
        try
        {
            var updated = await _bankAccountService.ToggleActiveAsync(id);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
