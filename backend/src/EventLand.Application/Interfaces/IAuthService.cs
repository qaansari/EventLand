namespace EventLand.Application.Interfaces;

using EventLand.Application.Dtos;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto dto);
    Task<LoginResponseDto> RegisterAsync(RegisterRequestDto dto);
    Task<UserDto?> GetCurrentUserAsync(int userId);
    Task ChangePasswordAsync(int userId, ChangePasswordDto dto);
    Task<string> ForgotPasswordAsync(string email);
    Task ResetPasswordAsync(ResetPasswordRequestDto dto);
    Task<LoginResponseDto> GoogleAuthAsync(GoogleAuthRequestDto dto);
    Task<LoginResponseDto> FacebookAuthAsync(FacebookAuthRequestDto dto);
    Task EnsureSuperAdminCreatedAsync();
}

