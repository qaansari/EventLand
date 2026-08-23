namespace EventLand.Infrastructure.Services;

using EventLand.Application.Common;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public class AdminService : IAdminService
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly IPasswordHasher<User> _passwordHasher;

    public AdminService(
        IApplicationDbContext context,
        ICacheService cacheService,
        IPasswordHasher<User> passwordHasher)
    {
        _context = context;
        _cacheService = cacheService;
        _passwordHasher = passwordHasher;
    }

    // --- Roles CRUD ---
    public async Task<List<RoleDto>> GetRolesAsync()
    {
        return await _context.Roles
            .AsNoTracking()
            .Where(r => !r.IsDeleted)
            .OrderBy(r => r.Id)
            .Select(r => new RoleDto(r.Id, r.Name, r.Description))
            .ToListAsync();
    }

    public async Task<RoleDto?> GetRoleByIdAsync(int id)
    {
        var r = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (r is null) return null;
        return new RoleDto(r.Id, r.Name, r.Description);
    }

    public async Task<RoleDto> CreateRoleAsync(CreateRoleDto dto)
    {
        var role = new Role
        {
            Name = dto.Name,
            Description = dto.Description
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        return new RoleDto(role.Id, role.Name, role.Description);
    }

    public async Task<RoleDto> UpdateRoleAsync(int id, UpdateRoleDto dto)
    {
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        if (role is null)
            throw new KeyNotFoundException($"Role '{id}' not found.");

        role.Name = dto.Name;
        role.Description = dto.Description;

        await _context.SaveChangesAsync();

        return new RoleDto(role.Id, role.Name, role.Description);
    }

    public async Task<bool> DeleteRoleAsync(int id)
    {
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        if (role is null) return false;

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

        var query = _context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Where(u => !u.IsDeleted);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserDto(
                u.Id,
                u.Email,
                u.FullName,
                u.Role.Name,
                u.LastLoginAt
            ))
            .ToListAsync();

        return new PagedResult<UserDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<UserDto?> GetUserByIdAsync(int id)
    {
        var u = await _context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (u is null) return null;

        return new UserDto(u.Id, u.Email, u.FullName, u.Role.Name, u.LastLoginAt);
    }

    public async Task<UserDto> CreateUserAsync(CreateUserDto dto)
    {
        var user = new User
        {
            Email = dto.Email,
            FullName = dto.FullName,
            RoleId = dto.RoleId,
            PhoneNumber = dto.PhoneNumber,
            IsActive = true
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return await GetUserByIdAsync(user.Id)
            ?? throw new InvalidOperationException("Failed to load created user.");
    }

    public async Task<UserDto> UpdateUserAsync(int id, UpdateUserDto dto)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);

        if (user is null)
            throw new KeyNotFoundException($"User '{id}' not found.");

        user.FullName = dto.FullName;
        user.RoleId = dto.RoleId;
        user.PhoneNumber = dto.PhoneNumber;
        user.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        return await GetUserByIdAsync(id)
            ?? throw new InvalidOperationException("Failed to load updated user.");
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
            .Include(e => e.Shows.Where(s => !s.IsDeleted).OrderBy(s => s.StartTimeUtc))
            .Include(e => e.EventTags).ThenInclude(et => et.Tag)
            .Where(e => !e.IsDeleted);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new EventSummaryDto(
                e.Id,
                e.Title,
                e.Category,
                e.Status.ToString(),
                e.IsFeatured,
                e.City,
                e.Venue,
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

    public async Task<EventDetailDto> CreateEventAsync(CreateAdminEventDto dto)
    {
        Enum.TryParse<TicketingType>(dto.TicketingType, true, out var ticketingType);
        Enum.TryParse<EventStatus>(dto.Status ?? "Live", true, out var status);

        var organizerExists = await _context.Organizers.AnyAsync(o => o.Id == dto.OrganizerId && !o.IsDeleted);
        var organizerId = organizerExists 
            ? dto.OrganizerId 
            : (await _context.Organizers.Where(o => !o.IsDeleted).Select(o => o.Id).FirstOrDefaultAsync());

        if (organizerId == 0)
        {
            var defaultOrg = new Organizer
            {
                Name = "Event Land",
                Email = "support@eventland.pk",
                Phone = "+92 307 9353185",
                WebsiteUrl = "https://eventland.pk",
                IsVerified = true
            };
            _context.Organizers.Add(defaultOrg);
            await _context.SaveChangesAsync();
            organizerId = defaultOrg.Id;
        }

        var exists = await _context.Events.AnyAsync(e => 
            e.Title.ToLower() == dto.Title.ToLower() && 
            e.Venue.ToLower() == dto.Venue.ToLower() && 
            e.StartDateUtc == dto.StartDateUtc && 
            !e.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"An event titled '{dto.Title}' at venue '{dto.Venue}' starting at '{dto.StartDateUtc:g}' already exists.");

        var ev = new Event
        {
            Title = dto.Title,
            Category = dto.Category,
            City = dto.City,
            Venue = dto.Venue,
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
                            SortOrder = sort++
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
            await CreateSeatingZoneFromLayoutAsync(ev.Id, dto.AuditoriumLayout, dto.StartingPrice);
        }

        await _cacheService.ClearEventCacheAsync(ev.Id);

        return await GetEventDetailDtoAsync(ev.Id);
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

        var exists = await _context.Events.AnyAsync(e => 
            e.Title.ToLower() == dto.Title.ToLower() && 
            e.Venue.ToLower() == dto.Venue.ToLower() && 
            e.StartDateUtc == dto.StartDateUtc && 
            !e.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"An event titled '{dto.Title}' at venue '{dto.Venue}' starting at '{dto.StartDateUtc:g}' already exists.");

        ev.Title = dto.Title;
        ev.Category = dto.Category;
        ev.Status = status;
        ev.IsFeatured = dto.IsFeatured;
        ev.IsPublished = dto.IsPublished;
        ev.City = dto.City;
        ev.Venue = dto.Venue;
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
                ev.EventTags.Add(new EventTag { EventId = id, TagId = tagId });
            }
        }

        // Update shows & show ticket tiers
        if (dto.Shows is not null)
        {
            var existingShows = await _context.EventShows.Where(s => s.EventId == id && !s.IsDeleted).ToListAsync();
            foreach (var s in existingShows)
            {
                s.IsDeleted = true;
                s.DeletedAt = DateTimeOffset.UtcNow;
            }
            await _context.SaveChangesAsync();

            if (dto.Shows.Any())
            {
                foreach (var sInput in dto.Shows)
                {
                    var show = new EventShow
                    {
                        EventId = id,
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
                                EventId = id,
                                EventShowId = show.Id,
                                Name = tInput.Name,
                                Description = tInput.Description ?? $"{tInput.Name} pass for {show.ShowTitle}",
                                Price = tInput.Price > 0 ? tInput.Price : (dto.StartingPrice > 0 ? dto.StartingPrice : 1500m),
                                AvailableQuantity = tInput.AvailableQuantity > 0 ? tInput.AvailableQuantity : 100,
                                SortOrder = sort++
                            });
                        }
                    }
                    else if (ticketingType == TicketingType.Categorized)
                    {
                        var basePrice = sInput.StartingPrice ?? (dto.StartingPrice > 0 ? dto.StartingPrice : 1500m);
                        _context.TicketTiers.Add(new TicketTier
                        {
                            EventId = id,
                            EventShowId = show.Id,
                            Name = "Standard Pass",
                            Description = $"Standard admission pass for {show.ShowTitle}",
                            Price = basePrice,
                            AvailableQuantity = 150,
                            SortOrder = 1
                        });
                        _context.TicketTiers.Add(new TicketTier
                        {
                            EventId = id,
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
                    EventId = id,
                    ShowTitle = "Standard Performance",
                    StartTimeUtc = ev.StartDateUtc,
                    EndTimeUtc = ev.EndDateUtc
                };
                _context.EventShows.Add(defaultShow);
                await _context.SaveChangesAsync();

                if (ticketingType == TicketingType.Categorized)
                {
                    var basePrice = dto.StartingPrice > 0 ? dto.StartingPrice : 1500m;
                    _context.TicketTiers.Add(new TicketTier
                    {
                        EventId = id,
                        EventShowId = defaultShow.Id,
                        Name = "Standard Pass",
                        Description = "Standard admission pass",
                        Price = basePrice,
                        AvailableQuantity = 150,
                        SortOrder = 1
                    });
                    _context.TicketTiers.Add(new TicketTier
                    {
                        EventId = id,
                        EventShowId = defaultShow.Id,
                        Name = "VIP Pass",
                        Description = "VIP fast-track pass",
                        Price = basePrice * 2.25m,
                        AvailableQuantity = 50,
                        SortOrder = 2
                    });
                }
            }
        }

        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(id);

        return await GetEventDetailDtoAsync(id);
    }

    public async Task<bool> DeleteEventAsync(int id)
    {
        var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
        if (ev is null) return false;

        ev.IsDeleted = true;
        ev.DeletedAt = DateTimeOffset.UtcNow;
        TryDeleteLocalFile(ev.Banner);
        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(id);
        return true;
    }

    // --- Organizers CRUD ---
    public async Task<List<OrganizerDto>> GetOrganizersAsync()
    {
        var list = await _context.Organizers
            .AsNoTracking()
            .Where(o => !o.IsDeleted)
            .OrderBy(o => o.Name)
            .ToListAsync();

        return list.Select(o => new OrganizerDto(
            o.Id, 
            o.Name, 
            o.Email, 
            o.Phone, 
            FileUrlHelper.FormatOrganizerLogoUrl(o.LogoUrl), 
            o.WebsiteUrl, 
            o.IsVerified
        )).ToList();
    }

    public async Task<OrganizerDto?> GetOrganizerByIdAsync(int id)
    {
        var o = await _context.Organizers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (o is null) return null;

        return new OrganizerDto(
            o.Id, 
            o.Name, 
            o.Email, 
            o.Phone, 
            FileUrlHelper.FormatOrganizerLogoUrl(o.LogoUrl), 
            o.WebsiteUrl, 
            o.IsVerified
        );
    }

    public async Task<OrganizerDto> CreateOrganizerAsync(CreateOrganizerDto dto)
    {
        var exists = await _context.Organizers.AnyAsync(o => 
            (o.Name.ToLower() == dto.Name.ToLower() || (!string.IsNullOrEmpty(dto.Email) && o.Email.ToLower() == dto.Email.ToLower())) && !o.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"An organizer with the name '{dto.Name}' or email '{dto.Email}' already exists.");

        var fileNameOnly = FileUrlHelper.ExtractFileName(dto.LogoUrl);

        var org = new Organizer
        {
            Name = dto.Name,
            Email = dto.Email,
            Phone = dto.Phone,
            LogoUrl = fileNameOnly,
            WebsiteUrl = dto.WebsiteUrl,
            IsVerified = dto.IsVerified
        };

        _context.Organizers.Add(org);
        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync();

        return new OrganizerDto(
            org.Id, 
            org.Name, 
            org.Email, 
            org.Phone, 
            FileUrlHelper.FormatOrganizerLogoUrl(org.LogoUrl), 
            org.WebsiteUrl, 
            org.IsVerified
        );
    }

    public async Task<OrganizerDto> UpdateOrganizerAsync(int id, UpdateOrganizerDto dto)
    {
        var org = await _context.Organizers.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);
        if (org is null)
            throw new KeyNotFoundException($"Organizer '{id}' not found.");

        var exists = await _context.Organizers.AnyAsync(o => 
            o.Id != id && (o.Name.ToLower() == dto.Name.ToLower() || (!string.IsNullOrEmpty(dto.Email) && o.Email.ToLower() == dto.Email.ToLower())) && !o.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"An organizer with the name '{dto.Name}' or email '{dto.Email}' already exists.");

        var newFileNameOnly = FileUrlHelper.ExtractFileName(dto.LogoUrl);

        org.Name = dto.Name;
        org.Email = dto.Email;
        org.Phone = dto.Phone;

        if (!string.Equals(org.LogoUrl, newFileNameOnly, StringComparison.OrdinalIgnoreCase))
        {
            TryDeleteLocalFile(org.LogoUrl);
            org.LogoUrl = newFileNameOnly;
        }

        org.WebsiteUrl = dto.WebsiteUrl;
        org.IsVerified = dto.IsVerified;

        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync();

        return new OrganizerDto(
            org.Id, 
            org.Name, 
            org.Email, 
            org.Phone, 
            FileUrlHelper.FormatOrganizerLogoUrl(org.LogoUrl), 
            org.WebsiteUrl, 
            org.IsVerified
        );
    }

    public async Task<bool> DeleteOrganizerAsync(int id)
    {
        var org = await _context.Organizers.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);
        if (org is null) return false;

        org.IsDeleted = true;
        org.DeletedAt = DateTimeOffset.UtcNow;
        TryDeleteLocalFile(org.LogoUrl);
        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync();
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
            .Select(a => new ArtistDto(
                a.Id, a.Name, a.Genre, a.Role, a.City, a.ImageUrl, a.Bio,
                a.Availability, a.StartingRate, a.Rating, a.ShowsDone, a.IsFeatured
            ))
            .ToListAsync();

        return new PagedResult<ArtistDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<ArtistDto?> GetArtistByIdAsync(int id)
    {
        var a = await _context.Artists.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (a is null) return null;

        return new ArtistDto(
            a.Id, a.Name, a.Genre, a.Role, a.City, a.ImageUrl, a.Bio,
            a.Availability, a.StartingRate, a.Rating, a.ShowsDone, a.IsFeatured
        );
    }

    public async Task<ArtistDto> CreateArtistAsync(CreateArtistDto dto)
    {
        var exists = await _context.Artists.AnyAsync(a => a.Name.ToLower() == dto.Name.ToLower() && !a.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"An artist named '{dto.Name}' already exists.");

        var artist = new Artist
        {
            Name = dto.Name,
            Genre = dto.Genre,
            Role = dto.Role,
            City = dto.City,
            ImageUrl = dto.ImageUrl,
            Bio = dto.Bio,
            Availability = dto.Availability,
            StartingRate = dto.StartingRate,
            Rating = dto.Rating,
            ShowsDone = dto.ShowsDone,
            IsFeatured = dto.IsFeatured
        };

        _context.Artists.Add(artist);
        await _context.SaveChangesAsync();

        return new ArtistDto(
            artist.Id, artist.Name, artist.Genre, artist.Role, artist.City, artist.ImageUrl,
            artist.Bio, artist.Availability, artist.StartingRate, artist.Rating, artist.ShowsDone, artist.IsFeatured
        );
    }

    public async Task<ArtistDto> UpdateArtistAsync(int id, UpdateArtistDto dto)
    {
        var artist = await _context.Artists.FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
        if (artist is null)
            throw new KeyNotFoundException($"Artist '{id}' not found.");

        var exists = await _context.Artists.AnyAsync(a => a.Id != id && a.Name.ToLower() == dto.Name.ToLower() && !a.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"An artist named '{dto.Name}' already exists.");

        artist.Name = dto.Name;
        artist.Genre = dto.Genre;
        artist.Role = dto.Role;
        artist.City = dto.City;
        artist.ImageUrl = dto.ImageUrl;
        artist.Bio = dto.Bio;
        artist.Availability = dto.Availability;
        artist.StartingRate = dto.StartingRate;
        artist.Rating = dto.Rating;
        artist.ShowsDone = dto.ShowsDone;
        artist.IsFeatured = dto.IsFeatured;

        await _context.SaveChangesAsync();

        return new ArtistDto(
            artist.Id, artist.Name, artist.Genre, artist.Role, artist.City, artist.ImageUrl,
            artist.Bio, artist.Availability, artist.StartingRate, artist.Rating, artist.ShowsDone, artist.IsFeatured
        );
    }

    public async Task<bool> DeleteArtistAsync(int id)
    {
        var artist = await _context.Artists.FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
        if (artist is null) return false;

        artist.IsDeleted = true;
        artist.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    // --- TicketTiers CRUD ---
    public async Task<TicketTierDto> CreateTicketTierAsync(CreateTicketTierDto dto)
    {
        var exists = await _context.TicketTiers.AnyAsync(t => t.EventId == dto.EventId && t.EventShowId == dto.EventShowId && t.Name.ToLower() == dto.Name.ToLower() && !t.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"A ticket tier named '{dto.Name}' already exists for this show.");

        var tier = new TicketTier
        {
            EventId = dto.EventId,
            EventShowId = dto.EventShowId,
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            AvailableQuantity = dto.AvailableQuantity,
            MaxPerOrder = dto.MaxPerOrder,
            SortOrder = dto.SortOrder
        };

        _context.TicketTiers.Add(tier);
        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(dto.EventId);

        return new TicketTierDto(tier.Id, tier.EventId, tier.EventShowId, tier.Name, tier.Description, tier.Price, tier.AvailableQuantity, tier.SoldCount, tier.MaxPerOrder, tier.SortOrder);
    }

    public async Task<TicketTierDto> UpdateTicketTierAsync(int id, UpdateTicketTierDto dto)
    {
        var tier = await _context.TicketTiers.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (tier is null)
            throw new KeyNotFoundException($"Ticket tier '{id}' not found.");

        var exists = await _context.TicketTiers.AnyAsync(t => t.Id != id && t.EventId == tier.EventId && t.EventShowId == dto.EventShowId && t.Name.ToLower() == dto.Name.ToLower() && !t.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"A ticket tier named '{dto.Name}' already exists for this show.");

        tier.EventShowId = dto.EventShowId;
        tier.Name = dto.Name;
        tier.Description = dto.Description;
        tier.Price = dto.Price;
        tier.AvailableQuantity = dto.AvailableQuantity;
        tier.MaxPerOrder = dto.MaxPerOrder;
        tier.SortOrder = dto.SortOrder;

        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(tier.EventId);

        return new TicketTierDto(tier.Id, tier.EventId, tier.EventShowId, tier.Name, tier.Description, tier.Price, tier.AvailableQuantity, tier.SoldCount, tier.MaxPerOrder, tier.SortOrder);
    }

    public async Task<bool> DeleteTicketTierAsync(int id)
    {
        var tier = await _context.TicketTiers.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (tier is null) return false;

        tier.IsDeleted = true;
        tier.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
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
            LayoutJson = dto.LayoutJson,
            TotalCapacity = dto.Rows * dto.Cols
        };

        GenerateSeatsForZone(zone, dto.LayoutJson);
        if (zone.Seats.Any())
        {
            zone.TotalCapacity = zone.Seats.Count;
        }

        _context.SeatingZones.Add(zone);
        await _context.SaveChangesAsync();

        return new SeatingZoneDto(
            zone.Id,
            zone.EventId,
            zone.Zone,
            zone.Rows,
            zone.Cols,
            zone.Price,
            zone.TotalCapacity,
            zone.SortOrder,
            zone.LayoutJson,
            zone.Seats.Select(s => new SeatDto(s.Id, s.ZoneId, s.Row, s.Col, s.Label, s.Status.ToString())).ToList()
        );
    }

    public async Task<SeatingZoneDto> UpdateSeatingZoneAsync(int id, UpdateSeatingZoneDto dto)
    {
        var zone = await _context.SeatingZones
            .Include(z => z.Seats)
            .FirstOrDefaultAsync(z => z.Id == id && !z.IsDeleted);

        if (zone is null)
            throw new KeyNotFoundException($"Seating zone '{id}' not found.");

        zone.Zone = dto.Zone;
        zone.Price = dto.Price;
        zone.SortOrder = dto.SortOrder;
        if (!string.IsNullOrEmpty(dto.LayoutJson)) zone.LayoutJson = dto.LayoutJson;

        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(zone.EventId);

        return new SeatingZoneDto(
            zone.Id, zone.EventId, zone.Zone, zone.Rows, zone.Cols, zone.Price, zone.TotalCapacity, zone.SortOrder, zone.LayoutJson,
            zone.Seats.Select(s => new SeatDto(s.Id, s.ZoneId, s.Row, s.Col, s.Label, s.Status.ToString())).ToList()
        );
    }

    public async Task<bool> DeleteSeatingZoneAsync(int id)
    {
        var zone = await _context.SeatingZones.FirstOrDefaultAsync(z => z.Id == id && !z.IsDeleted);
        if (zone is null) return false;

        zone.IsDeleted = true;
        zone.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(zone.EventId);
        return true;
    }

    // --- Bookings CRUD ---
    public async Task<PagedResult<BookingDto>> GetBookingsAsync(int? eventId, string? search, int pageNumber = 1, int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Bookings
            .AsNoTracking()
            .Include(b => b.Event)
            .Include(b => b.TicketTier)
            .Include(b => b.BookingSeats).ThenInclude(bs => bs.Seat)
            .Where(b => !b.IsDeleted);

        if (eventId.HasValue)
            query = query.Where(b => b.EventId == eventId.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(b => b.CustomerEmail.Contains(search) || b.BookingRef.Contains(search) || b.CustomerName.Contains(search));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new BookingDto(
                b.Id, b.EventId, b.Event.Title, b.TicketTierId, b.TicketTier.Name, b.BookingRef,
                b.CustomerName, b.CustomerEmail, b.CustomerPhone, b.Quantity, b.UnitPrice, b.TotalAmount,
                b.Status.ToString(), b.PaymentStatus.ToString(), b.PaymentMethod.ToString(), b.PaidAt, b.CreatedAt,
                b.BookingSeats.Select(bs => new SeatDto(bs.Seat.Id, bs.Seat.ZoneId, bs.Seat.Row, bs.Seat.Col, bs.Seat.Label, bs.Seat.Status.ToString())).ToList()
            ))
            .ToListAsync();

        return new PagedResult<BookingDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<BookingDto?> GetBookingByIdAsync(int id)
    {
        var b = await _context.Bookings
            .AsNoTracking()
            .Include(x => x.Event)
            .Include(x => x.TicketTier)
            .Include(x => x.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (b is null) return null;

        return new BookingDto(
            b.Id, b.EventId, b.Event.Title, b.TicketTierId, b.TicketTier.Name, b.BookingRef,
            b.CustomerName, b.CustomerEmail, b.CustomerPhone, b.Quantity, b.UnitPrice, b.TotalAmount,
            b.Status.ToString(), b.PaymentStatus.ToString(), b.PaymentMethod.ToString(), b.PaidAt, b.CreatedAt,
            b.BookingSeats.Select(bs => new SeatDto(bs.Seat.Id, bs.Seat.ZoneId, bs.Seat.Row, bs.Seat.Col, bs.Seat.Label, bs.Seat.Status.ToString())).ToList()
        );
    }

    public async Task<BookingDto> UpdateBookingStatusAsync(int id, UpdateBookingStatusDto dto)
    {
        var b = await _context.Bookings
            .Include(x => x.Event)
            .Include(x => x.TicketTier)
            .Include(x => x.BookingSeats).ThenInclude(bs => bs.Seat)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (b is null)
            throw new KeyNotFoundException($"Booking '{id}' not found.");

        if (Enum.TryParse<BookingStatus>(dto.Status, true, out var status)) b.Status = status;
        if (Enum.TryParse<PaymentStatus>(dto.PaymentStatus, true, out var payStatus)) b.PaymentStatus = payStatus;

        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(b.EventId);

        return new BookingDto(
            b.Id, b.EventId, b.Event.Title, b.TicketTierId, b.TicketTier.Name, b.BookingRef,
            b.CustomerName, b.CustomerEmail, b.CustomerPhone, b.Quantity, b.UnitPrice, b.TotalAmount,
            b.Status.ToString(), b.PaymentStatus.ToString(), b.PaymentMethod.ToString(), b.PaidAt, b.CreatedAt,
            b.BookingSeats.Select(bs => new SeatDto(bs.Seat.Id, bs.Seat.ZoneId, bs.Seat.Row, bs.Seat.Col, bs.Seat.Label, bs.Seat.Status.ToString())).ToList()
        );
    }

    public async Task<bool> DeleteBookingAsync(int id)
    {
        var b = await _context.Bookings.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (b is null) return false;

        b.IsDeleted = true;
        b.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync(b.EventId);
        return true;
    }

    // --- Tags CRUD ---
    public async Task<List<TagDto>> GetTagsAsync()
    {
        return await _context.Tags
            .AsNoTracking()
            .Where(t => !t.IsDeleted)
            .OrderBy(t => t.Name)
            .Select(t => new TagDto(t.Id, t.Name, t.Slug))
            .ToListAsync();
    }

    public async Task<TagDto> CreateTagAsync(CreateTagDto dto)
    {
        var exists = await _context.Tags.AnyAsync(t => (t.Name.ToLower() == dto.Name.ToLower() || t.Slug.ToLower() == dto.Slug.ToLower()) && !t.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"A tag with the name '{dto.Name}' or slug '{dto.Slug}' already exists.");

        var tag = new Tag { Name = dto.Name, Slug = dto.Slug };
        _context.Tags.Add(tag);
        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync();
        return new TagDto(tag.Id, tag.Name, tag.Slug);
    }

    public async Task<TagDto> UpdateTagAsync(int id, UpdateTagDto dto)
    {
        var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (tag is null)
            throw new KeyNotFoundException($"Tag '{id}' not found.");

        var exists = await _context.Tags.AnyAsync(t => t.Id != id && (t.Name.ToLower() == dto.Name.ToLower() || t.Slug.ToLower() == dto.Slug.ToLower()) && !t.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"A tag with the name '{dto.Name}' or slug '{dto.Slug}' already exists.");

        tag.Name = dto.Name;
        tag.Slug = dto.Slug;
        await _context.SaveChangesAsync();
        await _cacheService.ClearEventCacheAsync();
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

    private async Task<EventDetailDto> GetEventDetailDtoAsync(int eventId)
    {
        var ev = await _context.Events
            .AsNoTracking()
            .Include(e => e.Organizer)
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
            ev.Category,
            ev.Status.ToString(),
            ev.IsFeatured,
            ev.City,
            ev.Venue,
            ev.Address,
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
                s.TicketTiers.Select(t => new TicketTierDto(t.Id, t.EventId, t.EventShowId, t.Name, t.Description, t.Price, t.AvailableQuantity, t.SoldCount, t.MaxPerOrder, t.SortOrder)).ToList()
            )).ToList(),
            ev.TicketTiers.Select(t => new TicketTierDto(t.Id, t.EventId, t.EventShowId, t.Name, t.Description, t.Price, t.AvailableQuantity, t.SoldCount, t.MaxPerOrder, t.SortOrder)).ToList(),
            ev.SeatingZones.Select(z => new SeatingZoneDto(z.Id, z.EventId, z.Zone, z.Rows, z.Cols, z.Price, z.TotalCapacity, z.SortOrder, z.LayoutJson, z.Seats.Select(s => new SeatDto(s.Id, s.ZoneId, s.Row, s.Col, s.Label, s.Status.ToString())).ToList())).ToList(),
            ev.EventTags.Select(et => new TagDto(et.Tag.Id, et.Tag.Name, et.Tag.Slug)).ToList()
        );
    }

    // --- Auditorium Layouts CRUD ---
    public async Task<List<AuditoriumLayoutDto>> GetAuditoriumLayoutsAsync(bool activeOnly = false)
    {
        var query = _context.AuditoriumLayouts.AsNoTracking().Where(a => !a.IsDeleted);
        if (activeOnly)
        {
            query = query.Where(a => a.IsActive);
        }

        var list = await query.OrderBy(a => a.Name).ToListAsync();
        return list.Select(a => new AuditoriumLayoutDto(
            a.Id, a.Name, a.Venue, a.City, a.LayoutCode, a.TotalCapacity, a.Description, a.LayoutJson, a.IsActive
        )).ToList();
    }

    public async Task<AuditoriumLayoutDto?> GetAuditoriumLayoutByIdAsync(int id)
    {
        var a = await _context.AuditoriumLayouts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (a is null) return null;

        return new AuditoriumLayoutDto(
            a.Id, a.Name, a.Venue, a.City, a.LayoutCode, a.TotalCapacity, a.Description, a.LayoutJson, a.IsActive
        );
    }

    public async Task<AuditoriumLayoutDto> CreateAuditoriumLayoutAsync(CreateAuditoriumLayoutDto dto)
    {
        var layoutCode = !string.IsNullOrWhiteSpace(dto.LayoutCode)
            ? dto.LayoutCode.Trim().ToUpperInvariant().Replace(" ", "_")
            : dto.Name.Trim().ToUpperInvariant().Replace(" ", "_");

        var exists = await _context.AuditoriumLayouts.AnyAsync(a => (a.LayoutCode.ToLower() == layoutCode.ToLower() || a.Name.ToLower() == dto.Name.ToLower()) && !a.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"An auditorium layout with code '{layoutCode}' or name '{dto.Name}' already exists.");

        var layout = new AuditoriumLayout
        {
            Name = dto.Name,
            Venue = dto.Venue,
            City = dto.City,
            LayoutCode = layoutCode,
            TotalCapacity = dto.TotalCapacity,
            Description = dto.Description,
            LayoutJson = dto.LayoutJson,
            IsActive = dto.IsActive
        };

        _context.AuditoriumLayouts.Add(layout);
        await _context.SaveChangesAsync();

        return new AuditoriumLayoutDto(
            layout.Id, layout.Name, layout.Venue, layout.City, layout.LayoutCode, layout.TotalCapacity, layout.Description, layout.LayoutJson, layout.IsActive
        );
    }

    public async Task<AuditoriumLayoutDto> UpdateAuditoriumLayoutAsync(int id, UpdateAuditoriumLayoutDto dto)
    {
        var layout = await _context.AuditoriumLayouts.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (layout is null)
            throw new KeyNotFoundException($"Auditorium layout with ID '{id}' not found.");

        var layoutCode = !string.IsNullOrWhiteSpace(dto.LayoutCode)
            ? dto.LayoutCode.Trim().ToUpperInvariant().Replace(" ", "_")
            : dto.Name.Trim().ToUpperInvariant().Replace(" ", "_");

        var exists = await _context.AuditoriumLayouts.AnyAsync(a => a.Id != id && (a.LayoutCode.ToLower() == layoutCode.ToLower() || a.Name.ToLower() == dto.Name.ToLower()) && !a.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"An auditorium layout with code '{layoutCode}' or name '{dto.Name}' already exists.");

        layout.Name = dto.Name;
        layout.Venue = dto.Venue;
        layout.City = dto.City;
        if (!string.IsNullOrWhiteSpace(dto.LayoutCode))
        {
            layout.LayoutCode = dto.LayoutCode.Trim().ToUpperInvariant().Replace(" ", "_");
        }
        layout.TotalCapacity = dto.TotalCapacity;
        layout.Description = dto.Description;
        layout.LayoutJson = dto.LayoutJson;
        layout.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        return new AuditoriumLayoutDto(
            layout.Id, layout.Name, layout.Venue, layout.City, layout.LayoutCode, layout.TotalCapacity, layout.Description, layout.LayoutJson, layout.IsActive
        );
    }

    public async Task<bool> DeleteAuditoriumLayoutAsync(int id)
    {
        var layout = await _context.AuditoriumLayouts.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (layout is null) return false;

        layout.IsDeleted = true;
        layout.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task CreateSeatingZoneFromLayoutAsync(int eventId, string? layoutCodeOrName, decimal startingPrice)
    {
        AuditoriumLayout? layout = null;
        if (!string.IsNullOrWhiteSpace(layoutCodeOrName))
        {
            layout = await _context.AuditoriumLayouts
                .AsNoTracking()
                .FirstOrDefaultAsync(l => (l.LayoutCode == layoutCodeOrName || l.Name == layoutCodeOrName) && !l.IsDeleted);
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

        // Check if event shows exist and if TicketTiers are missing, generate row-lane TicketTiers automatically!
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
        if (string.IsNullOrWhiteSpace(layoutJson))
        {
            GenerateDefaultGridSeats(zone, zone.Rows, zone.Cols);
            return;
        }

        if (layoutJson.TrimStart().StartsWith("{") || layoutJson.TrimStart().StartsWith("["))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(layoutJson);
                var root = doc.RootElement;
                
                // Case A: Multi-section layout (e.g. { "sections": [ { "rows": [...] } ] })
                if (root.ValueKind == System.Text.Json.JsonValueKind.Object && root.TryGetProperty("sections", out var sectionsProp) && sectionsProp.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    int rowIndex = 1;
                    foreach (var secEl in sectionsProp.EnumerateArray())
                    {
                        if (secEl.TryGetProperty("rows", out var secRows) && secRows.ValueKind == System.Text.Json.JsonValueKind.Array)
                        {
                            foreach (var rowEl in secRows.EnumerateArray())
                            {
                                AddSeatsFromRowElement(zone, rowEl, rowIndex++);
                            }
                        }
                    }
                    if (zone.Seats.Any()) return;
                }

                // Case B: Direct rows array (e.g. { "rows": [...] })
                if (root.ValueKind == System.Text.Json.JsonValueKind.Object && root.TryGetProperty("rows", out var rowsProp) && rowsProp.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    int rowIndex = 1;
                    foreach (var rowEl in rowsProp.EnumerateArray())
                    {
                        AddSeatsFromRowElement(zone, rowEl, rowIndex++);
                    }
                    if (zone.Seats.Any()) return;
                }
            }
            catch
            {
                // Fallback to default grid below
            }
        }

        GenerateDefaultGridSeats(zone, zone.Rows, zone.Cols);
    }

    private static void AddSeatsFromRowElement(SeatingZone zone, System.Text.Json.JsonElement rowEl, int rowIndex)
    {
        var rowChar = rowEl.TryGetProperty("rowChar", out var rc) ? rc.GetString() ?? $"{rowIndex}" : $"{rowIndex}";
        var seatNumbers = new List<int>();

        if (rowEl.TryGetProperty("blocks", out var blocksProp) && blocksProp.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            foreach (var block in blocksProp.EnumerateArray())
            {
                if (block.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var s in block.EnumerateArray()) if (s.TryGetInt32(out var num)) seatNumbers.Add(num);
                }
            }
        }
        if (rowEl.TryGetProperty("left", out var leftProp) && leftProp.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            foreach (var s in leftProp.EnumerateArray()) if (s.TryGetInt32(out var num)) seatNumbers.Add(num);
        }
        if (rowEl.TryGetProperty("centerLeft", out var clProp) && clProp.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            foreach (var s in clProp.EnumerateArray()) if (s.TryGetInt32(out var num)) seatNumbers.Add(num);
        }
        if (rowEl.TryGetProperty("centerRight", out var crProp) && crProp.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            foreach (var s in crProp.EnumerateArray()) if (s.TryGetInt32(out var num)) seatNumbers.Add(num);
        }
        if (rowEl.TryGetProperty("center", out var centerProp) && centerProp.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            foreach (var s in centerProp.EnumerateArray()) if (s.TryGetInt32(out var num)) seatNumbers.Add(num);
        }
        if (rowEl.TryGetProperty("right", out var rightProp) && rightProp.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            foreach (var s in rightProp.EnumerateArray()) if (s.TryGetInt32(out var num)) seatNumbers.Add(num);
        }
        if (rowEl.TryGetProperty("seats", out var seatsProp) && seatsProp.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            foreach (var s in seatsProp.EnumerateArray()) if (s.TryGetInt32(out var num)) seatNumbers.Add(num);
        }

        if (!seatNumbers.Any() && rowEl.TryGetProperty("count", out var countProp) && countProp.TryGetInt32(out var count))
        {
            for (int i = 1; i <= count; i++) seatNumbers.Add(i);
        }

        int colIndex = 1;
        foreach (var num in seatNumbers)
        {
            zone.Seats.Add(new Seat
            {
                Zone = zone,
                Row = rowIndex,
                Col = colIndex++,
                Label = $"{rowChar}{num}",
                Status = SeatStatus.Available
            });
        }
    }

    private static void GenerateDefaultGridSeats(SeatingZone zone, int rows, int cols)
    {
        for (int r = 1; r <= rows; r++)
        {
            char rowChar = (char)('A' + r - 1);
            for (int c = 1; c <= cols; c++)
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

    private static void TryDeleteLocalFile(string? relativeUrl)
    {
        if (string.IsNullOrWhiteSpace(relativeUrl)) return;
        try
        {
            var fileName = Path.GetFileName(relativeUrl);
            if (string.IsNullOrEmpty(fileName)) return;

            var webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var candidatePaths = new[]
            {
                Path.Combine(webRootPath, "assets", "images", "organizers", fileName),
                Path.Combine(webRootPath, "assets", "images", "events", fileName),
                Path.Combine(webRootPath, "uploads", fileName),
                Path.Combine(webRootPath, relativeUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar))
            };

            foreach (var localPath in candidatePaths)
            {
                if (File.Exists(localPath))
                {
                    File.Delete(localPath);
                }
            }
        }
        catch
        {
            // Ignore file deletion errors safely
        }
    }
}

