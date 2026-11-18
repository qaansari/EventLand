namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class OutboxMessageConfiguration : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.HasKey(m => m.Id);

        builder.Property(m => m.EventType)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(m => m.PayloadJson)
               .IsRequired();

        builder.Property(m => m.Error)
               .HasMaxLength(2000);

        builder.HasIndex(m => m.ProcessedAtUtc)
               .HasDatabaseName("IX_OutboxMessages_ProcessedAtUtc");

        builder.HasIndex(m => new { m.ProcessedAtUtc, m.CreatedAt })
               .HasDatabaseName("IX_OutboxMessages_Unprocessed_CreatedAt");
    }
}
