namespace EventLand.Api.Controllers.Admin;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/event-shows")]
[Authorize(Roles = "SuperAdmin,Admin")]
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
        var created = await _adminService.CreateEventShowAsync(dto);
        return Ok(created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<EventShowDto>> UpdateEventShow(int id, [FromBody] UpdateEventShowDto dto)
    {
        var updated = await _adminService.UpdateEventShowAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteEventShow(int id)
    {
        var success = await _adminService.DeleteEventShowAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
