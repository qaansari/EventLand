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
    // Bank Transfer Details
    string? BankTransactionRef = null,
    string? PaymentProofUrl = null,
    DateTimeOffset? VerifiedAt = null,
    DateTimeOffset? PaymentExpiresAt = null,
    string? EventBanner = null,
    string? EventVenue = null
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

public record SubmitBankPaymentProofDto(
    string BankTransactionRef,
    string? PaymentProofUrl = null
);

public record ConfirmBankPaymentDto(
    int? BookingId = null,
    string? BookingRef = null,
    string? Notes = null
);

public record RejectBankPaymentDto(
    int? BookingId = null,
    string? BookingRef = null,
    string? Reason = null
);
