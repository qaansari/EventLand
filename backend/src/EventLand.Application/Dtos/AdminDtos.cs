namespace EventLand.Application.Dtos;

public record CreateShowTicketTierInputDto(
    string Name,
    decimal Price,
    int AvailableQuantity = 100,
    string? Description = null
);

public record CreateEventShowInputDto(
    string ShowTitle,
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc,
    decimal? StartingPrice = null,
    List<CreateShowTicketTierInputDto>? TicketTiers = null
);

public record CreateAdminEventDto(
    string Title,
    string Category,
    string? Status,
    bool IsFeatured,
    bool IsPublished,
    string City,
    string Venue,
    string? Address,
    DateTimeOffset StartDateUtc,
    DateTimeOffset EndDateUtc,
    decimal StartingPrice,
    string TicketingType,
    string Banner,
    string Description,
    string? ScarcityText,
    int OrganizerId,
    List<int>? TagIds,
    List<CreateEventShowInputDto>? Shows = null,
    string? AuditoriumLayout = null
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
    DateTimeOffset StartDateUtc,
    DateTimeOffset EndDateUtc,
    decimal StartingPrice,
    string TicketingType,
    string Banner,
    string Description,
    string? ScarcityText,
    int OrganizerId,
    List<int>? TagIds,
    List<CreateEventShowInputDto>? Shows = null,
    string? AuditoriumLayout = null
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

public record CreateEventShowDto(
    int EventId,
    string ShowTitle,
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc
);

public record UpdateEventShowDto(
    string ShowTitle,
    DateTimeOffset StartTimeUtc,
    DateTimeOffset EndTimeUtc
);

public record CreateTicketTierDto(
    int EventId,
    int? EventShowId,
    string Name,
    string Description,
    decimal Price,
    int AvailableQuantity,
    int MaxPerOrder,
    int SortOrder
);

public record UpdateTicketTierDto(
    int? EventShowId,
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
    int SortOrder,
    string? LayoutJson = null
);

public record UpdateSeatingZoneDto(
    string Zone,
    decimal Price,
    int SortOrder,
    string? LayoutJson = null
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
