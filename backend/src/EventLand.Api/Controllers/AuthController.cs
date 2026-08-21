namespace EventLand.Api.Controllers;

using System.Security.Claims;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>Authenticate Super Admin or Admin user and return JWT bearer token.</summary>
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto dto)
    {
        var response = await _authService.LoginAsync(dto);
        return Ok(response);
    }

    /// <summary>Get current authenticated user profile.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await _authService.GetCurrentUserAsync(userId);
        if (user == null) return NotFound();

        return Ok(user);
    }
}
