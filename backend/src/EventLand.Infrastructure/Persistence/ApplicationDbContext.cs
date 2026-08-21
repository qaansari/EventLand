namespace EventLand.Infrastructure.Persistence;

using System.Reflection;
using EventLand.Application.Common.Interfaces;
using EventLand.Domain.Common;
using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    // ── DbSets ──────────────────────────────────────────────────────────────
    public DbSet<User>        Users        => Set<User>();
    public DbSet<Role>        Roles        => Set<Role>();
    public DbSet<Event>       Events       => Set<Event>();
    public DbSet<Organizer>   Organizers   => Set<Organizer>();
    public DbSet<TicketTier>  TicketTiers  => Set<TicketTier>();
    public DbSet<SeatingZone> SeatingZones => Set<SeatingZone>();
    public DbSet<Seat>        Seats        => Set<Seat>();
    public DbSet<Booking>     Bookings     => Set<Booking>();
    public DbSet<BookingSeat> BookingSeats => Set<BookingSeat>();
    public DbSet<Artist>      Artists      => Set<Artist>();
    public DbSet<Tag>         Tags         => Set<Tag>();
    public DbSet<EventTag>    EventTags    => Set<EventTag>();

    // ── Model Configuration ──────────────────────────────────────────────────
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Automatically picks up all IEntityTypeConfiguration<T> classes in this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        // Configure all integer primary keys to start at 1000 for clean 4-digit numeric ID scheme
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var idProperty = entityType.FindProperty("Id");
            if (idProperty != null && idProperty.ClrType == typeof(int))
            {
                idProperty.SetIdentitySeed(1000);
                idProperty.SetIdentityIncrement(1);
            }
        }
    }

    // ── Auto-Audit on SaveChanges ────────────────────────────────────────────
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is BaseEntity baseEntity)
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        baseEntity.CreatedAt = now;
                        baseEntity.UpdatedAt = now;
                        break;

                    case EntityState.Modified:
                        entry.Property(nameof(BaseEntity.CreatedAt)).IsModified = false;
                        baseEntity.UpdatedAt = now;
                        break;

                    case EntityState.Deleted:
                        entry.State = EntityState.Modified;
                        baseEntity.IsDeleted = true;
                        baseEntity.DeletedAt = now;
                        baseEntity.UpdatedAt = now;
                        break;
                }
            }
            else if (entry.Entity.GetType().BaseType?.IsGenericType == true &&
                     entry.Entity.GetType().BaseType?.GetGenericTypeDefinition() == typeof(BaseEntity<>))
            {
                var entity = entry.Entity;
                var createdProp = entity.GetType().GetProperty("CreatedAt");
                var updatedProp = entity.GetType().GetProperty("UpdatedAt");
                var isDeletedProp = entity.GetType().GetProperty("IsDeleted");
                var deletedAtProp = entity.GetType().GetProperty("DeletedAt");

                switch (entry.State)
                {
                    case EntityState.Added:
                        createdProp?.SetValue(entity, now);
                        updatedProp?.SetValue(entity, now);
                        break;

                    case EntityState.Modified:
                        if (createdProp != null) entry.Property("CreatedAt").IsModified = false;
                        updatedProp?.SetValue(entity, now);
                        break;

                    case EntityState.Deleted:
                        entry.State = EntityState.Modified;
                        isDeletedProp?.SetValue(entity, true);
                        deletedAtProp?.SetValue(entity, now);
                        updatedProp?.SetValue(entity, now);
                        break;
                }
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
