namespace EventLand.Api.Controllers.Admin;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/tags")]
[Authorize(Roles = "SuperAdmin,Admin")]
[Produces("application/json")]
public class AdminTagsController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminTagsController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    public async Task<ActionResult<List<TagDto>>> GetTags()
    {
        var items = await _adminService.GetTagsAsync();
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<TagDto>> CreateTag([FromBody] CreateTagDto dto)
    {
        var created = await _adminService.CreateTagAsync(dto);
        return CreatedAtAction(nameof(GetTags), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TagDto>> UpdateTag(int id, [FromBody] UpdateTagDto dto)
    {
        var updated = await _adminService.UpdateTagAsync(id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteTag(int id)
    {
        var success = await _adminService.DeleteTagAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
