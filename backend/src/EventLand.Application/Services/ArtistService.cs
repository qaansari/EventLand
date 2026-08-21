namespace EventLand.Application.Services;

using EventLand.Application.Common;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;

public class ArtistService : IArtistService
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public ArtistService(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    public async Task<PagedResult<ArtistDto>> GetArtistsAsync(bool? featured, int pageNumber = 1, int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var cacheKey = string.Format(CacheKeys.PublicArtists, featured?.ToString() ?? "all", pageNumber, pageSize);

        var cachedResult = await _cacheService.GetAsync<PagedResult<ArtistDto>>(cacheKey);
        if (cachedResult is not null)
            return cachedResult;

        var query = _context.Artists.AsNoTracking().Where(a => !a.IsDeleted);

        if (featured.HasValue)
            query = query.Where(a => a.IsFeatured == featured.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(a => a.Rating)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new ArtistDto(
                a.Id,
                a.Name,
                a.Genre,
                a.Role,
                a.City,
                a.ImageUrl,
                a.Bio,
                a.Availability,
                a.StartingRate,
                a.Rating,
                a.ShowsDone,
                a.IsFeatured
            ))
            .ToListAsync();

        var result = new PagedResult<ArtistDto>(items, totalCount, pageNumber, pageSize);

        await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10));
        return result;
    }

    public async Task<ArtistDto?> GetArtistByIdAsync(int id)
    {
        var cacheKey = string.Format(CacheKeys.ArtistDetail, id);
        var cached = await _cacheService.GetAsync<ArtistDto>(cacheKey);
        if (cached is not null) return cached;

        var artist = await _context.Artists
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);

        if (artist is null) return null;

        var dto = new ArtistDto(
            artist.Id,
            artist.Name,
            artist.Genre,
            artist.Role,
            artist.City,
            artist.ImageUrl,
            artist.Bio,
            artist.Availability,
            artist.StartingRate,
            artist.Rating,
            artist.ShowsDone,
            artist.IsFeatured
        );

        await _cacheService.SetAsync(cacheKey, dto, TimeSpan.FromMinutes(15));
        return dto;
    }
}
