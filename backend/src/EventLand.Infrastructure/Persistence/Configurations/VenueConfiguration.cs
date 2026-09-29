namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class VenueConfiguration : IEntityTypeConfiguration<Venue>
{
    public void Configure(EntityTypeBuilder<Venue> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).ValueGeneratedOnAdd();

        builder.Property(v => v.Name)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(v => v.Address)
               .HasMaxLength(500);

        builder.Property(v => v.Description)
               .HasMaxLength(1000);

        builder.Property(v => v.IsActive)
               .HasDefaultValue(true);

        builder.HasOne(v => v.City)
               .WithMany(c => c.Venues)
               .HasForeignKey(v => v.CityId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(v => v.CityId)
               .HasDatabaseName("IX_Venues_CityId");

        builder.HasIndex(v => new { v.CityId, v.Name })
               .HasFilter("[IsDeleted] = 0")
               .HasDatabaseName("IX_Venues_CityId_Name");
    }
}
