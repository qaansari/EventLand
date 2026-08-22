namespace EventLand.Application.Interfaces;

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null);
    Task RemoveAsync(string key);
    Task RemoveByPrefixAsync(string prefixKey);
    Task ClearEventCacheAsync(int? eventId = null);

    // Real-time Seat Locking (Redis Hash + Expiration)
    Task<bool> HoldSeatsAsync(int eventId, List<int> seatIds, string email, TimeSpan holdDuration, int? eventShowId = null);
    Task ReleaseSeatsAsync(int eventId, List<int> seatIds, int? eventShowId = null);
    Task<List<int>> GetHeldSeatIdsAsync(int eventId, int? eventShowId = null);
}
