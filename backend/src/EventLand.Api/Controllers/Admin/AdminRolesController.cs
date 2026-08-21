namespace EventLand.Api.Controllers.Admin;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/roles")]
[Authorize(Roles = "SuperAdmin")]
[Produces("application/json")]
public class AdminRolesController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminRolesController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    public async Task<ActionResult<List<RoleDto>>> GetRoles()
    {
        var roles = await _adminService.GetRolesAsync();
        return Ok(roles);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RoleDto>> GetRoleById(int id)
    {
        var role = await _adminService.GetRoleByIdAsync(id);
        if (role is null) return NotFound(new { message = $"Role '{id}' not found." });
        return Ok(role);
    }

    [HttpPost]
    public async Task<ActionResult<RoleDto>> CreateRole([FromBody] CreateRoleDto dto)
    {
        var role = await _adminService.CreateRoleAsync(dto);
        return CreatedAtAction(nameof(GetRoleById), new { id = role.Id }, role);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<RoleDto>> UpdateRole(int id, [FromBody] UpdateRoleDto dto)
    {
        var updated = await _adminService.UpdateRoleAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteRole(int id)
    {
        var success = await _adminService.DeleteRoleAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
