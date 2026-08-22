namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class EventShowConfiguration : IEntityTypeConfiguration<EventShow>
{
    public void Configure(EntityTypeBuilder<EventShow> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedOnAdd();

        builder.Property(s => s.ShowTitle)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(s => s.StartTimeUtc)
               .IsRequired();

        builder.Property(s => s.EndTimeUtc)
               .IsRequired();

        builder.HasOne(s => s.Event)
               .WithMany(e => e.Shows)
               .HasForeignKey(s => s.EventId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.TicketTiers)
               .WithOne(t => t.EventShow)
               .HasForeignKey(t => t.EventShowId)
               .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(s => new { s.EventId, s.StartTimeUtc })
               .HasDatabaseName("IX_EventShows_EventId_StartTimeUtc");

        builder.HasQueryFilter(s => !s.IsDeleted);
    }
}
