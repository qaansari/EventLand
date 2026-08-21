namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class EventTagConfiguration : IEntityTypeConfiguration<EventTag>
{
    public void Configure(EntityTypeBuilder<EventTag> builder)
    {
        builder.HasKey(et => new { et.EventId, et.TagId });

        builder.HasOne(et => et.Event)
               .WithMany(e => e.EventTags)
               .HasForeignKey(et => et.EventId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(et => et.Tag)
               .WithMany(t => t.EventTags)
               .HasForeignKey(et => et.TagId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
