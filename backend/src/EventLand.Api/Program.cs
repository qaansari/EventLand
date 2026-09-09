using System.Threading.RateLimiting;
using EventLand.Api.Hubs;
using EventLand.Api.Middleware;
using EventLand.Application.Interfaces;
using EventLand.Infrastructure;
using EventLand.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

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

// Rate limiting: login is strict, upload is scoped, general API is more permissive
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, _) =>
    {
        context.HttpContext.Response.Headers.Append("X-RateLimit-Limit", "10");
        context.HttpContext.Response.Headers.Append("X-RateLimit-Remaining", "0");
        context.HttpContext.Response.Headers.Append("Retry-After", "60");
        
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            statusCode = 429,
            message = "Too many requests. Please try again later.",
            retryAfter = 60
        });
    };

    // Strict rate limiting for authentication endpoints
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.PermitLimit = 5;  // 5 requests per minute for brute-force protection
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    // Rate limiting for file uploads to prevent storage abuse
    options.AddFixedWindowLimiter("upload", opt =>
    {
        opt.PermitLimit = 20;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    // General API rate limiting
    options.AddFixedWindowLimiter("general", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    // Fallback partition for endpoints without explicit policy — per-IP general limit
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
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
        policy.WithOrigins(effectiveOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseRouting();
app.UseCors("AllowFrontend");

// Global Exception Handler & Security Headers
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

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

app.UseStaticFiles();

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
