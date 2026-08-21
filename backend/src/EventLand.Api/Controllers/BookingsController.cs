namespace EventLand.Api.Controllers;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
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

    /// <summary>Create a booking (supports both categorized and mapped-seat events).</summary>
    [HttpPost]
    public async Task<ActionResult<BookingDto>> CreateBooking([FromBody] CreateBookingDto dto)
    {
        var booking = await _bookingService.CreateBookingAsync(dto);
        return CreatedAtAction(nameof(GetBookingById), new { id = booking.Id }, booking);
    }

    /// <summary>Get booking by 4-digit ID.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<BookingDto>> GetBookingById(int id)
    {
        var booking = await _bookingService.GetBookingByIdAsync(id);
        if (booking is null)
            return NotFound(new { message = $"Booking '{id}' not found." });

        return Ok(booking);
    }

    /// <summary>Get booking by human-readable reference code (e.g. EVL-XXXX).</summary>
    [HttpGet("ref/{bookingRef}")]
    public async Task<ActionResult<BookingDto>> GetBookingByRef(string bookingRef)
    {
        var booking = await _bookingService.GetBookingByRefAsync(bookingRef);
        if (booking is null)
            return NotFound(new { message = $"Booking reference '{bookingRef}' not found." });

        return Ok(booking);
    }

    /// <summary>Get paged list of bookings for a customer by email address.</summary>
    [HttpGet("user/{email}")]
    public async Task<ActionResult<PagedResult<BookingDto>>> GetBookingsByEmail(
        string email,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var bookings = await _bookingService.GetBookingsByEmailAsync(email, pageNumber, pageSize);
        return Ok(bookings);
    }
}
