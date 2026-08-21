namespace EventLand.Application.Common.Interfaces;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;

public interface IApplicationDbContext
{
    DbSet<User>        Users        { get; }
    DbSet<Role>        Roles        { get; }
    DbSet<Event>       Events       { get; }
    DbSet<Organizer>   Organizers   { get; }
    DbSet<TicketTier>  TicketTiers  { get; }
    DbSet<SeatingZone> SeatingZones { get; }
    DbSet<Seat>        Seats        { get; }
    DbSet<Booking>     Bookings     { get; }
    DbSet<BookingSeat> BookingSeats { get; }
    DbSet<Artist>      Artists      { get; }
    DbSet<Tag>         Tags         { get; }
    DbSet<EventTag>    EventTags    { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
