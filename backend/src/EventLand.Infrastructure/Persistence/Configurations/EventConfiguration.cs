namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class EventConfiguration : IEntityTypeConfiguration<Event>
{
    public void Configure(EntityTypeBuilder<Event> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
               .ValueGeneratedOnAdd();

        builder.Property(e => e.Title)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(e => e.PriceRange)
               .HasMaxLength(100);

        builder.Property(e => e.StartingPrice)
               .HasPrecision(18, 2);

        builder.Property(e => e.Banner)
               .HasMaxLength(500);

        builder.Property(e => e.SeatChartUrl)
               .HasMaxLength(500);

        builder.Property(e => e.ScarcityText)
               .HasMaxLength(200);

        builder.Property(e => e.EventType)
               .IsRequired()
               .HasMaxLength(50)
               .HasDefaultValue("Event");

        builder.Property(e => e.AttractionsOrActivities)
               .IsRequired()
               .HasMaxLength(500)
               .HasDefaultValue("X");

        builder.Property(e => e.VenueEnvironment)
               .IsRequired()
               .HasMaxLength(30)
               .HasDefaultValue("Indoor");

        builder.Property(e => e.DressCode)
               .HasMaxLength(200);

        builder.Property(e => e.FoodDrinksAvailable)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(e => e.FoodDrinksIncluded)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(e => e.PetsAllowed)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(e => e.ParkingAvailable)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(e => e.ValetAvailable)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(e => e.SeatingArrangement)
               .IsRequired()
               .HasMaxLength(100)
               .HasDefaultValue("Seating");

        builder.Property(e => e.WheelchairAccessible)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(e => e.AudienceRestrictions)
               .IsRequired()
               .HasMaxLength(1000)
               .HasDefaultValue("[]");

        builder.Property(e => e.FoodDrinksRestrictions)
               .IsRequired()
               .HasMaxLength(1000)
               .HasDefaultValue("[]");

        builder.Property(e => e.SmokingRestrictions)
               .IsRequired()
               .HasMaxLength(1000)
               .HasDefaultValue("[]");

        builder.Property(e => e.TicketNameChangeAllowed)
               .IsRequired()
               .HasMaxLength(100)
               .HasDefaultValue("Yes");

        builder.Property(e => e.TicketNamePolicy)
               .IsRequired()
               .HasMaxLength(300)
               .HasDefaultValue("Only the person whose name is on the ticket can use the ticket");

        builder.Property(e => e.TicketDaysInterchangeable)
               .IsRequired()
               .HasMaxLength(100)
               .HasDefaultValue("No");

        builder.Property(e => e.Status)
               .HasConversion<int>();

        builder.Property(e => e.TicketingType)
               .HasConversion<int>();

        // --- Relationships ---
        builder.HasOne(e => e.Country)
               .WithMany(c => c.Events)
               .HasForeignKey(e => e.CountryId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.City)
               .WithMany(c => c.Events)
               .HasForeignKey(e => e.CityId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Venue)
               .WithMany(v => v.Events)
               .HasForeignKey(e => e.VenueId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Auditorium)
               .WithMany(a => a.Events)
               .HasForeignKey(e => e.AuditoriumId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.Organizer)
               .WithMany(o => o.Events)
               .HasForeignKey(e => e.OrganizerId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(e => e.TicketTiers)
               .WithOne(t => t.Event)
               .HasForeignKey(t => t.EventId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.SeatingZones)
               .WithOne(z => z.Event)
               .HasForeignKey(z => z.EventId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.Bookings)
               .WithOne(b => b.Event)
               .HasForeignKey(b => b.EventId)
               .OnDelete(DeleteBehavior.Restrict);

        // --- Indexes ---
        builder.HasIndex(e => e.CityId)
               .HasDatabaseName("IX_Events_CityId");

        builder.HasIndex(e => e.VenueId)
               .HasDatabaseName("IX_Events_VenueId");

        builder.HasIndex(e => e.Status)
               .HasDatabaseName("IX_Events_Status");

        builder.HasIndex(e => e.StartDateUtc)
               .HasDatabaseName("IX_Events_StartDateUtc");

        builder.HasIndex(e => e.IsFeatured)
               .HasDatabaseName("IX_Events_IsFeatured");

        builder.HasIndex(e => e.OrganizerId)
               .HasDatabaseName("IX_Events_OrganizerId");

        builder.HasIndex(e => e.EventType)
               .HasDatabaseName("IX_Events_EventType");

        builder.HasIndex(e => new { e.IsPublished, e.CityId, e.StartDateUtc })
               .HasDatabaseName("IX_Events_Published_City_Date");

        builder.HasIndex(e => new { e.IsDeleted, e.IsPublished, e.StartDateUtc })
               .HasDatabaseName("IX_Events_Published_Date");

        // Soft delete global filter
    }
}
