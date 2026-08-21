namespace EventLand.Application.Dtos;

public record BookingDto(
    int             Id,
    int             EventId,
    string          EventTitle,
    int             TicketTierId,
    string          TicketTierName,
    string          BookingRef,
    string          CustomerName,
    string          CustomerEmail,
    string          CustomerPhone,
    int             Quantity,
    decimal         UnitPrice,
    decimal         TotalAmount,
    string          Status,
    string          PaymentStatus,
    string          PaymentMethod,
    DateTimeOffset? PaidAt,
    DateTimeOffset  CreatedAt,
    List<SeatDto>   SelectedSeats
);

public record CreateBookingDto(
    int             EventId,
    int             TicketTierId,
    string          CustomerName,
    string          CustomerEmail,
    string          CustomerPhone,
    int             Quantity,
    string          PaymentMethod,
    List<int>?      SelectedSeatIds
);
