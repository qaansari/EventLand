namespace EventLand.Application.Interfaces;

public interface IGateQrSignatureService
{
    string GenerateSignature(string bookingRef, int eventId, int? showId = null, int? seatId = null, string? secretKey = null);
    bool VerifySignature(string bookingRef, int eventId, int? showId, string signature, int? seatId = null, string? secretKey = null);
    string CreateSignedPayload(string bookingRef, int eventId, int? showId = null, int? seatId = null);
    (bool IsValid, string BookingRef, int EventId, int? ShowId, int? SeatId) ParseAndVerifyPayload(string rawPayload);
}
