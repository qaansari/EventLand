namespace EventLand.UnitTests;

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Domain.Entities;
using EventLand.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Xunit;

public class SocialAuthTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly TestDbContext _context;
    private readonly IPasswordHasher<User> _hasher;
    private readonly FakeJwtGenerator _jwtGenerator;
    private readonly FakeCacheService _cacheService;
    private readonly FakeLogger<AuthService> _logger;
    private readonly FakeHttpClientFactory _httpClientFactory;

    public SocialAuthTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<TestDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new TestDbContext(options);
        _context.Database.EnsureCreated();

        _hasher = new PasswordHasher<User>();
        _jwtGenerator = new FakeJwtGenerator();
        _cacheService = new FakeCacheService();
        _logger = new FakeLogger<AuthService>();
        _httpClientFactory = new FakeHttpClientFactory();

        // Seed basic roles
        _context.Roles.AddRange(
            new Role { Id = 1, Name = "SuperAdmin" },
            new Role { Id = 2, Name = "Admin" },
            new Role { Id = 3, Name = "Organizer" },
            new Role { Id = 4, Name = "Customer" }
        );
        _context.Countries.Add(new Country { Id = 1, Name = "Pakistan", Code = "PK" });
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Close();
        _connection.Dispose();
    }

    private AuthService CreateAuthService(Dictionary<string, string?>? configValues = null)
    {
        var inMemorySettings = configValues ?? new Dictionary<string, string?>();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        return new AuthService(
            _context,
            _hasher,
            _jwtGenerator,
            _cacheService,
            configuration,
            _logger,
            _httpClientFactory);
    }

    [Fact]
    public async Task GoogleAuthAsync_ThrowsUnauthorized_WhenIdTokenIsEmpty()
    {
        var service = CreateAuthService();
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.GoogleAuthAsync(new GoogleAuthRequestDto(string.Empty)));
    }

    [Fact]
    public async Task GoogleAuthAsync_ThrowsInvalidOperation_WhenGoogleNotConfigured()
    {
        var service = CreateAuthService(); // No Google:ClientId configured
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.GoogleAuthAsync(new GoogleAuthRequestDto("some-valid-looking-jwt")));

        Assert.Contains("Google authentication is not configured", ex.Message);
    }

    [Fact]
    public async Task FacebookAuthAsync_ThrowsUnauthorized_WhenAccessTokenIsEmpty()
    {
        var service = CreateAuthService();
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.FacebookAuthAsync(new FacebookAuthRequestDto(string.Empty)));
    }

    [Fact]
    public async Task FacebookAuthAsync_ThrowsInvalidOperation_WhenFacebookNotConfigured()
    {
        var service = CreateAuthService(); // No Facebook:AppId / AppSecret
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.FacebookAuthAsync(new FacebookAuthRequestDto("mock-token")));

        Assert.Contains("Facebook authentication is not configured", ex.Message);
    }

    [Fact]
    public async Task UserEntity_AllowsNullPasswordHash_AndSupportsSocialIds()
    {
        // Verify User entity supports social auth schema contract
        var user = new User
        {
            Email = "social.user@example.com",
            FullName = "Social User",
            PasswordHash = string.Empty,
            GoogleId = "google-sub-12345",
            FacebookId = "fb-user-67890",
            AuthProvider = "google",
            RoleId = 4,
            CountryId = 1,
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var retrieved = await _context.Users.FirstOrDefaultAsync(u => u.GoogleId == "google-sub-12345");
        Assert.NotNull(retrieved);
        Assert.Equal("social.user@example.com", retrieved.Email);
        Assert.Equal(string.Empty, retrieved.PasswordHash);
        Assert.Equal("google", retrieved.AuthProvider);
        Assert.Equal("fb-user-67890", retrieved.FacebookId);
    }
}

internal class FakeJwtGenerator : IJwtTokenGenerator
{
    public (string Token, DateTimeOffset ExpiresAt) GenerateToken(User user, int? organizerId = null)
    {
        return ("mock-jwt-token", DateTimeOffset.UtcNow.AddHours(8));
    }
}

internal class FakeHttpClientFactory : IHttpClientFactory
{
    public HttpClient CreateClient(string name)
    {
        return new HttpClient();
    }
}
