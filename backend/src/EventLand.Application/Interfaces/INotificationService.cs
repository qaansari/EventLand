namespace EventLand.Application.Interfaces;

using EventLand.Application.Dtos;

public interface INotificationService
{
    Task SendTicketConfirmationEmailAsync(BookingDto booking);
    Task<string> GenerateWhatsAppTicketShareUrlAsync(BookingDto booking);
}
