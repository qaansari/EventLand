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
    string? DialingCode = null,
    int? OrganizerId = null,
    string? OrganizerName = null
);

public record ChangePasswordDto(
    string OldPassword,
    string NewPassword
);

public record ForgotPasswordRequestDto(string Email);

public record ResetPasswordRequestDto(
    string Email,
    string ResetToken,
    string NewPassword
);

/// <summary>Sent by the frontend after Google Identity Services returns an ID Token (JWT).</summary>
public record GoogleAuthRequestDto(string IdToken);

/// <summary>Sent by the frontend after Facebook JS SDK returns a User Access Token.</summary>
public record FacebookAuthRequestDto(string AccessToken);
