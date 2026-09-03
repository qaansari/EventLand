namespace EventLand.Api.Controllers;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class EventsController : ControllerBase
{
    private readonly IEventService _eventService;

    public EventsController(IEventService eventService)
    {
        _eventService = eventService;
    }

    /// <summary>Get a paged list of published events with optional category, city, tag, or search filters.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<EventSummaryDto>>> GetEvents(
        [FromQuery] string? category,
        [FromQuery] string? city,
        [FromQuery] string? search,
        [FromQuery] string? tag,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var events = await _eventService.GetEventsAsync(category, city, search, tag, pageNumber, pageSize);
        return Ok(events);
    }

    /// <summary>Get full event details including ticket tiers and seating zones by slug identifier or numeric ID.</summary>
    [HttpGet("{identifier}")]
    public async Task<ActionResult<EventDetailDto>> GetEventByIdentifier(string identifier)
    {
        var ev = await _eventService.GetEventByIdentifierAsync(identifier);
        if (ev is null)
            return NotFound(new { message = $"Event '{identifier}' not found." });

        return Ok(ev);
    }
}
