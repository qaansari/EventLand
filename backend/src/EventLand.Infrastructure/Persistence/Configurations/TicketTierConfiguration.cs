namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class TicketTierConfiguration : IEntityTypeConfiguration<TicketTier>
{
    public void Configure(EntityTypeBuilder<TicketTier> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedOnAdd();

        builder.Property(t => t.Name)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(t => t.Description)
               .HasMaxLength(500);

        builder.Property(t => t.Price)
               .HasPrecision(18, 2);

        builder.Property(t => t.AvailableQuantity)
               .IsRequired();

        builder.Property(t => t.SoldCount)
               .IsRequired();

        builder.Property(t => t.MaxPerOrder)
               .IsRequired();

        builder.Property(t => t.SortOrder)
               .IsRequired();

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_TicketTiers_SoldCount",
            "SoldCount >= 0 AND SoldCount <= AvailableQuantity"));

        builder.HasIndex(t => new { t.EventId, t.SortOrder })
               .HasDatabaseName("IX_TicketTiers_EventId_SortOrder");

        builder.HasQueryFilter(t => !t.IsDeleted);
    }
}
