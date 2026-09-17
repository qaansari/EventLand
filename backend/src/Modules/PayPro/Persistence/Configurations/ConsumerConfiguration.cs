namespace EventLand.Modules.PayPro.Persistence.Configurations;

using EventLand.Modules.PayPro.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class ConsumerConfiguration : IEntityTypeConfiguration<Consumer>
{
    public void Configure(EntityTypeBuilder<Consumer> builder)
    {
        builder.ToTable("Consumers");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.ConsumerId)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(c => c.Mobile)
            .HasMaxLength(30);

        builder.Property(c => c.Email)
            .HasMaxLength(150);

        builder.Property(c => c.Address)
            .HasMaxLength(255);

        builder.Property(c => c.CreatedAtUtc)
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .IsRequired();

        builder.Property(c => c.UpdatedAtUtc)
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .IsRequired();

        // Unique index on PayPro ConsumerId
        builder.HasIndex(c => c.ConsumerId)
            .IsUnique()
            .HasDatabaseName("IX_Consumers_ConsumerId");
    }
}
