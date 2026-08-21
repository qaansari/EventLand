namespace EventLand.Application.Dtos;

public record HoldSeatsRequestDto(
    int EventId,
    List<int> SeatIds,
    string CustomerEmail
);

public record HoldSeatsResponseDto(
    bool Success,
    string Message,
    List<int> HeldSeatIds,
    DateTimeOffset? ExpiresAt
);
