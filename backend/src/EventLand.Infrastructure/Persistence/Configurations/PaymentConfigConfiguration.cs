namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class PaymentConfigConfiguration : IEntityTypeConfiguration<PaymentConfig>
{
    public void Configure(EntityTypeBuilder<PaymentConfig> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedOnAdd();

        builder.Property(c => c.Provider)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(c => c.PaymentMethod)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(c => c.DisplayName)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(c => c.PercentageFee)
               .HasPrecision(5, 2)
               .IsRequired();

        builder.Property(c => c.FixedFee)
               .HasPrecision(18, 2)
               .IsRequired();

        builder.Property(c => c.Currency)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(c => c.IsActive)
               .IsRequired();

        builder.Property(c => c.SortOrder)
               .IsRequired();

        builder.Property(c => c.MetadataJson)
               .HasMaxLength(2000);

        builder.HasIndex(c => new { c.Provider, c.PaymentMethod })
               .IsUnique()
               .HasDatabaseName("IX_PaymentConfigs_Provider_PaymentMethod");

        builder.HasIndex(c => new { c.IsActive, c.SortOrder })
               .HasDatabaseName("IX_PaymentConfigs_IsActive_SortOrder");
    }
}
