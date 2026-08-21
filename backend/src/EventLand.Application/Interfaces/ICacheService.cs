namespace EventLand.Application.Interfaces;

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null);
    Task RemoveAsync(string key);
    Task RemoveByPrefixAsync(string prefixKey);

    // Real-time Seat Locking (Redis Hash + Expiration)
    Task<bool> HoldSeatsAsync(int eventId, List<int> seatIds, string email, TimeSpan holdDuration);
    Task ReleaseSeatsAsync(int eventId, List<int> seatIds);
    Task<List<int>> GetHeldSeatIdsAsync(int eventId);
}
