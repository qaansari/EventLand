namespace EventLand.Api.Controllers;

using EventLand.Application.Common;
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
        var result = await _adminService.GetCountriesAsync();
        return Ok(result);
    }

    [HttpPost("api/countries")]
    [Authorize(Roles = AppRoles.AdminOrSuperAdmin)]
    public async Task<ActionResult<CountryDto>> CreateCountry([FromBody] CreateCountryDto dto)
    {
        var created = await _adminService.CreateCountryAsync(dto);
        return Ok(created);
    }

    [HttpPut("api/countries/{id:int}")]
    [Authorize(Roles = AppRoles.AdminOrSuperAdmin)]
    public async Task<ActionResult<CountryDto>> UpdateCountry(int id, [FromBody] UpdateCountryDto dto)
    {
        var updated = await _adminService.UpdateCountryAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("api/countries/{id:int}")]
    [Authorize(Roles = AppRoles.AdminOrSuperAdmin)]
    public async Task<ActionResult> DeleteCountry(int id)
    {
        var success = await _adminService.DeleteCountryAsync(id);
        if (!success) return NotFound(new { message = $"Country '{id}' not found." });
        return NoContent();
    }

    // --- Cities ---
    [HttpGet("api/cities")]
    public async Task<ActionResult<List<CityDto>>> GetCities([FromQuery] int? countryId)
    {
        var result = await _adminService.GetCitiesAsync(countryId);
        return Ok(result);
    }

    [HttpPost("api/cities")]
    [Authorize(Roles = AppRoles.AdminOrSuperAdmin)]
    public async Task<ActionResult<CityDto>> CreateCity([FromBody] CreateCityDto dto)
    {
        var created = await _adminService.CreateCityAsync(dto);
        return Ok(created);
    }

    [HttpPut("api/cities/{id:int}")]
    [Authorize(Roles = AppRoles.AdminOrSuperAdmin)]
    public async Task<ActionResult<CityDto>> UpdateCity(int id, [FromBody] UpdateCityDto dto)
    {
        var updated = await _adminService.UpdateCityAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("api/cities/{id:int}")]
    [Authorize(Roles = AppRoles.AdminOrSuperAdmin)]
    public async Task<ActionResult> DeleteCity(int id)
    {
        var success = await _adminService.DeleteCityAsync(id);
        if (!success) return NotFound(new { message = $"City '{id}' not found." });
        return NoContent();
    }

    // --- Venues ---
    [HttpGet("api/venues")]
    public async Task<ActionResult<List<VenueDto>>> GetVenues([FromQuery] int? cityId)
    {
        var result = await _adminService.GetVenuesAsync(cityId);
        return Ok(result);
    }

    [HttpPost("api/venues")]
    [Authorize(Roles = AppRoles.OrganizerOrAdmin)]
    public async Task<ActionResult<VenueDto>> CreateVenue([FromBody] CreateVenueDto dto)
    {
        var created = await _adminService.CreateVenueAsync(dto);
        return Ok(created);
    }

    [HttpPut("api/venues/{id:int}")]
    [Authorize(Roles = AppRoles.AdminOrSuperAdmin)]
    public async Task<ActionResult<VenueDto>> UpdateVenue(int id, [FromBody] UpdateVenueDto dto)
    {
        var updated = await _adminService.UpdateVenueAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("api/venues/{id:int}")]
    [Authorize(Roles = AppRoles.AdminOrSuperAdmin)]
    public async Task<ActionResult> DeleteVenue(int id)
    {
        var success = await _adminService.DeleteVenueAsync(id);
        if (!success) return NotFound(new { message = $"Venue '{id}' not found." });
        return NoContent();
    }
}
