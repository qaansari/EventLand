namespace EventLand.Application.Dtos;

public record CountryDto(
    int Id,
    string Name,
    string Code,
    bool IsActive,
    List<CityDto>? Cities = null
);

public record CityDto(
    int Id,
    int CountryId,
    string? CountryName,
    string Name,
    bool IsActive
);

public record VenueDto(
    int Id,
    int CityId,
    string? CityName,
    string Name,
    string Address,
    string Description,
    bool IsActive,
    List<AuditoriumDto>? Auditoriums = null
);

public record AuditoriumDto(
    int Id,
    int VenueId,
    string? VenueName,
    string Name,
    string LayoutCode,
    int TotalCapacity,
    string Description,
    string LayoutJson,
    bool IsActive
);

public record CreateCountryDto(string Name, string Code);
public record CreateCityDto(int CountryId, string Name);
public record CreateVenueDto(int CityId, string Name, string Address, string? Description);
public record CreateAuditoriumDto(int VenueId, string Name, string LayoutCode, int TotalCapacity, string? Description, string? LayoutJson);

public record UpdateCountryDto(string Name, string Code, bool IsActive);
public record UpdateCityDto(string Name, bool IsActive);
public record UpdateVenueDto(int CityId, string Name, string Address, string? Description, bool IsActive);
public record UpdateAuditoriumDto(int VenueId, string Name, string LayoutCode, int TotalCapacity, string? Description, string? LayoutJson, bool IsActive);
