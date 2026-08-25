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

    /// <summary>Get list of all auditoriums / venue seating layouts for event creation.</summary>
    [HttpGet]
    public async Task<ActionResult<List<AuditoriumDto>>> GetActiveAuditoriums()
    {
        var result = await _adminService.GetAuditoriumsAsync();
        return Ok(result);
    }

    /// <summary>Get single auditorium details by ID.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AuditoriumDto>> GetAuditoriumById(int id)
    {
        var result = await _adminService.GetAuditoriumByIdAsync(id);
        if (result == null) return NotFound(new { message = $"Auditorium '{id}' not found." });
        return Ok(result);
    }
}
