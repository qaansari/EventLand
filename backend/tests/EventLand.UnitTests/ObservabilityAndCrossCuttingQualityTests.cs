namespace EventLand.UnitTests;

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using EventLand.Api.Health;
using EventLand.Api.Middleware;
using EventLand.Application.Common;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

public sealed class ObservabilityAndCrossCuttingQualityTests
{
    [Fact]
    public async Task CorrelationIdMiddleware_GeneratesNewId_WhenHeaderMissing()
    {
        // Arrange
        var context = new DefaultHttpContext();
        bool nextCalled = false;
        RequestDelegate next = ctx =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        };

        var middleware = new CorrelationIdMiddleware(next, NullLogger<CorrelationIdMiddleware>.Instance);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.True(nextCalled);
        Assert.False(string.IsNullOrWhiteSpace(context.TraceIdentifier));
        Assert.Equal(32, context.TraceIdentifier.Length);
    }

    [Fact]
    public async Task CorrelationIdMiddleware_PreservesExistingHeader_WhenProvided()
    {
        // Arrange
        var context = new DefaultHttpContext();
        const string customCorrelationId = "test-corr-id-12345678";
        context.Request.Headers[CorrelationIdMiddleware.CorrelationIdHeader] = customCorrelationId;

        var middleware = new CorrelationIdMiddleware(_ => Task.CompletedTask, NullLogger<CorrelationIdMiddleware>.Instance);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.Equal(customCorrelationId, context.TraceIdentifier);
    }

    [Fact]
    public async Task CorrelationIdMiddleware_SanitizesMalformedHeader_ToPreventInjection()
    {
        // Arrange
        var context = new DefaultHttpContext();
        const string maliciousHeader = "evil\r\nInjected-Header: true; drop table bookings;--";
        context.Request.Headers[CorrelationIdMiddleware.CorrelationIdHeader] = maliciousHeader;

        var middleware = new CorrelationIdMiddleware(_ => Task.CompletedTask, NullLogger<CorrelationIdMiddleware>.Instance);

        // Act
        await middleware.InvokeAsync(context);

        // Assert: should fall back to a safe 32-char hex string
        Assert.NotEqual(maliciousHeader, context.TraceIdentifier);
        Assert.Equal(32, context.TraceIdentifier.Length);
    }

    [Fact]
    public void EventLandTelemetry_RecordsMetrics_WithoutExceptions()
    {
        // Arrange & Act
        using var telemetry = new EventLandTelemetry();

        // Should execute smoothly and increment metrics
        telemetry.RecordBookingTransition("PendingHold", "Confirmed", true);
        telemetry.RecordSeatHoldConflict(1, 4);
        telemetry.RecordWebhookDuplicate("PayPro", "INV-10023");
        telemetry.RecordExpiryBatch(5, 42.5);
        telemetry.RecordGateScan("APPROVED", "DEV-01");
        telemetry.RecordRefundTransition("Approved", "Processed", true);

        // Assert
        Assert.Equal("EventLand.Api", telemetry.Meter.Name);
        Assert.Equal("1.0.0", telemetry.Meter.Version);
    }

    [Fact]
    public async Task LiveHealthCheck_ReturnsHealthy()
    {
        // Arrange
        var check = new LiveHealthCheck();

        // Act
        var result = await check.CheckHealthAsync(new HealthCheckContext());

        // Assert
        Assert.Equal(HealthStatus.Healthy, result.Status);
        Assert.Contains("alive", result.Description, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RedisHealthCheck_ReturnsHealthy_WhenMemoryCacheFallback()
    {
        // Arrange
        var inMemoryConfig = new ConfigurationBuilder().Build();
        var check = new RedisHealthCheck(inMemoryConfig, NullLogger<RedisHealthCheck>.Instance);

        // Act
        var result = await check.CheckHealthAsync(new HealthCheckContext());

        // Assert
        Assert.Equal(HealthStatus.Healthy, result.Status);
        Assert.Contains("IMemoryCache", result.Description);
    }

    [Fact]
    public async Task PayProHealthCheck_ReturnsDegraded_WhenUnconfigured()
    {
        // Arrange
        var emptyConfig = new ConfigurationBuilder().Build();
        var check = new PayProHealthCheck(emptyConfig);

        // Act
        var result = await check.CheckHealthAsync(new HealthCheckContext());

        // Assert
        Assert.Equal(HealthStatus.Degraded, result.Status);
    }

    [Fact]
    public async Task HealthCheckResponseWriter_FormatsValidJson()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var entries = new Dictionary<string, HealthReportEntry>
        {
            ["database"] = new HealthReportEntry(HealthStatus.Healthy, "DB up", TimeSpan.FromMilliseconds(5), null, null)
        };
        var report = new HealthReport(entries, TimeSpan.FromMilliseconds(5));

        // Act
        await HealthCheckResponseWriter.WriteDetailedJsonResponse(context, report);

        // Assert
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var json = await reader.ReadToEndAsync();

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        Assert.Equal("Healthy", root.GetProperty("status").GetString());
        Assert.True(root.GetProperty("entries").TryGetProperty("database", out var dbEntry));
        Assert.Equal("Healthy", dbEntry.GetProperty("status").GetString());
    }

    [Fact]
    public async Task EventLandCompiledQueries_ExecuteSuccessfully()
    {
        // Arrange
        using var connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options;

        using var context = new ApplicationDbContext(options);
        await context.Database.EnsureCreatedAsync();

        var country = await context.Countries.FirstOrDefaultAsync(c => c.Code == "PK");
        if (country == null)
        {
            country = new Country { Name = "Pakistan", Code = "PK" };
            context.Countries.Add(country);
        }

        var city = await context.Cities.FirstOrDefaultAsync(c => c.Name == "Lahore");
        if (city == null)
        {
            city = new City { Name = "Lahore", Country = country };
            context.Cities.Add(city);
        }

        var venue = new Venue { Name = "Expo Center", City = city };
        context.Venues.Add(venue);
        var organizer = new Organizer { Name = "Live Events", Email = "contact@liveevents.pk" };
        context.Organizers.Add(organizer);

        var bankAccount = new BankAccount
        {
            BankName = "Meezan Bank",
            AccountTitle = "EventLand Pvt Ltd",
            AccountNumber = "0101010101",
            Iban = "PK12MEZN0000010101010101",
            IsActive = true,
            DisplayOrder = 1,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        context.BankAccounts.Add(bankAccount);

        var ev = new Event
        {
            Title = "Tech Summit 2026",
            Description = "Annual developer conference",
            StartDateUtc = DateTimeOffset.UtcNow.AddDays(7),
            EndDateUtc = DateTimeOffset.UtcNow.AddDays(8),
            Country = country,
            City = city,
            Venue = venue,
            Organizer = organizer,
            Status = EventStatus.Live,
            IsPublished = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        context.Events.Add(ev);

        var zone = new SeatingZone
        {
            Event = ev,
            Zone = "VIP",
            Rows = 10,
            Cols = 10,
            TotalCapacity = 100,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        context.SeatingZones.Add(zone);

        var seat = new Seat
        {
            Zone = zone,
            Row = 1,
            Col = 5,
            Label = "A-5",
            Price = 5000m,
            Status = SeatStatus.Available,
            State = SeatState.Available,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        context.Seats.Add(seat);

        await context.SaveChangesAsync();

        // Act & Assert 1: Compiled query for Event by Id
        var fetchedEvent = await EventLandCompiledQueries.GetEventByIdAsync(context, ev.Id);
        Assert.NotNull(fetchedEvent);
        Assert.Equal("Tech Summit 2026", fetchedEvent.Title);

        // Act & Assert 2: Compiled query for Seat by coordinates
        var fetchedSeat = await EventLandCompiledQueries.GetSeatByCoordinatesAsync(context, zone.Id, 1, 5);
        Assert.NotNull(fetchedSeat);
        Assert.Equal("A-5", fetchedSeat.Label);

        // Act & Assert 3: Compiled query for Active Bank Account by Id
        var activeAccount = await EventLandCompiledQueries.GetActiveBankAccountByIdAsync(context, bankAccount.Id);
        Assert.NotNull(activeAccount);
        Assert.Equal("Meezan Bank", activeAccount.BankName);
    }
}
