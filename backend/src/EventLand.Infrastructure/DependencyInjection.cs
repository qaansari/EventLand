namespace EventLand.Infrastructure;

using System.Text;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Interfaces;
using EventLand.Application.Services;
using EventLand.Domain.Entities;
using EventLand.Infrastructure.Common;
using EventLand.Infrastructure.Persistence;
using EventLand.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        // SQL Server DbContext with resilience & query splitting
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
            options.UseSqlServer(
                connectionString,
                sqlServerOptions =>
                {
                    sqlServerOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
                    sqlServerOptions.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(15),
                        errorNumbersToAdd: null);
                });
        });

        services.AddScoped<IApplicationDbContext>(
            provider => provider.GetRequiredService<ApplicationDbContext>());

        // In-Memory & Redis Caching
        services.AddMemoryCache();

        var redisConnectionString = configuration.GetConnectionString("Redis") ?? "localhost:6379";
        services.AddStackExchangeRedisCache(options =>
        {
            var configOptions = StackExchange.Redis.ConfigurationOptions.Parse(redisConnectionString);
            configOptions.ConnectTimeout = 300;
            configOptions.SyncTimeout = 300;
            configOptions.AsyncTimeout = 300;
            configOptions.AbortOnConnectFail = false;
            configOptions.ConnectRetry = 1;

            options.ConfigurationOptions = configOptions;
            options.InstanceName = "EventLand:";
        });

        services.AddSingleton<ICacheService, RedisCacheService>();

        // Background job: expire pending bookings whose 30-minute direct bank transfer hold window has elapsed (every 60s)
        services.AddHostedService<PendingBookingExpiryService>();

        // Auth & Security
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAdminService, AdminService>();

        // JWT Authentication registration
        var secretKey = configuration["Jwt:SecretKey"];
        if (string.IsNullOrWhiteSpace(secretKey) || Encoding.UTF8.GetByteCount(secretKey) < 32)
            throw new InvalidOperationException(
                "Configuration 'Jwt:SecretKey' is missing or too short. Provide a secret of at least 32 bytes " +
                "via user-secrets or the Jwt__SecretKey environment variable.");

        var issuer = configuration["Jwt:Issuer"] ?? "EventLandApi";
        var audience = configuration["Jwt:Audience"] ?? "EventLandClients";

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            var isDevelopment = string.Equals(
                configuration["ASPNETCORE_ENVIRONMENT"],
                "Development",
                StringComparison.OrdinalIgnoreCase);

            options.RequireHttpsMetadata = !isDevelopment;
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ClockSkew = TimeSpan.Zero
            };

            // Enable JWT token authentication over SignalR WebSockets (passed via ?access_token=)
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });

        // Application public services
        services.AddScoped<IEventService, EventService>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<IArtistService, ArtistService>();
        services.AddScoped<IBankAccountService, BankAccountService>();
        services.AddScoped<INotificationService, NotificationService>();

        // Payment Gateway & Fee Services (PayPro Pakistan)
        services.Configure<EventLand.Application.Common.Models.PayProOptions>(
            configuration.GetSection(EventLand.Application.Common.Models.PayProOptions.SectionName));

        services.AddScoped<IPaymentFeeService, PaymentFeeService>();

        services.AddHttpClient<IPayProClient, PayProClient>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        services.AddScoped<IPayProService, PayProService>();

        // Cloudflare Turnstile / CAPTCHA Verification Service
        services.Configure<EventLand.Application.Common.Models.CaptchaOptions>(
            configuration.GetSection(EventLand.Application.Common.Models.CaptchaOptions.SectionName));

        services.AddHttpClient<ICaptchaService, TurnstileService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
        });

        return services;
    }
}
