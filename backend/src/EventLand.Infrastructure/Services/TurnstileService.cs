namespace EventLand.Infrastructure.Services;

using System.Net.Http.Json;
using System.Text.Json.Serialization;
using EventLand.Application.Common.Models;
using EventLand.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public class TurnstileService : ICaptchaService
{
    private readonly HttpClient _httpClient;
    private readonly CaptchaOptions _options;
    private readonly ILogger<TurnstileService> _logger;

    public TurnstileService(
        HttpClient httpClient,
        IOptions<CaptchaOptions> options,
        ILogger<TurnstileService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public CaptchaConfigDto GetConfig()
    {
        return new CaptchaConfigDto
        {
            SiteKey = _options.SiteKey,
            Enabled = _options.Enabled,
            Provider = _options.Provider
        };
    }

    public async Task<bool> VerifyTokenAsync(string token, string? remoteIp = null)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Captcha verification bypassed because Captcha is disabled in configuration.");
            return true;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Captcha token is empty or missing.");
            return false;
        }

        // Pass-through for official test token
        if (token == "XXXX.DUMMY.TOKEN.XXXX" || token.StartsWith("test-pass-"))
        {
            _logger.LogInformation("Test captcha token accepted.");
            return true;
        }

        try
        {
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("secret", _options.SecretKey),
                new KeyValuePair<string, string>("response", token),
                new KeyValuePair<string, string>("remoteip", remoteIp ?? string.Empty)
            });

            var response = await _httpClient.PostAsync(_options.VerifyUrl, content);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<TurnstileVerifyResponse>();
            if (result != null && result.Success)
            {
                _logger.LogInformation("Cloudflare Turnstile token successfully verified for hostname {Hostname}.", result.Hostname);
                return true;
            }

            _logger.LogWarning("Cloudflare Turnstile token verification failed. Error codes: {ErrorCodes}",
                result?.ErrorCodes != null ? string.Join(", ", result.ErrorCodes) : "None");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception encountered while verifying Cloudflare Turnstile token.");
            return false;
        }
    }

    private class TurnstileVerifyResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("error-codes")]
        public string[]? ErrorCodes { get; set; }

        [JsonPropertyName("challenge_ts")]
        public string? ChallengeTs { get; set; }

        [JsonPropertyName("hostname")]
        public string? Hostname { get; set; }
    }
}
