namespace EventLand.Infrastructure.Services;

using EventLand.Application.Common;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

public class AdminService : IAdminService
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly Microsoft.Extensions.Logging.ILogger<AdminService> _logger;

    public AdminService(IApplicationDbContext context, ICacheService cacheService, Microsoft.Extensions.Logging.ILogger<AdminService> logger)
    {
        _context = context;
        _cacheService = cacheService;
        _logger = logger;
    }

    // --- Location & Venue Hierarchy ---
    public async Task<List<CountryDto>> GetCountriesAsync()
    {
        var list = await _context.Countries.AsNoTracking().Where(c => !c.IsDeleted && c.IsActive).OrderBy(c => c.Name).ToListAsync();
        return list.Select(c => new CountryDto(c.Id, c.Name, c.Code, c.IsActive)).ToList();
    }

    public async Task<List<CityDto>> GetCitiesAsync(int? countryId = null)
    {
        var query = _context.Cities.AsNoTracking().Include(c => c.Country).Where(c => !c.IsDeleted && c.IsActive);
        if (countryId.HasValue && countryId.Value > 0)
            query = query.Where(c => c.CountryId == countryId.Value);

        var list = await query.OrderBy(c => c.Name).ToListAsync();
        return list.Select(c => new CityDto(c.Id, c.CountryId, c.Country?.Name, c.Name, c.IsActive)).ToList();
    }

    public async Task<List<VenueDto>> GetVenuesAsync(int? cityId = null)
    {
        var query = _context.Venues.AsNoTracking().Include(v => v.City).Where(v => !v.IsDeleted && v.IsActive);
        if (cityId.HasValue && cityId.Value > 0)
            query = query.Where(v => v.CityId == cityId.Value);

        var list = await query.OrderBy(v => v.Name).ToListAsync();
        return list.Select(v => new VenueDto(v.Id, v.CityId, v.City?.Name, v.Name, v.Address, v.Description, v.IsActive)).ToList();
    }

    public async Task<List<AuditoriumDto>> GetAuditoriumsAsync(int? venueId = null)
    {
        var query = _context.Auditoriums.AsNoTracking().Include(a => a.Venue).Where(a => !a.IsDeleted && a.IsActive);
        if (venueId.HasValue && venueId.Value > 0)
            query = query.Where(a => a.VenueId == venueId.Value);

        var list = await query.OrderBy(a => a.Name).ToListAsync();
        return list.Select(a => new AuditoriumDto(a.Id, a.VenueId, a.Venue?.Name, a.Name, a.LayoutCode, a.TotalCapacity, a.Description, a.LayoutJson, a.IsActive)).ToList();
    }

    public async Task<AuditoriumDto?> GetAuditoriumByIdAsync(int id)
    {
        var a = await _context.Auditoriums.AsNoTracking().Include(x => x.Venue).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (a is null) return null;
        return new AuditoriumDto(a.Id, a.VenueId, a.Venue?.Name, a.Name, a.LayoutCode, a.TotalCapacity, a.Description, a.LayoutJson, a.IsActive);
    }

    public async Task<CountryDto> CreateCountryAsync(CreateCountryDto dto)
    {
        try
        {
            var nameClean = dto.Name.Trim();
            var codeClean = dto.Code.Trim().ToUpperInvariant();

            var exists = await _context.Countries.AnyAsync(c => !c.IsDeleted && (c.Name.ToLower() == nameClean.ToLower() || c.Code == codeClean));
            if (exists)
                throw new InvalidOperationException($"Country with name '{nameClean}' or code '{codeClean}' already exists.");

            var country = new Country { Name = nameClean, Code = codeClean, IsActive = true };
            _context.Countries.Add(country);
            await _context.SaveChangesAsync();
            return new CountryDto(country.Id, country.Name, country.Code, country.IsActive);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating country {Name}", dto.Name);
            throw;
        }
        finally
        {
        }
    }

    public async Task<CityDto> CreateCityAsync(CreateCityDto dto)
    {
        try
        {
            var nameClean = dto.Name.Trim();
            var exists = await _context.Cities.AnyAsync(c => !c.IsDeleted && c.CountryId == dto.CountryId && c.Name.ToLower() == nameClean.ToLower());
            if (exists)
                throw new InvalidOperationException($"City '{nameClean}' already exists under the selected country.");

            var city = new City { CountryId = dto.CountryId, Name = nameClean, IsActive = true };
            _context.Cities.Add(city);
            await _context.SaveChangesAsync();

            var country = await _context.Countries.FirstOrDefaultAsync(c => c.Id == dto.CountryId);
            return new CityDto(city.Id, city.CountryId, country?.Name, city.Name, city.IsActive);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating city {Name}", dto.Name);
            throw;
        }
        finally
        {
        }
    }

    public async Task<CountryDto?> GetCountryByIdAsync(int id)
    {
        var c = await _context.Countries.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (c is null) return null;
        return new CountryDto(c.Id, c.Name, c.Code, c.IsActive);
    }

    public async Task<CountryDto> UpdateCountryAsync(int id, UpdateCountryDto dto)
    {
        try
        {
            var country = await _context.Countries.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
            if (country is null) throw new KeyNotFoundException($"Country '{id}' not found.");

            var nameClean = dto.Name.Trim();
            var codeClean = dto.Code.Trim().ToUpperInvariant();

            var exists = await _context.Countries.AnyAsync(c => c.Id != id && !c.IsDeleted && (c.Name.ToLower() == nameClean.ToLower() || c.Code == codeClean));
            if (exists)
                throw new InvalidOperationException($"Country with name '{nameClean}' or code '{codeClean}' already exists.");

            country.Name = nameClean;
            country.Code = codeClean;
            country.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return new CountryDto(country.Id, country.Name, country.Code, country.IsActive);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating country {Id}", id);
            throw;
        }
        finally
        {
        }
    }

    public async Task<bool> DeleteCountryAsync(int id)
    {
        var country = await _context.Countries.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
        if (country is null) return false;

        var hasCities = await _context.Cities.AnyAsync(c => c.CountryId == id && !c.IsDeleted);
        if (hasCities)
            throw new InvalidOperationException($"Cannot delete country '{country.Name}' because it has active cities.");

        country.IsDeleted = true;
        country.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<CityDto?> GetCityByIdAsync(int id)
    {
        var c = await _context.Cities.AsNoTracking().Include(x => x.Country).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (c is null) return null;
        return new CityDto(c.Id, c.CountryId, c.Country?.Name, c.Name, c.IsActive);
    }

    public async Task<CityDto> UpdateCityAsync(int id, UpdateCityDto dto)
    {
        try
        {
            var city = await _context.Cities.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
            if (city is null) throw new KeyNotFoundException($"City '{id}' not found.");

            var nameClean = dto.Name.Trim();
            var exists = await _context.Cities.AnyAsync(c => c.Id != id && c.CountryId == city.CountryId && !c.IsDeleted && c.Name.ToLower() == nameClean.ToLower());
            if (exists)
                throw new InvalidOperationException($"City '{nameClean}' already exists under this country.");

            city.Name = nameClean;
            city.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            var country = await _context.Countries.FirstOrDefaultAsync(c => c.Id == city.CountryId);
            return new CityDto(city.Id, city.CountryId, country?.Name, city.Name, city.IsActive);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating city {Id}", id);
            throw;
        }
        finally
        {
        }
    }

    public async Task<bool> DeleteCityAsync(int id)
    {
        var city = await _context.Cities.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
        if (city is null) return false;

        var hasVenues = await _context.Venues.AnyAsync(v => v.CityId == id && !v.IsDeleted);
        if (hasVenues)
            throw new InvalidOperationException($"Cannot delete city '{city.Name}' because it has active venues.");

        city.IsDeleted = true;
        city.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<VenueDto> CreateVenueAsync(CreateVenueDto dto)
    {
        try
        {
            var nameClean = dto.Name.Trim();
            var exists = await _context.Venues.AnyAsync(v => !v.IsDeleted && v.CityId == dto.CityId && v.Name.ToLower() == nameClean.ToLower());
            if (exists)
                throw new InvalidOperationException($"Venue '{nameClean}' already exists in this city.");

            var venue = new Venue
            {
                CityId = dto.CityId,
                Name = nameClean,
                Address = dto.Address?.Trim() ?? "",
                Description = dto.Description?.Trim() ?? "",
                IsActive = true
            };
            _context.Venues.Add(venue);
            await _context.SaveChangesAsync();

            var city = await _context.Cities.FirstOrDefaultAsync(c => c.Id == dto.CityId);
            return new VenueDto(venue.Id, venue.CityId, city?.Name, venue.Name, venue.Address, venue.Description, venue.IsActive);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating venue {Name}", dto.Name);
            throw;
        }
        finally
        {
        }
    }

    public async Task<VenueDto?> GetVenueByIdAsync(int id)
    {
        var v = await _context.Venues.AsNoTracking().Include(x => x.City).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (v is null) return null;
        return new VenueDto(v.Id, v.CityId, v.City?.Name, v.Name, v.Address, v.Description, v.IsActive);
    }

    public async Task<VenueDto> UpdateVenueAsync(int id, UpdateVenueDto dto)
    {
        try
        {
            var venue = await _context.Venues.FirstOrDefaultAsync(v => v.Id == id && !v.IsDeleted);
            if (venue is null) throw new KeyNotFoundException($"Venue '{id}' not found.");

            var nameClean = dto.Name.Trim();
            var exists = await _context.Venues.AnyAsync(v => v.Id != id && v.CityId == dto.CityId && !v.IsDeleted && v.Name.ToLower() == nameClean.ToLower());
            if (exists)
                throw new InvalidOperationException($"Venue '{nameClean}' already exists in this city.");

            venue.CityId = dto.CityId;
            venue.Name = nameClean;
            venue.Address = dto.Address?.Trim() ?? "";
            venue.Description = dto.Description?.Trim() ?? "";
            venue.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            var city = await _context.Cities.FirstOrDefaultAsync(c => c.Id == dto.CityId);
            return new VenueDto(venue.Id, venue.CityId, city?.Name, venue.Name, venue.Address, venue.Description, venue.IsActive);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating venue {Id}", id);
            throw;
        }
        finally
        {
        }
    }

    public async Task<bool> DeleteVenueAsync(int id)
    {
        var venue = await _context.Venues.FirstOrDefaultAsync(v => v.Id == id && !v.IsDeleted);
        if (venue is null) return false;

        var hasAuditoriums = await _context.Auditoriums.AnyAsync(a => a.VenueId == id && !a.IsDeleted);
        if (hasAuditoriums)
            throw new InvalidOperationException($"Cannot delete venue '{venue.Name}' because it has active auditoriums.");

        var hasEvents = await _context.Events.AnyAsync(e => e.VenueId == id && !e.IsDeleted);
        if (hasEvents)
            throw new InvalidOperationException($"Cannot delete venue '{venue.Name}' because events are scheduled at this venue.");

        venue.IsDeleted = true;
        venue.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<AuditoriumDto> CreateAuditoriumAsync(CreateAuditoriumDto dto)
    {
        try
        {
            var nameClean = dto.Name.Trim();
            var layoutCodeClean = string.IsNullOrWhiteSpace(dto.LayoutCode) 
                ? $"AUD_{Guid.NewGuid().ToString("N")[..6].ToUpper()}" 
                : dto.LayoutCode.Trim();

            var exists = await _context.Auditoriums.AnyAsync(a => !a.IsDeleted && a.VenueId == dto.VenueId && 
                (a.Name.ToLower() == nameClean.ToLower() || a.LayoutCode.ToLower() == layoutCodeClean.ToLower()));
            if (exists)
                throw new InvalidOperationException($"Auditorium '{nameClean}' or LayoutCode '{layoutCodeClean}' already exists for this venue.");

            var aud = new Auditorium
            {
                VenueId = dto.VenueId,
                Name = nameClean,
                LayoutCode = layoutCodeClean,
                TotalCapacity = dto.TotalCapacity > 0 ? dto.TotalCapacity : 200,
                Description = dto.Description ?? "",
                LayoutJson = dto.LayoutJson ?? "",
                IsActive = true
            };
            _context.Auditoriums.Add(aud);
            await _context.SaveChangesAsync();

            var venue = await _context.Venues.FirstOrDefaultAsync(v => v.Id == dto.VenueId);
            return new AuditoriumDto(aud.Id, aud.VenueId, venue?.Name, aud.Name, aud.LayoutCode, aud.TotalCapacity, aud.Description, aud.LayoutJson, aud.IsActive);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating auditorium {Name}", dto.Name);
            throw;
        }
        finally
        {
        }
    }

    public async Task<AuditoriumDto> UpdateAuditoriumAsync(int id, UpdateAuditoriumDto dto)
    {
        var aud = await _context.Auditoriums.FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
        if (aud is null) throw new KeyNotFoundException($"Auditorium '{id}' not found.");

        aud.VenueId = dto.VenueId;
        aud.Name = dto.Name;
        aud.LayoutCode = dto.LayoutCode;
        aud.TotalCapacity = dto.TotalCapacity;
        aud.Description = dto.Description ?? "";
        aud.LayoutJson = dto.LayoutJson ?? "";
        aud.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();
        var venue = await _context.Venues.FirstOrDefaultAsync(v => v.Id == dto.VenueId);
        return new AuditoriumDto(aud.Id, aud.VenueId, venue?.Name, aud.Name, aud.LayoutCode, aud.TotalCapacity, aud.Description, aud.LayoutJson, aud.IsActive);
    }

    public async Task<bool> DeleteAuditoriumAsync(int id)
    {
        var aud = await _context.Auditoriums.FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
        if (aud is null) return false;
        aud.IsDeleted = true;
        aud.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    // --- Roles CRUD ---
    public async Task<List<RoleDto>> GetRolesAsync()
    {
        var roles = await _context.Roles.AsNoTracking().Where(r => !r.IsDeleted).OrderBy(r => r.Id).ToListAsync();
        return roles.Select(r => new RoleDto(r.Id, r.Name, r.Description)).ToList();
    }

    public async Task<RoleDto?> GetRoleByIdAsync(int id)
    {
        var r = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        return r is null ? null : new RoleDto(r.Id, r.Name, r.Description);
    }

    public async Task<RoleDto> CreateRoleAsync(CreateRoleDto dto)
    {
        var exists = await _context.Roles.AnyAsync(r => r.Name.ToLower() == dto.Name.Trim().ToLower() && !r.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"Role '{dto.Name}' already exists.");

        var role = new Role { Name = dto.Name.Trim(), Description = dto.Description ?? "" };
        _context.Roles.Add(role);
        await _context.SaveChangesAsync();
        return new RoleDto(role.Id, role.Name, role.Description);
    }

    public async Task<RoleDto> UpdateRoleAsync(int id, UpdateRoleDto dto)
    {
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        if (role is null)
            throw new KeyNotFoundException($"Role '{id}' not found.");

        var exists = await _context.Roles.AnyAsync(r => r.Id != id && r.Name.ToLower() == dto.Name.Trim().ToLower() && !r.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"Role '{dto.Name}' already exists.");

        role.Name = dto.Name.Trim();
        role.Description = dto.Description ?? "";
        await _context.SaveChangesAsync();
        return new RoleDto(role.Id, role.Name, role.Description);
    }

    public async Task<bool> DeleteRoleAsync(int id)
    {
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        if (role is null) return false;

        var inUse = await _context.Users.AnyAsync(u => u.RoleId == id && !u.IsDeleted);
        if (inUse)
            throw new InvalidOperationException($"Cannot delete role '{role.Name}' because it is assigned to users.");

        role.IsDeleted = true;
        role.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    // --- Users CRUD ---
    public async Task<PagedResult<UserDto>> GetUsersAsync(int pageNumber = 1, int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Users.AsNoTracking().Include(u => u.Role).Where(u => !u.IsDeleted);
        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserDto(u.Id, u.Email, u.FullName, u.Role.Name, u.LastLoginAt, FileUrlHelper.FormatUserImageUrl(u.ImageUrl)))
            .ToListAsync();

        return new PagedResult<UserDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<UserDto?> GetUserByIdAsync(int id)
    {
        var u = await _context.Users.AsNoTracking().Include(x => x.Role).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        return u is null ? null : new UserDto(u.Id, u.Email, u.FullName, u.Role.Name, u.LastLoginAt, FileUrlHelper.FormatUserImageUrl(u.ImageUrl));
    }

    public async Task<UserDto> CreateUserAsync(CreateUserDto dto)
    {
        var exists = await _context.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.Trim().ToLower() && !u.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"A user with email '{dto.Email}' already exists.");

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == dto.RoleId && !r.IsDeleted);
        if (role is null)
            throw new KeyNotFoundException($"Role '{dto.RoleId}' not found.");

        var user = new User
        {
            Email = dto.Email.Trim(),
            FullName = dto.FullName.Trim(),
            RoleId = dto.RoleId,
            PhoneNumber = dto.PhoneNumber,
            ImageUrl = FileUrlHelper.ExtractFileName(dto.ImageUrl) ?? dto.ImageUrl,
            IsActive = true
        };

        var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<User>();
        user.PasswordHash = hasher.HashPassword(user, dto.Password);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return new UserDto(user.Id, user.Email, user.FullName, role.Name, null, FileUrlHelper.FormatUserImageUrl(user.ImageUrl));
    }

    public async Task<UserDto> UpdateUserAsync(int id, UpdateUserDto dto)
    {
        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (user is null)
            throw new KeyNotFoundException($"User '{id}' not found.");

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == dto.RoleId && !r.IsDeleted);
        if (role is null)
            throw new KeyNotFoundException($"Role '{dto.RoleId}' not found.");

        user.FullName = dto.FullName.Trim();
        user.RoleId = dto.RoleId;
        user.PhoneNumber = dto.PhoneNumber;
        user.IsActive = dto.IsActive;

        if (dto.ImageUrl != null)
        {
            user.ImageUrl = FileUrlHelper.ExtractFileName(dto.ImageUrl) ?? dto.ImageUrl;
        }

        // Direct Password Update by Super Admin (without asking old password)
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<User>();
            user.PasswordHash = hasher.HashPassword(user, dto.Password);
        }

        await _context.SaveChangesAsync();
        return new UserDto(user.Id, user.Email, user.FullName, role.Name, user.LastLoginAt, FileUrlHelper.FormatUserImageUrl(user.ImageUrl));
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (user is null) return false;

        user.IsDeleted = true;
        user.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    // --- Events CRUD ---
    public async Task<PagedResult<EventSummaryDto>> GetEventsAsync(int pageNumber = 1, int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Events
            .AsNoTracking()
            .Include(e => e.Organizer)
            .Include(e => e.Country)
            .Include(e => e.City)
            .Include(e => e.Venue)
            .Include(e => e.Auditorium)
            .Include(e => e.EventTags).ThenInclude(et => et.Tag)
            .Include(e => e.Shows.Where(s => !s.IsDeleted).OrderBy(s => s.StartTimeUtc))
            .Where(e => !e.IsDeleted);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new EventSummaryDto(
                e.Id,
                e.Title,
                e.Status.ToString(),
                e.IsFeatured,
                e.CountryId,
                e.Country != null ? e.Country.Name : "Pakistan",
                e.CityId,
                e.City != null ? e.City.Name : "Karachi",
                e.VenueId,
                e.Venue != null ? e.Venue.Name : "",
                e.AuditoriumId,
                e.Auditorium != null ? e.Auditorium.Name : null,
                e.Address ?? (e.Venue != null ? e.Venue.Address : null),
                e.StartDateUtc,
                e.EndDateUtc,
                e.PriceRange,
                e.StartingPrice,
                e.TicketingType.ToString(),
                FileUrlHelper.FormatEventBannerUrl(e.Banner),
                e.ScarcityText,
                e.OrganizerId,
                e.Organizer.Name,
                e.EventTags.Select(et => new TagDto(et.Tag.Id, et.Tag.Name, et.Tag.Slug)).ToList(),
                e.Shows.Select(s => new EventShowDto(s.Id, s.EventId, s.ShowTitle, s.StartTimeUtc, s.EndTimeUtc, new List<TicketTierDto>())).ToList()
            ))
            .ToListAsync();

        return new PagedResult<EventSummaryDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<EventDetailDto> GetEventByIdAsync(int eventId)
    {
        return await GetEventDetailDtoAsync(eventId);
    }

    public async Task<EventDetailDto> CreateEventAsync(CreateAdminEventDto dto)
    {
        try
        {
            var titleClean = dto.Title.Trim();
            var exists = await _context.Events.AnyAsync(e => !e.IsDeleted && 
                e.Title.ToLower() == titleClean.ToLower() && 
                e.StartDateUtc == dto.StartDateUtc);
            if (exists)
                throw new InvalidOperationException($"An event titled '{titleClean}' starting at the same time already exists.");

            Enum.TryParse<TicketingType>(dto.TicketingType, true, out var ticketingType);
            var statusStr = string.IsNullOrWhiteSpace(dto.Status) ? "Live" : dto.Status;
            Enum.TryParse<EventStatus>(statusStr, true, out var status);

            var organizerId = dto.OrganizerId;
            if (organizerId <= 0)
            {
                var defaultOrg = await _context.Organizers.FirstOrDefaultAsync(o => o.Name == "Event Land" && !o.IsDeleted)
                    ?? await _context.Organizers.FirstOrDefaultAsync(o => !o.IsDeleted);
                organizerId = defaultOrg?.Id ?? 1000;
            }

        // Country selection (Default: Pakistan)
        var countryId = dto.CountryId ?? (await _context.Countries.FirstOrDefaultAsync(c => c.Name == "Pakistan"))?.Id ?? 1000;

        // City selection
        int cityId;
        if (dto.CityId.HasValue && dto.CityId.Value > 0)
        {
            cityId = dto.CityId.Value;
        }
        else
        {
            var cityName = !string.IsNullOrWhiteSpace(dto.City) ? dto.City : "Karachi";
            var cityEntity = await _context.Cities.FirstOrDefaultAsync(c => c.Name.ToLower() == cityName.ToLower());
            if (cityEntity == null)
            {
                cityEntity = new City { CountryId = countryId, Name = cityName, IsActive = true };
                _context.Cities.Add(cityEntity);
                await _context.SaveChangesAsync();
            }
            cityId = cityEntity.Id;
        }

        // Venue selection
        int venueId;
        if (dto.VenueId.HasValue && dto.VenueId.Value > 0)
        {
            venueId = dto.VenueId.Value;
        }
        else
        {
            var venueName = !string.IsNullOrWhiteSpace(dto.Venue) ? dto.Venue : "Arts Council of Pakistan";
            var venueEntity = await _context.Venues.FirstOrDefaultAsync(v => v.CityId == cityId && v.Name.ToLower() == venueName.ToLower());
            if (venueEntity == null)
            {
                venueEntity = new Venue { CityId = cityId, Name = venueName, Address = dto.Address ?? "", IsActive = true };
                _context.Venues.Add(venueEntity);
                await _context.SaveChangesAsync();
            }
            venueId = venueEntity.Id;
        }

        // Auditorium selection (optional)
        int? auditoriumId = dto.AuditoriumId;
        if ((!auditoriumId.HasValue || auditoriumId == 0) && !string.IsNullOrWhiteSpace(dto.AuditoriumLayout))
        {
            if (int.TryParse(dto.AuditoriumLayout, out var parsedAudId))
            {
                auditoriumId = parsedAudId;
            }
            else
            {
                var audEntity = await _context.Auditoriums.FirstOrDefaultAsync(a => a.VenueId == venueId && a.Name.ToLower() == dto.AuditoriumLayout.ToLower());
                if (audEntity != null) auditoriumId = audEntity.Id;
            }
        }

        var ev = new Event
        {
            Title = dto.Title,
            CountryId = countryId,
            CityId = cityId,
            VenueId = venueId,
            AuditoriumId = auditoriumId,
            Address = dto.Address,
            StartDateUtc = dto.StartDateUtc,
            EndDateUtc = dto.EndDateUtc,
            PriceRange = !string.IsNullOrWhiteSpace(dto.PriceRange) ? dto.PriceRange : $"PKR {dto.StartingPrice:N0}+",
            StartingPrice = dto.StartingPrice,
            TicketingType = ticketingType,
            Banner = FileUrlHelper.ExtractFileName(dto.Banner) ?? dto.Banner,
            Description = dto.Description,
            ScarcityText = dto.ScarcityText,
            OrganizerId = organizerId,
            IsFeatured = dto.IsFeatured,
            IsPublished = dto.IsPublished,
            Status = status
        };

        _context.Events.Add(ev);
        await _context.SaveChangesAsync();

        if (dto.TagIds is not null && dto.TagIds.Any())
        {
            var validTagIds = await _context.Tags
                .Where(t => dto.TagIds.Contains(t.Id) && !t.IsDeleted)
                .Select(t => t.Id)
                .ToListAsync();

            foreach (var tagId in validTagIds)
            {
                _context.EventTags.Add(new EventTag { EventId = ev.Id, TagId = tagId });
            }
        }

        if (dto.Shows is not null && dto.Shows.Any())
        {
            foreach (var sInput in dto.Shows)
            {
                var show = new EventShow
                {
                    EventId = ev.Id,
                    ShowTitle = sInput.ShowTitle,
                    StartTimeUtc = sInput.StartTimeUtc,
                    EndTimeUtc = sInput.EndTimeUtc
                };
                _context.EventShows.Add(show);
                await _context.SaveChangesAsync();

                if (sInput.TicketTiers is not null && sInput.TicketTiers.Any())
                {
                    int sort = 1;
                    foreach (var tInput in sInput.TicketTiers)
                    {
                        _context.TicketTiers.Add(new TicketTier
                        {
                            EventId = ev.Id,
                            EventShowId = show.Id,
                            Name = tInput.Name,
                            Description = tInput.Description ?? $"{tInput.Name} pass for {show.ShowTitle}",
                            Price = tInput.Price > 0 ? tInput.Price : (dto.StartingPrice > 0 ? dto.StartingPrice : 1500m),
                            AvailableQuantity = tInput.AvailableQuantity > 0 ? tInput.AvailableQuantity : 100,
                            SortOrder = sort++,
                            RowRange = tInput.RowRange
                        });
                    }
                }
                else if (ticketingType == TicketingType.Categorized)
                {
                    var basePrice = sInput.StartingPrice ?? (dto.StartingPrice > 0 ? dto.StartingPrice : 1500m);
                    _context.TicketTiers.Add(new TicketTier
                    {
                        EventId = ev.Id,
                        EventShowId = show.Id,
                        Name = "Standard Pass",
                        Description = $"Standard admission pass for {show.ShowTitle}",
                        Price = basePrice,
                        AvailableQuantity = 150,
                        SortOrder = 1
                    });
                    _context.TicketTiers.Add(new TicketTier
                    {
                        EventId = ev.Id,
                        EventShowId = show.Id,
                        Name = "VIP Pass",
                        Description = $"VIP fast-track pass for {show.ShowTitle}",
                        Price = basePrice * 2.25m,
                        AvailableQuantity = 50,
                        SortOrder = 2
                    });
                }
            }
        }
        else
        {
            var defaultShow = new EventShow
            {
                EventId = ev.Id,
                ShowTitle = "Standard Performance",
                StartTimeUtc = dto.StartDateUtc,
                EndTimeUtc = dto.EndDateUtc
            };
            _context.EventShows.Add(defaultShow);
            await _context.SaveChangesAsync();

            if (ticketingType == TicketingType.Categorized)
            {
                var basePrice = dto.StartingPrice > 0 ? dto.StartingPrice : 1500m;
                _context.TicketTiers.Add(new TicketTier
                {
                    EventId = ev.Id,
                    EventShowId = defaultShow.Id,
                    Name = "Standard Pass",
                    Description = "Standard admission pass",
                    Price = basePrice,
                    AvailableQuantity = 150,
                    SortOrder = 1
                });
                _context.TicketTiers.Add(new TicketTier
                {
                    EventId = ev.Id,
                    EventShowId = defaultShow.Id,
                    Name = "VIP Pass",
                    Description = "VIP fast-track pass",
                    Price = basePrice * 2.25m,
                    AvailableQuantity = 50,
                    SortOrder = 2
                });
            }
        }
        await _context.SaveChangesAsync();

        // If Mapped Seating, automatically generate SeatingZone & Seats for selected Auditorium
        if (ticketingType == TicketingType.Mapped)
        {
            await CreateSeatingZoneFromLayoutAsync(ev.Id, auditoriumId?.ToString(), dto.StartingPrice);
        }

        await _cacheService.ClearEventCacheAsync(ev.Id);

        return await GetEventDetailDtoAsync(ev.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating event {Title}", dto.Title);
            throw;
        }
        finally
        {
        }
    }

    public async Task<EventDetailDto> UpdateEventAsync(int id, UpdateAdminEventDto dto)
    {
        var ev = await _context.Events
            .Include(e => e.EventTags)
            .Include(e => e.Shows)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

        if (ev is null)
            throw new KeyNotFoundException($"Event with ID '{id}' not found.");

        Enum.TryParse<TicketingType>(dto.TicketingType, true, out var ticketingType);
        Enum.TryParse<EventStatus>(dto.Status, true, out var status);

        if (dto.CountryId.HasValue && dto.CountryId.Value > 0) ev.CountryId = dto.CountryId.Value;
        if (dto.CityId.HasValue && dto.CityId.Value > 0) ev.CityId = dto.CityId.Value;
        if (dto.VenueId.HasValue && dto.VenueId.Value > 0) ev.VenueId = dto.VenueId.Value;
        if (dto.AuditoriumId.HasValue) ev.AuditoriumId = dto.AuditoriumId.Value > 0 ? dto.AuditoriumId.Value : null;

        ev.Title = dto.Title;
        ev.Status = status;
        ev.IsFeatured = dto.IsFeatured;
        ev.IsPublished = dto.IsPublished;
        ev.Address = dto.Address;
        ev.StartDateUtc = dto.StartDateUtc;
        ev.EndDateUtc = dto.EndDateUtc;
        ev.PriceRange = !string.IsNullOrWhiteSpace(dto.PriceRange) ? dto.PriceRange : $"PKR {dto.StartingPrice:N0}+";
        ev.StartingPrice = dto.StartingPrice;
        ev.TicketingType = ticketingType;
        if (!string.IsNullOrWhiteSpace(dto.Banner))
            ev.Banner = FileUrlHelper.ExtractFileName(dto.Banner) ?? dto.Banner;
        ev.Description = dto.Description;
        ev.ScarcityText = dto.ScarcityText;
        if (dto.OrganizerId > 0)
            ev.OrganizerId = dto.OrganizerId;

        // Update tags
        ev.EventTags.Clear();
        if (dto.TagIds is not null && dto.TagIds.Any())
        {
            var validTagIds = await _context.Tags
                .Where(t => dto.TagIds.Contains(t.Id) && !t.IsDeleted)
                .Select(t => t.Id)
                .ToListAsync();

            foreach (var tagId in validTagIds)
            {
                ev.EventTags.Add(new EventTag { EventId = ev.Id, TagId = tagId });
            }
        }

        // Synchronize Shows and TicketTiers
        if (dto.Shows is not null && dto.Shows.Any())
        {
            var existingShows = await _context.EventShows.Where(s => s.EventId == id && !s.IsDeleted).ToListAsync();
            var incomingShowIds = dto.Shows.Where(s => s.Id.HasValue).Select(s => s.Id!.Value).ToList();

            foreach (var exShow in existingShows.Where(s => !incomingShowIds.Contains(s.Id)))
            {
                exShow.IsDeleted = true;
                exShow.DeletedAt = DateTimeOffset.UtcNow;
            }

            foreach (var sInput in dto.Shows)
            {
                EventShow currentShow;
                if (sInput.Id.HasValue && sInput.Id.Value > 0)
                {
                    currentShow = existingShows.FirstOrDefault(s => s.Id == sInput.Id.Value) ?? new EventShow { EventId = id };
                    currentShow.ShowTitle = sInput.ShowTitle;
                    currentShow.StartTimeUtc = sInput.StartTimeUtc;
                    currentShow.EndTimeUtc = sInput.EndTimeUtc;
                    if (currentShow.Id == 0) _context.EventShows.Add(currentShow);
                }
                else
                {
                    currentShow = new EventShow
                    {
                        EventId = id,
                        ShowTitle = sInput.ShowTitle,
                        StartTimeUtc = sInput.StartTimeUtc,
                        EndTimeUtc = sInput.EndTimeUtc
                    };
                    _context.EventShows.Add(currentShow);
                }
                await _context.SaveChangesAsync();

                if (sInput.TicketTiers is not null && sInput.TicketTiers.Any())
                {
                    var existingTiers = await _context.TicketTiers.Where(t => t.EventId == id && t.EventShowId == currentShow.Id && !t.IsDeleted).ToListAsync();
                    var incomingTierIds = sInput.TicketTiers.Where(t => t.Id.HasValue).Select(t => t.Id!.Value).ToList();

                    foreach (var exTier in existingTiers.Where(t => !incomingTierIds.Contains(t.Id)))
                    {
                        exTier.IsDeleted = true;
                        exTier.DeletedAt = DateTimeOffset.UtcNow;
                    }

                    int sort = 1;
                    foreach (var tInput in sInput.TicketTiers)
                    {
                        if (tInput.Id.HasValue && tInput.Id.Value > 0)
                        {
                            var tier = existingTiers.FirstOrDefault(t => t.Id == tInput.Id.Value);
                            if (tier != null)
                            {
                                tier.Name = tInput.Name;
                                tier.Price = tInput.Price;
                                tier.AvailableQuantity = tInput.AvailableQuantity;
                                if (!string.IsNullOrWhiteSpace(tInput.Description)) tier.Description = tInput.Description;
                                if (tInput.RowRange != null) tier.RowRange = tInput.RowRange;
                                tier.SortOrder = sort++;
                            }
                        }
                        else
                        {
                            _context.TicketTiers.Add(new TicketTier
                            {
                                EventId = id,
                                EventShowId = currentShow.Id,
                                Name = tInput.Name,
                                Description = tInput.Description ?? $"{tInput.Name} pass for {currentShow.ShowTitle}",
                                Price = tInput.Price > 0 ? tInput.Price : dto.StartingPrice,
                                AvailableQuantity = tInput.AvailableQuantity > 0 ? tInput.AvailableQuantity : 100,
                                SortOrder = sort++,
                                RowRange = tInput.RowRange
                            });
                        }
                    }
                }
            }
        }

        await _context.SaveChangesAsync();
        await SyncEventPricingAsync(id);
        await _cacheService.ClearEventCacheAsync(id);

        return await GetEventDetailDtoAsync(id);
    }

    public async Task<bool> DeleteEventAsync(int id)
    {
        var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
        if (ev is null) return false;

        ev.IsDeleted = true;
        ev.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(id);
        return true;
    }

    // --- EventShows CRUD ---
    public async Task<EventShowDto> CreateEventShowAsync(CreateEventShowDto dto)
    {
        var evExists = await _context.Events.AnyAsync(e => e.Id == dto.EventId && !e.IsDeleted);
        if (!evExists)
            throw new KeyNotFoundException($"Event '{dto.EventId}' not found.");

        var show = new EventShow
        {
            EventId = dto.EventId,
            ShowTitle = dto.ShowTitle.Trim(),
            StartTimeUtc = dto.StartTimeUtc,
            EndTimeUtc = dto.EndTimeUtc
        };

        _context.EventShows.Add(show);
        await _context.SaveChangesAsync();

        await SyncEventPricingAsync(dto.EventId);
        await _cacheService.ClearEventCacheAsync(dto.EventId);

        var tiers = await _context.TicketTiers
            .Where(t => t.EventId == dto.EventId && t.EventShowId == show.Id && !t.IsDeleted)
            .OrderBy(t => t.SortOrder)
            .Select(t => new TicketTierDto(t.Id, t.EventId, t.EventShowId, t.Name, t.Description, t.Price, t.AvailableQuantity, t.SoldCount, t.MaxPerOrder, t.SortOrder, t.RowRange))
            .ToListAsync();

        return new EventShowDto(show.Id, show.EventId, show.ShowTitle, show.StartTimeUtc, show.EndTimeUtc, tiers);
    }

    public async Task<EventShowDto> UpdateEventShowAsync(int id, UpdateEventShowDto dto)
    {
        var show = await _context.EventShows.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        if (show is null)
            throw new KeyNotFoundException($"Event show '{id}' not found.");

        show.ShowTitle = dto.ShowTitle.Trim();
        show.StartTimeUtc = dto.StartTimeUtc;
        show.EndTimeUtc = dto.EndTimeUtc;
        await _context.SaveChangesAsync();

        await SyncEventPricingAsync(show.EventId);
        await _cacheService.ClearEventCacheAsync(show.EventId);

        var tiers = await _context.TicketTiers
            .Where(t => t.EventId == show.EventId && t.EventShowId == show.Id && !t.IsDeleted)
            .OrderBy(t => t.SortOrder)
            .Select(t => new TicketTierDto(t.Id, t.EventId, t.EventShowId, t.Name, t.Description, t.Price, t.AvailableQuantity, t.SoldCount, t.MaxPerOrder, t.SortOrder, t.RowRange))
            .ToListAsync();

        return new EventShowDto(show.Id, show.EventId, show.ShowTitle, show.StartTimeUtc, show.EndTimeUtc, tiers);
    }

    public async Task<bool> DeleteEventShowAsync(int id)
    {
        var show = await _context.EventShows.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        if (show is null) return false;

        show.IsDeleted = true;
        show.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        await SyncEventPricingAsync(show.EventId);
        await _cacheService.ClearEventCacheAsync(show.EventId);
        return true;
    }

    // --- Organizers CRUD ---
    public async Task<List<OrganizerDto>> GetOrganizersAsync()
    {
        var list = await _context.Organizers.AsNoTracking().Where(o => !o.IsDeleted).OrderBy(o => o.Name).ToListAsync();
        return list.Select(o => new OrganizerDto(o.Id, o.Name, o.Email, o.Phone, FileUrlHelper.FormatOrganizerLogoUrl(o.LogoUrl), o.WebsiteUrl, o.IsVerified)).ToList();
    }

    public async Task<OrganizerDto?> GetOrganizerByIdAsync(int id)
    {
        var o = await _context.Organizers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (o is null) return null;
        return new OrganizerDto(o.Id, o.Name, o.Email, o.Phone, FileUrlHelper.FormatOrganizerLogoUrl(o.LogoUrl), o.WebsiteUrl, o.IsVerified);
    }

    public async Task<OrganizerDto> CreateOrganizerAsync(CreateOrganizerDto dto)
    {
        try
        {
            var nameClean = dto.Name.Trim();
            var emailClean = dto.Email.Trim().ToLower();

            var exists = await _context.Organizers.AnyAsync(o => !o.IsDeleted && (o.Name.ToLower() == nameClean.ToLower() || o.Email.ToLower() == emailClean));
            if (exists)
                throw new InvalidOperationException($"Organizer '{nameClean}' or email '{emailClean}' already exists.");

            var organizer = new Organizer
            {
                Name = nameClean,
                Email = emailClean,
                Phone = dto.Phone,
                LogoUrl = FileUrlHelper.ExtractFileName(dto.LogoUrl) ?? dto.LogoUrl ?? "",
                WebsiteUrl = dto.WebsiteUrl ?? "",
                IsVerified = dto.IsVerified
            };

            _context.Organizers.Add(organizer);
            await _context.SaveChangesAsync();

            return new OrganizerDto(organizer.Id, organizer.Name, organizer.Email, organizer.Phone, FileUrlHelper.FormatOrganizerLogoUrl(organizer.LogoUrl), organizer.WebsiteUrl, organizer.IsVerified);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating organizer {Name}", dto.Name);
            throw;
        }
        finally
        {
        }
    }

    public async Task<OrganizerDto> UpdateOrganizerAsync(int id, UpdateOrganizerDto dto)
    {
        var org = await _context.Organizers.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);
        if (org is null)
            throw new KeyNotFoundException($"Organizer '{id}' not found.");

        org.Name = dto.Name.Trim();
        org.Email = dto.Email.Trim();
        org.Phone = dto.Phone;
        if (!string.IsNullOrWhiteSpace(dto.LogoUrl)) org.LogoUrl = FileUrlHelper.ExtractFileName(dto.LogoUrl) ?? dto.LogoUrl;
        org.WebsiteUrl = dto.WebsiteUrl ?? "";
        org.IsVerified = dto.IsVerified;

        await _context.SaveChangesAsync();
        return new OrganizerDto(org.Id, org.Name, org.Email, org.Phone, FileUrlHelper.FormatOrganizerLogoUrl(org.LogoUrl), org.WebsiteUrl, org.IsVerified);
    }

    public async Task<bool> DeleteOrganizerAsync(int id)
    {
        var org = await _context.Organizers.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);
        if (org is null) return false;

        org.IsDeleted = true;
        org.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    // --- Artists CRUD ---
    public async Task<PagedResult<ArtistDto>> GetArtistsAsync(int pageNumber = 1, int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Artists.AsNoTracking().Where(a => !a.IsDeleted);
        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(a => a.Rating)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new ArtistDto(a.Id, a.Name, a.Genre, a.Role, a.City, FileUrlHelper.FormatArtistImageUrl(a.ImageUrl), a.Bio, a.Availability, a.StartingRate, a.Rating, a.ShowsDone, a.IsFeatured))
            .ToListAsync();

        return new PagedResult<ArtistDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<ArtistDto?> GetArtistByIdAsync(int id)
    {
        var a = await _context.Artists.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (a is null) return null;
        return new ArtistDto(a.Id, a.Name, a.Genre, a.Role, a.City, FileUrlHelper.FormatArtistImageUrl(a.ImageUrl), a.Bio, a.Availability, a.StartingRate, a.Rating, a.ShowsDone, a.IsFeatured);
    }

    public async Task<ArtistDto> CreateArtistAsync(CreateArtistDto dto)
    {
        var artist = new Artist
        {
            Name = dto.Name.Trim(),
            Genre = dto.Genre,
            Role = dto.Role,
            City = dto.City,
            ImageUrl = FileUrlHelper.ExtractFileName(dto.ImageUrl) ?? dto.ImageUrl,
            Bio = dto.Bio,
            Availability = dto.Availability,
            StartingRate = dto.StartingRate,
            Rating = dto.Rating,
            ShowsDone = dto.ShowsDone,
            IsFeatured = dto.IsFeatured
        };

        _context.Artists.Add(artist);
        await _context.SaveChangesAsync();

        return new ArtistDto(artist.Id, artist.Name, artist.Genre, artist.Role, artist.City, FileUrlHelper.FormatArtistImageUrl(artist.ImageUrl), artist.Bio, artist.Availability, artist.StartingRate, artist.Rating, artist.ShowsDone, artist.IsFeatured);
    }

    public async Task<ArtistDto> UpdateArtistAsync(int id, UpdateArtistDto dto)
    {
        var a = await _context.Artists.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (a is null) throw new KeyNotFoundException($"Artist '{id}' not found.");

        a.Name = dto.Name.Trim();
        a.Genre = dto.Genre;
        a.Role = dto.Role;
        a.City = dto.City;
        if (!string.IsNullOrWhiteSpace(dto.ImageUrl)) a.ImageUrl = FileUrlHelper.ExtractFileName(dto.ImageUrl) ?? dto.ImageUrl;
        a.Bio = dto.Bio;
        a.Availability = dto.Availability;
        a.StartingRate = dto.StartingRate;
        a.Rating = dto.Rating;
        a.ShowsDone = dto.ShowsDone;
        a.IsFeatured = dto.IsFeatured;

        await _context.SaveChangesAsync();
        return new ArtistDto(a.Id, a.Name, a.Genre, a.Role, a.City, FileUrlHelper.FormatArtistImageUrl(a.ImageUrl), a.Bio, a.Availability, a.StartingRate, a.Rating, a.ShowsDone, a.IsFeatured);
    }

    public async Task<bool> DeleteArtistAsync(int id)
    {
        var a = await _context.Artists.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (a is null) return false;

        a.IsDeleted = true;
        a.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    // --- TicketTiers CRUD ---
    public async Task<TicketTierDto> CreateTicketTierAsync(CreateTicketTierDto dto)
    {
        var evExists = await _context.Events.AnyAsync(e => e.Id == dto.EventId && !e.IsDeleted);
        if (!evExists)
            throw new KeyNotFoundException($"Event '{dto.EventId}' not found.");

        var tier = new TicketTier
        {
            EventId = dto.EventId,
            EventShowId = dto.EventShowId,
            Name = dto.Name.Trim(),
            Description = dto.Description ?? "",
            Price = dto.Price,
            RowRange = dto.RowRange,
            AvailableQuantity = dto.AvailableQuantity,
            MaxPerOrder = dto.MaxPerOrder > 0 ? dto.MaxPerOrder : 5,
            SortOrder = dto.SortOrder > 0 ? dto.SortOrder : 1
        };

        _context.TicketTiers.Add(tier);
        await _context.SaveChangesAsync();

        await SyncEventPricingAsync(dto.EventId);
        await _cacheService.ClearEventCacheAsync(dto.EventId);

        return new TicketTierDto(tier.Id, tier.EventId, tier.EventShowId, tier.Name, tier.Description, tier.Price, tier.AvailableQuantity, tier.SoldCount, tier.MaxPerOrder, tier.SortOrder, tier.RowRange);
    }

    public async Task<TicketTierDto> UpdateTicketTierAsync(int id, UpdateTicketTierDto dto)
    {
        var tier = await _context.TicketTiers.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (tier is null)
            throw new KeyNotFoundException($"Ticket tier '{id}' not found.");

        tier.EventShowId = dto.EventShowId;
        tier.Name = dto.Name.Trim();
        tier.Description = dto.Description ?? "";
        tier.Price = dto.Price;
        if (dto.RowRange != null) tier.RowRange = dto.RowRange;
        tier.AvailableQuantity = dto.AvailableQuantity;
        tier.MaxPerOrder = dto.MaxPerOrder > 0 ? dto.MaxPerOrder : 5;
        tier.SortOrder = dto.SortOrder > 0 ? dto.SortOrder : 1;

        await _context.SaveChangesAsync();

        await SyncEventPricingAsync(tier.EventId);
        await _cacheService.ClearEventCacheAsync(tier.EventId);

        return new TicketTierDto(tier.Id, tier.EventId, tier.EventShowId, tier.Name, tier.Description, tier.Price, tier.AvailableQuantity, tier.SoldCount, tier.MaxPerOrder, tier.SortOrder, tier.RowRange);
    }

    public async Task<bool> DeleteTicketTierAsync(int id)
    {
        var tier = await _context.TicketTiers.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (tier is null) return false;

        tier.IsDeleted = true;
        tier.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        await SyncEventPricingAsync(tier.EventId);
        await _cacheService.ClearEventCacheAsync(tier.EventId);
        return true;
    }

    // --- SeatingZones & Seats CRUD ---
    public async Task<SeatingZoneDto> CreateSeatingZoneAsync(CreateSeatingZoneDto dto)
    {
        var zone = new SeatingZone
        {
            EventId = dto.EventId,
            Zone = dto.Zone,
            Rows = dto.Rows,
            Cols = dto.Cols,
            Price = dto.Price,
            SortOrder = dto.SortOrder,
            LayoutJson = dto.LayoutJson ?? "",
            TotalCapacity = dto.Rows * dto.Cols
        };

        GenerateSeatsForZone(zone, dto.LayoutJson);

        _context.SeatingZones.Add(zone);
        await _context.SaveChangesAsync();

        await SyncEventPricingAsync(dto.EventId);
        await _cacheService.ClearEventCacheAsync(dto.EventId);

        return new SeatingZoneDto(zone.Id, zone.EventId, zone.Zone, zone.Rows, zone.Cols, zone.Price, zone.TotalCapacity, zone.SortOrder, zone.LayoutJson, zone.Seats.Select(s => new SeatDto(s.Id, s.ZoneId, s.Row, s.Col, s.Label, s.Status.ToString(), s.Price)).ToList());
    }

    public async Task<SeatingZoneDto> UpdateSeatingZoneAsync(int id, UpdateSeatingZoneDto dto)
    {
        var zone = await _context.SeatingZones.Include(z => z.Seats).FirstOrDefaultAsync(z => z.Id == id && !z.IsDeleted);
        if (zone is null) throw new KeyNotFoundException($"Zone '{id}' not found.");

        zone.Zone = dto.Zone;
        zone.Price = dto.Price;
        zone.SortOrder = dto.SortOrder;
        if (!string.IsNullOrWhiteSpace(dto.LayoutJson)) zone.LayoutJson = dto.LayoutJson;

        await _context.SaveChangesAsync();

        await SyncEventPricingAsync(zone.EventId);
        await _cacheService.ClearEventCacheAsync(zone.EventId);

        return new SeatingZoneDto(zone.Id, zone.EventId, zone.Zone, zone.Rows, zone.Cols, zone.Price, zone.TotalCapacity, zone.SortOrder, zone.LayoutJson, zone.Seats.Select(s => new SeatDto(s.Id, s.ZoneId, s.Row, s.Col, s.Label, s.Status.ToString(), s.Price)).ToList());
    }

    public async Task<bool> DeleteSeatingZoneAsync(int id)
    {
        var zone = await _context.SeatingZones.FirstOrDefaultAsync(z => z.Id == id && !z.IsDeleted);
        if (zone is null) return false;

        zone.IsDeleted = true;
        zone.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        await SyncEventPricingAsync(zone.EventId);
        await _cacheService.ClearEventCacheAsync(zone.EventId);
        return true;
    }

    // --- Bookings CRUD ---
    public async Task<PagedResult<BookingDto>> GetBookingsAsync(int? eventId, string? search, int pageNumber = 1, int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Bookings.AsNoTracking()
            .Include(b => b.Event)
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .Where(b => !b.IsDeleted);

        if (eventId.HasValue && eventId.Value > 0)
            query = query.Where(b => b.EventId == eventId.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(b => b.BookingRef.Contains(search) || b.CustomerEmail.Contains(search) || b.CustomerName.Contains(search));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(b => MapBookingToDto(b))
            .ToListAsync();

        return new PagedResult<BookingDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<BookingDto?> GetBookingByIdAsync(int id)
    {
        var b = await _context.Bookings.AsNoTracking()
            .Include(x => x.Event)
            .Include(x => x.TicketTier)
            .Include(x => x.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (b is null) return null;
        return MapBookingToDto(b);
    }

    public async Task<BookingDto> UpdateBookingStatusAsync(int id, UpdateBookingStatusDto dto)
    {
        var booking = await _context.Bookings
            .Include(b => b.Event)
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);

        if (booking is null) throw new KeyNotFoundException($"Booking '{id}' not found.");

        if (Enum.TryParse<BookingStatus>(dto.Status, true, out var status)) booking.Status = status;
        if (Enum.TryParse<PaymentStatus>(dto.PaymentStatus, true, out var payStatus)) booking.PaymentStatus = payStatus;

        await _context.SaveChangesAsync();
        return MapBookingToDto(booking);
    }

    private static BookingDto MapBookingToDto(Booking b) => new(
        b.Id,
        b.EventId,
        b.Event != null ? b.Event.Title : "",
        b.TicketTierId,
        b.TicketTier != null ? b.TicketTier.Name : "",
        b.BookingRef,
        b.CustomerName,
        b.CustomerEmail,
        b.CustomerPhone,
        b.Quantity,
        b.UnitPrice,
        b.TotalAmount,
        b.Status.ToString(),
        b.PaymentStatus.ToString(),
        b.PaymentMethod.ToString(),
        b.PaidAt,
        b.CreatedAt,
        b.BookingSeats != null ? b.BookingSeats.Select(bs => new BookingSeatDto(bs.Seat.Id, bs.Seat.Label, bs.Seat.Row, bs.Seat.Col, bs.Seat.Price)).ToList() : new List<BookingSeatDto>()
    );

    public async Task<bool> DeleteBookingAsync(int id)
    {
        var b = await _context.Bookings.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (b is null) return false;
        b.IsDeleted = true;
        b.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    // --- Tags CRUD ---
    public async Task<List<TagDto>> GetTagsAsync()
    {
        var list = await _context.Tags.AsNoTracking().Where(t => !t.IsDeleted).OrderBy(t => t.Name).ToListAsync();
        return list.Select(t => new TagDto(t.Id, t.Name, t.Slug)).ToList();
    }

    public async Task<TagDto> CreateTagAsync(CreateTagDto dto)
    {
        try
        {
            var nameClean = dto.Name.Trim();
            var slugClean = string.IsNullOrWhiteSpace(dto.Slug) ? nameClean.ToLower().Replace(" ", "-") : dto.Slug.Trim().ToLower();

            var exists = await _context.Tags.AnyAsync(t => !t.IsDeleted && (t.Name.ToLower() == nameClean.ToLower() || t.Slug == slugClean));
            if (exists)
                throw new InvalidOperationException($"Tag '{nameClean}' or slug '{slugClean}' already exists.");

            var tag = new Tag { Name = nameClean, Slug = slugClean };
            _context.Tags.Add(tag);
            await _context.SaveChangesAsync();
            return new TagDto(tag.Id, tag.Name, tag.Slug);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating tag {Name}", dto.Name);
            throw;
        }
        finally
        {
        }
    }

    public async Task<TagDto> UpdateTagAsync(int id, UpdateTagDto dto)
    {
        var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (tag is null) throw new KeyNotFoundException($"Tag '{id}' not found.");
        tag.Name = dto.Name.Trim();
        tag.Slug = dto.Slug.Trim().ToLower();
        await _context.SaveChangesAsync();
        return new TagDto(tag.Id, tag.Name, tag.Slug);
    }

    public async Task<bool> DeleteTagAsync(int id)
    {
        var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (tag is null) return false;
        tag.IsDeleted = true;
        tag.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    // --- Private Helpers ---
    private async Task<EventDetailDto> GetEventDetailDtoAsync(int eventId)
    {
        var ev = await _context.Events
            .AsNoTracking()
            .Include(e => e.Organizer)
            .Include(e => e.Country)
            .Include(e => e.City)
            .Include(e => e.Venue)
            .Include(e => e.Auditorium)
            .Include(e => e.Shows.Where(s => !s.IsDeleted).OrderBy(s => s.StartTimeUtc))
                .ThenInclude(s => s.TicketTiers.Where(t => !t.IsDeleted))
            .Include(e => e.TicketTiers.Where(t => !t.IsDeleted))
            .Include(e => e.SeatingZones.Where(z => !z.IsDeleted))
                .ThenInclude(z => z.Seats.Where(s => !s.IsDeleted))
            .Include(e => e.EventTags).ThenInclude(et => et.Tag)
            .FirstOrDefaultAsync(e => e.Id == eventId && !e.IsDeleted);

        if (ev is null)
            throw new KeyNotFoundException($"Event with ID '{eventId}' not found.");

        return new EventDetailDto(
            ev.Id,
            ev.Title,
            ev.Status.ToString(),
            ev.IsFeatured,
            ev.CountryId,
            ev.Country?.Name ?? "Pakistan",
            ev.CityId,
            ev.City?.Name ?? "Karachi",
            ev.VenueId,
            ev.Venue?.Name ?? "",
            ev.AuditoriumId,
            ev.Auditorium?.Name,
            ev.Address ?? ev.Venue?.Address,
            ev.StartDateUtc,
            ev.EndDateUtc,
            ev.PriceRange,
            ev.StartingPrice,
            ev.TicketingType.ToString(),
            FileUrlHelper.FormatEventBannerUrl(ev.Banner),
            ev.Description,
            ev.ScarcityText,
            new OrganizerDto(ev.Organizer.Id, ev.Organizer.Name, ev.Organizer.Email, ev.Organizer.Phone, FileUrlHelper.FormatOrganizerLogoUrl(ev.Organizer.LogoUrl), ev.Organizer.WebsiteUrl, ev.Organizer.IsVerified),
            ev.Shows.Select(s => new EventShowDto(
                s.Id,
                s.EventId,
                s.ShowTitle,
                s.StartTimeUtc,
                s.EndTimeUtc,
                s.TicketTiers.Select(t => new TicketTierDto(t.Id, t.EventId, t.EventShowId, t.Name, t.Description, t.Price, t.AvailableQuantity, t.SoldCount, t.MaxPerOrder, t.SortOrder, t.RowRange)).ToList()
            )).ToList(),
            ev.TicketTiers.Select(t => new TicketTierDto(t.Id, t.EventId, t.EventShowId, t.Name, t.Description, t.Price, t.AvailableQuantity, t.SoldCount, t.MaxPerOrder, t.SortOrder, t.RowRange)).ToList(),
            ev.SeatingZones.Select(z => new SeatingZoneDto(z.Id, z.EventId, z.Zone, z.Rows, z.Cols, z.Price, z.TotalCapacity, z.SortOrder, z.LayoutJson, z.Seats.Select(s => new SeatDto(s.Id, s.ZoneId, s.Row, s.Col, s.Label, s.Status.ToString(), s.Price)).ToList())).ToList(),
            ev.EventTags.Select(et => new TagDto(et.Tag.Id, et.Tag.Name, et.Tag.Slug)).ToList()
        );
    }

    private async Task SyncEventPricingAsync(int eventId)
    {
        var tiers = await _context.TicketTiers.Where(t => t.EventId == eventId && !t.IsDeleted).ToListAsync();
        var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId && !e.IsDeleted);

        if (ev == null) return;

        if (tiers.Any())
        {
            var minPrice = tiers.Min(t => t.Price);
            var maxPrice = tiers.Max(t => t.Price);

            ev.StartingPrice = minPrice;
            ev.PriceRange = minPrice == maxPrice
                ? $"PKR {minPrice:N0}"
                : $"PKR {minPrice:N0} - PKR {maxPrice:N0}";
        }
        await _context.SaveChangesAsync();
    }

    private async Task CreateSeatingZoneFromLayoutAsync(int eventId, string? layoutCodeOrName, decimal startingPrice)
    {
        Auditorium? layout = null;
        if (!string.IsNullOrWhiteSpace(layoutCodeOrName))
        {
            if (int.TryParse(layoutCodeOrName, out var parsedAudId))
            {
                layout = await _context.Auditoriums.AsNoTracking().FirstOrDefaultAsync(l => l.Id == parsedAudId && !l.IsDeleted);
            }
            if (layout == null)
            {
                layout = await _context.Auditoriums.AsNoTracking().FirstOrDefaultAsync(l => (l.LayoutCode == layoutCodeOrName || l.Name == layoutCodeOrName) && !l.IsDeleted);
            }
        }

        var zoneName = layout?.Name ?? "Main Auditorium Hall";
        var layoutJson = layout?.LayoutJson ?? layoutCodeOrName ?? "";
        var capacity = layout?.TotalCapacity ?? 200;

        var zone = new SeatingZone
        {
            EventId = eventId,
            Zone = zoneName,
            Rows = 10,
            Cols = 20,
            Price = startingPrice > 0 ? startingPrice : 2500m,
            SortOrder = 1,
            LayoutJson = layoutJson,
            TotalCapacity = capacity
        };

        GenerateSeatsForZone(zone, layoutJson);

        _context.SeatingZones.Add(zone);
        await _context.SaveChangesAsync();

        var shows = await _context.EventShows.Where(s => s.EventId == eventId && !s.IsDeleted).ToListAsync();
        foreach (var show in shows)
        {
            var existingTiers = await _context.TicketTiers.Where(t => t.EventId == eventId && t.EventShowId == show.Id && !t.IsDeleted).ToListAsync();
            if (!existingTiers.Any())
            {
                var basePrice = startingPrice > 0 ? startingPrice : 500m;
                var rowTiers = new[]
                {
                    new TicketTier { EventId = eventId, EventShowId = show.Id, Name = "Platinum - 1st Row", Description = "Front Row Platinum Seating", Price = basePrice * 3.0m, AvailableQuantity = 25, SortOrder = 1 },
                    new TicketTier { EventId = eventId, EventShowId = show.Id, Name = "Diamond - 2nd and 3rd Row", Description = "Premium Orchestra Seating", Price = basePrice * 2.0m, AvailableQuantity = 50, SortOrder = 2 },
                    new TicketTier { EventId = eventId, EventShowId = show.Id, Name = "Gold - 4th and 5th Row", Description = "Prime Mid-Hall Seating", Price = basePrice * 1.6m, AvailableQuantity = 50, SortOrder = 3 },
                    new TicketTier { EventId = eventId, EventShowId = show.Id, Name = "Bronze - 6th and 7th Row", Description = "Standard Center Seating", Price = basePrice * 1.4m, AvailableQuantity = 55, SortOrder = 4 },
                    new TicketTier { EventId = eventId, EventShowId = show.Id, Name = "Standard - 8th to 11th Row", Description = "Standard Admission Seating", Price = basePrice, AvailableQuantity = 100, SortOrder = 5 }
                };
                _context.TicketTiers.AddRange(rowTiers);
            }
        }
        await _context.SaveChangesAsync();
    }

    private static void GenerateSeatsForZone(SeatingZone zone, string? layoutJson)
    {
        zone.Seats.Clear();
        for (int r = 1; r <= zone.Rows; r++)
        {
            char rowChar = (char)('A' + r - 1);
            for (int c = 1; c <= zone.Cols; c++)
            {
                zone.Seats.Add(new Seat
                {
                    Zone = zone,
                    Row = r,
                    Col = c,
                    Label = $"{rowChar}{c}",
                    Status = SeatStatus.Available
                });
            }
        }
    }
}
