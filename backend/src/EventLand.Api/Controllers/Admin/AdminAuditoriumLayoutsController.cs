namespace EventLand.Api.Controllers.Admin;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/auditorium-layouts")]
[Authorize(Roles = "SuperAdmin,Admin")]
[Produces("application/json")]
public class AdminAuditoriumLayoutsController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminAuditoriumLayoutsController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    public async Task<ActionResult<List<AuditoriumLayoutDto>>> GetAll()
    {
        var list = await _adminService.GetAuditoriumLayoutsAsync(activeOnly: false);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AuditoriumLayoutDto>> GetById(int id)
    {
        var layout = await _adminService.GetAuditoriumLayoutByIdAsync(id);
        if (layout is null) return NotFound(new { message = $"Auditorium layout '{id}' not found." });
        return Ok(layout);
    }

    [HttpPost]
    public async Task<ActionResult<AuditoriumLayoutDto>> Create([FromBody] CreateAuditoriumLayoutDto dto)
    {
        var created = await _adminService.CreateAuditoriumLayoutAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<AuditoriumLayoutDto>> Update(int id, [FromBody] UpdateAuditoriumLayoutDto dto)
    {
        var updated = await _adminService.UpdateAuditoriumLayoutAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var success = await _adminService.DeleteAuditoriumLayoutAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
