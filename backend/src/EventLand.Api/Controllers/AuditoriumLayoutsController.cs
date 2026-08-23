namespace EventLand.Api.Controllers;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/auditorium-layouts")]
[Produces("application/json")]
public class AuditoriumLayoutsController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AuditoriumLayoutsController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    /// <summary>Get list of all active auditorium seating layouts for event creation.</summary>
    [HttpGet]
    public async Task<ActionResult<List<AuditoriumLayoutDto>>> GetActiveAuditoriums()
    {
        var result = await _adminService.GetAuditoriumLayoutsAsync(activeOnly: true);
        return Ok(result);
    }

    /// <summary>Get single auditorium layout details by ID.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AuditoriumLayoutDto>> GetAuditoriumById(int id)
    {
        var result = await _adminService.GetAuditoriumLayoutByIdAsync(id);
        if (result == null) return NotFound(new { message = $"Auditorium layout '{id}' not found." });
        return Ok(result);
    }
}
