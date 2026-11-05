namespace EventLand.Infrastructure.Persistence.Configurations;

using System;
using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class PlatformFeeConfigConfiguration : IEntityTypeConfiguration<PlatformFeeConfig>
{
    public void Configure(EntityTypeBuilder<PlatformFeeConfig> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedOnAdd();

        builder.Property(c => c.Name)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(c => c.MinSubtotal)
               .HasPrecision(18, 2)
               .IsRequired();

        builder.Property(c => c.MaxSubtotal)
               .HasPrecision(18, 2);

        builder.Property(c => c.FeeAmount)
               .HasPrecision(18, 2)
               .IsRequired();

        builder.Property(c => c.IsActive)
               .IsRequired();

        builder.Property(c => c.SortOrder)
               .IsRequired();

        builder.Property(c => c.Description)
               .HasMaxLength(500);

        builder.HasIndex(c => new { c.IsActive, c.SortOrder })
               .HasDatabaseName("IX_PlatformFeeConfigs_IsActive_SortOrder");

        var seedDate = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

        builder.HasData(
            new PlatformFeeConfig
            {
                Id = 1,
                Name = "Standard Tier (Up to PKR 5,000)",
                MinSubtotal = 0m,
                MaxSubtotal = 5000m,
                FeeAmount = 49m,
                SortOrder = 1,
                IsActive = true,
                Description = "Base platform fee for ticket orders up to PKR 5,000",
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            },
            new PlatformFeeConfig
            {
                Id = 2,
                Name = "Medium Tier (PKR 5,001 - 10,000)",
                MinSubtotal = 5001m,
                MaxSubtotal = 10000m,
                FeeAmount = 99m,
                SortOrder = 2,
                IsActive = true,
                Description = "Mid-range platform fee for orders between PKR 5,001 and 10,000",
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            },
            new PlatformFeeConfig
            {
                Id = 3,
                Name = "High Tier (PKR 10,001 - 15,000)",
                MinSubtotal = 10001m,
                MaxSubtotal = 15000m,
                FeeAmount = 149m,
                SortOrder = 3,
                IsActive = true,
                Description = "High tier platform fee for orders between PKR 10,001 and 15,000",
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            },
            new PlatformFeeConfig
            {
                Id = 4,
                Name = "Premium Tier (Above PKR 15,000)",
                MinSubtotal = 15001m,
                MaxSubtotal = null,
                FeeAmount = 199m,
                SortOrder = 4,
                IsActive = true,
                Description = "Premium tier platform fee for VIP and large group orders above PKR 15,000",
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            }
        );
    }
}

