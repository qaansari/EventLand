namespace EventLand.Application.Common.Models;

public class CaptchaOptions
{
    public const string SectionName = "Captcha";

    public string Provider { get; set; } = "CloudflareTurnstile";
    // Cloudflare Turnstile official test sitekey (Always passes)
    public string SiteKey { get; set; } = "1x00000000000000000000AA";
    // Cloudflare Turnstile official test secret key
    public string SecretKey { get; set; } = "1x0000000000000000000000000000000AA";
    public bool Enabled { get; set; } = true;
    public string VerifyUrl { get; set; } = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
}
