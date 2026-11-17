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

    // --- Granular Real-Time Seat Holding (Phase 2 Concurrency Safety) ---
    // Keys follow the canonical format: seathold:{eventId}:{showId}:{seatId}
    // Storage value is: {ownerToken} with a strictly enforced TTL (e.g. 600s).
    public static string GranularSeatHoldKey(int eventId, int seatId, int? eventShowId) =>
        $"seathold:{eventId}:{eventShowId ?? 0}:{seatId}";

    public static string GranularSeatHoldPrefix(int eventId, int? eventShowId) =>
        $"seathold:{eventId}:{eventShowId ?? 0}:";

    private static readonly object _holdSyncLock = new();
    private static readonly ConcurrentDictionary<string, (string Owner, DateTimeOffset ExpiresAt)> _inMemoryGranularHolds = new();

    public async Task<SeatHoldResult> TryHoldSeatsGranularAsync(
        int eventId,
        List<int> seatIds,
        string ownerToken,
        TimeSpan holdDuration,
        int? eventShowId = null)
    {
        if (seatIds is null || seatIds.Count == 0)
            return new SeatHoldResult(true, new List<int>(), DateTimeOffset.UtcNow.Add(holdDuration));

        var distinctSeatIds = seatIds.Distinct().ToList();
        var now = DateTimeOffset.UtcNow;
        var expiresAt = now.Add(holdDuration);

        // Atomic multi-key hold evaluation (Lua script semantics)
        lock (_holdSyncLock)
        {
            var conflicting = new List<int>();

            // 1. Conflict detection phase: ensure every requested seat is free or already owned
            foreach (var seatId in distinctSeatIds)
            {
                var key = GranularSeatHoldKey(eventId, seatId, eventShowId);
                if (_inMemoryGranularHolds.TryGetValue(key, out var existingHold))
                {
                    if (existingHold.ExpiresAt > now && !string.Equals(existingHold.Owner, ownerToken, StringComparison.OrdinalIgnoreCase))
                    {
                        conflicting.Add(seatId);
                    }
                }
            }

            // 2. Abort if any conflicting seats exist
            if (conflicting.Count > 0)
            {
                return new SeatHoldResult(false, conflicting, null);
            }

            // 3. Atomically acquire all locks with TTL
            foreach (var seatId in distinctSeatIds)
            {
                var key = GranularSeatHoldKey(eventId, seatId, eventShowId);
                _inMemoryGranularHolds[key] = (ownerToken, expiresAt);
            }
        }

        // Also mirror to distributed cache if available for external cluster instances
        if (IsRedisAvailable())
        {
            foreach (var seatId in distinctSeatIds)
            {
                var key = GranularSeatHoldKey(eventId, seatId, eventShowId);
                try
                {
                    await SetAsync(key, ownerToken, holdDuration);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not mirror granular seat hold to distributed cache for key {Key}", key);
                }
            }
        }

        return new SeatHoldResult(true, new List<int>(), expiresAt);
    }

    public async Task<bool> HoldSeatsAsync(int eventId, List<int> seatIds, string email, TimeSpan holdDuration, int? eventShowId = null)
    {
        var result = await TryHoldSeatsGranularAsync(eventId, seatIds, email, holdDuration, eventShowId);
        return result.Success;
    }

    public async Task ReleaseSeatsAsync(int eventId, List<int> seatIds, int? eventShowId = null, string? expectedOwnerEmail = null)
    {
        if (seatIds == null || seatIds.Count == 0) return;

        lock (_holdSyncLock)
        {
            foreach (var seatId in seatIds)
            {
                var key = GranularSeatHoldKey(eventId, seatId, eventShowId);
                if (_inMemoryGranularHolds.TryGetValue(key, out var hold))
                {
                    if (string.IsNullOrWhiteSpace(expectedOwnerEmail) || string.Equals(hold.Owner, expectedOwnerEmail, StringComparison.OrdinalIgnoreCase))
                    {
                        _inMemoryGranularHolds.TryRemove(key, out _);
                    }
                }
            }
        }

        if (IsRedisAvailable())
        {
            foreach (var seatId in seatIds)
            {
                var key = GranularSeatHoldKey(eventId, seatId, eventShowId);
                try
                {
                    await RemoveAsync(key);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not release distributed key {Key}", key);
                }
            }
        }
    }

    public async Task<List<int>> GetHeldSeatIdsAsync(int eventId, int? eventShowId = null)
    {
        var prefix = GranularSeatHoldPrefix(eventId, eventShowId);
        var now = DateTimeOffset.UtcNow;
        var heldSeatIds = new HashSet<int>();

        lock (_holdSyncLock)
        {
            foreach (var kvp in _inMemoryGranularHolds)
            {
                if (kvp.Key.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    if (kvp.Value.ExpiresAt > now)
                    {
                        var seatPart = kvp.Key.Substring(prefix.Length);
                        if (int.TryParse(seatPart, out var seatId))
                        {
                            heldSeatIds.Add(seatId);
                        }
                    }
                    else
                    {
                        _inMemoryGranularHolds.TryRemove(kvp.Key, out _);
                    }
                }
            }
        }

        return heldSeatIds.ToList();
    }
}
