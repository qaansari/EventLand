namespace EventLand.Infrastructure.Services;

using EventLand.Application.Common;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtTokenGenerator _tokenGenerator;
    private readonly IConfiguration _configuration;
    private readonly int _passwordMinLength;
    private readonly bool _passwordRequireNonAlphanumeric;
    private readonly bool _passwordRequireDigit;
    private readonly bool _passwordRequireUppercase;
    private readonly bool _passwordRequireLowercase;

    public AuthService(
        IApplicationDbContext context,
        IPasswordHasher<User> passwordHasher,
        IJwtTokenGenerator tokenGenerator,
        IConfiguration configuration)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _tokenGenerator = tokenGenerator;
        _configuration = configuration;
        
        // Load security settings from configuration
        _passwordMinLength = configuration.GetValue<int>("Security:PasswordMinLength", 10);
        _passwordRequireNonAlphanumeric = configuration.GetValue<bool>("Security:PasswordRequireNonAlphanumeric", true);
        _passwordRequireDigit = configuration.GetValue<bool>("Security:PasswordRequireDigit", true);
        _passwordRequireUppercase = configuration.GetValue<bool>("Security:PasswordRequireUppercase", true);
        _passwordRequireLowercase = configuration.GetValue<bool>("Security:PasswordRequireLowercase", true);
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto dto)
    {
        // Emails are matched case-insensitively to stay consistent with RegisterAsync,
        // which checks duplicates with ToLower().
        var normalizedEmail = (dto.Email ?? string.Empty).Trim().ToLower();
        var user = await _context.Users
            .Include(u => u.Role)
            .Include(u => u.Country)
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
        var userDto = new UserDto(user.Id, user.Email, user.FullName, user.Role?.Name ?? "Customer", user.LastLoginAt, FileUrlHelper.FormatUserImageUrl(user.ImageUrl), user.PhoneNumber, user.CountryId, user.Country?.Name, user.Country?.DialingCode);

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
        
        // Enhanced password validation
        ValidatePassword(dto.Password);

        var normalizedEmail = email.ToLower();
        var emailExists = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail && !u.IsDeleted);
        if (emailExists)
            throw new InvalidOperationException("An account with this email address already exists.");

        var cleanPhone = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
        if (!string.IsNullOrWhiteSpace(cleanPhone))
        {
            var phoneExists = await _context.Users.AnyAsync(u => u.PhoneNumber == cleanPhone && !u.IsDeleted);
            if (phoneExists)
                throw new InvalidOperationException("An account with this phone number already exists.");
        }

        var customerRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Customer")
            ?? throw new InvalidOperationException("The Customer role is not configured on the server.");

        var user = new User
        {
            Email = email,
            FullName = fullName,
            PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim(),
            CountryId = dto.CountryId ?? 1,
            RoleId = customerRole.Id,
            Role = customerRole,
            IsActive = true,
            LastLoginAt = DateTimeOffset.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var country = await _context.Countries.FirstOrDefaultAsync(c => c.Id == user.CountryId);

        var (token, expiresAt) = _tokenGenerator.GenerateToken(user);
        var userDto = new UserDto(user.Id, user.Email, user.FullName, customerRole.Name, user.LastLoginAt, FileUrlHelper.FormatUserImageUrl(user.ImageUrl), user.PhoneNumber, user.CountryId, country?.Name, country?.DialingCode);

        return new LoginResponseDto(token, userDto, expiresAt);
    }

    private void ValidatePassword(string? password)
    {
        if (string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("Password is required.");
        
        if (password.Length < _passwordMinLength)
            throw new InvalidOperationException($"Password must be at least {_passwordMinLength} characters long.");

        if (_passwordRequireDigit && !password.Any(char.IsDigit))
            throw new InvalidOperationException("Password must contain at least one digit.");

        if (_passwordRequireUppercase && !password.Any(char.IsUpper))
            throw new InvalidOperationException("Password must contain at least one uppercase letter.");

        if (_passwordRequireLowercase && !password.Any(char.IsLower))
            throw new InvalidOperationException("Password must contain at least one lowercase letter.");

        if (_passwordRequireNonAlphanumeric && !password.Any(c => !char.IsLetterOrDigit(c)))
            throw new InvalidOperationException("Password must contain at least one special character.");
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
            .Include(u => u.Country)
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive && !u.IsDeleted);

        return user == null ? null : new UserDto(user.Id, user.Email, user.FullName, user.Role?.Name ?? "Customer", user.LastLoginAt, FileUrlHelper.FormatUserImageUrl(user.ImageUrl), user.PhoneNumber, user.CountryId, user.Country?.Name, user.Country?.DialingCode);
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordDto dto)
    {
        // Enhanced password validation for new password
        ValidatePassword(dto.NewPassword);

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (user is null || !user.IsActive)
            throw new KeyNotFoundException("User account not found.");

        // Require current / old password verification for self password update
        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.OldPassword);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            throw new InvalidOperationException("The current password you provided is incorrect.");
        }

        // Prevent reusing the same password
        if (_passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.NewPassword) == PasswordVerificationResult.Success)
            throw new InvalidOperationException("New password cannot be the same as your current password.");

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

        // 2. Seed Super Admin user if not exists or update phone number / countryId
        var superAdmin = await _context.Users.FirstOrDefaultAsync(u => u.RoleId == superAdminRole.Id && !u.IsDeleted);
        if (superAdmin == null)
        {
            superAdmin = new User
            {
                Email = "admin@eventland.pk",
                FullName = "Super Admin",
                PhoneNumber = "+92 331 2541767",
                CountryId = 1,
                RoleId = superAdminRole.Id,
                IsActive = true
            };
            var initialPassword = _configuration["Admin:InitialPassword"]
                ?? Environment.GetEnvironmentVariable("ADMIN_INITIAL_PASSWORD")
                ?? "SuperAdmin123!";
            superAdmin.PasswordHash = _passwordHasher.HashPassword(superAdmin, initialPassword);
            _context.Users.Add(superAdmin);
            await _context.SaveChangesAsync();
        }
        else if (superAdmin.PhoneNumber != "+92 331 2541767" || superAdmin.CountryId != 1)
        {
            superAdmin.PhoneNumber = "+92 331 2541767";
            superAdmin.CountryId = 1;
            await _context.SaveChangesAsync();
        }
    }
}
