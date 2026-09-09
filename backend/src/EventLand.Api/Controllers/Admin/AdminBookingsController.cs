namespace EventLand.Api.Controllers.Admin;

using EventLand.Api.Extensions;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/bookings")]
[Authorize(Roles = "SuperAdmin,Admin,Organizer,organizer,admin,superadmin")]
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
        int? organizerId = User.IsAdmin() ? null : User.GetOrganizerId();
        var bookings = await _adminService.GetBookingsAsync(eventId, search, pageNumber, pageSize, organizerId);
        return Ok(bookings);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BookingDto>> GetBookingById(int id)
    {
        int? scopedOrgId = User.IsAdmin() ? null : User.GetOrganizerId();
        if (!User.IsAdmin() && !scopedOrgId.HasValue) return Forbid();

        var booking = await _adminService.GetBookingByIdAsync(id, scopedOrgId);
        if (booking is null) return NotFound(new { message = $"Booking '{id}' not found." });

        return Ok(booking);
    }

    [HttpPut("{id:int}/status")]
    public async Task<ActionResult<BookingDto>> UpdateBookingStatus(int id, [FromBody] UpdateBookingStatusDto dto)
    {
        int? scopedOrgId = User.IsAdmin() ? null : User.GetOrganizerId();
        if (!User.IsAdmin() && !scopedOrgId.HasValue) return Forbid();

        try
        {
            var updated = await _adminService.UpdateBookingStatusAsync(id, dto, scopedOrgId);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin,superadmin,admin")]
    public async Task<ActionResult> DeleteBooking(int id)
    {
        var success = await _adminService.DeleteBookingAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
