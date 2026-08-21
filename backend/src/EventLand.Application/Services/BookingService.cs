namespace EventLand.Application.Services;

using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using Microsoft.EntityFrameworkCore;

public class BookingService : IBookingService
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public BookingService(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task<BookingDto> CreateBookingAsync(CreateBookingDto dto)
    {
        var ev = await _context.Events
            .FirstOrDefaultAsync(e => e.Id == dto.EventId && !e.IsDeleted);

        if (ev is null)
            throw new KeyNotFoundException($"Event with ID '{dto.EventId}' not found.");

        var tier = await _context.TicketTiers
            .FirstOrDefaultAsync(t => t.Id == dto.TicketTierId && t.EventId == dto.EventId && !t.IsDeleted);

        if (tier is null)
            throw new KeyNotFoundException($"Ticket tier '{dto.TicketTierId}' not found for event '{dto.EventId}'.");

        if (tier.AvailableQuantity - tier.SoldCount < dto.Quantity)
            throw new InvalidOperationException($"Not enough tickets available in tier '{tier.Name}'.");

        var bookingRef = $"EVL-{Random.Shared.Next(100000, 999999)}";

        Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var paymentMethod);

        var booking = new Booking
        {
            EventId = dto.EventId,
            TicketTierId = dto.TicketTierId,
            BookingRef = bookingRef,
            CustomerName = dto.CustomerName,
            CustomerEmail = dto.CustomerEmail,
            CustomerPhone = dto.CustomerPhone,
            Quantity = dto.Quantity,
            UnitPrice = tier.Price,
            TotalAmount = tier.Price * dto.Quantity,
            Status = BookingStatus.Confirmed,
            PaymentStatus = PaymentStatus.Paid,
            PaymentMethod = paymentMethod == PaymentMethod.None ? PaymentMethod.CreditCard : paymentMethod,
            PaidAt = DateTimeOffset.UtcNow
        };

        tier.SoldCount += dto.Quantity;
        _context.Bookings.Add(booking);

        if (dto.SelectedSeatIds is not null && dto.SelectedSeatIds.Any())
        {
            var seats = await _context.Seats
                .Where(s => dto.SelectedSeatIds.Contains(s.Id) && !s.IsDeleted)
                .ToListAsync();

            foreach (var seat in seats)
            {
                seat.Status = SeatStatus.Booked;
                _context.BookingSeats.Add(new BookingSeat
                {
                    Booking = booking,
                    Seat = seat
                });
            }

            await _cacheService.ReleaseSeatsAsync(dto.EventId, dto.SelectedSeatIds);
        }

        await _context.SaveChangesAsync();

        return await GetBookingByIdAsync(booking.Id)
            ?? throw new InvalidOperationException("Failed to load created booking.");
    }

    public async Task<BookingDto?> GetBookingByIdAsync(int id)
    {
        var b = await _context.Bookings
            .AsNoTracking()
            .Include(x => x.Event)
            .Include(x => x.TicketTier)
            .Include(x => x.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (b is null) return null;

        return MapToDto(b);
    }

    public async Task<BookingDto?> GetBookingByRefAsync(string bookingRef)
    {
        var b = await _context.Bookings
            .AsNoTracking()
            .Include(x => x.Event)
            .Include(x => x.TicketTier)
            .Include(x => x.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(x => x.BookingRef == bookingRef && !x.IsDeleted);

        if (b is null) return null;

        return MapToDto(b);
    }

    public async Task<PagedResult<BookingDto>> GetBookingsByEmailAsync(string email, int pageNumber = 1, int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Bookings
            .AsNoTracking()
            .Include(x => x.Event)
            .Include(x => x.TicketTier)
            .Include(x => x.BookingSeats).ThenInclude(bs => bs.Seat)
            .Where(b => b.CustomerEmail == email && !b.IsDeleted);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<BookingDto>(items.Select(MapToDto).ToList(), totalCount, pageNumber, pageSize);
    }

    private static BookingDto MapToDto(Booking b)
    {
        return new BookingDto(
            b.Id,
            b.EventId,
            b.Event.Title,
            b.TicketTierId,
            b.TicketTier.Name,
            b.BookingRef,
            b.CustomerName,
            b.CustomerEmail,
            b.CustomerPhone,
            b.Quantity,
            b.UnitPrice,
            b.TotalAmount,
            b.Status.ToString(),
            b.PaymentStatus.ToString(),
            b.PaymentMethod.ToString(),
            b.PaidAt,
            b.CreatedAt,
            b.BookingSeats.Select(bs => new SeatDto(
                bs.Seat.Id,
                bs.Seat.ZoneId,
                bs.Seat.Row,
                bs.Seat.Col,
                bs.Seat.Label,
                bs.Seat.Status.ToString()
            )).ToList()
        );
    }
}
