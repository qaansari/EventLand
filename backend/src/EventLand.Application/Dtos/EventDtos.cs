namespace EventLand.Application.Dtos;

public record EventSummaryDto(
    int Id,
    string Title,
    string Category,
    string Status,
    bool IsFeatured,
    string City,
    string Venue,
    DateTimeOffset StartDateUtc,
    DateTimeOffset EndDateUtc,
    string PriceRange,
    decimal StartingPrice,
    string TicketingType,
    string Banner,
    string? ScarcityText,
    string OrganizerName,
    List<TagDto> Tags
);

public record EventDetailDto(
    int Id,
    string Title,
    string Category,
    string Status,
    bool IsFeatured,
    string City,
    string Venue,
    string? Address,
    double? Latitude,
    double? Longitude,
    DateTimeOffset StartDateUtc,
    DateTimeOffset EndDateUtc,
    string PriceRange,
    decimal StartingPrice,
    string TicketingType,
    string Banner,
    string? ThumbnailUrl,
    string Description,
    string? ScarcityText,
    OrganizerDto Organizer,
    List<TicketTierDto> TicketTiers,
    List<SeatingZoneDto> SeatingZones,
    List<TagDto> Tags
);

public record TicketTierDto(
    int Id,
    int EventId,
    string Name,
    string Description,
    decimal Price,
    int AvailableQuantity,
    int SoldCount,
    int MaxPerOrder,
    int SortOrder
);

public record SeatingZoneDto(
    int Id,
    int EventId,
    string Zone,
    int Rows,
    int Cols,
    decimal Price,
    int TotalCapacity,
    int SortOrder,
    List<SeatDto> Seats
);

public record SeatDto(
    int Id,
    int ZoneId,
    int Row,
    int Col,
    string Label,
    string Status
);

public record TagDto(
    int Id,
    string Name,
    string Slug
);

public record OrganizerDto(
    int Id,
    string Name,
    string Email,
    string Phone,
    string? LogoUrl,
    bool IsVerified
);
