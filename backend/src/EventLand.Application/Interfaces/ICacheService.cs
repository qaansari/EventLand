namespace EventLand.Application.Interfaces;

public record SeatHoldResult(bool Success, List<int> ConflictingSeatIds, DateTimeOffset? ExpiresAt);

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null);
    Task<bool> TrySetOnceAsync(string key, TimeSpan expiration);
    Task RemoveAsync(string key);
    Task RemoveByPrefixAsync(string prefixKey);
    Task ClearEventCacheAsync(int? eventId = null);

    // Real-time Granular Seat Locking
    Task<SeatHoldResult> TryHoldSeatsGranularAsync(int eventId, List<int> seatIds, string ownerToken, TimeSpan holdDuration, int? eventShowId = null);
    Task<bool> HoldSeatsAsync(int eventId, List<int> seatIds, string email, TimeSpan holdDuration, int? eventShowId = null);
    Task ReleaseSeatsAsync(int eventId, List<int> seatIds, int? eventShowId = null, string? expectedOwnerEmail = null);
    Task<List<int>> GetHeldSeatIdsAsync(int eventId, int? eventShowId = null);
}
