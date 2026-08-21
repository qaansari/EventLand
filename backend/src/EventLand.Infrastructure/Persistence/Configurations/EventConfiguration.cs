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

        builder.Property(e => e.Category)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(e => e.City)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(e => e.Venue)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(e => e.Address)
               .HasMaxLength(500);

        builder.Property(e => e.PriceRange)
               .HasMaxLength(100);

        builder.Property(e => e.StartingPrice)
               .HasPrecision(18, 2);

        builder.Property(e => e.Banner)
               .HasMaxLength(500);

        builder.Property(e => e.ThumbnailUrl)
               .HasMaxLength(500);

        builder.Property(e => e.ScarcityText)
               .HasMaxLength(200);

        builder.Property(e => e.Status)
               .HasConversion<int>();

        builder.Property(e => e.TicketingType)
               .HasConversion<int>();

        // --- Relationships ---
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
        builder.HasIndex(e => e.Category)
               .HasDatabaseName("IX_Events_Category");

        builder.HasIndex(e => e.City)
               .HasDatabaseName("IX_Events_City");

        builder.HasIndex(e => e.Status)
               .HasDatabaseName("IX_Events_Status");

        builder.HasIndex(e => e.StartDateUtc)
               .HasDatabaseName("IX_Events_StartDateUtc");

        builder.HasIndex(e => e.IsFeatured)
               .HasDatabaseName("IX_Events_IsFeatured");

        builder.HasIndex(e => new { e.IsDeleted, e.IsPublished, e.StartDateUtc })
               .HasDatabaseName("IX_Events_Published_Date");

        // Soft delete global filter
        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}
