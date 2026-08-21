namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class OrganizerConfiguration : IEntityTypeConfiguration<Organizer>
{
    public void Configure(EntityTypeBuilder<Organizer> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Id).ValueGeneratedOnAdd();

        builder.Property(o => o.Name)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(o => o.Email)
               .IsRequired()
               .HasMaxLength(320);

        builder.HasIndex(o => o.Email)
               .IsUnique()
               .HasDatabaseName("IX_Organizers_Email");

        builder.Property(o => o.Phone)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(o => o.LogoUrl)
               .HasMaxLength(500);

        builder.Property(o => o.WebsiteUrl)
               .HasMaxLength(500);

        builder.HasQueryFilter(o => !o.IsDeleted);
    }
}
