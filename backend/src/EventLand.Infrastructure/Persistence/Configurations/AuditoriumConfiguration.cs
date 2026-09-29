namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class AuditoriumConfiguration : IEntityTypeConfiguration<Auditorium>
{
    public void Configure(EntityTypeBuilder<Auditorium> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedOnAdd();

        builder.Property(a => a.Name)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(a => a.LayoutCode)
               .HasMaxLength(100);

        builder.Property(a => a.Description)
               .HasMaxLength(1000);

        builder.Property(a => a.LayoutJson)
               .HasColumnType("nvarchar(max)");

        builder.Property(a => a.IsActive)
               .HasDefaultValue(true);

        builder.HasOne(a => a.Venue)
               .WithMany(v => v.Auditoriums)
               .HasForeignKey(a => a.VenueId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(a => a.VenueId)
               .HasDatabaseName("IX_Auditoriums_VenueId");

        builder.HasIndex(a => new { a.VenueId, a.Name })
               .HasFilter("[IsDeleted] = 0")
               .HasDatabaseName("IX_Auditoriums_VenueId_Name");
    }
}
