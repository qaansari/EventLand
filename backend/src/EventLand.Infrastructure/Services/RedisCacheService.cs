namespace EventLand.Infrastructure.Services;

using System.Collections.Concurrent;
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
    private static readonly ConcurrentDictionary<string, DateTimeOffset> _knownKeys = new();
    private static DateTimeOffset _redisDisabledUntil = DateTimeOffset.MinValue;

    public RedisCacheService(
        IDistributedCache distributedCache,
        IMemoryCache memoryCache,
        ILogger<RedisCacheService> logger)
    {
        _distributedCache = distributedCache;
        _memoryCache = memoryCache;
        _logger = logger;
    }

    private static bool IsRedisAvailable()
    {
        return DateTimeOffset.UtcNow > _redisDisabledUntil;
    }

    private static void DisableRedisTemporarily()
    {
        _redisDisabledUntil = DateTimeOffset.UtcNow.AddMinutes(2);
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        if (IsRedisAvailable())
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
                DisableRedisTemporarily();
                _logger.LogWarning(ex, "Redis GetAsync error for key '{Key}'. Temporarily switching to MemoryCache.", key);
            }
        }

        if (_memoryCache.TryGetValue(key, out T? memoryValue))
        {
            return memoryValue;
        }

        return default;
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null)
    {
        var duration = absoluteExpiration ?? TimeSpan.FromMinutes(10);
        var expiry = DateTimeOffset.UtcNow.Add(duration);
        _knownKeys[key] = expiry;

        // Prune expired entries periodically to prevent memory leaks
        if (_knownKeys.Count > 1000)
        {
            var now = DateTimeOffset.UtcNow;
            foreach (var entry in _knownKeys)
            {
                if (entry.Value < now)
                {
                    _knownKeys.TryRemove(entry.Key, out _);
                }
            }
        }

        if (IsRedisAvailable())
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = duration
            };

            var json = JsonSerializer.Serialize(value);

            try
            {
                await _distributedCache.SetStringAsync(key, json, options);
            }
            catch (Exception ex)
            {
                DisableRedisTemporarily();
                _logger.LogWarning(ex, "Redis SetAsync error for key '{Key}'. Storing in MemoryCache.", key);
            }
        }

        _memoryCache.Set(key, value, duration);
    }

    public async Task RemoveAsync(string key)
    {
        _knownKeys.TryRemove(key, out _);

        if (IsRedisAvailable())
        {
            try
            {
                await _distributedCache.RemoveAsync(key);
            }
            catch (Exception ex)
            {
                DisableRedisTemporarily();
                _logger.LogWarning(ex, "Redis RemoveAsync error for key '{Key}'. Removing from MemoryCache.", key);
            }
        }

        _memoryCache.Remove(key);
    }

    public async Task RemoveByPrefixAsync(string prefixKey)
    {
        _logger.LogInformation("Evicting cache prefix '{PrefixKey}'", prefixKey);

        var now = DateTimeOffset.UtcNow;
        var matchingKeys = _knownKeys
            .Where(k => k.Value >= now && k.Key.StartsWith(prefixKey, StringComparison.OrdinalIgnoreCase))
            .Select(k => k.Key)
            .ToList();

        // Remove all matching keys in parallel to reduce Redis round-trip latency
        await Task.WhenAll(matchingKeys.Select(key => RemoveAsync(key)));
    }

    public async Task ClearEventCacheAsync(int? eventId = null)
    {
        _logger.LogInformation("Clearing all event-related caches. EventId: {EventId}", eventId);

        // Evict all public event listing, category, tag, city, search, and detail caches
        await RemoveByPrefixAsync("events:");
        await RemoveByPrefixAsync("event:");
        await RemoveByPrefixAsync("organizers:");
        await RemoveByPrefixAsync("tags:");

        if (eventId.HasValue)
        {
            await RemoveAsync(string.Format(CacheKeys.EventDetail, eventId.Value));
            // Remove per-seat hold keys for this event (with and without show scope)
            await RemoveByPrefixAsync($"eventland:seats:event:{eventId.Value}");
            // Also evict any legacy dictionary-based entries keyed as seatlock:event:{id}
            await RemoveByPrefixAsync($"seatlock:event:{eventId.Value}");
        }
        else
        {
            // Full cache clear: also drop every seat hold key
            await RemoveByPrefixAsync(CacheKeys.SeatHoldsPrefix);
            await RemoveByPrefixAsync("seatlock:");
        }
    }

    // --- Redis Real-Time Seat Holding ---
    // Holds are stored as one key per seat so concurrent callers cannot overwrite each
    // other's locks (the old Dictionary-per-event Get+Set was a race). Each seat key gets
    // its own TTL and is released individually.
    private static string SeatLockKey(int eventId, int seatId, int? eventShowId) =>
        eventShowId.HasValue
            ? string.Format(CacheKeys.SeatHoldKeyForShow, eventId, eventShowId.Value, seatId)
            : string.Format(CacheKeys.SeatHoldKey, eventId, seatId);

    private static string SeatLockPrefix(int eventId, int? eventShowId) =>
        eventShowId.HasValue
            ? $"eventland:seats:event:{eventId}:show:{eventShowId.Value}:seat:"
            : $"eventland:seats:event:{eventId}:seat:";

    // In-process gate per event/show so the check-then-set sequence is atomic within a
    // single instance. Cross-instance atomicity comes from the per-seat keys themselves:
    // two callers can only ever conflict on a single seat, never clobber an entire
    // dictionary. A true Redis SET NX would be ideal; IDistributedCache does not expose
    // it, so this is the best achievable with the current abstraction.
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _holdGates = new();

    public async Task<bool> HoldSeatsAsync(int eventId, List<int> seatIds, string email, TimeSpan holdDuration, int? eventShowId = null)
    {
        if (seatIds is null || seatIds.Count == 0) return true;

        var gateKey = SeatLockPrefix(eventId, eventShowId);
        var gate = _holdGates.GetOrAdd(gateKey, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync();

        var acquired = new List<int>();
        try
        {
            foreach (var seatId in seatIds.Distinct())
            {
                var key = SeatLockKey(eventId, seatId, eventShowId);
                var existingEmail = await GetAsync<string>(key);

                if (!string.IsNullOrEmpty(existingEmail) && existingEmail != email)
                {
                    // Seat locked by someone else - roll back any locks acquired in this call.
                    foreach (var acquiredSeat in acquired)
                    {
                        await RemoveAsync(SeatLockKey(eventId, acquiredSeat, eventShowId));
                    }
                    return false;
                }

                await SetAsync(key, email, holdDuration);
                acquired.Add(seatId);
            }

            return true;
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task ReleaseSeatsAsync(int eventId, List<int> seatIds, int? eventShowId = null, string? expectedOwnerEmail = null)
    {
        foreach (var seatId in seatIds)
        {
            var key = SeatLockKey(eventId, seatId, eventShowId);
            if (!string.IsNullOrWhiteSpace(expectedOwnerEmail))
            {
                var holder = await GetAsync<string>(key);
                if (!string.IsNullOrEmpty(holder) && !string.Equals(holder, expectedOwnerEmail, StringComparison.OrdinalIgnoreCase))
                {
                    // Caller is not the owner of this seat hold; prevent unauthorized eviction
                    continue;
                }
            }
            await RemoveAsync(key);
        }
    }

    public async Task<List<int>> GetHeldSeatIdsAsync(int eventId, int? eventShowId = null)
    {
        // NOTE: keys created by other app instances are not present in _knownKeys. A
        // production multi-instance solution would SCAN Redis (pattern: prefix + "*") via
        // IConnectionMultiplexer; IDistributedCache does not expose SCAN, so we rely on
        // the in-process registry plus per-key TTL expiry as a safety net.
        var prefix = SeatLockPrefix(eventId, eventShowId);
        var seatIds = new List<int>();

        foreach (var key in _knownKeys.Keys.Where(k => k.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)).ToList())
        {
            var seatPart = key.Substring(prefix.Length);
            if (!int.TryParse(seatPart, out var seatId))
            {
                continue;
            }

            // Verify the hold is still alive (registry may contain keys whose TTL already
            // expired in Redis/MemoryCache). Prune stale entries while we scan.
            var holder = await GetAsync<string>(key);
            if (string.IsNullOrEmpty(holder))
            {
                _knownKeys.TryRemove(key, out _);
                continue;
            }

            seatIds.Add(seatId);
        }

        return seatIds;
    }
}
