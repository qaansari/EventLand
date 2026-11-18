namespace EventLand.Api.Controllers;

using EventLand.Api.Extensions;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Domain.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/seatHold")]
[Produces("application/json")]
public class SeatHoldController : ControllerBase
{
    private readonly ICacheService _cacheService;
    private readonly IHubContext<Hubs.SeatingHub, ISeatingHubClient> _hubContext;
    private readonly IApplicationDbContext _context;
    private readonly IBankAccountService? _bankAccountService;
    private readonly EventLand.Application.Common.EventLandTelemetry? _telemetry;

    public SeatHoldController(
        ICacheService cacheService,
        IHubContext<Hubs.SeatingHub, ISeatingHubClient> hubContext,
        IApplicationDbContext context,
        IBankAccountService? bankAccountService = null,
        EventLand.Application.Common.EventLandTelemetry? telemetry = null)
    {
        _cacheService = cacheService;
        _hubContext = hubContext;
        _context = context;
        _bankAccountService = bankAccountService;
        _telemetry = telemetry;
    }

    /// <summary>Hold seats for 10 minutes in Redis for checkout. Requires authentication.</summary>
    [HttpPost("hold")]
    [Authorize]
    [EnableRateLimiting("hold")]
    public async Task<ActionResult<HoldSeatsResponseDto>> HoldSeats([FromBody] HoldSeatsRequestDto dto)
    {
        if (dto.SeatIds == null || !dto.SeatIds.Any())
            return BadRequest(new HoldSeatsResponseDto(false, "No seat IDs provided.", new List<int>(), null));

        var authenticatedEmail = User.GetEmail();

        if (string.IsNullOrWhiteSpace(authenticatedEmail))
            return Unauthorized();

        // Server-side Bank Maintenance Check: Reject seat hold if requested for direct bank transfer during maintenance
        if (!string.IsNullOrWhiteSpace(dto.PaymentMethod) && string.Equals(dto.PaymentMethod, "BankTransfer", StringComparison.OrdinalIgnoreCase))
        {
            if (_bankAccountService != null)
            {
                var opStatus = await _bankAccountService.GetActiveBankOperationalStatusAsync();
                if (!opStatus.IsOperational && opStatus.State == BankOperationalState.UnderMaintenance)
                {
                    throw new BankMaintenanceException(
                        opStatus.Reason ?? "Direct bank transfers are currently paused for maintenance.",
                        opStatus.UntilUtc);
                }
            }
        }

        var holdDuration = TimeSpan.FromMinutes(10);
        var holdResult = await _cacheService.TryHoldSeatsGranularAsync(dto.EventId, dto.SeatIds, authenticatedEmail, holdDuration, dto.EventShowId);

        if (!holdResult.Success)
        {
            _telemetry?.RecordSeatHoldConflict(dto.EventId, dto.SeatIds.Count);

            return Conflict(new HoldSeatsResponseDto(
                false,
                holdResult.ConflictingSeatIds.Count > 0
                    ? $"The following seat(s) are currently locked by another customer: {string.Join(", ", holdResult.ConflictingSeatIds)}"
                    : "One or more selected seats are currently locked by another customer.",
                holdResult.ConflictingSeatIds,
                null
            ));
        }

        // Broadcast live SignalR WebSocket notification to the hub group clients actually join.
        await _hubContext.Clients.Group(Hubs.SeatingHub.GetGroupName(dto.EventId))
            .SeatsHeld(dto.EventId, dto.SeatIds, authenticatedEmail);

        return Ok(new HoldSeatsResponseDto(
            true,
            "Seats held successfully for 10 minutes.",
            dto.SeatIds,
            holdResult.ExpiresAt ?? DateTimeOffset.UtcNow.Add(holdDuration)
        ));
    }

    /// <summary>Release held seats back to available state. Requires authentication.</summary>
    [HttpPost("release")]
    [Authorize]
    public async Task<ActionResult> ReleaseSeats([FromBody] HoldSeatsRequestDto dto)
    {
        if (dto.SeatIds != null && dto.SeatIds.Any())
        {
            var callerEmail = User.GetEmail();
            bool isAdmin = User.IsAdmin();
            await _cacheService.ReleaseSeatsAsync(dto.EventId, dto.SeatIds, dto.EventShowId, isAdmin ? null : callerEmail);

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

    /// <summary>Reconcile seat status snapshot with ETag / If-None-Match support (Audit #2).</summary>
    [HttpGet("/api/events/{id:int}/shows/{showId:int}/seats")]
    [ResponseCache(NoStore = true)]
    public async Task<IActionResult> GetSeatSnapshot(int id, int showId)
    {
        var seats = await _context.Seats
            .AsNoTracking()
            .Where(s => s.Zone.EventId == id && !s.IsDeleted)
            .Select(s => new
            {
                s.Id,
                s.ZoneId,
                s.Row,
                s.Col,
                s.Label,
                s.Price,
                Status = s.Status.ToString(),
                State = s.State.ToString(),
                s.UpdatedAt
            })
            .ToListAsync();

        var heldSeatIds = (await _cacheService.GetHeldSeatIdsAsync(id, showId)).ToHashSet();

        var snapshot = seats.Select(s => new
        {
            s.Id,
            s.ZoneId,
            s.Row,
            s.Col,
            s.Label,
            s.Price,
            Status = heldSeatIds.Contains(s.Id) ? "Reserved" : s.Status,
            State = heldSeatIds.Contains(s.Id) ? "TemporarilyHeld" : s.State,
            IsHeld = heldSeatIds.Contains(s.Id)
        }).ToList();

        var versionTag = $"W/\"ver-{id}-{showId}-{seats.Count}-{heldSeatIds.Count}-{seats.Max(s => (DateTimeOffset?)s.UpdatedAt)?.ToUnixTimeSeconds() ?? 0}\"";

        if (Request.Headers.TryGetValue("If-None-Match", out var ifNoneMatch) && ifNoneMatch == versionTag)
        {
            return StatusCode(StatusCodes.Status304NotModified);
        }

        Response.Headers.ETag = versionTag;
        return Ok(snapshot);
    }
}
