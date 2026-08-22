namespace EventLand.Application.Dtos;

public record HoldSeatsRequestDto(
    int EventId,
    List<int> SeatIds,
    string CustomerEmail,
    int? EventShowId = null
);

public record HoldSeatsResponseDto(
    bool Success,
    string Message,
    List<int> HeldSeatIds,
    DateTimeOffset? ExpiresAt
);
