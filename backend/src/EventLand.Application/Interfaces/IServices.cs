namespace EventLand.Application.Interfaces;

using EventLand.Application.Dtos;

public interface IEventService
{
    Task<PagedResult<EventSummaryDto>> GetEventsAsync(
        string? category,
        string? city,
        string? search,
        string? tag,
        int pageNumber = 1,
        int pageSize = 10);

    Task<EventDetailDto?> GetEventByIdAsync(int id);
}

public interface IArtistService
{
    Task<PagedResult<ArtistDto>> GetArtistsAsync(bool? featured, int pageNumber = 1, int pageSize = 10);
    Task<ArtistDto?> GetArtistByIdAsync(int id);
}

public interface IBookingService
{
    Task<BookingDto> CreateBookingAsync(CreateBookingDto dto, int? userId = null, string? userEmail = null);
    Task<BookingDto?> GetBookingByIdAsync(int id);
    Task<BookingDto?> GetBookingByRefAsync(string bookingRef);
    Task<PagedResult<BookingDto>> GetBookingsByEmailAsync(string email, int pageNumber = 1, int pageSize = 10);
    Task<BookingDto> SubmitPaymentProofAsync(int id, SubmitBankPaymentProofDto dto);
    Task<BookingDto> ConfirmBankPaymentAsync(int id, ConfirmBankPaymentDto dto, int? adminId = null, string? adminEmail = null);
    Task<BookingDto> RejectBankPaymentAsync(int id, RejectBankPaymentDto dto, int? adminId = null, string? adminEmail = null);
}
