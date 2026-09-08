namespace EventLand.Api.Middleware;

using System.Net;
using System.Text.Json;

public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IWebHostEnvironment _environment;

    public SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment environment)
    {
        _next = next;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Prevent MIME type sniffing
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        
        // Prevent clickjacking attacks
        context.Response.Headers.Append("X-Frame-Options", "DENY");
        
        // XSS protection (legacy but still useful for older browsers)
        context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
        
        // Control referrer information
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
        
        // Restrict browser features/permissions
        context.Response.Headers.Append("Permissions-Policy", "geolocation=(), camera=(), microphone=(), payment=(self)");
        
        // Content Security Policy - restrict resource loading
        var cspPolicy = _environment.IsDevelopment()
            ? "default-src 'self'; img-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' wss: https: http://localhost:* ws://localhost:*;"
            : "default-src 'self'; img-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self' wss: https:;";
        
        context.Response.Headers.Append("Content-Security-Policy", cspPolicy);

        // HSTS - enforce HTTPS in production
        if (!_environment.IsDevelopment() && context.Request.IsHttps)
        {
            context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
        }

        // Remove server header to reduce information disclosure
        context.Response.Headers.Append("Server-Timing", "total;dur=0");

        await _next(context);
    }
}
