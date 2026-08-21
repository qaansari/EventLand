namespace EventLand.Api.Controllers.Admin;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/seating-zones")]
[Authorize(Roles = "SuperAdmin,Admin")]
[Produces("application/json")]
public class AdminSeatingZonesController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminSeatingZonesController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpPost]
    public async Task<ActionResult<SeatingZoneDto>> CreateSeatingZone([FromBody] CreateSeatingZoneDto dto)
    {
        var created = await _adminService.CreateSeatingZoneAsync(dto);
        return Ok(created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<SeatingZoneDto>> UpdateSeatingZone(int id, [FromBody] UpdateSeatingZoneDto dto)
    {
        var updated = await _adminService.UpdateSeatingZoneAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteSeatingZone(int id)
    {
        var success = await _adminService.DeleteSeatingZoneAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
