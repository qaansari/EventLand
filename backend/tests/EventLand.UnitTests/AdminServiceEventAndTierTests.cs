namespace EventLand.UnitTests;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Xunit;

public class AdminServiceEventAndTierTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly TestDbContext _context;
    private readonly AdminService _adminService;

    public AdminServiceEventAndTierTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<TestDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new TestDbContext(options);
        _context.Database.EnsureCreated();

        var fakeCache = new FakeCacheService();
        var fakeLogger = new FakeLogger<AdminService>();

        _adminService = new AdminService(_context, fakeCache, fakeLogger);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Close();
        _connection.Dispose();
    }

    private async Task<(Event ev, EventShow show, TicketTier tier)> SeedEventWithShowAndTierAsync()
    {
        var country = new Country { Id = 1, Name = "Pakistan", Code = "PK" };
        var city = new City { Id = 1, CountryId = 1, Name = "Karachi" };
        var venue = new Venue { Id = 1, CityId = 1, Name = "Main Hall", Address = "Arts Council Road" };
        _context.Countries.Add(country);
        _context.Cities.Add(city);
        _context.Venues.Add(venue);

        var organizer = new Organizer
        {
            Id = 1,
            Name = "Arts Council",
            Email = "artscouncil@example.com"
        };
        _context.Organizers.Add(organizer);

        var ev = new Event
        {
            Id = 1,
            Title = "Music Fest 2026",
            CountryId = 1,
            CityId = 1,
            VenueId = 1,
            OrganizerId = 1,
            StartDateUtc = DateTimeOffset.UtcNow.AddDays(10),
            EndDateUtc = DateTimeOffset.UtcNow.AddDays(12),
            StartingPrice = 1500,
            Status = EventLand.Domain.Enums.EventStatus.Live,
            IsPublished = true
        };
        _context.Events.Add(ev);

        var show = new EventShow
        {
            Id = 10,
            EventId = 1,
            ShowTitle = "Opening Night",
            StartTimeUtc = DateTimeOffset.UtcNow.AddDays(10),
            EndTimeUtc = DateTimeOffset.UtcNow.AddDays(10).AddHours(3),
            IsDeleted = false
        };
        _context.EventShows.Add(show);

        var tier = new TicketTier
        {
            Id = 100,
            EventId = 1,
            EventShowId = 10,
            Name = "Early Bird",
            Price = 1500,
            AvailableQuantity = 50,
            MaxPerOrder = 5,
            SortOrder = 1,
            IsDeleted = false
        };
        _context.TicketTiers.Add(tier);

        await _context.SaveChangesAsync();
        return (ev, show, tier);
    }

    [Fact]
    public async Task UpdateEventAsync_PreservesShowsAndTiers_WhenIdsProvided()
    {
        var (ev, show, tier) = await SeedEventWithShowAndTierAsync();

        var updateDto = new UpdateAdminEventDto(
            Title: "Music Fest 2026 - Updated",
            Status: "Live",
            IsFeatured: false,
            IsPublished: true,
            CountryId: null,
            CityId: null,
            VenueId: null,
            AuditoriumId: null,
            City: "Karachi",
            Venue: "Grand Arena",
            StartDateUtc: ev.StartDateUtc,
            EndDateUtc: ev.EndDateUtc,
            StartingPrice: 2000,
            TicketingType: "categorized",
            Banner: "http://example.com/banner.jpg",
            Description: "Updated description",
            ScarcityText: "Selling Fast",
            OrganizerId: ev.OrganizerId,
            TagIds: new List<int>(),
            Shows: new List<CreateEventShowInputDto>
            {
                new CreateEventShowInputDto(
                    Id: show.Id,
                    ShowTitle: "Opening Night - Deluxe",
                    StartTimeUtc: show.StartTimeUtc,
                    EndTimeUtc: show.EndTimeUtc,
                    StartingPrice: 2000,
                    TicketTiers: new List<CreateShowTicketTierInputDto>
                    {
                        new CreateShowTicketTierInputDto(
                            Id: tier.Id,
                            Name: "VIP Pass",
                            Price: 2500,
                            AvailableQuantity: 100
                        )
                    }
                )
            }
        );

        var result = await _adminService.UpdateEventAsync(ev.Id, updateDto);

        Assert.NotNull(result);
        Assert.Equal("Music Fest 2026 - Updated", result.Title);

        // Verify show is preserved, not soft-deleted
        var dbShow = await _context.EventShows.FirstOrDefaultAsync(s => s.Id == show.Id);
        Assert.NotNull(dbShow);
        Assert.False(dbShow.IsDeleted);
        Assert.Equal("Opening Night - Deluxe", dbShow.ShowTitle);

        // Verify tier is preserved and updated
        var dbTier = await _context.TicketTiers.FirstOrDefaultAsync(t => t.Id == tier.Id);
        Assert.NotNull(dbTier);
        Assert.False(dbTier.IsDeleted);
        Assert.Equal("VIP Pass", dbTier.Name);
        Assert.Equal(2500, dbTier.Price);
        Assert.Equal(100, dbTier.AvailableQuantity);
    }

    [Fact]
    public async Task UpdateEventAsync_CreatesMissingTiers_WithoutSilentlyDropping()
    {
        var (ev, show, tier) = await SeedEventWithShowAndTierAsync();

        var updateDto = new UpdateAdminEventDto(
            Title: ev.Title,
            Status: "Live",
            IsFeatured: false,
            IsPublished: true,
            CountryId: null,
            CityId: null,
            VenueId: null,
            AuditoriumId: null,
            City: "Karachi",
            Venue: "Main Hall",
            StartDateUtc: ev.StartDateUtc,
            EndDateUtc: ev.EndDateUtc,
            StartingPrice: ev.StartingPrice,
            TicketingType: "categorized",
            Banner: "http://example.com/banner.jpg",
            Description: "Desc",
            ScarcityText: "Selling Fast",
            OrganizerId: ev.OrganizerId,
            TagIds: new List<int>(),
            Shows: new List<CreateEventShowInputDto>
            {
                new CreateEventShowInputDto(
                    Id: show.Id,
                    ShowTitle: show.ShowTitle,
                    StartTimeUtc: show.StartTimeUtc,
                    EndTimeUtc: show.EndTimeUtc,
                    StartingPrice: 1500,
                    TicketTiers: new List<CreateShowTicketTierInputDto>
                    {
                        new CreateShowTicketTierInputDto(
                            Id: tier.Id,
                            Name: tier.Name,
                            Price: tier.Price,
                            AvailableQuantity: tier.AvailableQuantity
                        ),
                        new CreateShowTicketTierInputDto(
                            Id: null, // Newly added tier during event edit
                            Name: "Gold Circle",
                            Price: 4000,
                            AvailableQuantity: 30
                        )
                    }
                )
            }
        );

        await _adminService.UpdateEventAsync(ev.Id, updateDto);

        var allTiers = await _context.TicketTiers.Where(t => t.EventId == ev.Id && !t.IsDeleted).ToListAsync();
        Assert.Equal(2, allTiers.Count);
        Assert.Contains(allTiers, t => t.Name == "Gold Circle" && t.Price == 4000 && t.EventShowId == show.Id);
    }

    [Fact]
    public async Task UpdateEventAsync_ThrowsInvalidOperationException_WhenDuplicateShowsSubmitted()
    {
        var (ev, show, tier) = await SeedEventWithShowAndTierAsync();

        var sameStartTime = DateTime.UtcNow.AddDays(15);
        var updateDto = new UpdateAdminEventDto(
            Title: ev.Title,
            Status: "Live",
            IsFeatured: false,
            IsPublished: true,
            CountryId: null,
            CityId: null,
            VenueId: null,
            AuditoriumId: null,
            City: "Karachi",
            Venue: "Main Hall",
            StartDateUtc: ev.StartDateUtc,
            EndDateUtc: ev.EndDateUtc,
            StartingPrice: ev.StartingPrice,
            TicketingType: "categorized",
            Banner: "http://example.com/banner.jpg",
            Description: "Desc",
            ScarcityText: "Selling Fast",
            OrganizerId: ev.OrganizerId,
            TagIds: new List<int>(),
            Shows: new List<CreateEventShowInputDto>
            {
                new CreateEventShowInputDto(
                    ShowTitle: "Matinee",
                    StartTimeUtc: sameStartTime,
                    EndTimeUtc: sameStartTime.AddHours(2)
                ),
                new CreateEventShowInputDto(
                    ShowTitle: "matinee", // Case-insensitive duplicate at same time
                    StartTimeUtc: sameStartTime,
                    EndTimeUtc: sameStartTime.AddHours(2)
                )
            }
        );

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _adminService.UpdateEventAsync(ev.Id, updateDto));

        Assert.Contains("Duplicate show", ex.Message);
    }

    [Fact]
    public async Task UpdateEventAsync_ThrowsInvalidOperationException_WhenDuplicateTiersSubmittedInSameShow()
    {
        var (ev, show, tier) = await SeedEventWithShowAndTierAsync();

        var updateDto = new UpdateAdminEventDto(
            Title: ev.Title,
            Status: "Live",
            IsFeatured: false,
            IsPublished: true,
            CountryId: null,
            CityId: null,
            VenueId: null,
            AuditoriumId: null,
            City: "Karachi",
            Venue: "Main Hall",
            StartDateUtc: ev.StartDateUtc,
            EndDateUtc: ev.EndDateUtc,
            StartingPrice: ev.StartingPrice,
            TicketingType: "categorized",
            Banner: "http://example.com/banner.jpg",
            Description: "Desc",
            ScarcityText: "Selling Fast",
            OrganizerId: ev.OrganizerId,
            TagIds: new List<int>(),
            Shows: new List<CreateEventShowInputDto>
            {
                new CreateEventShowInputDto(
                    Id: show.Id,
                    ShowTitle: show.ShowTitle,
                    StartTimeUtc: show.StartTimeUtc,
                    EndTimeUtc: show.EndTimeUtc,
                    TicketTiers: new List<CreateShowTicketTierInputDto>
                    {
                        new CreateShowTicketTierInputDto(Name: "General Admission", Price: 1000),
                        new CreateShowTicketTierInputDto(Name: "general admission", Price: 1200)
                    }
                )
            }
        );

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _adminService.UpdateEventAsync(ev.Id, updateDto));

        Assert.Contains("Duplicate ticket tier name", ex.Message);
    }

    [Fact]
    public async Task CreateEventShowAsync_ThrowsInvalidOperationException_WhenDuplicateShowSlotExists()
    {
        var (ev, show, tier) = await SeedEventWithShowAndTierAsync();

        var newShowDto = new CreateEventShowDto(
            EventId: ev.Id,
            ShowTitle: show.ShowTitle.ToLower(),
            StartTimeUtc: show.StartTimeUtc,
            EndTimeUtc: show.EndTimeUtc
        );

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _adminService.CreateEventShowAsync(newShowDto));

        Assert.Contains("already exists", ex.Message);
    }

    [Fact]
    public async Task CreateTicketTierAsync_ThrowsInvalidOperationException_WhenDuplicateTierNameExistsInShow()
    {
        var (ev, show, tier) = await SeedEventWithShowAndTierAsync();

        var newTierDto = new CreateTicketTierDto(
            EventId: ev.Id,
            EventShowId: show.Id,
            Name: tier.Name.ToLower(),
            Description: "Desc",
            Price: 2000,
            AvailableQuantity: 50,
            MaxPerOrder: 5,
            SortOrder: 1
        );

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _adminService.CreateTicketTierAsync(newTierDto));

        Assert.Contains("already exists", ex.Message);
    }

    [Fact]
    public async Task CreateTicketTierAsync_AutoResolvesEventShowId_WhenOmitted()
    {
        var (ev, show, tier) = await SeedEventWithShowAndTierAsync();

        var newTierDto = new CreateTicketTierDto(
            EventId: ev.Id,
            EventShowId: null, // omitted
            Name: "Balcony Standard",
            Description: "Balcony tier",
            Price: 1800,
            AvailableQuantity: 40,
            MaxPerOrder: 5,
            SortOrder: 2
        );

        var created = await _adminService.CreateTicketTierAsync(newTierDto);

        Assert.NotNull(created);
        Assert.Equal(show.Id, created.EventShowId);
        Assert.Equal("Balcony Standard", created.Name);
    }

    [Fact]
    public async Task DeleteEventShowAsync_SoftDeletesChildTicketTiers()
    {
        var (ev, show, tier) = await SeedEventWithShowAndTierAsync();

        var deleted = await _adminService.DeleteEventShowAsync(show.Id);

        Assert.True(deleted);

        var dbShow = await _context.EventShows.FirstOrDefaultAsync(s => s.Id == show.Id);
        Assert.NotNull(dbShow);
        Assert.True(dbShow.IsDeleted);

        var dbTier = await _context.TicketTiers.FirstOrDefaultAsync(t => t.Id == tier.Id);
        Assert.NotNull(dbTier);
        Assert.True(dbTier.IsDeleted);
    }

    [Fact]
    public async Task GetTicketTiersAsync_ReturnsTiers_WithFiltering()
    {
        var (ev, show, tier) = await SeedEventWithShowAndTierAsync();

        var tiers = await _adminService.GetTicketTiersAsync(eventId: ev.Id);

        Assert.NotEmpty(tiers);
        Assert.Contains(tiers, t => t.Id == tier.Id && t.Name == tier.Name);
    }

    [Fact]
    public async Task UpdateTicketTierAsync_UpdatesTierPropertiesAndPrice()
    {
        var (ev, show, tier) = await SeedEventWithShowAndTierAsync();

        var updateDto = new UpdateTicketTierDto(
            EventShowId: show.Id,
            Name: "VIP Front Row",
            Description: "Updated VIP description",
            Price: 3500,
            AvailableQuantity: 75,
            MaxPerOrder: 4,
            SortOrder: 1,
            RowRange: "A-B"
        );

        var updated = await _adminService.UpdateTicketTierAsync(tier.Id, updateDto);

        Assert.NotNull(updated);
        Assert.Equal("VIP Front Row", updated.Name);
        Assert.Equal(3500, updated.Price);
        Assert.Equal(75, updated.AvailableQuantity);
        Assert.Equal("A-B", updated.RowRange);

        var dbTier = await _context.TicketTiers.FirstOrDefaultAsync(t => t.Id == tier.Id);
        Assert.NotNull(dbTier);
        Assert.Equal(3500, dbTier.Price);
    }
}

public class FakeCacheService : ICacheService
{
    public Task<T?> GetAsync<T>(string key) => Task.FromResult<T?>(default);
    public Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null) => Task.CompletedTask;
    public Task RemoveAsync(string key) => Task.CompletedTask;
    public Task RemoveByPrefixAsync(string prefixKey) => Task.CompletedTask;
    public Task ClearEventCacheAsync(int? eventId = null) => Task.CompletedTask;
    public Task<bool> HoldSeatsAsync(int eventId, List<int> seatIds, string email, TimeSpan holdDuration, int? eventShowId = null) => Task.FromResult(true);
    public Task ReleaseSeatsAsync(int eventId, List<int> seatIds, int? eventShowId = null, string? expectedOwnerEmail = null) => Task.CompletedTask;
    public Task<List<int>> GetHeldSeatIdsAsync(int eventId, int? eventShowId = null) => Task.FromResult(new List<int>());
}

public class FakeLogger<T> : ILogger<T>
{
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(LogLevel logLevel) => true;
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
    }
}
