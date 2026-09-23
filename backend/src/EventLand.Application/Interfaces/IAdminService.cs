namespace EventLand.Application.Interfaces;

using EventLand.Application.Dtos;

public interface IAdminService
{
    // --- Location & Venue Hierarchy ---
    Task<List<CountryDto>> GetCountriesAsync();
    Task<CountryDto?> GetCountryByIdAsync(int id);
    Task<CountryDto> CreateCountryAsync(CreateCountryDto dto);
    Task<CountryDto> UpdateCountryAsync(int id, UpdateCountryDto dto);
    Task<bool> DeleteCountryAsync(int id);

    Task<List<CityDto>> GetCitiesAsync(int? countryId = null);
    Task<CityDto?> GetCityByIdAsync(int id);
    Task<CityDto> CreateCityAsync(CreateCityDto dto);
    Task<CityDto> UpdateCityAsync(int id, UpdateCityDto dto);
    Task<bool> DeleteCityAsync(int id);

    Task<List<VenueDto>> GetVenuesAsync(int? cityId = null);
    Task<VenueDto?> GetVenueByIdAsync(int id);
    Task<VenueDto> CreateVenueAsync(CreateVenueDto dto);
    Task<VenueDto> UpdateVenueAsync(int id, UpdateVenueDto dto);
    Task<bool> DeleteVenueAsync(int id);
    Task<List<AuditoriumDto>> GetAuditoriumsAsync(int? venueId = null);
    Task<AuditoriumDto?> GetAuditoriumByIdAsync(int id);
    Task<AuditoriumDto> CreateAuditoriumAsync(CreateAuditoriumDto dto);
    Task<AuditoriumDto> UpdateAuditoriumAsync(int id, UpdateAuditoriumDto dto);
    Task<bool> DeleteAuditoriumAsync(int id);

    // --- Roles CRUD ---
    Task<List<RoleDto>> GetRolesAsync();
    Task<RoleDto?> GetRoleByIdAsync(int id);
    Task<RoleDto> CreateRoleAsync(CreateRoleDto dto);
    Task<RoleDto> UpdateRoleAsync(int id, UpdateRoleDto dto);
    Task<bool> DeleteRoleAsync(int id);

    // --- Users CRUD ---
    Task<PagedResult<UserDto>> GetUsersAsync(int pageNumber = 1, int pageSize = 10, bool isSuperAdmin = true);
    Task<UserDto?> GetUserByIdAsync(int id, bool isSuperAdmin = true);
    Task<UserDto> CreateUserAsync(CreateUserDto dto, bool isSuperAdmin = true);
    Task<UserDto> UpdateUserAsync(int id, UpdateUserDto dto, bool isSuperAdmin = true);
    Task<bool> DeleteUserAsync(int id, bool isSuperAdmin = true);

    // --- Events CRUD ---
    Task<PagedResult<EventSummaryDto>> GetEventsAsync(int pageNumber = 1, int pageSize = 10);
    Task<EventDetailDto> GetEventByIdAsync(int eventId);
    Task<EventDetailDto> CreateEventAsync(CreateAdminEventDto dto);
    Task<EventDetailDto> UpdateEventAsync(int id, UpdateAdminEventDto dto, int? organizerId = null);
    Task<bool> DeleteEventAsync(int id, int? organizerId = null);

    // --- EventShows CRUD ---
    Task<List<EventShowDto>> GetEventShowsAsync(int? eventId = null, int? organizerId = null);
    Task<EventShowDto?> GetEventShowByIdAsync(int id, int? organizerId = null);
    Task<EventShowDto> CreateEventShowAsync(CreateEventShowDto dto, int? organizerId = null);
    Task<EventShowDto> UpdateEventShowAsync(int id, UpdateEventShowDto dto, int? organizerId = null);
    Task<bool> DeleteEventShowAsync(int id, int? organizerId = null);

    // --- Organizers CRUD ---
    Task<List<OrganizerDto>> GetOrganizersAsync();
    Task<OrganizerDto?> GetOrganizerByIdAsync(int id);
    Task<OrganizerDto> CreateOrganizerAsync(CreateOrganizerDto dto);
    Task<OrganizerDto> UpdateOrganizerAsync(int id, UpdateOrganizerDto dto);
    Task<bool> DeleteOrganizerAsync(int id);

    // --- Artists CRUD ---
    Task<PagedResult<ArtistDto>> GetArtistsAsync(int pageNumber = 1, int pageSize = 10);
    Task<ArtistDto?> GetArtistByIdAsync(int id);
    Task<ArtistDto> CreateArtistAsync(CreateArtistDto dto);
    Task<ArtistDto> UpdateArtistAsync(int id, UpdateArtistDto dto);
    Task<bool> DeleteArtistAsync(int id);

    // --- TicketTiers CRUD ---
    Task<List<TicketTierDto>> GetTicketTiersAsync(int? eventId = null, int? eventShowId = null, int? organizerId = null);
    Task<TicketTierDto> CreateTicketTierAsync(CreateTicketTierDto dto, int? organizerId = null);
    Task<TicketTierDto> UpdateTicketTierAsync(int id, UpdateTicketTierDto dto, int? organizerId = null);
    Task<bool> DeleteTicketTierAsync(int id, int? organizerId = null);

    // --- SeatingZones & Seats CRUD ---
    Task<SeatingZoneDto> CreateSeatingZoneAsync(CreateSeatingZoneDto dto);
    Task<SeatingZoneDto> UpdateSeatingZoneAsync(int id, UpdateSeatingZoneDto dto);
    Task<bool> DeleteSeatingZoneAsync(int id);

    // --- Bookings CRUD ---
    Task<PagedResult<BookingDto>> GetBookingsAsync(int? eventId, string? search, int pageNumber = 1, int pageSize = 10, int? organizerId = null);
    Task<BookingDto?> GetBookingByIdAsync(int id, int? organizerId = null);
    Task<BookingDto> UpdateBookingStatusAsync(int id, UpdateBookingStatusDto dto, int? organizerId = null);
    Task<bool> DeleteBookingAsync(int id);

    // --- Tags CRUD ---
    Task<List<TagDto>> GetTagsAsync();
    Task<TagDto> CreateTagAsync(CreateTagDto dto);
    Task<TagDto> UpdateTagAsync(int id, UpdateTagDto dto);
    Task<bool> DeleteTagAsync(int id);
}
