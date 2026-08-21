namespace EventLand.Api.Controllers.Admin;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/bookings")]
[Authorize(Roles = "SuperAdmin,Admin")]
[Produces("application/json")]
public class AdminBookingsController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminBookingsController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<BookingDto>>> GetBookings(
        [FromQuery] int? eventId,
        [FromQuery] string? search,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var bookings = await _adminService.GetBookingsAsync(eventId, search, pageNumber, pageSize);
        return Ok(bookings);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BookingDto>> GetBookingById(int id)
    {
        var booking = await _adminService.GetBookingByIdAsync(id);
        if (booking is null) return NotFound(new { message = $"Booking '{id}' not found." });
        return Ok(booking);
    }

    [HttpPut("{id:int}/status")]
    public async Task<ActionResult<BookingDto>> UpdateBookingStatus(int id, [FromBody] UpdateBookingStatusDto dto)
    {
        var updated = await _adminService.UpdateBookingStatusAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteBooking(int id)
    {
        var success = await _adminService.DeleteBookingAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
