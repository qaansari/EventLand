namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;
using EventLand.Domain.Enums;

/// <summary>
/// Core event entity.
/// </summary>
public class Event : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public EventStatus Status { get; set; } = EventStatus.Live;
    public bool IsFeatured { get; set; } = false;
    public bool IsPublished { get; set; } = true;

    // Location FKs
    public int CountryId { get; set; }
    public Country Country { get; set; } = null!;

    public int CityId { get; set; }
    public City City { get; set; } = null!;

    public int VenueId { get; set; }
    public Venue Venue { get; set; } = null!;

    public int? AuditoriumId { get; set; }
    public Auditorium? Auditorium { get; set; }

    // Structured dates
    public DateTimeOffset StartDateUtc { get; set; }
    public DateTimeOffset EndDateUtc { get; set; }

    // Pricing summary
    public string PriceRange { get; set; } = string.Empty;
    public decimal StartingPrice { get; set; }
    public TicketingType TicketingType { get; set; } = TicketingType.Categorized;

    // Media & display
    public string Banner { get; set; } = string.Empty;
    public string? SeatChartUrl { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? ScarcityText { get; set; }

    // House Rules, Amenities & Specifications
    public string EventType { get; set; } = "Event"; // Workshop, Event
    public string AttractionsOrActivities { get; set; } = "X";
    public string VenueEnvironment { get; set; } = "Indoor"; // Indoor, Outdoor, Both
    public string? DressCode { get; set; }
    public bool FoodDrinksAvailable { get; set; } = false;
    public bool FoodDrinksIncluded { get; set; } = false;
    public bool PetsAllowed { get; set; } = false;
    public bool ParkingAvailable { get; set; } = false;
    public bool ValetAvailable { get; set; } = false;
    public string SeatingArrangement { get; set; } = "Seating"; // Seating, Standing, or custom
    public bool WheelchairAccessible { get; set; } = false;

    // Restrictions & Policies (JSON serialized array strings)
    public string AudienceRestrictions { get; set; } = "[]";
    public string FoodDrinksRestrictions { get; set; } = "[]";
    public string SmokingRestrictions { get; set; } = "[]";

    // Ticket Flexibility Policies
    public string TicketNameChangeAllowed { get; set; } = "Yes"; // Yes, No, Other
    public string TicketNamePolicy { get; set; } = "Only the person whose name is on the ticket can use the ticket";
    public string TicketDaysInterchangeable { get; set; } = "No"; // Yes, No, Not Applicable, Other

    // Organizer (FK)
    public int OrganizerId { get; set; }
    public Organizer Organizer { get; set; } = null!;

    // Navigation collections
    public ICollection<EventShow> Shows { get; set; } = new List<EventShow>();
    public ICollection<TicketTier> TicketTiers { get; set; } = new List<TicketTier>();
    public ICollection<SeatingZone> SeatingZones { get; set; } = new List<SeatingZone>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<EventTag> EventTags { get; set; } = new List<EventTag>();
}
