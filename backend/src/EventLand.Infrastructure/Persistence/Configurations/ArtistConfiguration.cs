namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class ArtistConfiguration : IEntityTypeConfiguration<Artist>
{
    public void Configure(EntityTypeBuilder<Artist> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedOnAdd();

        builder.Property(a => a.Name)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(a => a.Genre)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(a => a.Role)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(a => a.City)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(a => a.ImageUrl)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(a => a.Bio)
               .HasMaxLength(2000);

        builder.Property(a => a.Availability)
               .HasMaxLength(200);

        builder.Property(a => a.StartingRate)
               .HasPrecision(18, 2);

        builder.Property(a => a.Rating)
               .HasPrecision(3, 2);

        builder.HasIndex(a => a.IsFeatured)
               .HasDatabaseName("IX_Artists_IsFeatured");

        builder.HasQueryFilter(a => !a.IsDeleted);
    }
}
