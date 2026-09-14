namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class PaymentTransactionConfiguration : IEntityTypeConfiguration<PaymentTransaction>
{
    public void Configure(EntityTypeBuilder<PaymentTransaction> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedOnAdd();

        builder.Property(t => t.Provider)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(t => t.ProviderTransactionId)
               .HasMaxLength(100);

        builder.Property(t => t.ProviderOrderId)
               .HasMaxLength(100);

        builder.Property(t => t.PaymentMethod)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(t => t.Amount)
               .HasPrecision(18, 2)
               .IsRequired();

        builder.Property(t => t.Currency)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(t => t.Status)
               .HasConversion<int>()
               .IsRequired();

        builder.Property(t => t.InternalReference)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(t => t.ProviderReference)
               .HasMaxLength(100);

        builder.Property(t => t.FailureReason)
               .HasMaxLength(500);

        builder.Property(t => t.RawProviderResponse)
               .HasMaxLength(4000);

        builder.Property(t => t.MetadataJson)
               .HasMaxLength(4000);

        builder.HasOne(t => t.Booking)
               .WithMany(b => b.PaymentTransactions)
               .HasForeignKey(t => t.BookingId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.BookingId)
               .HasDatabaseName("IX_PaymentTransactions_BookingId");

        builder.HasIndex(t => t.InternalReference)
               .IsUnique()
               .HasDatabaseName("IX_PaymentTransactions_InternalReference");

        builder.HasIndex(t => t.ProviderTransactionId)
               .HasDatabaseName("IX_PaymentTransactions_ProviderTransactionId");

        builder.HasIndex(t => t.ProviderOrderId)
               .HasDatabaseName("IX_PaymentTransactions_ProviderOrderId");

        builder.HasIndex(t => t.Status)
               .HasDatabaseName("IX_PaymentTransactions_Status");
    }
}
