namespace EventLand.Application.Common;

public static class CacheKeys
{
    public const string EventsPrefix   = "events:";
    public const string EventDetail    = "event:detail:{0}";
    public const string PublicEvents   = "events:public:cat={0}:city={1}:search={2}:tag={3}:page={4}:size={5}";
    public const string PublicArtists  = "artists:public:featured={0}:page={1}:size={2}";
    public const string ArtistDetail   = "artist:detail:{0}";
    public const string TagsList       = "tags:all";
    public const string OrganizersList = "organizers:all";

    // Per-seat hold keys: eventland:seats:event:{eventId}[:show:{showId}]:seat:{seatId}
    public const string SeatHoldsPrefix     = "eventland:seats:";
    public const string SeatHoldKey         = "eventland:seats:event:{0}:seat:{1}";
    public const string SeatHoldKeyForShow  = "eventland:seats:event:{0}:show:{1}:seat:{2}";
}
