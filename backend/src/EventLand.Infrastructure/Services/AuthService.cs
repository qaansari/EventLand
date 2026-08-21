namespace EventLand.Infrastructure.Services;

using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtTokenGenerator _tokenGenerator;

    public AuthService(
        IApplicationDbContext context,
        IPasswordHasher<User> passwordHasher,
        IJwtTokenGenerator tokenGenerator)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _tokenGenerator = tokenGenerator;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto dto)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == dto.Email && !u.IsDeleted);

        if (user is null || !user.IsActive)
            throw new UnauthorizedAccessException("Invalid email or password.");

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
        if (verificationResult == PasswordVerificationResult.Failed)
            throw new UnauthorizedAccessException("Invalid email or password.");

        // Update last login
        user.LastLoginAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        var (token, expiresAt) = _tokenGenerator.GenerateToken(user);
        var userDto = new UserDto(user.Id, user.Email, user.FullName, user.Role.Name, user.LastLoginAt);

        return new LoginResponseDto(token, userDto, expiresAt);
    }

    public async Task<UserDto?> GetCurrentUserAsync(int userId)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive && !u.IsDeleted);

        return user == null ? null : new UserDto(user.Id, user.Email, user.FullName, user.Role.Name, user.LastLoginAt);
    }

    public async Task EnsureSuperAdminCreatedAsync()
    {
        // 1. Seed Roles table if empty
        if (!await _context.Roles.AnyAsync())
        {
            _context.Roles.AddRange(
                new Role { Name = "SuperAdmin", Description = "Full system super admin privileges" },
                new Role { Name = "Admin", Description = "Event management and administrative privileges" },
                new Role { Name = "Organizer", Description = "Event organizer account" },
                new Role { Name = "Customer", Description = "Standard customer account" }
            );
            await _context.SaveChangesAsync();
        }

        var superAdminRole = await _context.Roles.FirstAsync(r => r.Name == "SuperAdmin");

        // 2. Seed Super Admin user if not exists
        var hasSuperAdmin = await _context.Users.AnyAsync(u => u.RoleId == superAdminRole.Id && !u.IsDeleted);
        if (hasSuperAdmin) return;

        var superAdmin = new User
        {
            Email = "admin@eventland.pk",
            FullName = "Super Admin",
            RoleId = superAdminRole.Id,
            IsActive = true
        };

        superAdmin.PasswordHash = _passwordHasher.HashPassword(superAdmin, "SuperAdmin123!");

        _context.Users.Add(superAdmin);
        await _context.SaveChangesAsync();
    }
}
