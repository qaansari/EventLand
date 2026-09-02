namespace EventLand.Application.Dtos;

public record LoginRequestDto(string Email, string Password);

public record RegisterRequestDto(
    string FullName,
    string Email,
    string Password,
    string? PhoneNumber = null,
    int? CountryId = null
);

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
    DateTimeOffset? LastLoginAt,
    string? ImageUrl = null,
    string? PhoneNumber = null,
    int? CountryId = null,
    string? CountryName = null,
    string? DialingCode = null
);

public record ChangePasswordDto(
    string OldPassword,
    string NewPassword
);

