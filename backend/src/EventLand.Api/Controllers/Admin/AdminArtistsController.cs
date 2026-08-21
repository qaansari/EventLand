namespace EventLand.Api.Controllers.Admin;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/artists")]
[Authorize(Roles = "SuperAdmin,Admin")]
[Produces("application/json")]
public class AdminArtistsController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminArtistsController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<ArtistDto>>> GetArtists([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var items = await _adminService.GetArtistsAsync(pageNumber, pageSize);
        return Ok(items);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ArtistDto>> GetArtistById(int id)
    {
        var item = await _adminService.GetArtistByIdAsync(id);
        if (item is null) return NotFound(new { message = $"Artist '{id}' not found." });
        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<ArtistDto>> CreateArtist([FromBody] CreateArtistDto dto)
    {
        var created = await _adminService.CreateArtistAsync(dto);
        return CreatedAtAction(nameof(GetArtistById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ArtistDto>> UpdateArtist(int id, [FromBody] UpdateArtistDto dto)
    {
        var updated = await _adminService.UpdateArtistAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteArtist(int id)
    {
        var success = await _adminService.DeleteArtistAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
