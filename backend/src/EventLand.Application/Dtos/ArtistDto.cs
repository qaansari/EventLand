namespace EventLand.Application.Dtos;

public record ArtistDto(
    int     Id,
    string  Name,
    string  Genre,
    string  Role,
    string  City,
    string  ImageUrl,
    string  Bio,
    string? Availability,
    decimal StartingRate,
    decimal Rating,
    int     ShowsDone,
    bool    IsFeatured
);
