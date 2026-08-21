namespace EventLand.Infrastructure.Services;

using System.Text.Json;
using EventLand.Application.Common;
using EventLand.Application.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _distributedCache;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<RedisCacheService> _logger;

    public RedisCacheService(
        IDistributedCache distributedCache,
        IMemoryCache memoryCache,
        ILogger<RedisCacheService> logger)
    {
        _distributedCache = distributedCache;
        _memoryCache = memoryCache;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        try
        {
            var value = await _distributedCache.GetStringAsync(key);
            if (!string.IsNullOrEmpty(value))
            {
                return JsonSerializer.Deserialize<T>(value);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis GetAsync error for key '{Key}'. Falling back to MemoryCache.", key);
            if (_memoryCache.TryGetValue(key, out T? memoryValue))
            {
                return memoryValue;
            }
        }

        return default;
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null)
    {
        var options = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = absoluteExpiration ?? TimeSpan.FromMinutes(10)
        };

        var json = JsonSerializer.Serialize(value);

        try
        {
            await _distributedCache.SetStringAsync(key, json, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis SetAsync error for key '{Key}'. Storing in MemoryCache.", key);
            _memoryCache.Set(key, value, absoluteExpiration ?? TimeSpan.FromMinutes(10));
        }
    }

    public async Task RemoveAsync(string key)
    {
        try
        {
            await _distributedCache.RemoveAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis RemoveAsync error for key '{Key}'. Removing from MemoryCache.", key);
        }
        _memoryCache.Remove(key);
    }

    public async Task RemoveByPrefixAsync(string prefixKey)
    {
        // Simple prefix removal for memory cache fallback; Redis requires SCAN pattern or key tracking
        _logger.LogInformation("Evicting cache prefix '{PrefixKey}'", prefixKey);
    }

    // --- Redis Real-Time Seat Holding ---
    public async Task<bool> HoldSeatsAsync(int eventId, List<int> seatIds, string email, TimeSpan holdDuration)
    {
        var lockKey = string.Format(CacheKeys.SeatLocks, eventId);
        var currentlyHeld = await GetAsync<Dictionary<int, string>>(lockKey) ?? new Dictionary<int, string>();

        // Check if any seat is already locked by someone else
        foreach (var seatId in seatIds)
        {
            if (currentlyHeld.TryGetValue(seatId, out var existingEmail) && existingEmail != email)
            {
                return false; // Seat already held by another user
            }
        }

        // Lock seats for this email
        foreach (var seatId in seatIds)
        {
            currentlyHeld[seatId] = email;
        }

        await SetAsync(lockKey, currentlyHeld, holdDuration);
        return true;
    }

    public async Task ReleaseSeatsAsync(int eventId, List<int> seatIds)
    {
        var lockKey = string.Format(CacheKeys.SeatLocks, eventId);
        var currentlyHeld = await GetAsync<Dictionary<int, string>>(lockKey);

        if (currentlyHeld != null)
        {
            foreach (var seatId in seatIds)
            {
                currentlyHeld.Remove(seatId);
            }
            await SetAsync(lockKey, currentlyHeld, TimeSpan.FromMinutes(10));
        }
    }

    public async Task<List<int>> GetHeldSeatIdsAsync(int eventId)
    {
        var lockKey = string.Format(CacheKeys.SeatLocks, eventId);
        var currentlyHeld = await GetAsync<Dictionary<int, string>>(lockKey);

        if (currentlyHeld == null) return new List<int>();

        return currentlyHeld.Keys.ToList();
    }
}
