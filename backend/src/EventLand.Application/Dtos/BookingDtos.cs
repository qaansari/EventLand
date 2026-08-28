namespace EventLand.Application.Dtos;

public record BookingSeatDto(
    int Id,
    string SeatLabel,
    int SeatRow,
    int SeatCol,
    decimal? Price
);

public record BookingDto(
    int Id,
    int EventId,
    string EventTitle,
    int TicketTierId,
    string TicketTierName,
    string BookingRef,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    int Quantity,
    decimal UnitPrice,
    decimal TotalAmount,
    string Status,
    string PaymentStatus,
    string PaymentMethod,
    DateTimeOffset? PaidAt,
    DateTimeOffset CreatedAt,
    List<BookingSeatDto> SelectedSeats,
    // PayPro invoice details so an unpaid booking can be resumed and paid later.
    string? PayProInvoiceId = null,
    string? PayProConnectUrl = null,
    DateTimeOffset? PaymentExpiresAt = null
);

public record CreateBookingDto(
    int EventId,
    int TicketTierId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    int Quantity,
    string PaymentMethod,
    List<int>? SelectedSeatIds,
    int? EventShowId = null
);
