namespace EventLand.Infrastructure.Services;

using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using EventLand.Application.Common;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtTokenGenerator _tokenGenerator;
    private readonly ICacheService _cacheService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;
    private readonly HttpClient _facebookHttpClient;
    private readonly int _passwordMinLength;
    private readonly bool _passwordRequireNonAlphanumeric;
    private readonly bool _passwordRequireDigit;
    private readonly bool _passwordRequireUppercase;
    private readonly bool _passwordRequireLowercase;
    private readonly int _maxLoginAttempts;
    private readonly int _lockoutDurationMinutes;
    private readonly string _googleClientId;
    private readonly string _facebookAppId;
    private readonly string _facebookAppSecret;

    public AuthService(
        IApplicationDbContext context,
        IPasswordHasher<User> passwordHasher,
        IJwtTokenGenerator tokenGenerator,
        ICacheService cacheService,
        IConfiguration configuration,
        ILogger<AuthService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _tokenGenerator = tokenGenerator;
        _cacheService = cacheService;
        _configuration = configuration;
        _logger = logger;
        _facebookHttpClient = httpClientFactory.CreateClient("FacebookGraph");

        // Load security settings from configuration
        _passwordMinLength = configuration.GetValue<int>("Security:PasswordMinLength", 10);
        _passwordRequireNonAlphanumeric = configuration.GetValue<bool>("Security:PasswordRequireNonAlphanumeric", true);
        _passwordRequireDigit = configuration.GetValue<bool>("Security:PasswordRequireDigit", true);
        _passwordRequireUppercase = configuration.GetValue<bool>("Security:PasswordRequireUppercase", true);
        _passwordRequireLowercase = configuration.GetValue<bool>("Security:PasswordRequireLowercase", true);
        _maxLoginAttempts = configuration.GetValue<int>("Security:MaxLoginAttempts", 5);
        _lockoutDurationMinutes = configuration.GetValue<int>("Security:LockoutDurationMinutes", 15);

        _googleClientId = configuration["Google:ClientId"] ?? string.Empty;
        _facebookAppId = configuration["Facebook:AppId"] ?? string.Empty;
        _facebookAppSecret = configuration["Facebook:AppSecret"] ?? string.Empty;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto dto)
    {
        // Emails are matched case-insensitively to stay consistent with RegisterAsync,
        // which checks duplicates with ToLower().
        var normalizedEmail = (dto.Email ?? string.Empty).Trim().ToLower();
        var user = await _context.Users
            .Include(u => u.Role)
            .Include(u => u.Country)
            .FirstOrDefaultAsync(u => EF.Functions.Like(u.Email, normalizedEmail) && !u.IsDeleted);

        if (user is null || !user.IsActive)
            throw new UnauthorizedAccessException("Invalid email or password.");

        // Check if account is currently locked out
        if (user.LockoutEndUtc.HasValue && user.LockoutEndUtc.Value > DateTimeOffset.UtcNow)
        {
            var remaining = user.LockoutEndUtc.Value - DateTimeOffset.UtcNow;
            var minutes = Math.Max(1, (int)Math.Ceiling(remaining.TotalMinutes));
            throw new UnauthorizedAccessException($"Account is temporarily locked due to multiple failed login attempts. Please try again in {minutes} minute(s).");
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            user.AccessFailedCount++;
            if (user.AccessFailedCount >= _maxLoginAttempts)
            {
                user.LockoutEndUtc = DateTimeOffset.UtcNow.AddMinutes(_lockoutDurationMinutes);
                user.AccessFailedCount = 0; // reset counter after triggering lockout
                await _context.SaveChangesAsync();
                throw new UnauthorizedAccessException($"Account is temporarily locked due to multiple failed login attempts. Please try again in {_lockoutDurationMinutes} minutes.");
            }

            await _context.SaveChangesAsync();
            var remainingAttempts = _maxLoginAttempts - user.AccessFailedCount;
            throw new UnauthorizedAccessException($"Invalid email or password. {remainingAttempts} attempt(s) remaining before temporary lockout.");
        }

        // On successful login, reset failed count & lockout timer
        user.AccessFailedCount = 0;
        user.LockoutEndUtc = null;
        user.LastLoginAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        int? organizerId = user.OrganizerId;
        string? organizerName = null;

        if (string.Equals(user.Role?.Name, "Organizer", StringComparison.OrdinalIgnoreCase))
        {
            Organizer? org = null;
            if (organizerId.HasValue && organizerId.Value > 0)
            {
                org = await _context.Organizers.FirstOrDefaultAsync(o => o.Id == organizerId.Value && !o.IsDeleted);
            }
            else
            {
                org = await _context.Organizers
                    .FirstOrDefaultAsync(o => !o.IsDeleted && (o.Email.ToLower() == normalizedEmail || o.Name.ToLower() == user.FullName.ToLower()));
                if (org == null)
                {
                    org = new Organizer
                    {
                        Name = user.FullName,
                        Email = user.Email,
                        Phone = user.PhoneNumber ?? "",
                        IsVerified = true
                    };
                    _context.Organizers.Add(org);
                    await _context.SaveChangesAsync();
                }
                organizerId = org.Id;
                user.OrganizerId = org.Id;
                await _context.SaveChangesAsync();
            }
            organizerName = org?.Name;
        }

        var (token, expiresAt) = _tokenGenerator.GenerateToken(user, organizerId);
        var userDto = new UserDto(user.Id, user.Email, user.FullName, user.Role?.Name ?? "Customer", user.LastLoginAt, FileUrlHelper.FormatUserImageUrl(user.ImageUrl), user.PhoneNumber, user.CountryId, user.Country?.Name, user.Country?.DialingCode, organizerId, organizerName);

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
        var emailExists = await _context.Users.AnyAsync(u => EF.Functions.Like(u.Email, normalizedEmail) && !u.IsDeleted);
        if (emailExists)
            throw new InvalidOperationException("An account with this email address already exists.");

        var cleanPhone = PhoneHelper.Normalize(dto.PhoneNumber);
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
            PhoneNumber = cleanPhone,
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
            .Include(u => u.Organizer)
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive && !u.IsDeleted);

        if (user == null) return null;

        int? organizerId = user.OrganizerId;
        string? organizerName = user.Organizer?.Name;

        if (!organizerId.HasValue && string.Equals(user.Role?.Name, "Organizer", StringComparison.OrdinalIgnoreCase))
        {
            var org = await _context.Organizers.AsNoTracking()
                .FirstOrDefaultAsync(o => !o.IsDeleted && (o.Email.ToLower() == user.Email.ToLower() || o.Name.ToLower() == user.FullName.ToLower()));
            organizerId = org?.Id;
            organizerName = org?.Name;
        }

        return new UserDto(user.Id, user.Email, user.FullName, user.Role?.Name ?? "Customer", user.LastLoginAt, FileUrlHelper.FormatUserImageUrl(user.ImageUrl), user.PhoneNumber, user.CountryId, user.Country?.Name, user.Country?.DialingCode, organizerId, organizerName);
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
                PhoneNumber = "+923312541767",
                CountryId = 1,
                RoleId = superAdminRole.Id,
                IsActive = true
            };
            var initialPassword = _configuration["Admin:InitialPassword"]
                ?? Environment.GetEnvironmentVariable("ADMIN_INITIAL_PASSWORD");

            if (string.IsNullOrWhiteSpace(initialPassword))
            {
                // Security: warn loudly when using the hardcoded fallback — never use in production
                _logger.LogCritical(
                    "SECURITY WARNING: Super Admin is being seeded with the default hardcoded password. " +
                    "Set 'Admin:InitialPassword' via user-secrets or the ADMIN_INITIAL_PASSWORD environment variable immediately.");
                initialPassword = "SuperAdmin123!";
            }

            superAdmin.PasswordHash = _passwordHasher.HashPassword(superAdmin, initialPassword);
            _context.Users.Add(superAdmin);
            await _context.SaveChangesAsync();
        }
        else if (superAdmin.PhoneNumber != "+923312541767" || superAdmin.CountryId != 1)
        {
            superAdmin.PhoneNumber = "+923312541767";
            superAdmin.CountryId = 1;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<string> ForgotPasswordAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new InvalidOperationException("Email address is required.");

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .FirstOrDefaultAsync(u => EF.Functions.Like(u.Email, normalizedEmail) && !u.IsDeleted);

        var tokenBytes = RandomNumberGenerator.GetBytes(32);
        var resetToken = Convert.ToHexString(tokenBytes);

        if (user != null && user.IsActive)
        {
            var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(resetToken)));
            await _cacheService.SetAsync($"auth:pwd-reset:{normalizedEmail}", tokenHash, TimeSpan.FromMinutes(15));
            _logger.LogInformation("Password reset token generated for user {Email}", normalizedEmail);
        }
        else
        {
            _logger.LogWarning("Password reset requested for non-existent or inactive user {Email}", normalizedEmail);
        }

        return resetToken;
    }

    public async Task ResetPasswordAsync(ResetPasswordRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.ResetToken) || string.IsNullOrWhiteSpace(dto.NewPassword))
            throw new InvalidOperationException("Email, reset token, and new password are required.");

        ValidatePassword(dto.NewPassword);

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var cachedHash = await _cacheService.GetAsync<string>($"auth:pwd-reset:{normalizedEmail}");

        if (string.IsNullOrWhiteSpace(cachedHash))
            throw new InvalidOperationException("Invalid or expired password reset token.");

        var incomingHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(dto.ResetToken.Trim())));

        if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(cachedHash), Encoding.UTF8.GetBytes(incomingHash)))
            throw new InvalidOperationException("Invalid or expired password reset token.");

        var user = await _context.Users
            .FirstOrDefaultAsync(u => EF.Functions.Like(u.Email, normalizedEmail) && !u.IsDeleted);

        if (user == null || !user.IsActive)
            throw new InvalidOperationException("User account not found or is inactive.");

        user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
        user.AccessFailedCount = 0;
        user.LockoutEndUtc = null;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();
        await _cacheService.RemoveAsync($"auth:pwd-reset:{normalizedEmail}");

        _logger.LogInformation("Password successfully reset for user {Email}", normalizedEmail);
    }

    // ── Google OAuth ────────────────────────────────────────────────────────────

    public async Task<LoginResponseDto> GoogleAuthAsync(GoogleAuthRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.IdToken))
            throw new UnauthorizedAccessException("Google ID token is required.");

        if (string.IsNullOrWhiteSpace(_googleClientId))
            throw new InvalidOperationException("Google authentication is not configured on this server.");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(dto.IdToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _googleClientId }
            });
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning("Google ID token validation failed: {Message}", ex.Message);
            throw new UnauthorizedAccessException("Invalid or expired Google token. Please sign in again.");
        }

        if (!payload.EmailVerified)
            throw new UnauthorizedAccessException("Your Google account email address has not been verified.");

        return await FindOrCreateSocialUserAsync(
            googleId: payload.Subject,
            facebookId: null,
            email: payload.Email,
            fullName: payload.Name ?? payload.Email,
            imageUrl: payload.Picture,
            provider: "google");
    }

    // ── Facebook OAuth ──────────────────────────────────────────────────────────

    public async Task<LoginResponseDto> FacebookAuthAsync(FacebookAuthRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.AccessToken))
            throw new UnauthorizedAccessException("Facebook access token is required.");

        if (string.IsNullOrWhiteSpace(_facebookAppId) || string.IsNullOrWhiteSpace(_facebookAppSecret))
            throw new InvalidOperationException("Facebook authentication is not configured on this server.");

        // Step 1: Verify the user access token via Facebook's debug_token endpoint.
        // The app access token format is: {AppId}|{AppSecret}
        var appToken = Uri.EscapeDataString($"{_facebookAppId}|{_facebookAppSecret}");
        var inputToken = Uri.EscapeDataString(dto.AccessToken);
        var debugUrl = $"https://graph.facebook.com/debug_token?input_token={inputToken}&access_token={appToken}";

        FacebookDebugResponse? debug;
        try
        {
            debug = await _facebookHttpClient.GetFromJsonAsync<FacebookDebugResponse>(debugUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reach Facebook debug_token endpoint.");
            throw new UnauthorizedAccessException("Unable to verify Facebook token. Please try again.");
        }

        if (debug?.Data is not { IsValid: true })
            throw new UnauthorizedAccessException("Invalid or expired Facebook access token.");

        if (debug.Data.AppId != _facebookAppId)
            throw new UnauthorizedAccessException("Facebook token does not belong to this application.");

        // Step 2: Fetch user profile using the user's own access token.
        var profileUrl = $"https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token={inputToken}";
        FacebookProfileResponse? profile;
        try
        {
            profile = await _facebookHttpClient.GetFromJsonAsync<FacebookProfileResponse>(profileUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch Facebook user profile.");
            throw new UnauthorizedAccessException("Unable to retrieve Facebook profile. Please try again.");
        }

        if (profile is null || string.IsNullOrWhiteSpace(profile.Id))
            throw new UnauthorizedAccessException("Facebook profile could not be retrieved.");

        // Facebook email is optional — generate a deterministic placeholder if not granted.
        var email = !string.IsNullOrWhiteSpace(profile.Email)
            ? profile.Email
            : $"fb.{profile.Id}@facebook.noemail.eventland";

        return await FindOrCreateSocialUserAsync(
            googleId: null,
            facebookId: profile.Id,
            email: email,
            fullName: profile.Name ?? "Facebook User",
            imageUrl: profile.Picture?.Data?.Url,
            provider: "facebook");
    }

    // ── Shared social find-or-create helper ─────────────────────────────────────

    private async Task<LoginResponseDto> FindOrCreateSocialUserAsync(
        string? googleId,
        string? facebookId,
        string email,
        string fullName,
        string? imageUrl,
        string provider)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        // 1. Try to find by provider-specific ID first (most precise — survives email changes).
        User? user = null;
        if (!string.IsNullOrWhiteSpace(googleId))
            user = await _context.Users.Include(u => u.Role).Include(u => u.Country)
                .FirstOrDefaultAsync(u => u.GoogleId == googleId && !u.IsDeleted);

        if (user is null && !string.IsNullOrWhiteSpace(facebookId))
            user = await _context.Users.Include(u => u.Role).Include(u => u.Country)
                .FirstOrDefaultAsync(u => u.FacebookId == facebookId && !u.IsDeleted);

        // 2. Fall back to email match for account linking (e.g., existing local account).
        if (user is null)
            user = await _context.Users.Include(u => u.Role).Include(u => u.Country)
                .FirstOrDefaultAsync(u => EF.Functions.Like(u.Email, normalizedEmail) && !u.IsDeleted);

        if (user is not null)
        {
            // 3. Link provider ID if found by email but not yet connected.
            var dirty = false;
            if (!string.IsNullOrWhiteSpace(googleId) && user.GoogleId != googleId)
            { user.GoogleId = googleId; dirty = true; }

            if (!string.IsNullOrWhiteSpace(facebookId) && user.FacebookId != facebookId)
            { user.FacebookId = facebookId; dirty = true; }

            // Update avatar only if the user has no existing image.
            if (string.IsNullOrWhiteSpace(user.ImageUrl) && !string.IsNullOrWhiteSpace(imageUrl))
            { user.ImageUrl = imageUrl; dirty = true; }

            if (dirty)
            {
                user.UpdatedAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
        else
        {
            // 4. Auto-register brand-new social user.
            var customerRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Customer")
                ?? throw new InvalidOperationException("The Customer role is not configured on the server.");

            user = new User
            {
                Email = normalizedEmail,
                FullName = fullName,
                PasswordHash = string.Empty,  // No local password for social accounts
                GoogleId = googleId,
                FacebookId = facebookId,
                AuthProvider = provider,
                ImageUrl = imageUrl,
                RoleId = customerRole.Id,
                Role = customerRole,
                IsActive = true,
                CountryId = 1  // Default to Pakistan; user can update in profile
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Auto-registered new {Provider} user {Email} (Id={UserId})", provider, normalizedEmail, user.Id);
        }

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Your account has been deactivated. Please contact support.");

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        var (token, expiresAt) = _tokenGenerator.GenerateToken(user, user.OrganizerId);
        var userDto = new UserDto(
            user.Id, user.Email, user.FullName, user.Role?.Name ?? "Customer",
            user.LastLoginAt, FileUrlHelper.FormatUserImageUrl(user.ImageUrl),
            user.PhoneNumber, user.CountryId, user.Country?.Name, user.Country?.DialingCode,
            user.OrganizerId, null);

        return new LoginResponseDto(token, userDto, expiresAt);
    }
}

// ── Facebook Graph API response models ──────────────────────────────────────────

internal sealed record FacebookDebugResponse(FacebookDebugData? Data);

internal sealed record FacebookDebugData(
    [property: System.Text.Json.Serialization.JsonPropertyName("app_id")] string AppId,
    [property: System.Text.Json.Serialization.JsonPropertyName("is_valid")] bool IsValid,
    [property: System.Text.Json.Serialization.JsonPropertyName("expires_at")] long ExpiresAt);

internal sealed record FacebookProfileResponse(
    string Id,
    string? Name,
    string? Email,
    FacebookPicture? Picture);

internal sealed record FacebookPicture(FacebookPictureData? Data);

internal sealed record FacebookPictureData(string? Url);

