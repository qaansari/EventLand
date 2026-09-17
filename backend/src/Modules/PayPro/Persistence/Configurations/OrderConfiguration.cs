namespace EventLand.Modules.PayPro.Persistence.Configurations;

using EventLand.Modules.PayPro.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders");

        builder.HasKey(o => o.Id);

        builder.Property(o => o.OrderNumber)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(o => o.PayProId)
            .HasMaxLength(50);

        builder.Property(o => o.Amount)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(o => o.AmountPaid)
            .HasPrecision(18, 4);

        builder.Property(o => o.Status)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(o => o.PaymentMode)
            .HasMaxLength(50);

        builder.Property(o => o.IssueDate)
            .HasColumnType("date")
            .IsRequired();

        builder.Property(o => o.DueDate)
            .HasColumnType("date")
            .IsRequired();

        builder.Property(o => o.CreatedAtUtc)
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .IsRequired();

        builder.Property(o => o.UpdatedAtUtc)
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .IsRequired();

        builder.Property(o => o.DatePaid)
            .HasColumnType("datetime2");

        // Indexes
        builder.HasIndex(o => o.OrderNumber)
            .IsUnique()
            .HasDatabaseName("IX_Orders_OrderNumber");

        builder.HasIndex(o => o.PayProId)
            .HasDatabaseName("IX_Orders_PayProId");

        builder.HasIndex(o => new { o.Status, o.UpdatedAtUtc })
            .HasDatabaseName("IX_Orders_Status_UpdatedAtUtc");

        // Foreign Key to Consumer with Restrict delete behavior
        builder.HasOne(o => o.Consumer)
            .WithMany(c => c.Orders)
            .HasForeignKey(o => o.ConsumerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
