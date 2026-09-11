namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;
using EventLand.Domain.Enums;

/// <summary>
/// A ticket booking placed by a customer for a specific event and ticket tier.
/// Uses direct manual bank transfer workflow without external gateway fees.
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

    // Ticket details & Authoritative Pricing Snapshot
    public int          Quantity                 { get; set; } = 1;
    public decimal      UnitPrice                { get; set; }
    public decimal      SubtotalAmount           { get; set; } // Raw ticket price before fees (Quantity * UnitPrice or Sum of seats)
    public decimal      PlatformFee              { get; set; } // EventLand platform tier fee (49/99/149/199 PKR)
    public decimal      PaymentProcessingFee     { get; set; } // Payment gateway processing fee
    public decimal      FeePercentageAtPurchase  { get; set; } // Snapshot of % fee at checkout (e.g. 2.80% or 0.80%)
    public decimal      TotalAmount              { get; set; } // Final total payable: Subtotal + PlatformFee + ProcessingFee

    // Status & payment
    public BookingStatus  Status          { get; set; } = BookingStatus.Pending;
    public PaymentStatus  PaymentStatus   { get; set; } = PaymentStatus.Pending;
    public PaymentMethod  PaymentMethod   { get; set; } = PaymentMethod.None;
    public DateTimeOffset? PaidAt         { get; set; }

    // Direct Bank Transfer & Verification fields
    public string?        BankTransactionRef   { get; set; }
    public string?        PaymentProofUrl      { get; set; }
    public string?        SenderAccountTitle   { get; set; }
    public string?        SenderBankName       { get; set; }
    public string?        SenderAccountLast4   { get; set; }
    public int?           VerifiedByAdminId    { get; set; }
    public string?        VerifiedByAdminEmail { get; set; }
    public DateTimeOffset? VerifiedAt          { get; set; }

    // 30-Minute hold expiry window
    public DateTimeOffset? PaymentExpiresAt    { get; set; }

    // Refund tracking
    public DateTimeOffset? RefundedAt          { get; set; }
    public string?        RefundReason         { get; set; }

    // Navigation
    public ICollection<BookingSeat>        BookingSeats        { get; set; } = new List<BookingSeat>();
    public ICollection<PaymentTransaction> PaymentTransactions { get; set; } = new List<PaymentTransaction>();
}
