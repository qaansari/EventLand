namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class SeatConfiguration : IEntityTypeConfiguration<Seat>
{
    public void Configure(EntityTypeBuilder<Seat> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedOnAdd();

        builder.Property(s => s.Row)
               .IsRequired();

        builder.Property(s => s.Col)
               .IsRequired();

        builder.Property(s => s.Label)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(s => s.Price)
               .HasPrecision(18, 2);

        builder.Property(s => s.Status)
               .HasConversion<int>();

        builder.HasIndex(s => new { s.ZoneId, s.Row, s.Col })
               .IsUnique()
               .HasDatabaseName("IX_Seats_Zone_Row_Col");

        builder.HasIndex(s => new { s.ZoneId, s.Status })
               .HasDatabaseName("IX_Seats_ZoneId_Status");

        builder.HasQueryFilter(s => !s.IsDeleted);
    }
}
