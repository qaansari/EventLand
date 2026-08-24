namespace EventLand.Application.Dtos;

public record EventSummaryDto(
    int Id,
    string Title,
    string Category,
    string Status,
    bool IsFeatured,
    string City,
    string Venue,
    string? Address,
    DateTimeOffset StartDateUtc,
    DateTimeOffset EndDateUtc,
    string PriceRange,
    decimal StartingPrice,
    string TicketingType,
    string Banner,
    string? ScarcityText,
    int OrganizerId,
    string OrganizerName,
    List<TagDto> Tags,
    List<EventShowDto>? Shows = null
);

public record EventShowDto(
    int Id,
    int EventId,
    string ShowTitle,
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    List<TicketTierDto> TicketTiers
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
    DateTimeOffset StartDateUtc,
    DateTimeOffset EndDateUtc,
    string PriceRange,
    decimal StartingPrice,
    string TicketingType,
    string Banner,
    string Description,
    string? ScarcityText,
    OrganizerDto Organizer,
    List<EventShowDto> Shows,
    List<TicketTierDto> TicketTiers,
    List<SeatingZoneDto> SeatingZones,
    List<TagDto> Tags
);

public record TicketTierDto(
    int Id,
    int EventId,
    int? EventShowId,
    string Name,
    string Description,
    decimal Price,
    int AvailableQuantity,
    int SoldCount,
    int MaxPerOrder,
    int SortOrder,
    string? RowRange = null
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
    string? LayoutJson,
    List<SeatDto> Seats
);

public record SeatDto(
    int Id,
    int ZoneId,
    int Row,
    int Col,
    string Label,
    string Status,
    decimal? Price = null
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
    string? WebsiteUrl,
    bool IsVerified
);
