namespace EventLand.Api.Controllers;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

[ApiController]
[Route("api/seatHold")]
[Produces("application/json")]
public class SeatHoldController : ControllerBase
{
    private readonly ICacheService _cacheService;
    private readonly IHubContext<Hubs.SeatingHub, ISeatingHubClient> _hubContext;

    public SeatHoldController(
        ICacheService cacheService,
        IHubContext<Hubs.SeatingHub, ISeatingHubClient> hubContext)
    {
        _cacheService = cacheService;
        _hubContext = hubContext;
    }

    /// <summary>Hold seats for 10 minutes in Redis for checkout. Requires authentication.</summary>
    [HttpPost("hold")]
    [Authorize]
    public async Task<ActionResult<HoldSeatsResponseDto>> HoldSeats([FromBody] HoldSeatsRequestDto dto)
    {
        if (dto.SeatIds == null || !dto.SeatIds.Any())
            return BadRequest(new HoldSeatsResponseDto(false, "No seat IDs provided.", new List<int>(), null));

        var holdDuration = TimeSpan.FromMinutes(10);
        var success = await _cacheService.HoldSeatsAsync(dto.EventId, dto.SeatIds, dto.CustomerEmail, holdDuration, dto.EventShowId);

        if (!success)
        {
            return Conflict(new HoldSeatsResponseDto(
                false,
                "One or more selected seats are currently locked by another customer.",
                new List<int>(),
                null
            ));
        }

        // Broadcast live SignalR WebSocket notification to the hub group clients actually join.
        await _hubContext.Clients.Group(Hubs.SeatingHub.GetGroupName(dto.EventId))
            .SeatsHeld(dto.EventId, dto.SeatIds, dto.CustomerEmail);

        return Ok(new HoldSeatsResponseDto(
            true,
            "Seats held successfully for 10 minutes.",
            dto.SeatIds,
            DateTimeOffset.UtcNow.Add(holdDuration)
        ));
    }

    /// <summary>Release held seats back to available state. Requires authentication.</summary>
    [HttpPost("release")]
    [Authorize]
    public async Task<ActionResult> ReleaseSeats([FromBody] HoldSeatsRequestDto dto)
    {
        if (dto.SeatIds != null && dto.SeatIds.Any())
        {
            await _cacheService.ReleaseSeatsAsync(dto.EventId, dto.SeatIds, dto.EventShowId);

            await _hubContext.Clients.Group(Hubs.SeatingHub.GetGroupName(dto.EventId))
                .SeatsReleased(dto.EventId, dto.SeatIds);
        }

        return NoContent();
    }

    /// <summary>Get list of currently locked seat IDs for an event/show.</summary>
    [HttpGet("event/{eventId:int}")]
    public async Task<ActionResult<List<int>>> GetHeldSeats(int eventId, [FromQuery] int? showId)
    {
        var heldSeats = await _cacheService.GetHeldSeatIdsAsync(eventId, showId);
        return Ok(heldSeats);
    }
}
