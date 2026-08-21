namespace EventLand.Api.Controllers.Admin;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "SuperAdmin")]
[Produces("application/json")]
public class AdminUsersController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminUsersController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<UserDto>>> GetUsers([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var users = await _adminService.GetUsersAsync(pageNumber, pageSize);
        return Ok(users);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserDto>> GetUserById(int id)
    {
        var user = await _adminService.GetUserByIdAsync(id);
        if (user is null) return NotFound(new { message = $"User '{id}' not found." });
        return Ok(user);
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> CreateUser([FromBody] CreateUserDto dto)
    {
        var user = await _adminService.CreateUserAsync(dto);
        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, user);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> UpdateUser(int id, [FromBody] UpdateUserDto dto)
    {
        var updated = await _adminService.UpdateUserAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteUser(int id)
    {
        var success = await _adminService.DeleteUserAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
