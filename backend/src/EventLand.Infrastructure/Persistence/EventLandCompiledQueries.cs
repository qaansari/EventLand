namespace EventLand.Infrastructure.Persistence;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Pre-compiled EF Core queries for high-throughput execution paths.
/// Bypasses LINQ-to-SQL expression tree parsing and compilation overhead on hot paths.
/// </summary>
public static class EventLandCompiledQueries
{
    /// <summary>
    /// Hot-path query: lookup booking by BookingRef.
    /// </summary>
    public static readonly Func<ApplicationDbContext, string, Task<Booking?>> GetBookingByRefAsync =
        EF.CompileAsyncQuery((ApplicationDbContext context, string bookingRef) =>
            context.Bookings
                .AsNoTracking()
                .Include(b => b.BookingSeats)
                .Include(b => b.TicketTier)
                .FirstOrDefault(b => b.BookingRef == bookingRef));

    /// <summary>
    /// Hot-path query: lookup single seat by zone and coordinates.
    /// </summary>
    public static readonly Func<ApplicationDbContext, int, int, int, Task<Seat?>> GetSeatByCoordinatesAsync =
        EF.CompileAsyncQuery((ApplicationDbContext context, int zoneId, int row, int col) =>
            context.Seats
                .FirstOrDefault(s => s.ZoneId == zoneId && s.Row == row && s.Col == col));

    /// <summary>
    /// Hot-path query: lookup active bank account by Id.
    /// </summary>
    public static readonly Func<ApplicationDbContext, int, Task<BankAccount?>> GetActiveBankAccountByIdAsync =
        EF.CompileAsyncQuery((ApplicationDbContext context, int id) =>
            context.BankAccounts
                .AsNoTracking()
                .FirstOrDefault(b => b.Id == id && b.IsActive));

    /// <summary>
    /// Hot-path query: lookup event by Id with no-tracking.
    /// </summary>
    public static readonly Func<ApplicationDbContext, int, Task<Event?>> GetEventByIdAsync =
        EF.CompileAsyncQuery((ApplicationDbContext context, int id) =>
            context.Events
                .AsNoTracking()
                .FirstOrDefault(e => e.Id == id && !e.IsDeleted));
}
