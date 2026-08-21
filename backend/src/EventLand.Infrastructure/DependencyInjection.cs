namespace EventLand.Infrastructure;

using System.Text;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Interfaces;
using EventLand.Application.Services;
using EventLand.Domain.Entities;
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
            options.Configuration = redisConnectionString;
            options.InstanceName = "EventLand:";
        });

        services.AddSingleton<ICacheService, RedisCacheService>();

        // Auth & Security
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAdminService, AdminService>();

        // JWT Authentication registration
        var secretKey = configuration["Jwt:SecretKey"] ?? "SuperSecretKeyForEventLandApi2026!MustBe32BytesOrLonger";
        var issuer = configuration["Jwt:Issuer"] ?? "EventLandApi";
        var audience = configuration["Jwt:Audience"] ?? "EventLandClients";

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false;
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
        });

        // Application public services
        services.AddScoped<IEventService, EventService>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<IArtistService, ArtistService>();

        return services;
    }
}
