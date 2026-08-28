namespace EventLand.Infrastructure.Common;

// Deprecated shim: the single source of truth for cache keys lives in
// EventLand.Application.Common.CacheKeys. This class re-exports those values
// for backward compatibility only - new code should use the Application class.
[Obsolete("Use EventLand.Application.Common.CacheKeys instead.")]
public static class CacheKeys
{
    public const string EventsPrefix   = EventLand.Application.Common.CacheKeys.EventsPrefix;
    public const string EventDetail    = EventLand.Application.Common.CacheKeys.EventDetail;
    public const string PublicEvents   = EventLand.Application.Common.CacheKeys.PublicEvents;
    public const string PublicArtists  = EventLand.Application.Common.CacheKeys.PublicArtists;
    public const string ArtistDetail   = EventLand.Application.Common.CacheKeys.ArtistDetail;
    public const string TagsList       = EventLand.Application.Common.CacheKeys.TagsList;
    public const string OrganizersList = EventLand.Application.Common.CacheKeys.OrganizersList;
    public const string SeatLocks      = "seatlock:event:{0}"; // legacy key, kept only so old entries can still be evicted
}
