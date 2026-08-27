namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;
using EventLand.Domain.Enums;

/// <summary>
/// A ticket booking placed by a customer for a specific event and ticket tier.
/// Uses 4-digit integer ID scheme.
/// </summary>
public class Booking : BaseEntity
{
    // Event + Tier references
    public int          EventId         { get; set; }
    public Event        Event           { get; set; } = null!;

    public int          TicketTierId    { get; set; }
    public TicketTier   TicketTier      { get; set; } = null!;

    // Owning user account (nullable: preserves guest-checkout capability at the DB level)
    public int?         UserId          { get; set; }
    public User?        User            { get; set; }

    // Human-readable booking reference
    public string       BookingRef      { get; set; } = string.Empty;

    // Customer info
    public string       CustomerName    { get; set; } = string.Empty;
    public string       CustomerEmail   { get; set; } = string.Empty;
    public string       CustomerPhone   { get; set; } = string.Empty;

    // Ticket details
    public int          Quantity        { get; set; } = 1;
    public decimal      UnitPrice       { get; set; }
    public decimal      TotalAmount     { get; set; }

    // Status & payment
    public BookingStatus  Status          { get; set; } = BookingStatus.Pending;
    public PaymentStatus  PaymentStatus   { get; set; } = PaymentStatus.Pending;
    public PaymentMethod  PaymentMethod   { get; set; } = PaymentMethod.None;
    public DateTimeOffset? PaidAt         { get; set; }

    // PayPro Pakistan integration & timer fields
    public string?        PayProInvoiceId   { get; set; }
    public string?        PayProConnectUrl { get; set; }
    public DateTimeOffset? PaymentExpiresAt { get; set; }

    // Refund tracking
    public DateTimeOffset? RefundedAt      { get; set; }
    public string?        RefundReason    { get; set; }

    // Navigation
    public ICollection<BookingSeat> BookingSeats { get; set; } = new List<BookingSeat>();
}
