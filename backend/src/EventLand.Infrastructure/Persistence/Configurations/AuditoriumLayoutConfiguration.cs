namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class AuditoriumLayoutConfiguration : IEntityTypeConfiguration<AuditoriumLayout>
{
    public void Configure(EntityTypeBuilder<AuditoriumLayout> builder)
    {
        builder.HasKey(al => al.Id);
        builder.Property(al => al.Id).ValueGeneratedOnAdd();

        builder.Property(al => al.Name)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(al => al.Venue)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(al => al.City)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(al => al.LayoutCode)
               .IsRequired()
               .HasMaxLength(100);

        builder.HasIndex(al => al.LayoutCode)
               .IsUnique()
               .HasFilter("[IsDeleted] = 0")
               .HasDatabaseName("IX_AuditoriumLayouts_LayoutCode");

        builder.Property(al => al.Description)
               .HasMaxLength(1000);

        builder.Property(al => al.LayoutJson)
               .HasColumnType("nvarchar(max)");

        builder.Property(al => al.IsActive)
               .HasDefaultValue(true);
    }
}
