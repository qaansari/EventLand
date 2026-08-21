namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class SeatingZoneConfiguration : IEntityTypeConfiguration<SeatingZone>
{
    public void Configure(EntityTypeBuilder<SeatingZone> builder)
    {
        builder.HasKey(z => z.Id);
        builder.Property(z => z.Id).ValueGeneratedOnAdd();

        builder.Property(z => z.Zone)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(z => z.Rows)
               .IsRequired();

        builder.Property(z => z.Cols)
               .IsRequired();

        builder.Property(z => z.Price)
               .HasPrecision(18, 2);

        builder.Property(z => z.TotalCapacity)
               .IsRequired();

        builder.Property(z => z.SortOrder)
               .IsRequired();

        builder.HasMany(z => z.Seats)
               .WithOne(s => s.Zone)
               .HasForeignKey(s => s.ZoneId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(z => new { z.EventId, z.SortOrder })
               .HasDatabaseName("IX_SeatingZones_EventId_SortOrder");

        builder.HasQueryFilter(z => !z.IsDeleted);
    }
}
