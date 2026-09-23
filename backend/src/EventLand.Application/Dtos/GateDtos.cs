namespace EventLand.Application.Dtos;

public record ValidateGateTicketRequestDto(
    string TicketCode,
    int? EventId = null,
    int? EventShowId = null,
    bool CheckIn = true,
    string? GateName = null
);

public record TicketValidationResultDto(
    bool IsValid,
    string Status,
    string Message,
    int? BookingId = null,
    string? BookingRef = null,
    string? CustomerName = null,
    string? CustomerEmail = null,
    string? CustomerPhone = null,
    int? EventId = null,
    string? EventTitle = null,
    string? TicketTierName = null,
    int Quantity = 0,
    List<string>? SeatLabels = null,
    DateTimeOffset? CheckedInAt = null,
    string? CheckedInBy = null,
    string? GateName = null,
    DateTimeOffset ValidatedAt = default
);

public record RecentGateScanDto(
    int BookingId,
    string BookingRef,
    string CustomerName,
    string TierName,
    string SeatSummary,
    string Status,
    DateTimeOffset CheckedInAt,
    string? CheckedInBy,
    string? GateName
);

public record GateStatsDto(
    int EventId,
    string EventTitle,
    int TotalTicketsSold,
    int TotalCheckedIn,
    int TotalRemaining,
    double AttendancePercentage,
    List<RecentGateScanDto> RecentScans
);

public record ResetGateCheckInRequestDto(
    string TicketCode,
    string? Reason = null
);
