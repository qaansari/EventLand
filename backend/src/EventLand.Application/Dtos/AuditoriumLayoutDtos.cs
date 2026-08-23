namespace EventLand.Application.Dtos;

public record AuditoriumLayoutDto(
    int Id,
    string Name,
    string Venue,
    string City,
    string LayoutCode,
    int TotalCapacity,
    string Description,
    string LayoutJson,
    bool IsActive
);

public record CreateAuditoriumLayoutDto(
    string Name,
    string Venue,
    string City,
    string? LayoutCode,
    int TotalCapacity,
    string Description,
    string LayoutJson,
    bool IsActive = true
);

public record UpdateAuditoriumLayoutDto(
    string Name,
    string Venue,
    string City,
    string? LayoutCode,
    int TotalCapacity,
    string Description,
    string LayoutJson,
    bool IsActive
);
