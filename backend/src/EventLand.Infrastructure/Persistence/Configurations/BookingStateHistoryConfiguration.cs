namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class BookingStateHistoryConfiguration : IEntityTypeConfiguration<BookingStateHistory>
{
    public void Configure(EntityTypeBuilder<BookingStateHistory> builder)
    {
        builder.HasKey(h => h.Id);
        builder.Property(h => h.Id).ValueGeneratedOnAdd();

        builder.Property(h => h.FromState)
               .HasConversion<int>()
               .IsRequired();

        builder.Property(h => h.ToState)
               .HasConversion<int>()
               .IsRequired();

        builder.Property(h => h.Trigger)
               .HasMaxLength(100)
               .IsRequired();

        builder.Property(h => h.ChangedBy)
               .HasMaxLength(150);

        builder.Property(h => h.Reason)
               .HasMaxLength(500);

        builder.Property(h => h.MetadataJson)
               .HasColumnType("nvarchar(max)");

        builder.HasIndex(h => h.BookingId)
               .HasDatabaseName("IX_BookingStateHistories_BookingId");

        builder.HasIndex(h => new { h.BookingId, h.CreatedAt })
               .HasDatabaseName("IX_BookingStateHistories_BookingId_CreatedAt");
    }
}
