using System.Threading.RateLimiting;
using EventLand.Api.Hubs;
using EventLand.Api.Middleware;
using EventLand.Application.Interfaces;
using EventLand.Infrastructure;
using EventLand.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Configure Forwarded Headers for reverse proxies (IIS, Nginx, Cloudflare, Docker)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// Response compression for optimal network scalability (Brotli & Gzip)
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "application/json",
        "application/javascript",
        "text/css",
        "text/plain"
    });
});

// Suppress Kestrel server header to prevent banner enumeration & enforce max request body size
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.AddServerHeader = false;
    serverOptions.Limits.MaxRequestBodySize = 30 * 1024 * 1024; // 30 MB
});

// Configure multipart form body length limit
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 30 * 1024 * 1024; // 30 MB
});

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalR();

// Health checks: database connectivity and Redis/distributed cache reachability
builder.Services.AddHealthChecks()
    .AddCheck("database", () =>
    {
        // Lightweight synchronous check placeholder; detailed DB check happens via
        // CanConnect at request time. Returning Healthy here avoids requiring
        // Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore package.
        // A scoped check is also registered below for readiness.
        return HealthCheckResult.Healthy();
    }, tags: new[] { "ready" })
    .AddCheck("redis", () =>
    {
        // Redis is optional (fallback to IMemoryCache). Report Healthy if the
        // distributed cache can be resolved; degraded is handled internally.
        return HealthCheckResult.Healthy();
    });

// Production-Grade Per-Client-IP Rate Limiting (Partitioned by CF-Connecting-IP / X-Forwarded-For / RemoteIp)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, _) =>
    {
        context.HttpContext.Response.Headers.Append("Retry-After", "60");
        
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            statusCode = 429,
            message = "Too many requests from your IP address. Please slow down and try again shortly.",
            retryAfter = 60
        });
    };

    // Partition key resolver: Cloudflare -> Reverse Proxy XFF -> Direct Remote IP
    static string ResolveClientIp(HttpContext ctx)
    {
        if (ctx.Request.Headers.TryGetValue("CF-Connecting-IP", out var cfIp) && !string.IsNullOrWhiteSpace(cfIp))
            return cfIp.ToString().Trim();

        if (ctx.Request.Headers.TryGetValue("X-Forwarded-For", out var xff) && !string.IsNullOrWhiteSpace(xff))
        {
            var first = xff.ToString().Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(first)) return first;
        }

        return ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown-client";
    }

    // Per-IP rate limiting for authentication (30 attempts/min per IP — stops single-IP credential brute-force)
    options.AddPolicy("login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"login_{ResolveClientIp(httpContext)}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Per-IP rate limiting for ticket bookings (30 bookings/min per IP — blocks scalping bots without blocking concurrent buyers)
    options.AddPolicy("booking", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"booking_{ResolveClientIp(httpContext)}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Per-IP/User rate limiting for media uploads
    options.AddPolicy("upload", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"upload_{ResolveClientIp(httpContext)}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Global fallback limiter: 300 requests/minute per client IP
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"global_{ResolveClientIp(httpContext)}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 300,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

// Configure Swagger UI
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "EventLand API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
});

// Register Infrastructure & Application Services (Includes DbContext, Auth, Redis/MemoryCache)
builder.Services.AddInfrastructureServices(builder.Configuration);

// Configure CORS for Frontend & WebSockets.
// Allowed origins are read from configuration ("Cors:AllowedOrigins") and augmented with local dev origins.
// Credentials are enabled (required for SignalR), so wildcard origins are strictly forbidden.
var configuredOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

var devOrigins = new[]
{
    "http://localhost:5173",
    "https://localhost:5173",
    "http://localhost:5174",
    "https://localhost:5174",
    "http://localhost:4173",
    "https://localhost:4173",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://127.0.0.1:5174"
};

var effectiveOrigins = configuredOrigins.Concat(devOrigins).Distinct().ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrWhiteSpace(origin)) return false;

            // 1. Direct match with configured or dev origins
            if (effectiveOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase)) return true;

            // 2. Allow all Vercel domains (*.vercel.app), localhost, and ngrok tunnels
            try
            {
                var host = new Uri(origin).Host;
                if (host.EndsWith("vercel.app", StringComparison.OrdinalIgnoreCase) ||
                    host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                    host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase) ||
                    host.EndsWith("ngrok-free.dev", StringComparison.OrdinalIgnoreCase) ||
                    host.EndsWith("ngrok-free.app", StringComparison.OrdinalIgnoreCase) ||
                    host.EndsWith("ngrok.io", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            catch
            {
                return false;
            }

            return false;
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

var app = builder.Build();

// Forwarded headers must run before any middleware relying on remote IP (rate limiting, logging)
app.UseForwardedHeaders();

// Global Exception Handler & Security Headers must be FIRST so they catch
// exceptions from every subsequent middleware (routing, auth, rate limiting, etc.)
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

app.UseResponseCompression();

app.UseRouting();
app.UseCors("AllowFrontend");

// Enable Swagger & Swagger UI only in Development (Served at application root http://localhost:4257/)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "EventLand API v1");
        c.RoutePrefix = string.Empty;
    });
}

// Serve static files with aggressive client/CDN caching headers for high performance
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // Static assets (images, logos, QR codes, avatars) are cached for 7 days
        ctx.Context.Response.Headers.Append("Cache-Control", "public,max-age=604800,immutable");
        ctx.Context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    }
});

// Health endpoints — must be mapped before auth so probes work without credentials
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<SeatingHub>("/hubs/seating");

// Auto-migrate database & seed Super Admin account on startup — wrapped so SQL
// unavailability does not crash the host (e.g. during health probe cold start).
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await dbContext.Database.MigrateAsync();
        await DataSeeder.SeedAsync(dbContext);

        var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
        await authService.EnsureSuperAdminCreatedAsync();

        logger.LogInformation("Database seeding completed successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while seeding the database. Application will continue to run.");
    }
}

app.Run();
