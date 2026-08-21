namespace EventLand.Api.Controllers.Admin;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/ticket-tiers")]
[Authorize(Roles = "SuperAdmin,Admin")]
[Produces("application/json")]
public class AdminTicketTiersController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminTicketTiersController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpPost]
    public async Task<ActionResult<TicketTierDto>> CreateTicketTier([FromBody] CreateTicketTierDto dto)
    {
        var created = await _adminService.CreateTicketTierAsync(dto);
        return Ok(created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TicketTierDto>> UpdateTicketTier(int id, [FromBody] UpdateTicketTierDto dto)
    {
        var updated = await _adminService.UpdateTicketTierAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteTicketTier(int id)
    {
        var success = await _adminService.DeleteTicketTierAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
