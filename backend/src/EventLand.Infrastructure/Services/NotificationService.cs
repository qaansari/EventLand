namespace EventLand.Infrastructure.Services;

using System.Net;
using System.Net.Mail;
using System.Text.Encodings.Web;
using EventLand.Application.Dtos;
using EventLand.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Web;

public class NotificationService : INotificationService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(IConfiguration configuration, ILogger<NotificationService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendTicketConfirmationEmailAsync(BookingDto booking)
    {
        if (string.IsNullOrWhiteSpace(booking.CustomerEmail)) return;

        try
        {
            var host = _configuration["Smtp:Host"];
            var portStr = _configuration["Smtp:Port"];
            var user = _configuration["Smtp:User"];
            var pass = _configuration["Smtp:Password"];
            var fromEmail = _configuration["Smtp:FromEmail"] ?? "tickets@eventland.pk";
            var fromName = _configuration["Smtp:FromName"] ?? "EventLand Pakistan";

            var subject = $"Your Official E-Ticket Pass - {booking.EventTitle} ({booking.BookingRef})";

            // HTML-encode all user-controlled fields to prevent stored XSS
            var safeEventTitle = HttpUtility.HtmlEncode(booking.EventTitle);
            var safeBookingRef = HttpUtility.HtmlEncode(booking.BookingRef);
            var safeCustomerName = HttpUtility.HtmlEncode(booking.CustomerName);
            var safeTierName = HttpUtility.HtmlEncode(booking.TicketTierName);

            var bodyHtml = $@"
<!DOCTYPE html>
<html>
<head>
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #061017; color: #f8fafc; margin: 0; padding: 20px; }}
    .card {{ background-color: #0f172a; border: 1px solid #0d9488; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 24px; }}
    .header {{ border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 16px; }}
    .badge {{ background-color: #059669; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; }}
    .info-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #94a3b8; }}
    .info-val {{ color: #ffffff; font-weight: 600; }}
    .footer {{ margin-top: 24px; font-size: 12px; color: #64748b; text-align: center; }}
  </style>
</head>
<body>
  <div class='card'>
    <div class='header'>
      <span class='badge'>CONFIRMED PASS</span>
      <h2 style='color: #ffffff; margin-top: 8px;'>{safeEventTitle}</h2>
      <p style='color: #2dd4bf; margin: 0;'>Booking Ref: <strong>{safeBookingRef}</strong></p>
    </div>
    <div class='info-row'><span>Pass Holder:</span> <span class='info-val'>{safeCustomerName}</span></div>
    <div class='info-row'><span>Ticket Tier:</span> <span class='info-val'>{safeTierName} ({booking.Quantity} Pass)</span></div>
    <div class='info-row'><span>Amount Paid:</span> <span class='info-val'>PKR {booking.TotalAmount:N0}</span></div>
    <div class='info-row'><span>Payment Method:</span> <span class='info-val'>Direct Bank Transfer (Verified)</span></div>
    <div class='footer'>
      <p>Thank you for booking with EventLand Pakistan. Please present this reference or your QR E-Ticket pass at the venue entrance.</p>
    </div>
  </div>
</body>
</html>";

            if (!string.IsNullOrWhiteSpace(host) && int.TryParse(portStr, out var port))
            {
                using var client = new SmtpClient(host, port)
                {
                    EnableSsl = true,
                    Credentials = (!string.IsNullOrWhiteSpace(user) && !string.IsNullOrWhiteSpace(pass))
                        ? new NetworkCredential(user, pass)
                        : null
                };

                using var mail = new MailMessage
                {
                    From = new MailAddress(fromEmail, fromName),
                    Subject = subject,
                    Body = bodyHtml,
                    IsBodyHtml = true
                };

                mail.To.Add(booking.CustomerEmail);
                await client.SendMailAsync(mail);
                _logger.LogInformation("Confirmation E-Ticket email sent to {Email} for {BookingRef}", booking.CustomerEmail, booking.BookingRef);
            }
            else
            {
                _logger.LogInformation("SMTP not configured. Logged E-Ticket dispatch for {Email} ({BookingRef})", booking.CustomerEmail, booking.BookingRef);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send ticket email to {Email}", booking.CustomerEmail);
        }
    }

    public Task<string> GenerateWhatsAppTicketShareUrlAsync(BookingDto booking)
    {
        var phone = booking.CustomerPhone?.Replace("+", "").Replace(" ", "").Replace("-", "").Trim() ?? "";
        if (phone.StartsWith("03"))
        {
            phone = "92" + phone.Substring(1);
        }

        var message = $"*EventLand Pakistan - E-Ticket Pass Confirmed!* 🎟️\n\n" +
                      $"*Event:* {booking.EventTitle}\n" +
                      $"*Booking Ref:* {booking.BookingRef}\n" +
                      $"*Pass Holder:* {booking.CustomerName}\n" +
                      $"*Quantity:* {booking.Quantity} Pass\n" +
                      $"*Total Paid:* PKR {booking.TotalAmount:N0}\n" +
                      $"*Status:* CONFIRMED & VERIFIED ✓\n\n" +
                      $"Show this confirmation at the venue entrance for gate check-in.";

        var encodedMsg = UrlEncoder.Default.Encode(message);
        var url = string.IsNullOrWhiteSpace(phone)
            ? $"https://api.whatsapp.com/send?text={encodedMsg}"
            : $"https://api.whatsapp.com/send?phone={phone}&text={encodedMsg}";

        return Task.FromResult(url);
    }
}
