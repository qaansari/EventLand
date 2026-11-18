namespace EventLand.Api.Middleware;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

/// <summary>
/// Production-grade Correlation ID &amp; structured logging enrichment middleware.
/// Propagates incoming X-Correlation-ID / X-Request-ID headers or generates an immutable 32-character GUID.
/// Enriches ILogger ambient scope so all log events within the request include the CorrelationId.
/// </summary>
public sealed class CorrelationIdMiddleware
{
    public const string CorrelationIdHeader = "X-Correlation-ID";
    public const string RequestIdHeader = "X-Request-ID";

    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;

    public CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 1. Resolve or generate Correlation ID
        string correlationId = ResolveCorrelationId(context);

        // Assign to TraceIdentifier for standard ASP.NET Core diagnostics
        context.TraceIdentifier = correlationId;

        // Propagate header in response
        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey(CorrelationIdHeader))
            {
                context.Response.Headers[CorrelationIdHeader] = correlationId;
            }
            return Task.CompletedTask;
        });

        // 2. Structured logging enrichment scope
        var clientIp = ResolveClientIp(context);
        var scopeState = new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["ClientIp"] = clientIp,
            ["RequestMethod"] = context.Request.Method,
            ["RequestPath"] = context.Request.Path.Value ?? string.Empty
        };

        using (_logger.BeginScope(scopeState))
        {
            var sw = Stopwatch.StartNew();
            try
            {
                await _next(context);
            }
            finally
            {
                sw.Stop();
                // Avoid logging noise for health probes
                var path = context.Request.Path.Value ?? string.Empty;
                if (!path.StartsWith("/health", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogInformation(
                        "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs:0.00} ms [CorrelationId: {CorrelationId}]",
                        context.Request.Method,
                        context.Request.Path,
                        context.Response.StatusCode,
                        sw.Elapsed.TotalMilliseconds,
                        correlationId);
                }
            }
        }
    }

    private static string ResolveCorrelationId(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue(CorrelationIdHeader, out var val) &&
            !string.IsNullOrWhiteSpace(val))
        {
            return SanitizeHeaderValue(val.ToString());
        }

        if (context.Request.Headers.TryGetValue(RequestIdHeader, out var reqIdVal) &&
            !string.IsNullOrWhiteSpace(reqIdVal))
        {
            return SanitizeHeaderValue(reqIdVal.ToString());
        }

        return Guid.NewGuid().ToString("N");
    }

    private static string SanitizeHeaderValue(string value)
    {
        var trimmed = value.Trim();
        // Truncate to 64 chars max to prevent log injection/abuse
        if (trimmed.Length > 64)
        {
            trimmed = trimmed[..64];
        }

        // Only allow alphanumeric and dash/underscore
        foreach (char c in trimmed)
        {
            if (!char.IsLetterOrDigit(c) && c != '-' && c != '_')
            {
                return Guid.NewGuid().ToString("N");
            }
        }

        return trimmed;
    }

    private static string ResolveClientIp(HttpContext ctx)
    {
        if (ctx.Request.Headers.TryGetValue("CF-Connecting-IP", out var cfIp) && !string.IsNullOrWhiteSpace(cfIp))
            return cfIp.ToString().Trim();

        if (ctx.Request.Headers.TryGetValue("X-Forwarded-For", out var xff) && !string.IsNullOrWhiteSpace(xff))
        {
            var first = xff.ToString().Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(first)) return first;
        }

        return ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
