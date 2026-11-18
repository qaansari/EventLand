namespace EventLand.Application.Interfaces;

using EventLand.Application.Common.Models;

public interface ICaptchaService
{
    Task<bool> VerifyTokenAsync(string token, string? remoteIp = null);
    Task<bool> VerifyActionTokenAsync(string token, string? expectedAction = null, string? remoteIp = null);
    Task ValidateActionTokenAsync(string? token, string? expectedAction = null, string? remoteIp = null);
    CaptchaConfigDto GetConfig();
}

public class CaptchaConfigDto
{
    public string SiteKey { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public string Provider { get; set; } = "CloudflareTurnstile";
}
