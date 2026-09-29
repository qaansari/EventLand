namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class CityConfiguration : IEntityTypeConfiguration<City>
{
    public void Configure(EntityTypeBuilder<City> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedOnAdd();

        builder.Property(c => c.Name)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(c => c.IsActive)
               .HasDefaultValue(true);

        builder.HasOne(c => c.Country)
               .WithMany(co => co.Cities)
               .HasForeignKey(c => c.CountryId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => c.CountryId)
               .HasDatabaseName("IX_Cities_CountryId");

        builder.HasIndex(c => new { c.CountryId, c.Name })
               .HasFilter("[IsDeleted] = 0")
               .HasDatabaseName("IX_Cities_CountryId_Name");
    }
}
