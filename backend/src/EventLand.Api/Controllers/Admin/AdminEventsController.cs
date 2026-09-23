namespace EventLand.Api.Controllers.Admin;

using EventLand.Api.Extensions;
using EventLand.Application.Common;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/events")]
[Authorize(Roles = AppRoles.OrganizerOrAdmin)]
[Produces("application/json")]
public class AdminEventsController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminEventsController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<EventSummaryDto>>> GetEvents(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _adminService.GetEventsAsync(pageNumber, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EventDetailDto>> GetEventById(int id)
    {
        var ev = await _adminService.GetEventByIdAsync(id);
        return Ok(ev);
    }

    [HttpPost]
    public async Task<ActionResult<EventDetailDto>> CreateEvent([FromBody] CreateAdminEventDto dto)
    {
        if (!User.IsAdmin())
        {
            var orgId = User.GetOrganizerId();
            if (orgId.HasValue && orgId.Value > 0)
            {
                dto = dto with { OrganizerId = orgId.Value };
            }
        }

        var created = await _adminService.CreateEventAsync(dto);
        return CreatedAtAction(nameof(GetEvents), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<EventDetailDto>> UpdateEvent(int id, [FromBody] UpdateAdminEventDto dto)
    {
        int? scopedOrgId = User.IsAdmin() ? null : User.GetOrganizerId();
        if (!User.IsAdmin() && !scopedOrgId.HasValue) return Forbid();

        if (scopedOrgId.HasValue)
        {
            dto = dto with { OrganizerId = scopedOrgId.Value };
        }

        try
        {
            var updated = await _adminService.UpdateEventAsync(id, dto, scopedOrgId);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteEvent(int id)
    {
        int? scopedOrgId = User.IsAdmin() ? null : User.GetOrganizerId();
        if (!User.IsAdmin() && !scopedOrgId.HasValue) return Forbid();

        var success = await _adminService.DeleteEventAsync(id, scopedOrgId);
        if (!success) return NotFound();
        return NoContent();
    }
}
