namespace EventLand.UnitTests;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Application.Services;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using EventLand.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

public class GateScanLifecycleTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<TestDbContext> _dbOptions;
    private readonly GateQrSignatureService _signatureService;

    public GateScanLifecycleTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:;Cache=Shared");
        _connection.Open();

        using var pragmaCmd = _connection.CreateCommand();
        pragmaCmd.CommandText = "PRAGMA busy_timeout = 5000;";
        pragmaCmd.ExecuteNonQuery();

        _dbOptions = new DbContextOptionsBuilder<TestDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var initContext = new TestDbContext(_dbOptions);
        initContext.Database.EnsureCreated();

        var inMemoryConfig = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Gate:SecretKey"] = "EventLand_SuperSecret_TestKey_1234567890!"
            })
            .Build();

        _signatureService = new GateQrSignatureService(inMemoryConfig);
    }

    public void Dispose()
    {
        _connection.Close();
        _connection.Dispose();
    }

    private (TestDbContext context, BookingService service) CreateService()
    {
        var context = new TestDbContext(_dbOptions);
        var fakeCache = new FakeCacheService();
        var fakeNotif = new FakeGateNotificationService();
        var fakeFee = new FakeGatePaymentFeeService();

        var service = new BookingService(
            context,
            fakeCache,
            fakeNotif,
            fakeFee,
            NullLogger<BookingService>.Instance,
            _signatureService
        );

        return (context, service);
    }

    private async Task<(Event ev, TicketTier tier)> SeedEventAndTierAsync(
        TestDbContext context,
        int eventId = 1,
        int tierId = 1,
        int? showId = null,
        string title = "Grand Gala")
    {
        if (!await context.Countries.AnyAsync(c => c.Id == 1))
        {
            var country = new Country { Id = 1, Name = "Pakistan", Code = "PK" };
            var city = new City { Id = 1, CountryId = 1, Name = "Lahore" };
            var venue = new Venue { Id = 1, CityId = 1, Name = "Alhamra Cultural Complex", Address = "Qaddafi Stadium" };
            var organizer = new Organizer { Id = 1, Name = "EventLand Productions", Email = "ops@eventland.pk" };
            context.Countries.Add(country);
            context.Cities.Add(city);
            context.Venues.Add(venue);
            context.Organizers.Add(organizer);
            await context.SaveChangesAsync();
        }

        var ev = new Event
        {
            Id = eventId,
            Title = title,
            CountryId = 1,
            CityId = 1,
            VenueId = 1,
            OrganizerId = 1,
            StartDateUtc = DateTimeOffset.UtcNow.AddDays(1),
            EndDateUtc = DateTimeOffset.UtcNow.AddDays(2),
            StartingPrice = 2000,
            Status = EventStatus.Live,
            IsPublished = true
        };
        context.Events.Add(ev);

        if (showId.HasValue)
        {
            var show = new EventShow
            {
                Id = showId.Value,
                EventId = eventId,
                ShowTitle = "Matinee Show",
                StartTimeUtc = DateTimeOffset.UtcNow.AddDays(1).AddHours(14),
                EndTimeUtc = DateTimeOffset.UtcNow.AddDays(1).AddHours(17)
            };
            context.EventShows.Add(show);
        }

        var tier = new TicketTier
        {
            Id = tierId,
            EventId = eventId,
            EventShowId = showId,
            Name = "VIP Diamond",
            Price = 5000,
            AvailableQuantity = 100
        };
        context.TicketTiers.Add(tier);
        await context.SaveChangesAsync();

        return (ev, tier);
    }

    [Fact]
    public async Task ConcurrentScans_SameTicket_OnlyOneAdmits_OthersReportAlreadyCheckedIn()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 10, 10, title: "Concurrency Fest");

        var booking = new Booking
        {
            Id = 501,
            BookingRef = "EVL-CONC-01",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Hamza Farooq",
            CustomerEmail = "hamza@example.com",
            CustomerPhone = "03001112233",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Confirmed,
            State = BookingState.Confirmed,
            Quantity = 1,
            IsCheckedIn = false,
            ScanState = TicketScanState.Issued
        };
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        // 10 concurrent turnstile scans for the same ticket
        var tasks = Enumerable.Range(1, 10).Select(async i =>
        {
            var (_, threadService) = CreateService();
            var req = new ValidateGateTicketRequestDto(
                TicketCode: "EVL-CONC-01",
                CheckIn: true,
                GateName: $"Gate-{i}",
                DeviceId: $"scanner-turnstile-{i}",
                SequenceNumber: i
            );
            return await threadService.ValidateGateTicketAsync(req, i, $"gatekeeper{i}@eventland.pk");
        });

        var results = await Task.WhenAll(tasks);

        var approved = results.Where(r => r.IsValid && r.Status == "APPROVED").ToList();
        var duplicates = results.Where(r => !r.IsValid && r.Status == "ALREADY_CHECKED_IN").ToList();

        approved.Should().HaveCount(1, "Exactly one concurrent scan must win the atomic admission race");
        duplicates.Should().HaveCount(9, "All subsequent 9 concurrent scans must detect duplicate entry");

        // Verify persistence in DB
        using var verifyContext = new TestDbContext(_dbOptions);
        var dbBooking = await verifyContext.Bookings.FindAsync(501);
        dbBooking.Should().NotBeNull();
        dbBooking!.IsCheckedIn.Should().BeTrue();
        dbBooking.ScanState.Should().Be(TicketScanState.ScannedAndAdmitted);
        dbBooking.CheckedInAt.Should().NotBeNull();
        dbBooking.CheckedInDeviceId.Should().StartWith("scanner-turnstile-");
    }

    [Fact]
    public async Task ValidateGateTicket_SignedQrPayload_ValidSignature_ApprovesEntry()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 20, 20, title: "HMAC Music Awards");

        var booking = new Booking
        {
            Id = 502,
            BookingRef = "EVL-HMAC-OK",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Ayesha Khan",
            CustomerEmail = "ayesha@example.com",
            CustomerPhone = "03214445566",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Confirmed,
            State = BookingState.Confirmed,
            Quantity = 1,
            IsCheckedIn = false,
            ScanState = TicketScanState.Issued
        };
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var signedPayload = _signatureService.CreateSignedPayload(booking.BookingRef, ev.Id);

        var req = new ValidateGateTicketRequestDto(
            TicketCode: signedPayload,
            CheckIn: true,
            GateName: "Gate VIP West",
            DeviceId: "scanner-mobile-01"
        );

        var result = await service.ValidateGateTicketAsync(req, 1, "gate@eventland.pk");

        result.IsValid.Should().BeTrue();
        result.Status.Should().Be("APPROVED");
        result.TicketState.Should().Be(TicketScanState.ScannedAndAdmitted);
        result.CustomerName.Should().Be("Ayesha Khan");
    }

    [Fact]
    public async Task ValidateGateTicket_SignedQrPayload_TamperedPayload_RejectsWithInvalidSignature()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 30, 30, title: "Crypto Security Expo");

        var booking = new Booking
        {
            Id = 503,
            BookingRef = "EVL-ORIGINAL",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Ali Raza",
            CustomerEmail = "ali@example.com",
            CustomerPhone = "03331112222",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Confirmed,
            State = BookingState.Confirmed,
            Quantity = 1
        };
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var signedPayload = _signatureService.CreateSignedPayload(booking.BookingRef, ev.Id);
        // Tamper with payload: alter booking ref while keeping old signature
        var tamperedPayload = signedPayload.Replace("EVL-ORIGINAL", "EVL-FORGED");

        var req = new ValidateGateTicketRequestDto(
            TicketCode: tamperedPayload,
            CheckIn: true
        );

        var result = await service.ValidateGateTicketAsync(req, 1, "gate@eventland.pk");

        result.IsValid.Should().BeFalse();
        result.Status.Should().Be("INVALID_SIGNATURE");
        result.TicketState.Should().Be(TicketScanState.Revoked);
        result.Message.Should().Contain("TAMPER DETECTED");
    }

    [Fact]
    public async Task ValidateGateTicket_RevokedTicket_WhenRefundedOrCancelled_RejectsAdmission()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 40, 40);

        var refundedBooking = new Booking
        {
            Id = 504,
            BookingRef = "EVL-REFUNDED",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Sara Ahmed",
            CustomerEmail = "sara@example.com",
            CustomerPhone = "03009998877",
            PaymentStatus = PaymentStatus.Refunded,
            Status = BookingStatus.Cancelled,
            State = BookingState.Refunded,
            ScanState = TicketScanState.Revoked
        };

        var cancelledBooking = new Booking
        {
            Id = 505,
            BookingRef = "EVL-CANCELLED",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Zainab Malik",
            CustomerEmail = "zainab@example.com",
            CustomerPhone = "03008887766",
            PaymentStatus = PaymentStatus.Expired,
            Status = BookingStatus.Cancelled,
            State = BookingState.Cancelled,
            ScanState = TicketScanState.Revoked
        };

        context.Bookings.AddRange(refundedBooking, cancelledBooking);
        await context.SaveChangesAsync();

        var refundResult = await service.ValidateGateTicketAsync(new ValidateGateTicketRequestDto("EVL-REFUNDED"));
        refundResult.IsValid.Should().BeFalse();
        refundResult.Status.Should().Be("REFUNDED");
        refundResult.TicketState.Should().Be(TicketScanState.Revoked);

        var cancelResult = await service.ValidateGateTicketAsync(new ValidateGateTicketRequestDto("EVL-CANCELLED"));
        cancelResult.IsValid.Should().BeFalse();
        cancelResult.Status.Should().Be("CANCELLED");
        cancelResult.TicketState.Should().Be(TicketScanState.Revoked);
    }

    [Fact]
    public async Task ValidateGateTicket_ShowMismatch_RejectsWithInvalidShowSlot()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 50, 50, showId: 101, title: "Multi-Show Theatre");

        var booking = new Booking
        {
            Id = 506,
            BookingRef = "EVL-SHOW-MISMATCH",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Omer Sheikh",
            CustomerEmail = "omer@example.com",
            CustomerPhone = "03221234567",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Confirmed,
            State = BookingState.Confirmed,
            ScanState = TicketScanState.Issued
        };
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        // Presented at Turnstile configured for Show ID 999 instead of 101
        var req = new ValidateGateTicketRequestDto(
            TicketCode: "EVL-SHOW-MISMATCH",
            EventShowId: 999,
            CheckIn: true
        );

        var result = await service.ValidateGateTicketAsync(req);

        result.IsValid.Should().BeFalse();
        result.Status.Should().Be("SHOW_MISMATCH");
        result.TicketState.Should().Be(TicketScanState.InvalidShowSlot);
        result.Message.Should().Contain("Wrong Show Slot");
    }

    [Fact]
    public async Task SyncOfflineGateScans_ChronologicalBatch_FirstAdmits_SubsequentOnSameDeviceReportsAlreadyCheckedIn()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 60, 60);

        var booking = new Booking
        {
            Id = 507,
            BookingRef = "EVL-OFFLINE-01",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Bilal Tariq",
            CustomerEmail = "bilal@example.com",
            CustomerPhone = "03001239876",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Confirmed,
            State = BookingState.Confirmed,
            ScanState = TicketScanState.Issued
        };
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var sig = _signatureService.GenerateSignature(booking.BookingRef, ev.Id, null, null);

        var batch = new OfflineGateSyncBatchRequestDto(
            DeviceId: "scanner-device-alpha",
            Scans: new List<OfflineGateScanItemDto>
            {
                new(booking.BookingRef, DateTimeOffset.UtcNow.AddMinutes(-10), "scanner-device-alpha", sig, 1, ev.Id, null, null, "Gate North"),
                new(booking.BookingRef, DateTimeOffset.UtcNow.AddMinutes(-5), "scanner-device-alpha", sig, 2, ev.Id, null, null, "Gate North")
            }
        );

        var syncResponse = await service.SyncOfflineGateScansAsync(batch, 1, "ops@eventland.pk");

        syncResponse.TotalProcessed.Should().Be(2);
        syncResponse.TotalAdmitted.Should().Be(1);
        syncResponse.TotalRejected.Should().Be(1);
        syncResponse.TotalDuplicateSecurityAlerts.Should().Be(0);

        syncResponse.Results[0].Status.Should().Be("APPROVED");
        syncResponse.Results[1].Status.Should().Be("ALREADY_CHECKED_IN");
    }

    [Fact]
    public async Task SyncOfflineGateScans_AcrossDifferentDevices_FlagsSecurityAlertDuplicateEntry()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 70, 70);

        var booking = new Booking
        {
            Id = 508,
            BookingRef = "EVL-OFFLINE-CLONED",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Usman Ghani",
            CustomerEmail = "usman@example.com",
            CustomerPhone = "03110001122",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Confirmed,
            State = BookingState.Confirmed,
            IsCheckedIn = true,
            CheckedInAt = DateTimeOffset.UtcNow.AddHours(-1),
            CheckedInDeviceId = "scanner-device-1",
            ScanState = TicketScanState.ScannedAndAdmitted
        };
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var sig = _signatureService.GenerateSignature(booking.BookingRef, ev.Id);

        // A second device synced a scan for the same ticket
        var batch = new OfflineGateSyncBatchRequestDto(
            DeviceId: "scanner-device-2",
            Scans: new List<OfflineGateScanItemDto>
            {
                new(booking.BookingRef, DateTimeOffset.UtcNow.AddMinutes(-15), "scanner-device-2", sig, 42, ev.Id)
            }
        );

        var syncResponse = await service.SyncOfflineGateScansAsync(batch, 1, "ops@eventland.pk");

        syncResponse.TotalAdmitted.Should().Be(0);
        syncResponse.TotalRejected.Should().Be(1);
        syncResponse.TotalDuplicateSecurityAlerts.Should().Be(1);
        syncResponse.Results[0].Status.Should().Be("SECURITY_ALERT_DUPLICATE_ENTRY");
        syncResponse.Results[0].Message.Should().Contain("SECURITY ALERT: Duplicate scan across devices");
    }

    [Fact]
    public async Task SyncOfflineGateScans_TamperedOfflineSignature_RejectsWithInvalidSignature()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 80, 80);

        var booking = new Booking
        {
            Id = 509,
            BookingRef = "EVL-OFFLINE-BADSIG",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Farhan Zaidi",
            CustomerEmail = "farhan@example.com",
            CustomerPhone = "03009991122",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Confirmed,
            State = BookingState.Confirmed,
            ScanState = TicketScanState.Issued
        };
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var batch = new OfflineGateSyncBatchRequestDto(
            DeviceId: "scanner-mobile-03",
            Scans: new List<OfflineGateScanItemDto>
            {
                new(booking.BookingRef, DateTimeOffset.UtcNow, "scanner-mobile-03", "tampered_fake_signature_hash_12345", 1, ev.Id)
            }
        );

        var syncResponse = await service.SyncOfflineGateScansAsync(batch);

        syncResponse.TotalAdmitted.Should().Be(0);
        syncResponse.TotalRejected.Should().Be(1);
        syncResponse.Results[0].Status.Should().Be("INVALID_SIGNATURE");
    }

    [Fact]
    public async Task ResetGateCheckIn_WhenAdmitted_ResetsToIssuedState()
    {
        var (context, service) = CreateService();
        var (ev, tier) = await SeedEventAndTierAsync(context, 90, 90);

        var booking = new Booking
        {
            Id = 510,
            BookingRef = "EVL-RESET-TEST",
            EventId = ev.Id,
            TicketTierId = tier.Id,
            CustomerName = "Nabeel Akhtar",
            CustomerEmail = "nabeel@example.com",
            CustomerPhone = "03451112233",
            PaymentStatus = PaymentStatus.Paid,
            Status = BookingStatus.Confirmed,
            State = BookingState.Confirmed,
            IsCheckedIn = true,
            ScanState = TicketScanState.ScannedAndAdmitted,
            CheckedInAt = DateTimeOffset.UtcNow.AddMinutes(-30),
            CheckedInBy = "Gate VIP",
            CheckedInDeviceId = "dev-reset-01"
        };
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        var resetReq = new ResetGateCheckInRequestDto(
            TicketCode: "EVL-RESET-TEST",
            Reason: "Attendee stepped out briefly to vehicle"
        );

        var resetResult = await service.ResetGateCheckInAsync(resetReq, 999, "admin@eventland.pk");

        resetResult.IsValid.Should().BeTrue();
        resetResult.Status.Should().Be("RESET");
        resetResult.TicketState.Should().Be(TicketScanState.Issued);

        using var verifyContext = new TestDbContext(_dbOptions);
        var dbBooking = await verifyContext.Bookings.FindAsync(510);
        dbBooking.Should().NotBeNull();
        dbBooking!.IsCheckedIn.Should().BeFalse();
        dbBooking.ScanState.Should().Be(TicketScanState.Issued);
        dbBooking.CheckedInAt.Should().BeNull();
        dbBooking.CheckedInDeviceId.Should().BeNull();
        dbBooking.GateNotes.Should().Contain("Reset: Attendee stepped out briefly to vehicle");
    }
}
