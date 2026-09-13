namespace EventLand.Api.Controllers.Admin;

using EventLand.Api.Extensions;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/ticket-tiers")]
[Authorize(Roles = "SuperAdmin,Admin,Organizer,organizer,admin,superadmin")]
[Produces("application/json")]
public class AdminTicketTiersController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminTicketTiersController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    public async Task<ActionResult<List<TicketTierDto>>> GetTicketTiers([FromQuery] int? eventId = null, [FromQuery] int? eventShowId = null)
    {
        int? scopedOrgId = User.IsAdmin() ? null : User.GetOrganizerId();
        if (!User.IsAdmin() && !scopedOrgId.HasValue) return Forbid();

        var list = await _adminService.GetTicketTiersAsync(eventId, eventShowId, scopedOrgId);
        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<TicketTierDto>> CreateTicketTier([FromBody] CreateTicketTierDto dto)
    {
        int? scopedOrgId = User.IsAdmin() ? null : User.GetOrganizerId();
        if (!User.IsAdmin() && !scopedOrgId.HasValue) return Forbid();

        try
        {
            var created = await _adminService.CreateTicketTierAsync(dto, scopedOrgId);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TicketTierDto>> UpdateTicketTier(int id, [FromBody] UpdateTicketTierDto dto)
    {
        int? scopedOrgId = User.IsAdmin() ? null : User.GetOrganizerId();
        if (!User.IsAdmin() && !scopedOrgId.HasValue) return Forbid();

        try
        {
            var updated = await _adminService.UpdateTicketTierAsync(id, dto, scopedOrgId);
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteTicketTier(int id)
    {
        int? scopedOrgId = User.IsAdmin() ? null : User.GetOrganizerId();
        if (!User.IsAdmin() && !scopedOrgId.HasValue) return Forbid();

        var success = await _adminService.DeleteTicketTierAsync(id, scopedOrgId);
        if (!success) return NotFound();
        return NoContent();
    }
}
