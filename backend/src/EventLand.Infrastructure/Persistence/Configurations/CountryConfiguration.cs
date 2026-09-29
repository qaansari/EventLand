namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class CountryConfiguration : IEntityTypeConfiguration<Country>
{
    public void Configure(EntityTypeBuilder<Country> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedOnAdd();

        builder.Property(c => c.Name)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(c => c.Code)
               .IsRequired()
               .HasMaxLength(10);

        builder.HasIndex(c => c.Code)
               .IsUnique()
               .HasFilter("[IsDeleted] = 0")
               .HasDatabaseName("IX_Countries_Code");

        builder.Property(c => c.DialingCode)
               .HasMaxLength(10);

        builder.Property(c => c.IsActive)
               .HasDefaultValue(true);
    }
}
