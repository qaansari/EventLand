namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
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
               .HasConversion<string>()
               .HasMaxLength(50)
               .IsRequired();

        builder.Property(r => r.ProviderRefundRef)
               .HasMaxLength(100);

        builder.Property(r => r.ProcessedByEmail)
               .HasMaxLength(320);

        builder.HasOne(r => r.Booking)
               .WithMany()
               .HasForeignKey(r => r.BookingId)
               .OnDelete(DeleteBehavior.Cascade);

        // Filtered unique index: at most one active refund (Requested, Approved, Processed) per booking
        builder.HasIndex(r => r.BookingId)
               .IsUnique()
               .HasFilter("Status IN ('Requested', 'Approved', 'Processed')")
               .HasDatabaseName("IX_RefundRecords_BookingId_Active");

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_RefundRecords_Status",
            "Status IN ('Requested', 'Approved', 'Processed', 'Rejected', 'Failed')"));
    }
}
