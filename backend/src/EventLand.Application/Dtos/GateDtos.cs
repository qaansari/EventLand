namespace EventLand.Application.Dtos;

using EventLand.Domain.Enums;

public record ValidateGateTicketRequestDto(
    string TicketCode,
    int? EventId = null,
    int? EventShowId = null,
    bool CheckIn = true,
    string? GateName = null,
    string? DeviceId = null,
    long? SequenceNumber = null
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
    DateTimeOffset ValidatedAt = default,
    TicketScanState TicketState = TicketScanState.Issued,
    string? DeviceId = null
);

public record OfflineGateScanItemDto(
    string BookingRef,
    DateTimeOffset ScannedAt,
    string DeviceId,
    string Signature,
    long SequenceNumber,
    int? EventId = null,
    int? EventShowId = null,
    int? SeatId = null,
    string? GateName = null
);

public record OfflineGateSyncBatchRequestDto(
    string DeviceId,
    List<OfflineGateScanItemDto> Scans
);

public record OfflineGateSyncItemResultDto(
    string BookingRef,
    string Status, // "APPROVED", "ALREADY_CHECKED_IN", "SECURITY_ALERT_DUPLICATE_ENTRY", "INVALID_SIGNATURE", "TICKET_REVOKED", "NOT_FOUND"
    string Message,
    DateTimeOffset? AdmittedAt
);

public record OfflineGateSyncBatchResponseDto(
    int TotalProcessed,
    int TotalAdmitted,
    int TotalRejected,
    int TotalDuplicateSecurityAlerts,
    List<OfflineGateSyncItemResultDto> Results
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
