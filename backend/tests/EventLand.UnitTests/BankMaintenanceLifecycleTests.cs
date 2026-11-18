namespace EventLand.UnitTests;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Application.Services;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Domain.Exceptions;
using EventLand.Infrastructure.Services;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Xunit;

public class BankMaintenanceLifecycleTests : IAsyncLifetime
{
    private SqliteConnection _connection = null!;
    private TestDbContext _context = null!;
    private FakeTimeProvider _fakeTimeProvider = null!;
    private TestCacheService _cacheService = null!;
    private BankAccountService _bankAccountService = null!;
    private BookingService _bookingService = null!;

    public async Task InitializeAsync()
    {
        _connection = new SqliteConnection("DataSource=:memory:;Cache=Shared");
        await _connection.OpenAsync();

        using var command = _connection.CreateCommand();
        command.CommandText = "PRAGMA busy_timeout = 5000;";
        await command.ExecuteNonQueryAsync();

        var options = new DbContextOptionsBuilder<TestDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new TestDbContext(options);
        await _context.Database.EnsureCreatedAsync();

        // Pin time to 2026-11-18 12:00:00 UTC
        _fakeTimeProvider = new FakeTimeProvider(new DateTimeOffset(2026, 11, 18, 12, 0, 0, TimeSpan.Zero));
        _cacheService = new TestCacheService();

        _bankAccountService = new BankAccountService(
            _context,
            _cacheService,
            NullLogger<BankAccountService>.Instance,
            _fakeTimeProvider
        );

        var paymentFeeService = new PaymentFeeService(_context);
        var notificationService = new TestNotificationService();

        _bookingService = new BookingService(
            _context,
            _cacheService,
            notificationService,
            paymentFeeService,
            NullLogger<BookingService>.Instance,
            gateQrSignatureService: null,
            timeProvider: _fakeTimeProvider
        );
    }

    public async Task DisposeAsync()
    {
        await _context.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private async Task<BankAccount> SeedActiveBankAccountAsync(
        DateTimeOffset? startUtc = null,
        DateTimeOffset? endUtc = null,
        bool isMaintenanceMode = false,
        string? notice = "Scheduled banking system upgrade")
    {
        var bank = new BankAccount
        {
            BankName = "Habib Bank Limited",
            AccountTitle = "EventLand Pvt Ltd",
            AccountNumber = "01234567890123",
            Iban = "PK36HABB0001234567890123",
            IsActive = true,
            IsEnabled = true,
            MaintenanceNotice = notice,
            MaintenanceStartUtc = startUtc,
            MaintenanceEndUtc = endUtc,
            IsMaintenanceMode = isMaintenanceMode
        };

        _context.BankAccounts.Add(bank);
        await _context.SaveChangesAsync();
        return bank;
    }

    private async Task<(Event ev, TicketTier tier)> SeedEventAndTierAsync()
    {
        var country = new Country { Name = "Pakistan", Code = "PK" };
        var city = new City { Name = "Lahore", Country = country };
        var venue = new Venue { Name = "Alhamra", Address = "Mall Rd", City = city };
        var organizer = new Organizer { Name = "Live Events", Email = "org@example.com", Phone = "03001234567" };

        _context.Countries.Add(country);
        _context.Cities.Add(city);
        _context.Venues.Add(venue);
        _context.Organizers.Add(organizer);
        await _context.SaveChangesAsync();

        var ev = new Event
        {
            Title = "Music Fest",
            CountryId = country.Id,
            CityId = city.Id,
            VenueId = venue.Id,
            OrganizerId = organizer.Id,
            Status = EventStatus.Live,
            IsPublished = true,
            StartDateUtc = _fakeTimeProvider.GetUtcNow().AddDays(2),
            EndDateUtc = _fakeTimeProvider.GetUtcNow().AddDays(4)
        };
        _context.Events.Add(ev);
        await _context.SaveChangesAsync();

        var tier = new TicketTier
        {
            EventId = ev.Id,
            Name = "General Admission",
            Price = 2000m,
            AvailableQuantity = 100,
            SoldCount = 0,
            Status = TicketTierStatus.Available
        };
        _context.TicketTiers.Add(tier);
        await _context.SaveChangesAsync();

        return (ev, tier);
    }

    [Fact]
    public void GetOperationalStatus_RespectsWindowBoundaries_WithFakeTime()
    {
        var startTime = new DateTimeOffset(2026, 11, 18, 14, 0, 0, TimeSpan.Zero);
        var endTime = new DateTimeOffset(2026, 11, 18, 16, 0, 0, TimeSpan.Zero);

        var bank = new BankAccount
        {
            BankName = "Meezan Bank",
            IsActive = true,
            IsEnabled = true,
            MaintenanceNotice = "1Link Maintenance",
            MaintenanceStartUtc = startTime,
            MaintenanceEndUtc = endTime,
            IsMaintenanceMode = false
        };

        // 1. Before maintenance window (13:59:59) -> Active
        var statusBefore = bank.GetOperationalStatus(startTime.AddSeconds(-1));
        statusBefore.State.Should().Be(BankOperationalState.Active);
        statusBefore.IsOperational.Should().BeTrue();

        // 2. Exact start time (14:00:00) -> UnderScheduledMaintenance
        var statusStart = bank.GetOperationalStatus(startTime);
        statusStart.State.Should().Be(BankOperationalState.UnderMaintenance);
        statusStart.IsOperational.Should().BeFalse();
        statusStart.MaintenanceType.Should().Be(BankMaintenanceType.Scheduled);
        statusStart.UntilUtc.Should().Be(endTime);

        // 3. Mid window (15:00:00) -> UnderScheduledMaintenance
        var statusMid = bank.GetOperationalStatus(startTime.AddHours(1));
        statusMid.State.Should().Be(BankOperationalState.UnderMaintenance);
        statusMid.IsOperational.Should().BeFalse();

        // 4. Exact end time (16:00:00) -> Still UnderMaintenance
        var statusEnd = bank.GetOperationalStatus(endTime);
        statusEnd.State.Should().Be(BankOperationalState.UnderMaintenance);
        statusEnd.IsOperational.Should().BeFalse();

        // 5. One second after end time (16:00:01) -> Active
        var statusAfter = bank.GetOperationalStatus(endTime.AddSeconds(1));
        statusAfter.State.Should().Be(BankOperationalState.Active);
        statusAfter.IsOperational.Should().BeTrue();
    }

    [Fact]
    public void GetOperationalStatus_ManualFlagTakesPrecedenceOverScheduledDates()
    {
        var startTime = new DateTimeOffset(2026, 11, 18, 14, 0, 0, TimeSpan.Zero);
        var endTime = new DateTimeOffset(2026, 11, 18, 16, 0, 0, TimeSpan.Zero);

        var bank = new BankAccount
        {
            BankName = "Faysal Bank",
            IsActive = true,
            IsEnabled = true,
            MaintenanceNotice = "Emergency Maintenance",
            MaintenanceStartUtc = startTime,
            MaintenanceEndUtc = endTime,
            IsMaintenanceMode = true // Manual flag forced ON
        };

        // Before scheduled start (12:00:00) -> Still UnderMaintenance because of manual flag!
        var statusBefore = bank.GetOperationalStatus(new DateTimeOffset(2026, 11, 18, 12, 0, 0, TimeSpan.Zero));
        statusBefore.State.Should().Be(BankOperationalState.UnderMaintenance);
        statusBefore.MaintenanceType.Should().Be(BankMaintenanceType.Manual);
        statusBefore.IsOperational.Should().BeFalse();

        // After scheduled end (18:00:00) -> Still UnderMaintenance because of manual flag!
        var statusAfter = bank.GetOperationalStatus(new DateTimeOffset(2026, 11, 18, 18, 0, 0, TimeSpan.Zero));
        statusAfter.State.Should().Be(BankOperationalState.UnderMaintenance);
        statusAfter.MaintenanceType.Should().Be(BankMaintenanceType.Manual);
        statusAfter.IsOperational.Should().BeFalse();
    }

    [Fact]
    public void SetMaintenanceWindow_ValidatesWriteInvariants()
    {
        var now = new DateTimeOffset(2026, 11, 18, 12, 0, 0, TimeSpan.Zero);
        var bank = new BankAccount { BankName = "Allied Bank" };

        // 1. Both-or-neither check: start only -> fails
        var actStartOnly = () => bank.SetMaintenanceWindow(now.AddHours(1), null, "Notice", false, now);
        actStartOnly.Should().Throw<ArgumentException>()
            .WithMessage("*both*");

        // 2. Both-or-neither check: end only -> fails
        var actEndOnly = () => bank.SetMaintenanceWindow(null, now.AddHours(2), "Notice", false, now);
        actEndOnly.Should().Throw<ArgumentException>()
            .WithMessage("*both*");

        // 3. Start >= End -> fails
        var actStartAfterEnd = () => bank.SetMaintenanceWindow(now.AddHours(3), now.AddHours(2), "Notice", false, now);
        actStartAfterEnd.Should().Throw<ArgumentException>()
            .WithMessage("*earlier*");

        // 4. End in the past -> fails
        var actEndInPast = () => bank.SetMaintenanceWindow(now.AddHours(-3), now.AddHours(-1), "Notice", false, now);
        actEndInPast.Should().Throw<ArgumentException>()
            .WithMessage("*future*");

        // 5. Valid window -> succeeds
        bank.SetMaintenanceWindow(now.AddHours(1), now.AddHours(3), "Routine Upgrade", false, now);
        bank.MaintenanceStartUtc.Should().Be(now.AddHours(1));
        bank.MaintenanceEndUtc.Should().Be(now.AddHours(3));
        bank.MaintenanceNotice.Should().Be("Routine Upgrade");
    }

    [Fact]
    public async Task GetCachedBankStatus_ReturnsLightweightDto_AndUsesCache()
    {
        var start = _fakeTimeProvider.GetUtcNow().AddHours(1);
        var end = _fakeTimeProvider.GetUtcNow().AddHours(3);
        await SeedActiveBankAccountAsync(start, end, isMaintenanceMode: false, notice: "Scheduled 1Link Maintenance");

        // 1. Query status before window -> Active
        var status1 = await _bankAccountService.GetCachedBankStatusAsync();
        status1.IsOperational.Should().BeTrue();
        status1.Status.Should().Be("Active");

        // Cache was populated
        _cacheService.HasKey("bank:operational-status").Should().BeTrue();

        // 2. Invalidate cache and advance time into maintenance window
        await _cacheService.RemoveAsync("bank:operational-status");
        _fakeTimeProvider.Advance(TimeSpan.FromHours(1.5)); // now in window

        var status2 = await _bankAccountService.GetCachedBankStatusAsync();
        status2.IsOperational.Should().BeFalse();
        status2.Status.Should().Be("UnderMaintenance");
        status2.MaintenanceType.Should().Be("Scheduled");
        status2.Notice.Should().Be("Scheduled 1Link Maintenance");
        status2.UntilUtc.Should().Be(end);
        status2.RetryAfterSeconds.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task CreateBookingAsync_RejectsBankTransferDuringMaintenance_With503Exception()
    {
        var (ev, tier) = await SeedEventAndTierAsync();

        // Schedule maintenance window active RIGHT NOW
        var start = _fakeTimeProvider.GetUtcNow().AddMinutes(-10);
        var end = _fakeTimeProvider.GetUtcNow().AddMinutes(50);
        await SeedActiveBankAccountAsync(start, end, isMaintenanceMode: false, notice: "Interbank switch downtime");

        var dto = new CreateBookingDto(
            EventId: ev.Id,
            TicketTierId: tier.Id,
            CustomerName: "Kashif Ali",
            CustomerEmail: "kashif@example.com",
            CustomerPhone: "03001234567",
            Quantity: 1,
            PaymentMethod: "BankTransfer",
            SelectedSeatIds: null
        );

        // Act & Assert: CreateBookingAsync throws BankMaintenanceException
        var act = async () => await _bookingService.CreateBookingAsync(dto);
        var exception = await act.Should().ThrowAsync<BankMaintenanceException>();
        exception.Which.Code.Should().Be("BANK_MAINTENANCE");
        exception.Which.RetryAfterUtc.Should().Be(end);
        exception.Which.RetryAfterSeconds.Should().BeGreaterThan(0);

        // Advance time past the maintenance window
        _fakeTimeProvider.Advance(TimeSpan.FromHours(1));

        // Now creating booking should succeed!
        var successfulBooking = await _bookingService.CreateBookingAsync(dto);
        successfulBooking.Should().NotBeNull();
        successfulBooking.Status.Should().Be("Pending");
    }

    private class TestCacheService : ICacheService
    {
        private readonly Dictionary<string, object> _store = new();

        public bool HasKey(string key) => _store.ContainsKey(key);

        public Task<T?> GetAsync<T>(string key)
        {
            if (_store.TryGetValue(key, out var val) && val is T typed)
                return Task.FromResult<T?>(typed);
            return Task.FromResult<T?>(default);
        }

        public Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null)
        {
            if (value != null) _store[key] = value;
            return Task.CompletedTask;
        }

        public Task RemoveAsync(string key)
        {
            _store.Remove(key);
            return Task.CompletedTask;
        }

        public Task RemoveByPrefixAsync(string prefixKey) => Task.CompletedTask;
        public Task ClearEventCacheAsync(int? eventId = null) => Task.CompletedTask;
        public Task<SeatHoldResult> TryHoldSeatsGranularAsync(int eventId, List<int> seatIds, string ownerToken, TimeSpan holdDuration, int? eventShowId = null) =>
            Task.FromResult(new SeatHoldResult(true, new List<int>(), DateTimeOffset.UtcNow.Add(holdDuration)));
        public Task<bool> HoldSeatsAsync(int eventId, List<int> seatIds, string email, TimeSpan holdDuration, int? eventShowId = null) => Task.FromResult(true);
        public Task ReleaseSeatsAsync(int eventId, List<int> seatIds, int? eventShowId = null, string? expectedOwnerEmail = null) => Task.CompletedTask;
        public Task<List<int>> GetHeldSeatIdsAsync(int eventId, int? eventShowId = null) => Task.FromResult(new List<int>());
    }

    private class TestNotificationService : INotificationService
    {
        public Task SendTicketConfirmationEmailAsync(BookingDto booking) => Task.CompletedTask;
        public Task<string> GenerateWhatsAppTicketShareUrlAsync(BookingDto booking) => Task.FromResult("https://wa.me/test");
    }
}
