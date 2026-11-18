namespace EventLand.Infrastructure.Services;

using System.Security.Cryptography;
using System.Text;
using EventLand.Application.Interfaces;
using Microsoft.Extensions.Configuration;

public class GateQrSignatureService : IGateQrSignatureService
{
    private readonly string _defaultSecret;

    public GateQrSignatureService(IConfiguration configuration)
    {
        _defaultSecret = configuration["Gate:SecretKey"] ?? "EventLand_Gate_Secret_2026_EnterpriseSecure_HMACKey!";
    }

    private static string BuildMessage(string bookingRef, int eventId, int? showId, int? seatId)
    {
        return $"{bookingRef.Trim().ToUpperInvariant()}:{eventId}:{showId ?? 0}:{seatId ?? 0}";
    }

    public string GenerateSignature(string bookingRef, int eventId, int? showId = null, int? seatId = null, string? secretKey = null)
    {
        var secret = secretKey ?? _defaultSecret;
        var message = BuildMessage(bookingRef, eventId, showId, seatId);
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public bool VerifySignature(string bookingRef, int eventId, int? showId, string signature, int? seatId = null, string? secretKey = null)
    {
        if (string.IsNullOrWhiteSpace(signature))
            return false;

        var expectedSignature = GenerateSignature(bookingRef, eventId, showId, seatId, secretKey);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(signature.Trim().ToLowerInvariant()),
            Encoding.UTF8.GetBytes(expectedSignature));
    }

    public string CreateSignedPayload(string bookingRef, int eventId, int? showId = null, int? seatId = null)
    {
        var sig = GenerateSignature(bookingRef, eventId, showId, seatId);
        return $"EVL-QR:{bookingRef.Trim().ToUpperInvariant()}:{eventId}:{showId ?? 0}:{seatId ?? 0}:{sig}";
    }

    public (bool IsValid, string BookingRef, int EventId, int? ShowId, int? SeatId) ParseAndVerifyPayload(string rawPayload)
    {
        if (string.IsNullOrWhiteSpace(rawPayload))
            return (false, string.Empty, 0, null, null);

        var trimmed = rawPayload.Trim();
        if (!trimmed.StartsWith("EVL-QR:", StringComparison.OrdinalIgnoreCase))
        {
            // Legacy plain booking reference
            return (true, trimmed, 0, null, null);
        }

        var parts = trimmed.Split(':');
        if (parts.Length != 6)
            return (false, string.Empty, 0, null, null);

        var bookingRef = parts[1];
        if (!int.TryParse(parts[2], out var eventId))
            return (false, string.Empty, 0, null, null);

        int.TryParse(parts[3], out var showIdNum);
        int? showId = showIdNum > 0 ? showIdNum : null;

        int.TryParse(parts[4], out var seatIdNum);
        int? seatId = seatIdNum > 0 ? seatIdNum : null;

        var signature = parts[5];
        var isValid = VerifySignature(bookingRef, eventId, showId, signature, seatId);

        return (isValid, bookingRef, eventId, showId, seatId);
    }
}
