namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class BankAccountConfiguration : IEntityTypeConfiguration<BankAccount>
{
    public void Configure(EntityTypeBuilder<BankAccount> builder)
    {
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).ValueGeneratedOnAdd();

        builder.Property(b => b.BankName)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(b => b.AccountTitle)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(b => b.AccountNumber)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(b => b.Iban)
               .HasMaxLength(50);

        builder.Property(b => b.BranchCode)
               .HasMaxLength(20);

        builder.Property(b => b.BranchName)
               .HasMaxLength(150);

        builder.Property(b => b.QrCodeImageUrl)
               .HasMaxLength(500);

        builder.Property(b => b.Instructions)
               .HasMaxLength(1000);

        builder.Property(b => b.IsActive)
               .HasDefaultValue(true);

        builder.Property(b => b.IsEnabled)
               .HasDefaultValue(true);

        builder.Property(b => b.DisplayOrder)
               .HasDefaultValue(1);

        builder.Property(b => b.MaintenanceNotice)
               .HasMaxLength(500);

        builder.Property(b => b.IsMaintenanceMode)
               .HasDefaultValue(false);

        builder.HasIndex(b => new { b.IsActive, b.IsEnabled, b.DisplayOrder })
               .HasFilter("[IsDeleted] = 0")
               .HasDatabaseName("IX_BankAccounts_Active_Enabled_DisplayOrder");
    }
}
