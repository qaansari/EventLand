namespace EventLand.Api.Controllers.Admin;

using EventLand.Api.Extensions;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/event-shows")]
[Authorize(Roles = "SuperAdmin,Admin,Organizer,organizer,admin,superadmin")]
[Produces("application/json")]
public class AdminEventShowsController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminEventShowsController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpPost]
    public async Task<ActionResult<EventShowDto>> CreateEventShow([FromBody] CreateEventShowDto dto)
    {
        int? scopedOrgId = User.IsAdmin() ? null : User.GetOrganizerId();
        if (!User.IsAdmin() && !scopedOrgId.HasValue) return Forbid();

        try
        {
            var created = await _adminService.CreateEventShowAsync(dto, scopedOrgId);
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
    public async Task<ActionResult<EventShowDto>> UpdateEventShow(int id, [FromBody] UpdateEventShowDto dto)
    {
        int? scopedOrgId = User.IsAdmin() ? null : User.GetOrganizerId();
        if (!User.IsAdmin() && !scopedOrgId.HasValue) return Forbid();

        try
        {
            var updated = await _adminService.UpdateEventShowAsync(id, dto, scopedOrgId);
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
    public async Task<ActionResult> DeleteEventShow(int id)
    {
        int? scopedOrgId = User.IsAdmin() ? null : User.GetOrganizerId();
        if (!User.IsAdmin() && !scopedOrgId.HasValue) return Forbid();

        var success = await _adminService.DeleteEventShowAsync(id, scopedOrgId);
        if (!success) return NotFound();
        return NoContent();
    }
}
