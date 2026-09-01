namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).ValueGeneratedOnAdd();

        builder.Property(b => b.BookingRef)
               .IsRequired()
               .HasMaxLength(20);

        builder.HasIndex(b => b.BookingRef)
               .IsUnique()
               .HasDatabaseName("IX_Bookings_BookingRef");

        builder.Property(b => b.CustomerName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(b => b.CustomerEmail)
               .IsRequired()
               .HasMaxLength(320);

        builder.HasIndex(b => b.CustomerEmail)
               .HasDatabaseName("IX_Bookings_CustomerEmail");

        builder.Property(b => b.CustomerPhone)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(b => b.UnitPrice)
               .HasPrecision(18, 2);

        builder.Property(b => b.TotalAmount)
               .HasPrecision(18, 2);

        builder.Property(b => b.Status)
               .HasConversion<int>();

        builder.Property(b => b.PaymentStatus)
               .HasConversion<int>();

        builder.Property(b => b.PaymentMethod)
               .HasConversion<int>();

        builder.HasOne(b => b.Event)
               .WithMany(e => e.Bookings)
               .HasForeignKey(b => b.EventId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(b => b.TicketTier)
               .WithMany(t => t.Bookings)
               .HasForeignKey(b => b.TicketTierId)
               .OnDelete(DeleteBehavior.Restrict);

        // Optional owning user. SetNull keeps historical bookings if the user is removed.
        builder.HasOne(b => b.User)
               .WithMany()
               .HasForeignKey(b => b.UserId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(b => b.UserId)
               .HasDatabaseName("IX_Bookings_UserId");

        builder.HasMany(b => b.BookingSeats)
               .WithOne(bs => bs.Booking)
               .HasForeignKey(bs => bs.BookingId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(b => b.EventId)
               .HasDatabaseName("IX_Bookings_EventId");

        builder.HasIndex(b => new { b.EventId, b.Status })
               .HasDatabaseName("IX_Bookings_EventId_Status");

        // Composite index for PendingBookingExpiryService — queried every 60 seconds
        builder.HasIndex(b => new { b.PaymentStatus, b.PaymentExpiresAt })
               .HasDatabaseName("IX_Bookings_PaymentStatus_PaymentExpiresAt");

        // Note: Global soft-delete query filter (!IsDeleted) is applied in OnModelCreating.
        // Do NOT add a duplicate HasQueryFilter here — EF Core only supports one per entity.
    }
}
