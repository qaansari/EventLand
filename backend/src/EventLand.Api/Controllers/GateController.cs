namespace EventLand.Api.Controllers;

using EventLand.Api.Extensions;
using EventLand.Application.Common;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize(Roles = AppRoles.AdminOrSuperAdmin)]
public class GateController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public GateController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    /// <summary>
    /// Validates a ticket at the venue gate and performs admission check-in.
    /// Strictly restricted to Admin and SuperAdmin roles.
    /// </summary>
    [HttpPost("validate")]
    [EnableRateLimiting("gate")]
    public async Task<ActionResult<TicketValidationResultDto>> ValidateTicket([FromBody] ValidateGateTicketRequestDto request)
    {
        var adminId = User.GetUserId();
        var adminEmail = User.GetEmail() ?? User.Identity?.Name ?? "Admin";

        var result = await _bookingService.ValidateGateTicketAsync(request, adminId, adminEmail);
        return Ok(result);
    }

    /// <summary>
    /// Retrieves real-time attendance statistics and recent check-in activity for an event.
    /// Strictly restricted to Admin and SuperAdmin roles.
    /// </summary>
    [HttpGet("stats/{eventId:int}")]
    public async Task<ActionResult<GateStatsDto>> GetEventGateStats(int eventId)
    {
        var stats = await _bookingService.GetEventGateStatsAsync(eventId);
        return Ok(stats);
    }

    /// <summary>
    /// Resets/reverses a check-in status for an attendee (e.g. accidental scan or re-entry).
    /// Strictly restricted to Admin and SuperAdmin roles.
    /// </summary>
    [HttpPost("reset")]
    public async Task<ActionResult<TicketValidationResultDto>> ResetCheckIn([FromBody] ResetGateCheckInRequestDto request)
    {
        var adminId = User.GetUserId();
        var adminEmail = User.GetEmail() ?? User.Identity?.Name ?? "Admin";

        var result = await _bookingService.ResetGateCheckInAsync(request, adminId, adminEmail);
        return Ok(result);
    }
}
