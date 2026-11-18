namespace EventLand.UnitTests;

using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using EventLand.Application.Common.Models;
using EventLand.Domain.Enums;
using EventLand.Domain.Exceptions;
using EventLand.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

public class TurnstileTokenLifecycleTests
{
    private readonly RedisCacheService _cacheService;

    public TurnstileTokenLifecycleTests()
    {
        var memCache = new MemoryCache(new MemoryCacheOptions());
        var distributedCache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        _cacheService = new RedisCacheService(distributedCache, memCache, NullLogger<RedisCacheService>.Instance);
    }

    private TurnstileService CreateTurnstileService(bool enabled = true, string siteKey = "test-site-key", string secretKey = "test-secret-key")
    {
        var options = Options.Create(new CaptchaOptions
        {
            Enabled = enabled,
            SiteKey = siteKey,
            SecretKey = secretKey,
            Provider = "CloudflareTurnstile"
        });

        var httpClient = new HttpClient();
        return new TurnstileService(httpClient, options, NullLogger<TurnstileService>.Instance, _cacheService);
    }

    [Fact]
    public async Task VerifyActionToken_TestToken_SucceedsAndEnforcesReplayProtection()
    {
        var service = CreateTurnstileService(enabled: true);
        var testToken = $"test-pass-{Guid.NewGuid():N}";

        // First verification: must succeed and mark token as consumed
        var firstResult = await service.VerifyActionTokenAsync(testToken, "login");
        firstResult.Should().BeTrue("First use of a valid token must be accepted");

        // Second verification of the exact same token: replay attack must be blocked
        var secondResult = await service.VerifyActionTokenAsync(testToken, "login");
        secondResult.Should().BeFalse("Replay attack: subsequent use of the same token must be rejected");
    }

    [Fact]
    public async Task ValidateActionToken_WhenCaptchaDisabled_BypassesSuccessfully()
    {
        var service = CreateTurnstileService(enabled: false);

        // Should not throw even when token is null or empty
        var act = async () => await service.ValidateActionTokenAsync(null, "login");
        await act.Should().NotThrowAsync("When captcha is disabled in configuration, verification must bypass cleanly");
    }

    [Fact]
    public async Task ValidateActionToken_WhenMissingTokenAndEnabled_ThrowsCaptchaVerificationException()
    {
        var service = CreateTurnstileService(enabled: true);

        var act = async () => await service.ValidateActionTokenAsync(null, "login");
        var ex = await act.Should().ThrowAsync<CaptchaVerificationException>();
        ex.Which.Code.Should().Be("BOT_CHALLENGE_REQUIRED");
    }

    [Fact]
    public async Task ValidateActionToken_WhenReplayed_ThrowsCaptchaVerificationException()
    {
        var service = CreateTurnstileService(enabled: true);
        var token = $"test-pass-replay-{Guid.NewGuid():N}";

        // First use passes
        await service.ValidateActionTokenAsync(token, "login");

        // Replay attempt must throw
        var replayAct = async () => await service.ValidateActionTokenAsync(token, "login");
        var ex = await replayAct.Should().ThrowAsync<CaptchaVerificationException>();
        ex.Which.Code.Should().Be("BOT_CHALLENGE_REQUIRED");
    }

    [Fact]
    public async Task ReplayProtection_ConcurrentRequestsWithSameToken_ExactlyOneSucceeds()
    {
        var service = CreateTurnstileService(enabled: true);
        var sharedToken = $"test-pass-concurrent-{Guid.NewGuid():N}";

        // 10 concurrent requests attempting to use the same token
        var tasks = Enumerable.Range(1, 10).Select(async _ =>
        {
            return await service.VerifyActionTokenAsync(sharedToken, "booking_create");
        });

        var results = await Task.WhenAll(tasks);

        var successful = results.Count(r => r);
        var blocked = results.Count(r => !r);

        successful.Should().Be(1, "Exactly one request must consume the token");
        blocked.Should().Be(9, "All remaining 9 concurrent requests must be rejected as replays");
    }

    [Fact]
    public void CaptchaVerificationException_CarriesStandardBotChallengeRequiredCode()
    {
        var ex = new CaptchaVerificationException("Bot challenge required for this action");
        ex.Code.Should().Be("BOT_CHALLENGE_REQUIRED");
        ex.Message.Should().Be("Bot challenge required for this action");
    }

    [Fact]
    public void GetConfig_ReturnsConfiguredSiteKeyAndState()
    {
        var service = CreateTurnstileService(enabled: true, siteKey: "my-custom-turnstile-sitekey");
        var config = service.GetConfig();

        config.SiteKey.Should().Be("my-custom-turnstile-sitekey");
        config.Enabled.Should().BeTrue();
        config.Provider.Should().Be("CloudflareTurnstile");
    }
}
