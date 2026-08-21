namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class BookingSeatConfiguration : IEntityTypeConfiguration<BookingSeat>
{
    public void Configure(EntityTypeBuilder<BookingSeat> builder)
    {
        builder.HasKey(bs => new { bs.BookingId, bs.SeatId });

        builder.HasOne(bs => bs.Booking)
               .WithMany(b => b.BookingSeats)
               .HasForeignKey(bs => bs.BookingId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(bs => bs.Seat)
               .WithMany(s => s.BookingSeats)
               .HasForeignKey(bs => bs.SeatId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
