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
                e.Banner,
                e.ScarcityText,
                e.Organizer.Name,
                e.EventTags.Select(et => new TagDto(et.Tag.Id, et.Tag.Name, et.Tag.Slug)).ToList()
            ))
            .ToListAsync();

        return new PagedResult<EventSummaryDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<EventDetailDto> CreateEventAsync(CreateAdminEventDto dto)
    {
        Enum.TryParse<TicketingType>(dto.TicketingType, true, out var ticketingType);

        var ev = new Event
        {
            Title = dto.Title,
            Category = dto.Category,
            City = dto.City,
            Venue = dto.Venue,
            Address = dto.Address,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            StartDateUtc = dto.StartDateUtc,
            EndDateUtc = dto.EndDateUtc,
            PriceRange = $"PKR {dto.StartingPrice:N0}+",
            StartingPrice = dto.StartingPrice,
            TicketingType = ticketingType,
            Banner = dto.Banner,
            ThumbnailUrl = dto.ThumbnailUrl,
            Description = dto.Description,
            ScarcityText = dto.ScarcityText,
            OrganizerId = dto.OrganizerId,
            IsFeatured = dto.IsFeatured,
            IsPublished = true,
            Status = EventStatus.Live
        };

        if (dto.TagIds is not null && dto.TagIds.Any())
        {
            foreach (var tagId in dto.TagIds)
            {
                ev.EventTags.Add(new EventTag { Event = ev, TagId = tagId });
            }
        }

        _context.Events.Add(ev);
        await _context.SaveChangesAsync();

        await _cacheService.RemoveByPrefixAsync(CacheKeys.EventsPrefix);

        return await GetEventDetailDtoAsync(ev.Id);
    }

    public async Task<EventDetailDto> UpdateEventAsync(int id, UpdateAdminEventDto dto)
    {
        var ev = await _context.Events
            .Include(e => e.EventTags)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

        if (ev is null)
            throw new KeyNotFoundException($"Event with ID '{id}' not found.");

        Enum.TryParse<TicketingType>(dto.TicketingType, true, out var ticketingType);
        Enum.TryParse<EventStatus>(dto.Status, true, out var status);

        ev.Title = dto.Title;
        ev.Category = dto.Category;
        ev.Status = status;
        ev.IsFeatured = dto.IsFeatured;
        ev.IsPublished = dto.IsPublished;
        ev.City = dto.City;
        ev.Venue = dto.Venue;
        ev.Address = dto.Address;
        ev.Latitude = dto.Latitude;
        ev.Longitude = dto.Longitude;
        ev.StartDateUtc = dto.StartDateUtc;
        ev.EndDateUtc = dto.EndDateUtc;
        ev.PriceRange = $"PKR {dto.StartingPrice:N0}+";
        ev.StartingPrice = dto.StartingPrice;
        ev.TicketingType = ticketingType;
        ev.Banner = dto.Banner;
        ev.ThumbnailUrl = dto.ThumbnailUrl;
        ev.Description = dto.Description;
        ev.ScarcityText = dto.ScarcityText;
        ev.OrganizerId = dto.OrganizerId;

        // Update tags
        ev.EventTags.Clear();
        if (dto.TagIds is not null && dto.TagIds.Any())
        {
            foreach (var tagId in dto.TagIds)
            {
                ev.EventTags.Add(new EventTag { EventId = id, TagId = tagId });
            }
        }

        await _context.SaveChangesAsync();

        await _cacheService.RemoveAsync(string.Format(CacheKeys.EventDetail, id));
        await _cacheService.RemoveByPrefixAsync(CacheKeys.EventsPrefix);

        return await GetEventDetailDtoAsync(id);
    }

    public async Task<bool> DeleteEventAsync(int id)
    {
        var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
        if (ev is null) return false;

        ev.IsDeleted = true;
        ev.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        await _cacheService.RemoveAsync(string.Format(CacheKeys.EventDetail, id));
        await _cacheService.RemoveByPrefixAsync(CacheKeys.EventsPrefix);
        return true;
    }

    // --- Organizers CRUD ---
    public async Task<List<OrganizerDto>> GetOrganizersAsync()
    {
        return await _context.Organizers
            .AsNoTracking()
            .Where(o => !o.IsDeleted)
            .OrderBy(o => o.Name)
            .Select(o => new OrganizerDto(o.Id, o.Name, o.Email, o.Phone, o.LogoUrl, o.IsVerified))
            .ToListAsync();
    }

    public async Task<OrganizerDto?> GetOrganizerByIdAsync(int id)
    {
        var o = await _context.Organizers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        if (o is null) return null;

        return new OrganizerDto(o.Id, o.Name, o.Email, o.Phone, o.LogoUrl, o.IsVerified);
    }

    public async Task<OrganizerDto> CreateOrganizerAsync(CreateOrganizerDto dto)
    {
        var org = new Organizer
        {
            Name = dto.Name,
            Email = dto.Email,
            Phone = dto.Phone,
            LogoUrl = dto.LogoUrl,
            WebsiteUrl = dto.WebsiteUrl,
            IsVerified = dto.IsVerified
        };

        _context.Organizers.Add(org);
        await _context.SaveChangesAsync();

        return new OrganizerDto(org.Id, org.Name, org.Email, org.Phone, org.LogoUrl, org.IsVerified);
    }

    public async Task<OrganizerDto> UpdateOrganizerAsync(int id, UpdateOrganizerDto dto)
    {
        var org = await _context.Organizers.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);
        if (org is null)
            throw new KeyNotFoundException($"Organizer '{id}' not found.");

        org.Name = dto.Name;
        org.Email = dto.Email;
        org.Phone = dto.Phone;
        org.LogoUrl = dto.LogoUrl;
        org.WebsiteUrl = dto.WebsiteUrl;
        org.IsVerified = dto.IsVerified;

        await _context.SaveChangesAsync();

        return new OrganizerDto(org.Id, org.Name, org.Email, org.Phone, org.LogoUrl, org.IsVerified);
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
        var tier = new TicketTier
        {
            EventId = dto.EventId,
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            AvailableQuantity = dto.AvailableQuantity,
            MaxPerOrder = dto.MaxPerOrder,
            SortOrder = dto.SortOrder
        };

        _context.TicketTiers.Add(tier);
        await _context.SaveChangesAsync();

        return new TicketTierDto(tier.Id, tier.EventId, tier.Name, tier.Description, tier.Price, tier.AvailableQuantity, tier.SoldCount, tier.MaxPerOrder, tier.SortOrder);
    }

    public async Task<TicketTierDto> UpdateTicketTierAsync(int id, UpdateTicketTierDto dto)
    {
        var tier = await _context.TicketTiers.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (tier is null)
            throw new KeyNotFoundException($"Ticket tier '{id}' not found.");

        tier.Name = dto.Name;
        tier.Description = dto.Description;
        tier.Price = dto.Price;
        tier.AvailableQuantity = dto.AvailableQuantity;
        tier.MaxPerOrder = dto.MaxPerOrder;
        tier.SortOrder = dto.SortOrder;

        await _context.SaveChangesAsync();

        return new TicketTierDto(tier.Id, tier.EventId, tier.Name, tier.Description, tier.Price, tier.AvailableQuantity, tier.SoldCount, tier.MaxPerOrder, tier.SortOrder);
    }

    public async Task<bool> DeleteTicketTierAsync(int id)
    {
        var tier = await _context.TicketTiers.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (tier is null) return false;

        tier.IsDeleted = true;
        tier.DeletedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
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
            TotalCapacity = dto.Rows * dto.Cols
        };

        for (int r = 1; r <= dto.Rows; r++)
        {
            char rowChar = (char)('A' + r - 1);
            for (int c = 1; c <= dto.Cols; c++)
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

        _context.SeatingZones.Add(zone);
        await _context.SaveChangesAsync();

        return new SeatingZoneDto(
            zone.Id, zone.EventId, zone.Zone, zone.Rows, zone.Cols, zone.Price, zone.TotalCapacity, zone.SortOrder,
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

        await _context.SaveChangesAsync();

        return new SeatingZoneDto(
            zone.Id, zone.EventId, zone.Zone, zone.Rows, zone.Cols, zone.Price, zone.TotalCapacity, zone.SortOrder,
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
        var tag = new Tag { Name = dto.Name, Slug = dto.Slug };
        _context.Tags.Add(tag);
        await _context.SaveChangesAsync();
        return new TagDto(tag.Id, tag.Name, tag.Slug);
    }

    public async Task<TagDto> UpdateTagAsync(int id, UpdateTagDto dto)
    {
        var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (tag is null)
            throw new KeyNotFoundException($"Tag '{id}' not found.");

        tag.Name = dto.Name;
        tag.Slug = dto.Slug;
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

    private async Task<EventDetailDto> GetEventDetailDtoAsync(int eventId)
    {
        var ev = await _context.Events
            .AsNoTracking()
            .Include(e => e.Organizer)
            .Include(e => e.TicketTiers)
            .Include(e => e.SeatingZones).ThenInclude(z => z.Seats)
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
            ev.Latitude,
            ev.Longitude,
            ev.StartDateUtc,
            ev.EndDateUtc,
            ev.PriceRange,
            ev.StartingPrice,
            ev.TicketingType.ToString(),
            ev.Banner,
            ev.ThumbnailUrl,
            ev.Description,
            ev.ScarcityText,
            new OrganizerDto(ev.Organizer.Id, ev.Organizer.Name, ev.Organizer.Email, ev.Organizer.Phone, ev.Organizer.LogoUrl, ev.Organizer.IsVerified),
            ev.TicketTiers.Select(t => new TicketTierDto(t.Id, t.EventId, t.Name, t.Description, t.Price, t.AvailableQuantity, t.SoldCount, t.MaxPerOrder, t.SortOrder)).ToList(),
            ev.SeatingZones.Select(z => new SeatingZoneDto(z.Id, z.EventId, z.Zone, z.Rows, z.Cols, z.Price, z.TotalCapacity, z.SortOrder, z.Seats.Select(s => new SeatDto(s.Id, s.ZoneId, s.Row, s.Col, s.Label, s.Status.ToString())).ToList())).ToList(),
            ev.EventTags.Select(et => new TagDto(et.Tag.Id, et.Tag.Name, et.Tag.Slug)).ToList()
        );
    }
}
