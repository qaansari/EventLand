namespace EventLand.Application.Dtos;

public record LoginRequestDto(string Email, string Password);

public record LoginResponseDto(
    string Token,
    UserDto User,
    DateTimeOffset ExpiresAt
);

public record UserDto(
    int Id,
    string Email,
    string FullName,
    string Role,
    DateTimeOffset? LastLoginAt
);
