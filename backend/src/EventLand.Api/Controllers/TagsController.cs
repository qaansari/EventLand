namespace EventLand.Api.Controllers;

using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/tags")]
[Produces("application/json")]
public class TagsController : ControllerBase
{
    private readonly IAdminService _adminService;

    public TagsController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    /// <summary>Get list of all active tags for public event filtering.</summary>
    [HttpGet]
    public async Task<ActionResult<List<TagDto>>> GetTags()
    {
        var result = await _adminService.GetTagsAsync();
        return Ok(result);
    }
}
