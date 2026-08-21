namespace EventLand.Api.Controllers.Admin;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/events")]
[Authorize(Roles = "SuperAdmin,Admin")]
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

    [HttpPost]
    public async Task<ActionResult<EventDetailDto>> CreateEvent([FromBody] CreateAdminEventDto dto)
    {
        var created = await _adminService.CreateEventAsync(dto);
        return CreatedAtAction(nameof(GetEvents), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<EventDetailDto>> UpdateEvent(int id, [FromBody] UpdateAdminEventDto dto)
    {
        var updated = await _adminService.UpdateEventAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteEvent(int id)
    {
        var success = await _adminService.DeleteEventAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
