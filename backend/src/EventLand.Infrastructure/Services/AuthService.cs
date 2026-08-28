namespace EventLand.Infrastructure.Services;

using EventLand.Application.Common;
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
        // Emails are matched case-insensitively to stay consistent with RegisterAsync,
        // which checks duplicates with ToLower().
        var normalizedEmail = (dto.Email ?? string.Empty).Trim().ToLower();
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail && !u.IsDeleted);

        if (user is null || !user.IsActive)
            throw new UnauthorizedAccessException("Invalid email or password.");

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
        if (verificationResult == PasswordVerificationResult.Failed)
            throw new UnauthorizedAccessException("Invalid email or password.");

        // Update last login
        user.LastLoginAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        var (token, expiresAt) = _tokenGenerator.GenerateToken(user);
        var userDto = new UserDto(user.Id, user.Email, user.FullName, user.Role?.Name ?? "Customer", user.LastLoginAt, FileUrlHelper.FormatUserImageUrl(user.ImageUrl));

        return new LoginResponseDto(token, userDto, expiresAt);
    }

    public async Task<LoginResponseDto> RegisterAsync(RegisterRequestDto dto)
    {
        var email = dto.Email?.Trim() ?? string.Empty;
        var fullName = dto.FullName?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(fullName))
            throw new InvalidOperationException("Full name is required.");
        if (string.IsNullOrWhiteSpace(email) || !IsValidEmail(email))
            throw new InvalidOperationException("A valid email address is required.");
        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 8)
            throw new InvalidOperationException("Password must be at least 8 characters long.");

        var normalizedEmail = email.ToLower();
        var emailExists = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail && !u.IsDeleted);
        if (emailExists)
            throw new InvalidOperationException("An account with this email address already exists.");

        var customerRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Customer")
            ?? throw new InvalidOperationException("The Customer role is not configured on the server.");

        var user = new User
        {
            Email = email,
            FullName = fullName,
            PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim(),
            RoleId = customerRole.Id,
            Role = customerRole,
            IsActive = true,
            LastLoginAt = DateTimeOffset.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var (token, expiresAt) = _tokenGenerator.GenerateToken(user);
        var userDto = new UserDto(user.Id, user.Email, user.FullName, customerRole.Name, user.LastLoginAt, FileUrlHelper.FormatUserImageUrl(user.ImageUrl));

        return new LoginResponseDto(token, userDto, expiresAt);
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return string.Equals(addr.Address, email, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    public async Task<UserDto?> GetCurrentUserAsync(int userId)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive && !u.IsDeleted);

        return user == null ? null : new UserDto(user.Id, user.Email, user.FullName, user.Role?.Name ?? "Customer", user.LastLoginAt, FileUrlHelper.FormatUserImageUrl(user.ImageUrl));
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 8)
            throw new InvalidOperationException("New password must be at least 8 characters long.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (user is null || !user.IsActive)
            throw new KeyNotFoundException("User account not found.");

        // Require current / old password verification for self password update
        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.OldPassword);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            throw new InvalidOperationException("The current password you provided is incorrect.");
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
        await _context.SaveChangesAsync();
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
