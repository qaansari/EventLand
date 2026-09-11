namespace EventLand.UnitTests;

using System.Threading;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

public class TestDbContext : DbContext, IApplicationDbContext
{
    public TestDbContext(DbContextOptions<TestDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventShow> EventShows => Set<EventShow>();
    public DbSet<Organizer> Organizers => Set<Organizer>();
    public DbSet<TicketTier> TicketTiers => Set<TicketTier>();
    public DbSet<SeatingZone> SeatingZones => Set<SeatingZone>();
    public DbSet<Seat> Seats => Set<Seat>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingSeat> BookingSeats => Set<BookingSeat>();
    public DbSet<Artist> Artists => Set<Artist>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<EventTag> EventTags => Set<EventTag>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<City> Cities => Set<City>();
    public DbSet<Venue> Venues => Set<Venue>();
    public DbSet<Auditorium> Auditoriums => Set<Auditorium>();
    public DbSet<Faq> Faqs => Set<Faq>();
    public DbSet<FooterInfo> FooterInfo => Set<FooterInfo>();
    public DbSet<RefundRecord> RefundRecords => Set<RefundRecord>();
    public DbSet<BankAccount> BankAccounts => Set<BankAccount>();
    public DbSet<PaymentConfig> PaymentConfigs => Set<PaymentConfig>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<BookingSeat>().HasKey(bs => new { bs.BookingId, bs.SeatId });
        modelBuilder.Entity<EventTag>().HasKey(et => new { et.EventId, et.TagId });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return base.SaveChangesAsync(cancellationToken);
    }
}
