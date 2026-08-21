namespace EventLand.Application.Interfaces;

using EventLand.Application.Dtos;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto dto);
    Task<UserDto?> GetCurrentUserAsync(int userId);
    Task EnsureSuperAdminCreatedAsync();
}
