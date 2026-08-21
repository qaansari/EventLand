namespace EventLand.Application.Dtos;

public record CreateAdminEventDto(
    string Title,
    string Category,
    string City,
    string Venue,
    string? Address,
    double? Latitude,
    double? Longitude,
    DateTimeOffset StartDateUtc,
    DateTimeOffset EndDateUtc,
    decimal StartingPrice,
    string TicketingType,
    string Banner,
    string? ThumbnailUrl,
    string Description,
    string? ScarcityText,
    int OrganizerId,
    bool IsFeatured,
    List<int>? TagIds
);

public record UpdateAdminEventDto(
    string Title,
    string Category,
    string Status,
    bool IsFeatured,
    bool IsPublished,
    string City,
    string Venue,
    string? Address,
    double? Latitude,
    double? Longitude,
    DateTimeOffset StartDateUtc,
    DateTimeOffset EndDateUtc,
    decimal StartingPrice,
    string TicketingType,
    string Banner,
    string? ThumbnailUrl,
    string Description,
    string? ScarcityText,
    int OrganizerId,
    List<int>? TagIds
);

public record CreateOrganizerDto(
    string Name,
    string Email,
    string Phone,
    string? LogoUrl,
    string? WebsiteUrl,
    bool IsVerified
);

public record UpdateOrganizerDto(
    string Name,
    string Email,
    string Phone,
    string? LogoUrl,
    string? WebsiteUrl,
    bool IsVerified
);

public record CreateArtistDto(
    string Name,
    string Genre,
    string Role,
    string City,
    string ImageUrl,
    string Bio,
    string? Availability,
    decimal StartingRate,
    decimal Rating,
    int ShowsDone,
    bool IsFeatured
);

public record UpdateArtistDto(
    string Name,
    string Genre,
    string Role,
    string City,
    string ImageUrl,
    string Bio,
    string? Availability,
    decimal StartingRate,
    decimal Rating,
    int ShowsDone,
    bool IsFeatured
);

public record CreateTicketTierDto(
    int EventId,
    string Name,
    string Description,
    decimal Price,
    int AvailableQuantity,
    int MaxPerOrder,
    int SortOrder
);

public record UpdateTicketTierDto(
    string Name,
    string Description,
    decimal Price,
    int AvailableQuantity,
    int MaxPerOrder,
    int SortOrder
);

public record CreateSeatingZoneDto(
    int EventId,
    string Zone,
    int Rows,
    int Cols,
    decimal Price,
    int SortOrder
);

public record UpdateSeatingZoneDto(
    string Zone,
    decimal Price,
    int SortOrder
);

public record CreateTagDto(
    string Name,
    string Slug
);

public record UpdateTagDto(
    string Name,
    string Slug
);

public record UpdateBookingStatusDto(
    string Status,
    string PaymentStatus
);

public record CreateUserDto(
    string Email,
    string Password,
    string FullName,
    int RoleId,
    string? PhoneNumber
);

public record UpdateUserDto(
    string FullName,
    int RoleId,
    string? PhoneNumber,
    bool IsActive
);
