namespace EventLand.Application.Services;

using EventLand.Application.Common;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;
using Microsoft.EntityFrameworkCore;

public class EventService : IEventService
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public EventService(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task<PagedResult<EventSummaryDto>> GetEventsAsync(
        string? category,
        string? city,
        string? search,
        string? tag,
        int pageNumber = 1,
        int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var cacheKey = string.Format(CacheKeys.PublicEvents,
            category ?? "all", city ?? "all", search ?? "all", tag ?? "all", pageNumber, pageSize);

        var cachedResult = await _cacheService.GetAsync<PagedResult<EventSummaryDto>>(cacheKey);
        if (cachedResult is not null)
            return cachedResult;

        var query = _context.Events
            .AsNoTracking()
            .Include(e => e.Organizer)
            .Include(e => e.Shows.Where(s => !s.IsDeleted).OrderBy(s => s.StartTimeUtc))
            .Include(e => e.EventTags).ThenInclude(et => et.Tag)
            .Where(e => !e.IsDeleted && e.IsPublished);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(e => e.Category.ToLower() == category.ToLower());

        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(e => e.City.ToLower() == city.ToLower());

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(e => e.Title.Contains(search) || e.Description.Contains(search) || e.Venue.Contains(search));

        if (!string.IsNullOrWhiteSpace(tag))
            query = query.Where(e => e.EventTags.Any(et => et.Tag.Slug.ToLower() == tag.ToLower()));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(e => e.StartDateUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new EventSummaryDto(
                e.Id,
                e.Title,
                e.Category,
                StatusLabel(e.Status),
                e.IsFeatured,
                e.City,
                e.Venue,
                e.Address,
                e.StartDateUtc,
                e.EndDateUtc,
                e.PriceRange,
                e.StartingPrice,
                e.TicketingType.ToString().ToLower(),
                FileUrlHelper.FormatEventBannerUrl(e.Banner),
                e.ScarcityText,
                e.OrganizerId,
                e.Organizer.Name,
                e.EventTags.Select(et => new TagDto(et.Tag.Id, et.Tag.Name, et.Tag.Slug)).ToList(),
                e.Shows.Select(s => new EventShowDto(s.Id, s.EventId, s.ShowTitle, s.StartTimeUtc, s.EndTimeUtc, new List<TicketTierDto>())).ToList()
            ))
            .ToListAsync();

        var result = new PagedResult<EventSummaryDto>(items, totalCount, pageNumber, pageSize);

        await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));

        return result;
    }

    public async Task<EventDetailDto?> GetEventByIdAsync(int id)
    {
        var cacheKey = string.Format(CacheKeys.EventDetail, id);
        var cached = await _cacheService.GetAsync<EventDetailDto>(cacheKey);
        if (cached is not null) return cached;

        var ev = await _context.Events
            .AsNoTracking()
            .Include(e => e.Organizer)
            .Include(e => e.Shows.Where(s => !s.IsDeleted).OrderBy(s => s.StartTimeUtc))
                .ThenInclude(s => s.TicketTiers.Where(t => !t.IsDeleted).OrderBy(t => t.SortOrder))
            .Include(e => e.TicketTiers.Where(t => !t.IsDeleted).OrderBy(t => t.SortOrder))
            .Include(e => e.SeatingZones.Where(z => !z.IsDeleted).OrderBy(z => z.SortOrder))
                .ThenInclude(z => z.Seats.Where(s => !s.IsDeleted).OrderBy(s => s.Row).ThenBy(s => s.Col))
            .Include(e => e.EventTags).ThenInclude(et => et.Tag)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

        if (ev is null) return null;

        var dto = MapToDetailDto(ev);

        await _cacheService.SetAsync(cacheKey, dto, TimeSpan.FromMinutes(10));
        return dto;
    }

    private static EventDetailDto MapToDetailDto(Event e) => new(
        e.Id,
        e.Title,
        e.Category,
        StatusLabel(e.Status),
        e.IsFeatured,
        e.City,
        e.Venue,
        e.Address,
        e.StartDateUtc,
        e.EndDateUtc,
        e.PriceRange,
        e.StartingPrice,
        e.TicketingType.ToString().ToLower(),
        FileUrlHelper.FormatEventBannerUrl(e.Banner),
        e.Description,
        e.ScarcityText,
        e.Organizer == null ? new OrganizerDto(0, "", "", "", null, null, false) : new OrganizerDto(
            e.Organizer.Id, e.Organizer.Name, e.Organizer.Email, e.Organizer.Phone, FileUrlHelper.FormatOrganizerLogoUrl(e.Organizer.LogoUrl), e.Organizer.WebsiteUrl, e.Organizer.IsVerified),
        e.Shows.Select(s => new EventShowDto(
            s.Id,
            s.EventId,
            s.ShowTitle,
            s.StartTimeUtc,
            s.EndTimeUtc,
            s.TicketTiers.Select(t => new TicketTierDto(t.Id, t.EventId, t.EventShowId, t.Name, t.Description, t.Price, t.AvailableQuantity, t.SoldCount, t.MaxPerOrder, t.SortOrder)).ToList()
        )).ToList(),
        e.TicketTiers.Select(t => new TicketTierDto(t.Id, t.EventId, t.EventShowId, t.Name, t.Description, t.Price, t.AvailableQuantity, t.SoldCount, t.MaxPerOrder, t.SortOrder)).ToList(),
        e.SeatingZones.Select(z => new SeatingZoneDto(z.Id, z.EventId, z.Zone, z.Rows, z.Cols, z.Price, z.TotalCapacity, z.SortOrder, z.LayoutJson, z.Seats.Select(s => new SeatDto(s.Id, s.ZoneId, s.Row, s.Col, s.Label, s.Status.ToString())).ToList())).ToList(),
        e.EventTags.Select(et => new TagDto(et.Tag.Id, et.Tag.Name, et.Tag.Slug)).ToList()
    );

    private static string StatusLabel(EventStatus s) => s switch
    {
        EventStatus.Live        => "LIVE",
        EventStatus.SellingFast => "SELLING FAST",
        EventStatus.SoldOut     => "SOLD OUT",
        EventStatus.Upcoming    => "UPCOMING",
        _                       => s.ToString().ToUpper()
    };
}
