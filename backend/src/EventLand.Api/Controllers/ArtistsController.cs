namespace EventLand.Api.Controllers;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ArtistsController : ControllerBase
{
    private readonly IArtistService _artistService;

    public ArtistsController(IArtistService artistService)
    {
        _artistService = artistService;
    }

    /// <summary>Get paged list of artists, optionally filtered to featured only.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<ArtistDto>>> GetArtists(
        [FromQuery] bool? featured,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var artists = await _artistService.GetArtistsAsync(featured, pageNumber, pageSize);
        return Ok(artists);
    }

    /// <summary>Get a single artist by 4-digit ID.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ArtistDto>> GetArtistById(int id)
    {
        var artist = await _artistService.GetArtistByIdAsync(id);
        if (artist is null)
            return NotFound(new { message = $"Artist '{id}' not found." });

        return Ok(artist);
    }
}
