namespace EventLand.Modules.PayPro.Persistence.Configurations;

using EventLand.Modules.PayPro.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class PayProCallbackLogConfiguration : IEntityTypeConfiguration<PayProCallbackLog>
{
    public void Configure(EntityTypeBuilder<PayProCallbackLog> builder)
    {
        builder.ToTable("PayProCallbackLogs");

        builder.HasKey(l => l.Id);

        builder.Property(l => l.ReceivedAtUtc)
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .IsRequired();

        builder.Property(l => l.RequestBody)
            .IsRequired();

        builder.Property(l => l.ResponseBody)
            .IsRequired();

        builder.Property(l => l.Success)
            .IsRequired();

        builder.HasIndex(l => l.ReceivedAtUtc)
            .HasDatabaseName("IX_PayProCallbackLogs_ReceivedAtUtc");
    }
}
