namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Audit record for ticket booking refunds initiated by Admins/Organizers or system rules.
/// </summary>
public class RefundRecord : BaseEntity
{
    public int            BookingId       { get; set; }
    public Booking        Booking         { get; set; } = null!;

    public decimal        Amount          { get; set; }
    public string         Reason          { get; set; } = string.Empty;
    public string         Status          { get; set; } = "Processed"; // Pending, Approved, Processed, Rejected

    public int?           ProcessedByUserId { get; set; }
    public string?        ProcessedByEmail { get; set; }

    public DateTimeOffset ProcessedAt     { get; set; } = DateTimeOffset.UtcNow;
}
