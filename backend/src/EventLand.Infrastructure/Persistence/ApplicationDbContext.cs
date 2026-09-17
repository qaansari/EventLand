namespace EventLand.Infrastructure.Persistence;

using System.Reflection;
using EventLand.Application.Common.Interfaces;
using EventLand.Domain.Common;
using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;

public class ApplicationDbContext : DbContext, IApplicationDbContext, EventLand.Modules.PayPro.Persistence.IPayProDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    // ── DbSets ──────────────────────────────────────────────────────────────
    public DbSet<User>        Users        => Set<User>();
    public DbSet<Role>        Roles        => Set<Role>();
    public DbSet<Event>       Events       => Set<Event>();
    public DbSet<EventShow>   EventShows   => Set<EventShow>();
    public DbSet<Organizer>   Organizers   => Set<Organizer>();
    public DbSet<TicketTier>  TicketTiers  => Set<TicketTier>();
    public DbSet<SeatingZone> SeatingZones => Set<SeatingZone>();
    public DbSet<Seat>        Seats        => Set<Seat>();
    public DbSet<Booking>     Bookings     => Set<Booking>();
    public DbSet<BookingSeat> BookingSeats => Set<BookingSeat>();
    public DbSet<Artist>      Artists      => Set<Artist>();
    public DbSet<Tag>         Tags         => Set<Tag>();
    public DbSet<EventTag>    EventTags    => Set<EventTag>();
    public DbSet<Country>     Countries    => Set<Country>();
    public DbSet<City>        Cities       => Set<City>();
    public DbSet<Venue>       Venues       => Set<Venue>();
    public DbSet<Auditorium>  Auditoriums  => Set<Auditorium>();
    public DbSet<Faq>         Faqs         => Set<Faq>();
    public DbSet<FooterInfo>  FooterInfo   => Set<FooterInfo>();
    public DbSet<RefundRecord> RefundRecords => Set<RefundRecord>();
    public DbSet<BankAccount> BankAccounts => Set<BankAccount>();
    public DbSet<PaymentConfig> PaymentConfigs => Set<PaymentConfig>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();

    // ── PayPro Module DbSets ─────────────────────────────────────────────────
    public DbSet<EventLand.Modules.PayPro.Entities.Order> Orders => Set<EventLand.Modules.PayPro.Entities.Order>();
    public DbSet<EventLand.Modules.PayPro.Entities.Consumer> Consumers => Set<EventLand.Modules.PayPro.Entities.Consumer>();
    public DbSet<EventLand.Modules.PayPro.Entities.PayProCallbackLog> PayProCallbackLogs => Set<EventLand.Modules.PayPro.Entities.PayProCallbackLog>();

    // ── Model Configuration ──────────────────────────────────────────────────
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Automatically picks up all IEntityTypeConfiguration<T> classes in this assembly and PayPro module
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(EventLand.Modules.PayPro.Entities.Order).Assembly);

        // Apply global soft-delete query filter for all BaseEntity models
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = System.Linq.Expressions.Expression.Parameter(entityType.ClrType, "e");
                var property = System.Linq.Expressions.Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
                var falseConstant = System.Linq.Expressions.Expression.Constant(false);
                var comparison = System.Linq.Expressions.Expression.Equal(property, falseConstant);
                var lambda = System.Linq.Expressions.Expression.Lambda(comparison, parameter);

                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(lambda);
            }

            var idProperty = entityType.FindProperty("Id");
            if (idProperty != null && idProperty.ClrType == typeof(int))
            {
                idProperty.SetIdentitySeed(1000);
                idProperty.SetIdentityIncrement(1);
            }
        }

        // Seed default model data directly into EF migrations
        modelBuilder.SeedDefaultData();
    }

    // ── Auto-Audit on SaveChanges ────────────────────────────────────────────
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is IAuditableEntity auditable)
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        auditable.CreatedAt = now;
                        auditable.UpdatedAt = now;
                        break;

                    case EntityState.Modified:
                        entry.Property(nameof(IAuditableEntity.CreatedAt)).IsModified = false;
                        auditable.UpdatedAt = now;
                        break;

                    case EntityState.Deleted:
                        entry.State = EntityState.Modified;
                        auditable.IsDeleted = true;
                        auditable.DeletedAt = now;
                        auditable.UpdatedAt = now;
                        break;
                }
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
