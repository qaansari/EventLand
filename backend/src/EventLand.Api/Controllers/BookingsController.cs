namespace EventLand.Api.Controllers;

using System.Security.Claims;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    /// <summary>Create a booking (supports both categorized and mapped-seat events). Requires authentication.</summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<BookingDto>> CreateBooking([FromBody] CreateBookingDto dto)
    {
        var email = GetAuthenticatedEmail();
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized();

        var booking = await _bookingService.CreateBookingAsync(dto, GetAuthenticatedUserId(), email);
        return CreatedAtAction(nameof(GetBookingById), new { id = booking.Id }, booking);
    }

    /// <summary>Get booking by 4-digit ID. Owner or admin only.</summary>
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<ActionResult<BookingDto>> GetBookingById(int id)
    {
        var booking = await _bookingService.GetBookingByIdAsync(id);
        if (booking is null)
            return NotFound(new { message = $"Booking '{id}' not found." });

        if (!CanAccess(booking.CustomerEmail))
            return Forbid();

        return Ok(booking);
    }

    /// <summary>Get booking by human-readable reference code (e.g. EVL-XXXX). Owner or admin only.</summary>
    [HttpGet("ref/{bookingRef}")]
    [Authorize]
    public async Task<ActionResult<BookingDto>> GetBookingByRef(string bookingRef)
    {
        var booking = await _bookingService.GetBookingByRefAsync(bookingRef);
        if (booking is null)
            return NotFound(new { message = $"Booking reference '{bookingRef}' not found." });

        if (!CanAccess(booking.CustomerEmail))
            return Forbid();

        return Ok(booking);
    }

    /// <summary>Get paged list of bookings for a customer by email address. Owner or admin only.</summary>
    [HttpGet("user/{email}")]
    [Authorize]
    public async Task<ActionResult<PagedResult<BookingDto>>> GetBookingsByEmail(
        string email,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        if (!CanAccess(email))
            return Forbid();

        var bookings = await _bookingService.GetBookingsByEmailAsync(email, pageNumber, pageSize);
        return Ok(bookings);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    private string? GetAuthenticatedEmail() =>
        User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");

    private int? GetAuthenticatedUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(raw, out var id) ? id : (int?)null;
    }

    private bool IsAdmin() =>
        User.IsInRole("SuperAdmin") || User.IsInRole("Admin");

    /// <summary>A caller may access a booking if they are an admin or the booking belongs to their email.</summary>
    private bool CanAccess(string bookingEmail)
    {
        if (IsAdmin()) return true;
        var email = GetAuthenticatedEmail();
        return !string.IsNullOrWhiteSpace(email)
               && string.Equals(email, bookingEmail, StringComparison.OrdinalIgnoreCase);
    }
}
