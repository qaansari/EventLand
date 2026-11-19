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
            .Where(e => !e.IsDeleted && e.IsPublished);

        if (!string.IsNullOrWhiteSpace(city))
        {
            if (int.TryParse(city, out var cityId))
                query = query.Where(e => e.CityId == cityId);
            else
                query = query.Where(e => e.City != null && EF.Functions.Like(e.City.Name, city));
        }

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(e => e.Title.Contains(search) || e.Description.Contains(search) || (e.Venue != null && e.Venue.Name.Contains(search)));

        // "category" and "tag" both filter by attached tags (slug/name/id). They are kept as
        // separate query parameters for backwards compatibility with the frontend.
        var rawCategory = category?.Trim();
        var rawTag = tag?.Trim();

        var tagFilters = new List<string>();
        if (!string.IsNullOrWhiteSpace(rawTag))
        {
            tagFilters.Add(rawTag.ToLower());
            tagFilters.AddRange(rawTag.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(t => t.ToLower()));
        }
        if (!string.IsNullOrWhiteSpace(rawCategory))
        {
            tagFilters.Add(rawCategory.ToLower());
            tagFilters.AddRange(rawCategory.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(c => c.ToLower()));
        }
        tagFilters = tagFilters.Distinct().ToList();

        if (tagFilters.Count > 0)
        {
            query = query.Where(e => e.EventTags.Any(et =>
                tagFilters.Contains(et.Tag.Slug.ToLower()) ||
                tagFilters.Contains(et.Tag.Name.ToLower()) ||
                tagFilters.Contains(et.Tag.Id.ToString()) ||
                (rawCategory != null && (et.Tag.Name.ToLower() == rawCategory.ToLower() || et.Tag.Slug.ToLower() == rawCategory.ToLower())) ||
                (rawTag != null && (et.Tag.Name.ToLower() == rawTag.ToLower() || et.Tag.Slug.ToLower() == rawTag.ToLower()))
            ));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(e => e.StartDateUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new EventSummaryDto(
                e.Id,
                e.Title,
                StatusLabel(e.Status),
                e.IsFeatured,
                e.CountryId,
                e.Country != null ? e.Country.Name : "Pakistan",
                e.CityId,
                e.City != null ? e.City.Name : "Karachi",
                e.VenueId,
                e.Venue != null ? e.Venue.Name : "",
                e.AuditoriumId,
                e.Auditorium != null ? e.Auditorium.Name : null,
                e.StartDateUtc,
                e.EndDateUtc,
                e.PriceRange,
                e.StartingPrice,
                e.TicketingType.ToString().ToLower(),
                FileUrlHelper.FormatEventBannerUrl(e.Banner),
                e.ScarcityText,
                e.OrganizerId,
                e.Organizer != null ? e.Organizer.Name : "EventLand Host",
                e.EventTags.Select(et => new TagDto(et.Tag.Id, et.Tag.Name, et.Tag.Slug)).ToList(),
                e.Shows.Where(s => !s.IsDeleted).Select(s => new EventShowDto(
                    s.Id,
                    s.EventId,
                    s.ShowTitle,
                    s.StartTimeUtc,
                    s.EndTimeUtc,
                    s.TicketTiers.Where(t => !t.IsDeleted).Select(t => new TicketTierDto(t.Id, t.EventId, t.EventShowId, t.Name, t.Description, t.Price, t.AvailableQuantity, t.SoldCount, t.MaxPerOrder, t.SortOrder, t.RowRange, t.Status == TicketTierStatus.Closed ? "Closed" : (t.Status == TicketTierStatus.SoldOut || t.AvailableQuantity <= t.SoldCount || t.AvailableQuantity <= 0 ? "SoldOut" : "Available"))).ToList(),
                    s.IsClosed
                )).ToList(),
                e.EventType,
                e.VenueEnvironment,
                e.IsPublished
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
            .AsSplitQuery()
            .Include(e => e.Organizer)
            .Include(e => e.Country)
            .Include(e => e.City)
            .Include(e => e.Venue)
            .Include(e => e.Auditorium)
            .Include(e => e.Shows.Where(s => !s.IsDeleted).OrderBy(s => s.StartTimeUtc))
                .ThenInclude(s => s.TicketTiers.Where(t => !t.IsDeleted).OrderBy(t => t.SortOrder))
            .Include(e => e.TicketTiers.Where(t => !t.IsDeleted).OrderBy(t => t.SortOrder))
            .Include(e => e.SeatingZones.Where(z => !z.IsDeleted).OrderBy(z => z.SortOrder))
                .ThenInclude(z => z.Seats.Where(s => !s.IsDeleted).OrderBy(s => s.Row).ThenBy(s => s.Col))
            .Include(e => e.EventTags).ThenInclude(et => et.Tag)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted && e.IsPublished);

        if (ev is null) return null;

        var dto = MapToDetailDto(ev);

        await _cacheService.SetAsync(cacheKey, dto, TimeSpan.FromMinutes(10));
        return dto;
    }

    public async Task<EventDetailDto?> GetEventByIdentifierAsync(string identifier)
    {
        if (string.IsNullOrWhiteSpace(identifier)) return null;

        var clean = identifier.Trim();

        // Check identifier-level cache first
        var identifierCacheKey = $"event:ident:{clean.ToLowerInvariant()}";
        var cached = await _cacheService.GetAsync<EventDetailDto>(identifierCacheKey);
        if (cached is not null) return cached;

        // 1. Direct numeric ID lookup
        if (int.TryParse(clean, out int directId))
        {
            var res = await GetEventByIdAsync(directId);
            if (res is not null)
            {
                await _cacheService.SetAsync(identifierCacheKey, res, TimeSpan.FromMinutes(10));
            }
            return res;
        }

        // 2. Exact Title / Clean Slug lookup (e.g. "pacc-theatre-festival-2026")
        var normalizedSlug = clean.ToLowerInvariant().Replace("-", " ");
        var evByTitle = await _context.Events
            .AsNoTracking()
            .Where(e => !e.IsDeleted && e.IsPublished && EF.Functions.Like(e.Title, normalizedSlug))
            .Select(e => e.Id)
            .FirstOrDefaultAsync();

        if (evByTitle > 0)
        {
            var res = await GetEventByIdAsync(evByTitle);
            if (res is not null)
            {
                await _cacheService.SetAsync(identifierCacheKey, res, TimeSpan.FromMinutes(10));
                return res;
            }
        }

        // 2b. In-memory Slugify matching for titles with punctuation/symbols (e.g. "PACC Theatre Festival (2026)")
        var candidateEvents = await _context.Events
            .AsNoTracking()
            .Where(e => !e.IsDeleted && e.IsPublished)
            .Select(e => new { e.Id, e.Title })
            .ToListAsync();

        var matchedCandidate = candidateEvents.FirstOrDefault(c => Slugify(c.Title).Equals(clean, StringComparison.OrdinalIgnoreCase));
        if (matchedCandidate != null)
        {
            var res = await GetEventByIdAsync(matchedCandidate.Id);
            if (res is not null)
            {
                await _cacheService.SetAsync(identifierCacheKey, res, TimeSpan.FromMinutes(10));
                return res;
            }
        }

        // 3. Legacy trailing ID extraction (e.g. "pacc-theatre-festival-2026-1000")
        var lastDashIndex = clean.LastIndexOf('-');
        if (lastDashIndex > 0 && lastDashIndex < clean.Length - 1)
        {
            var trailingIdPart = clean.Substring(lastDashIndex + 1);
            if (int.TryParse(trailingIdPart, out int extractedId))
            {
                var evById = await GetEventByIdAsync(extractedId);
                if (evById is not null)
                {
                    await _cacheService.SetAsync(identifierCacheKey, evById, TimeSpan.FromMinutes(10));
                    return evById;
                }
            }
        }


        return null;
    }

    private static string Slugify(string? title)
    {
        if (string.IsNullOrWhiteSpace(title)) return string.Empty;
        var clean = new string(title
            .ToLowerInvariant()
            .Trim()
            .Where(c => char.IsLetterOrDigit(c) || char.IsWhiteSpace(c) || c == '-')
            .ToArray());
        var words = clean.Split(new[] { ' ', '-' }, StringSplitOptions.RemoveEmptyEntries);
        return string.Join("-", words);
    }

    private static EventDetailDto MapToDetailDto(Event e) => new(
        e.Id,
        e.Title,
        StatusLabel(e.Status),
        e.IsFeatured,
        e.CountryId,
        e.Country != null ? e.Country.Name : "Pakistan",
        e.CityId,
        e.City != null ? e.City.Name : "Karachi",
        e.VenueId,
        e.Venue != null ? e.Venue.Name : "",
        e.AuditoriumId,
        e.Auditorium != null ? e.Auditorium.Name : null,
        e.StartDateUtc,
        e.EndDateUtc,
        e.PriceRange,
        e.StartingPrice,
        e.TicketingType.ToString().ToLower(),
        FileUrlHelper.FormatEventBannerUrl(e.Banner),
        e.Description,
        e.ScarcityText,
        e.Organizer == null ? new OrganizerDto(0, "", "", "", null, null, false) : new OrganizerDto(
            e.Organizer.Id,
            e.Organizer.Name,
            e.Organizer.Email,
            e.Organizer.Phone,
            FileUrlHelper.FormatOrganizerLogoUrl(e.Organizer.LogoUrl),
            e.Organizer.WebsiteUrl,
            e.Organizer.IsVerified,
            e.Organizer.BrandName,
            e.Organizer.CompanyType,
            e.Organizer.RegisteredAddress,
            e.Organizer.CompanyNtn,
            e.Organizer.Description,
            e.Organizer.InstagramUrl,
            e.Organizer.FacebookUrl
        ),
        e.Shows.Select(s => new EventShowDto(
            s.Id,
            s.EventId,
            s.ShowTitle,
            s.StartTimeUtc,
            s.EndTimeUtc,
            s.TicketTiers.Where(t => !t.IsDeleted).OrderBy(t => t.SortOrder).ThenBy(t => t.Price).Select(t => new TicketTierDto(t.Id, t.EventId, t.EventShowId, t.Name, t.Description, t.Price, t.AvailableQuantity, t.SoldCount, t.MaxPerOrder, t.SortOrder, t.RowRange, t.EffectiveStatus.ToString())).ToList(),
            s.IsClosed
        )).ToList(),
        e.TicketTiers.Where(t => !t.IsDeleted).OrderBy(t => t.SortOrder).ThenBy(t => t.Price).Select(t => new TicketTierDto(t.Id, t.EventId, t.EventShowId, t.Name, t.Description, t.Price, t.AvailableQuantity, t.SoldCount, t.MaxPerOrder, t.SortOrder, t.RowRange, t.EffectiveStatus.ToString())).ToList(),
        e.SeatingZones.Select(z => new SeatingZoneDto(z.Id, z.EventId, z.Zone, z.Rows, z.Cols, z.Price, z.TotalCapacity, z.SortOrder, z.LayoutJson, z.Seats.Select(s => new SeatDto(s.Id, s.ZoneId, s.Row, s.Col, s.Label, s.Status.ToString())).ToList())).ToList(),
        e.EventTags.Select(et => new TagDto(et.Tag.Id, et.Tag.Name, et.Tag.Slug)).ToList(),
        FileUrlHelper.FormatSeatChartUrl(e.SeatChartUrl),
        e.EventType,
        e.AttractionsOrActivities,
        e.VenueEnvironment,
        e.DressCode,
        e.FoodDrinksAvailable,
        e.FoodDrinksIncluded,
        e.PetsAllowed,
        e.ParkingAvailable,
        e.ValetAvailable,
        e.SeatingArrangement,
        e.WheelchairAccessible,
        e.AudienceRestrictions,
        e.FoodDrinksRestrictions,
        e.SmokingRestrictions,
        e.TicketNameChangeAllowed,
        e.TicketNamePolicy,
        e.TicketDaysInterchangeable,
        e.IsPublished,
        e.OrganizerId
    );

    private static string StatusLabel(EventStatus s) => s switch
    {
        EventStatus.Live => "LIVE",
        EventStatus.SellingFast => "SELLING FAST",
        EventStatus.SoldOut => "SOLD OUT",
        EventStatus.Upcoming => "UPCOMING",
        EventStatus.Closed => "CLOSED",
        _ => s.ToString().ToUpper()
    };
}
