namespace EventLand.Application.Dtos;

public record LoginRequestDto(string Email, string Password);

public record RegisterRequestDto(
    string FullName,
    string Email,
    string Password,
    string? PhoneNumber = null
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
    string? ImageUrl = null
);

public record ChangePasswordDto(
    string OldPassword,
    string NewPassword
);

