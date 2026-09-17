namespace EventLand.Modules.PayPro.Client;

using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Dtos;
using EventLand.Modules.PayPro.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public interface IPayProAuthTokenProvider
{
    Task<string> GetTokenAsync(bool forceRefresh = false, CancellationToken cancellationToken = default);
    void InvalidateToken();
}

public class PayProAuthTokenProvider : IPayProAuthTokenProvider, IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly PayProOptions _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<PayProAuthTokenProvider> _logger;
    private readonly SemaphoreSlim _semaphore = new(1, 1);
    private bool _disposed;

    public PayProAuthTokenProvider(
        HttpClient httpClient,
        IOptions<PayProOptions> options,
        IMemoryCache cache,
        ILogger<PayProAuthTokenProvider> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _cache = cache;
        _logger = logger;
    }

    private string CacheKey => $"PayPro_Token_{_options.ClientId}";

    public void InvalidateToken()
    {
        _cache.Remove(CacheKey);
        _logger.LogInformation("PayPro auth token cache invalidated.");
    }

    public async Task<string> GetTokenAsync(bool forceRefresh = false, CancellationToken cancellationToken = default)
    {
        if (!forceRefresh && _cache.TryGetValue(CacheKey, out string? cachedToken) && !string.IsNullOrWhiteSpace(cachedToken))
        {
            return cachedToken;
        }

        await _semaphore.WaitAsync(cancellationToken);
        try
        {
            // Re-check after acquiring semaphore
            if (!forceRefresh && _cache.TryGetValue(CacheKey, out cachedToken) && !string.IsNullOrWhiteSpace(cachedToken))
            {
                return cachedToken;
            }

            var (isValid, missingKeys) = _options.Validate();
            if (!isValid)
            {
                throw new PayProApiException(
                    $"PayPro configuration is incomplete. Missing keys: {string.Join(", ", missingKeys)}",
                    payProStatusCode: "01",
                    endpoint: "/v2/ppro/auth"
                );
            }

            var baseUrl = _options.BaseUrl.TrimEnd('/');
            var authUrl = $"{baseUrl}/v2/ppro/auth";

            var authPayload = new PayProAuthRequest(_options.ClientId, _options.ClientSecret);

            using var request = new HttpRequestMessage(HttpMethod.Post, authUrl)
            {
                Content = JsonContent.Create(authPayload)
            };

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var contentString = await response.Content.ReadAsStringAsync(cancellationToken);

            string? token = null;
            int expiryMinutes = 1440; // Default 24h as per PayPro specification

            // 1. Read token from headers (either "Token" or "token")
            if (response.Headers.TryGetValues("Token", out var tokenVals) ||
                response.Headers.TryGetValues("token", out tokenVals))
            {
                token = System.Linq.Enumerable.FirstOrDefault(tokenVals);
            }

            // 2. Read token expiry header if present
            if (response.Headers.TryGetValues("TokenExpiry", out var expiryVals) ||
                response.Headers.TryGetValues("tokenexpiry", out expiryVals))
            {
                var val = System.Linq.Enumerable.FirstOrDefault(expiryVals);
                if (int.TryParse(val, out var parsedExp) && parsedExp > 0)
                {
                    expiryMinutes = parsedExp;
                }
            }

            // 3. Fallback: Parse body if token was returned in JSON
            if (string.IsNullOrWhiteSpace(token) && response.IsSuccessStatusCode)
            {
                try
                {
                    using var doc = JsonDocument.Parse(contentString);
                    if (doc.RootElement.TryGetProperty("Token", out var tProp) ||
                        doc.RootElement.TryGetProperty("token", out tProp))
                    {
                        token = tProp.GetString();
                    }
                    if (doc.RootElement.TryGetProperty("TokenExpiry", out var expProp) && expProp.TryGetInt32(out var exp))
                    {
                        expiryMinutes = exp;
                    }
                }
                catch (JsonException)
                {
                    // Body was not JSON
                }
            }

            if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(token))
            {
                _logger.LogError("PayPro /v2/ppro/auth failed with HTTP {StatusCode}", (int)response.StatusCode);
                throw new PayProApiException(
                    $"PayPro authentication failed with HTTP {response.StatusCode}.",
                    payProStatusCode: "02",
                    httpStatusCode: response.StatusCode,
                    endpoint: "/v2/ppro/auth",
                    rawResponse: contentString
                );
            }

            // Refresh at 90% of TTL (or TTL minus configured buffer minutes)
            var ttlMinutes = Math.Max(5, (int)(expiryMinutes * 0.90));
            var cacheDuration = TimeSpan.FromMinutes(ttlMinutes);

            _cache.Set(CacheKey, token, cacheDuration);
            _logger.LogInformation("Acquired new PayPro auth session token. Cached for {Minutes} minutes.", ttlMinutes);

            return token;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _semaphore.Dispose();
            _disposed = true;
        }
        GC.SuppressFinalize(this);
    }
}
