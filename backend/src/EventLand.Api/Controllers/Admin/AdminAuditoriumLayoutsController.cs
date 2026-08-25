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
    public async Task<ActionResult<List<AuditoriumDto>>> GetAll()
    {
        var list = await _adminService.GetAuditoriumsAsync();
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AuditoriumDto>> GetById(int id)
    {
        var layout = await _adminService.GetAuditoriumByIdAsync(id);
        if (layout is null) return NotFound(new { message = $"Auditorium '{id}' not found." });
        return Ok(layout);
    }

    [HttpPost]
    public async Task<ActionResult<AuditoriumDto>> Create([FromBody] CreateAuditoriumDto dto)
    {
        var created = await _adminService.CreateAuditoriumAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<AuditoriumDto>> Update(int id, [FromBody] UpdateAuditoriumDto dto)
    {
        var updated = await _adminService.UpdateAuditoriumAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var success = await _adminService.DeleteAuditoriumAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
