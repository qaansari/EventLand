namespace EventLand.Application.Interfaces;

using EventLand.Application.Dtos;

public interface IAdminService
{
    // --- Roles CRUD ---
    Task<List<RoleDto>> GetRolesAsync();
    Task<RoleDto?> GetRoleByIdAsync(int id);
    Task<RoleDto> CreateRoleAsync(CreateRoleDto dto);
    Task<RoleDto> UpdateRoleAsync(int id, UpdateRoleDto dto);
    Task<bool> DeleteRoleAsync(int id);

    // --- Users CRUD ---
    Task<PagedResult<UserDto>> GetUsersAsync(int pageNumber = 1, int pageSize = 10);
    Task<UserDto?> GetUserByIdAsync(int id);
    Task<UserDto> CreateUserAsync(CreateUserDto dto);
    Task<UserDto> UpdateUserAsync(int id, UpdateUserDto dto);
    Task<bool> DeleteUserAsync(int id);

    // --- Events CRUD ---
    Task<PagedResult<EventSummaryDto>> GetEventsAsync(int pageNumber = 1, int pageSize = 10);
    Task<EventDetailDto> CreateEventAsync(CreateAdminEventDto dto);
    Task<EventDetailDto> UpdateEventAsync(int id, UpdateAdminEventDto dto);
    Task<bool> DeleteEventAsync(int id);

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
    Task<TicketTierDto> CreateTicketTierAsync(CreateTicketTierDto dto);
    Task<TicketTierDto> UpdateTicketTierAsync(int id, UpdateTicketTierDto dto);
    Task<bool> DeleteTicketTierAsync(int id);

    // --- SeatingZones & Seats CRUD ---
    Task<SeatingZoneDto> CreateSeatingZoneAsync(CreateSeatingZoneDto dto);
    Task<SeatingZoneDto> UpdateSeatingZoneAsync(int id, UpdateSeatingZoneDto dto);
    Task<bool> DeleteSeatingZoneAsync(int id);

    // --- Bookings CRUD ---
    Task<PagedResult<BookingDto>> GetBookingsAsync(int? eventId, string? search, int pageNumber = 1, int pageSize = 10);
    Task<BookingDto?> GetBookingByIdAsync(int id);
    Task<BookingDto> UpdateBookingStatusAsync(int id, UpdateBookingStatusDto dto);
    Task<bool> DeleteBookingAsync(int id);

    // --- Tags CRUD ---
    Task<List<TagDto>> GetTagsAsync();
    Task<TagDto> CreateTagAsync(CreateTagDto dto);
    Task<TagDto> UpdateTagAsync(int id, UpdateTagDto dto);
    Task<bool> DeleteTagAsync(int id);
}
