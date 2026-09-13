namespace EventLand.Api.Controllers;

using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class CaptchaController : ControllerBase
{
    private readonly ICaptchaService _captchaService;

    public CaptchaController(ICaptchaService captchaService)
    {
        _captchaService = captchaService;
    }

    /// <summary>Get public Cloudflare Turnstile CAPTCHA configuration (SiteKey & Enabled state).</summary>
    [HttpGet("config")]
    public ActionResult<CaptchaConfigDto> GetConfig()
    {
        var config = _captchaService.GetConfig();
        return Ok(config);
    }

    /// <summary>Verify a Cloudflare Turnstile / reCAPTCHA response token.</summary>
    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] CaptchaVerifyRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Token))
        {
            return BadRequest(new { success = false, message = "Captcha token is required." });
        }

        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var isValid = await _captchaService.VerifyTokenAsync(dto.Token, clientIp);

        if (isValid)
        {
            return Ok(new { success = true, message = "Captcha token verified successfully." });
        }

        return BadRequest(new { success = false, message = "Invalid or expired Captcha token challenge." });
    }
}

public class CaptchaVerifyRequest
{
    public string Token { get; set; } = string.Empty;
}
