namespace EventLand.Api.Controllers.Admin;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/organizers")]
[Authorize(Roles = "SuperAdmin,Admin")]
[Produces("application/json")]
public class AdminOrganizersController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminOrganizersController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    public async Task<ActionResult<List<OrganizerDto>>> GetOrganizers()
    {
        var item = await _adminService.GetOrganizersAsync();
        return Ok(item);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrganizerDto>> GetOrganizerById(int id)
    {
        var item = await _adminService.GetOrganizerByIdAsync(id);
        if (item is null) return NotFound(new { message = $"Organizer '{id}' not found." });
        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<OrganizerDto>> CreateOrganizer([FromBody] CreateOrganizerDto dto)
    {
        var created = await _adminService.CreateOrganizerAsync(dto);
        return CreatedAtAction(nameof(GetOrganizerById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<OrganizerDto>> UpdateOrganizer(int id, [FromBody] UpdateOrganizerDto dto)
    {
        var updated = await _adminService.UpdateOrganizerAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteOrganizer(int id)
    {
        var success = await _adminService.DeleteOrganizerAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
