namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class RefundRecordConfiguration : IEntityTypeConfiguration<RefundRecord>
{
    public void Configure(EntityTypeBuilder<RefundRecord> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedOnAdd();

        builder.Property(r => r.Amount)
               .HasPrecision(18, 2);

        builder.Property(r => r.Reason)
               .HasMaxLength(500);

        builder.Property(r => r.Status)
               .HasMaxLength(50);

        builder.Property(r => r.ProcessedByEmail)
               .HasMaxLength(320);

        builder.HasOne(r => r.Booking)
               .WithMany()
               .HasForeignKey(r => r.BookingId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.BookingId)
               .HasDatabaseName("IX_RefundRecords_BookingId");
    }
}
