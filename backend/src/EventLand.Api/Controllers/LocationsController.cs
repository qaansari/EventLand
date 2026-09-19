namespace EventLand.Api.Controllers;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Produces("application/json")]
public class LocationsController : ControllerBase
{
    private readonly IAdminService _adminService;

    public LocationsController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    // --- Countries ---
    [HttpGet("api/countries")]
    public async Task<ActionResult<List<CountryDto>>> GetCountries()
    {
        try
        {
            var result = await _adminService.GetCountriesAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("api/countries")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult<CountryDto>> CreateCountry([FromBody] CreateCountryDto dto)
    {
        try
        {
            var created = await _adminService.CreateCountryAsync(dto);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPut("api/countries/{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult<CountryDto>> UpdateCountry(int id, [FromBody] UpdateCountryDto dto)
    {
        try
        {
            var updated = await _adminService.UpdateCountryAsync(id, dto);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpDelete("api/countries/{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult> DeleteCountry(int id)
    {
        try
        {
            var success = await _adminService.DeleteCountryAsync(id);
            if (!success) return NotFound(new { message = $"Country '{id}' not found." });
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // --- Cities ---
    [HttpGet("api/cities")]
    public async Task<ActionResult<List<CityDto>>> GetCities([FromQuery] int? countryId)
    {
        try
        {
            var result = await _adminService.GetCitiesAsync(countryId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("api/cities")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult<CityDto>> CreateCity([FromBody] CreateCityDto dto)
    {
        try
        {
            var created = await _adminService.CreateCityAsync(dto);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPut("api/cities/{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult<CityDto>> UpdateCity(int id, [FromBody] UpdateCityDto dto)
    {
        try
        {
            var updated = await _adminService.UpdateCityAsync(id, dto);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpDelete("api/cities/{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult> DeleteCity(int id)
    {
        try
        {
            var success = await _adminService.DeleteCityAsync(id);
            if (!success) return NotFound(new { message = $"City '{id}' not found." });
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // --- Venues ---
    [HttpGet("api/venues")]
    public async Task<ActionResult<List<VenueDto>>> GetVenues([FromQuery] int? cityId)
    {
        try
        {
            var result = await _adminService.GetVenuesAsync(cityId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("api/venues")]
    [Authorize(Roles = "SuperAdmin,Admin,Organizer")]
    public async Task<ActionResult<VenueDto>> CreateVenue([FromBody] CreateVenueDto dto)
    {
        try
        {
            var created = await _adminService.CreateVenueAsync(dto);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPut("api/venues/{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult<VenueDto>> UpdateVenue(int id, [FromBody] UpdateVenueDto dto)
    {
        try
        {
            var updated = await _adminService.UpdateVenueAsync(id, dto);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpDelete("api/venues/{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult> DeleteVenue(int id)
    {
        try
        {
            var success = await _adminService.DeleteVenueAsync(id);
            if (!success) return NotFound(new { message = $"Venue '{id}' not found." });
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}

