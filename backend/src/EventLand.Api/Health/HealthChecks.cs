namespace EventLand.Api.Health;

using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;

/// <summary>
/// Liveness health check: returns Healthy as long as the Kestrel web server is receiving requests.
/// Used by Kubernetes / Docker / load balancers for /health/live.
/// </summary>
public sealed class LiveHealthCheck : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(HealthCheckResult.Healthy("EventLand API process is alive and responsive."));
    }
}

/// <summary>
/// Database readiness health check: executes a lightweight probe against the configured database.
/// Used by /health/ready to determine if traffic can safely be routed to this instance.
/// </summary>
public sealed class DatabaseHealthCheck : IHealthCheck
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<DatabaseHealthCheck> _logger;

    public DatabaseHealthCheck(ApplicationDbContext dbContext, ILogger<DatabaseHealthCheck> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            bool canConnect = await _dbContext.Database.CanConnectAsync(cancellationToken);
            if (canConnect)
            {
                return HealthCheckResult.Healthy("Database connection verified successfully.");
            }

            return HealthCheckResult.Unhealthy("Database CanConnect returned false.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database readiness health check failed.");
            return HealthCheckResult.Unhealthy("Database readiness probe failed.", ex);
        }
    }
}

/// <summary>
/// Redis / Distributed Cache readiness health check.
/// If Redis connection string is absent, reports Healthy (in-memory cache mode).
/// </summary>
public sealed class RedisHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<RedisHealthCheck> _logger;

    public RedisHealthCheck(IConfiguration configuration, ILogger<RedisHealthCheck> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var redisConn = _configuration.GetConnectionString("Redis");
        if (string.IsNullOrWhiteSpace(redisConn))
        {
            return Task.FromResult(HealthCheckResult.Healthy("Redis not configured; falling back to high-performance IMemoryCache."));
        }

        // Connection string configured; report healthy configuration state
        return Task.FromResult(HealthCheckResult.Healthy("Redis distributed cache endpoint configured."));
    }
}

/// <summary>
/// Payment Provider (PayPro) configuration &amp; readiness check.
/// </summary>
public sealed class PayProHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;

    public PayProHealthCheck(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var baseUrl = _configuration["PayPro:BaseUrl"];
        var merchantId = _configuration["PayPro:MerchantId"];

        if (string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(merchantId))
        {
            return Task.FromResult(HealthCheckResult.Degraded("PayPro integration settings are not fully configured in environment."));
        }

        return Task.FromResult(HealthCheckResult.Healthy("PayPro merchant configuration loaded."));
    }
}

/// <summary>
/// Formats health check responses into clean, machine-readable JSON.
/// </summary>
public static class HealthCheckResponseWriter
{
    public static async Task WriteDetailedJsonResponse(HttpContext httpContext, HealthReport report)
    {
        httpContext.Response.ContentType = "application/json; charset=utf-8";

        var response = new
        {
            status = report.Status.ToString(),
            totalDuration = $"{report.TotalDuration.TotalMilliseconds:0.##} ms",
            timestamp = DateTimeOffset.UtcNow,
            entries = new Dictionary<string, object>()
        };

        foreach (var entry in report.Entries)
        {
            response.entries[entry.Key] = new
            {
                status = entry.Value.Status.ToString(),
                description = entry.Value.Description,
                duration = $"{entry.Value.Duration.TotalMilliseconds:0.##} ms",
                error = entry.Value.Exception?.Message
            };
        }

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await httpContext.Response.WriteAsync(json);
    }
}
