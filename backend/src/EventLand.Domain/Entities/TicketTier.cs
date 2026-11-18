namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;
using EventLand.Domain.Enums;
using EventLand.Domain.Services;

/// <summary>
/// A ticket tier (e.g. Standard, VIP, Gold) belonging to a specific event.
/// Uses 4-digit integer ID scheme.
/// </summary>
public class TicketTier : BaseEntity
{
    public int EventId { get; set; }
    public Event Event { get; set; } = null!;

    public int? EventShowId { get; set; }
    public EventShow? EventShow { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? RowRange { get; set; }

    // Inventory
    public int AvailableQuantity { get; set; } = 100;
    public int SoldCount { get; set; } = 0;

    // Status: Available, SoldOut, Closed
    public TicketTierStatus Status { get; set; } = TicketTierStatus.Available;

    public AvailabilityResult EffectiveAvailability =>
        AvailabilityPolicy.Evaluate(Event, EventShow, this, DateTimeOffset.UtcNow);

    public TicketTierStatus EffectiveStatus
    {
        get
        {
            var result = EffectiveAvailability;
            return result.Status switch
            {
                AvailabilityStatus.Bookable => TicketTierStatus.Available,
                AvailabilityStatus.SoldOut => TicketTierStatus.SoldOut,
                _ => TicketTierStatus.Closed
            };
        }
    }

    public void CloseTier()
    {
        Status = TicketTierStatus.Closed;
    }

    public void ReopenTier()
    {
        Status = TicketTierStatus.Available;
    }

    // Purchase limits
    public int MaxPerOrder { get; set; } = 10;

    // Display order
    public int SortOrder { get; set; } = 0;

    // Navigation
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
