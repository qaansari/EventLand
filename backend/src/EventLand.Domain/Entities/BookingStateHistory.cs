namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;
using EventLand.Domain.Enums;

public class BookingStateHistory : BaseEntity
{
    public int BookingId { get; set; }
    public Booking Booking { get; set; } = null!;

    public BookingState FromState { get; set; }
    public BookingState ToState { get; set; }
    public string Trigger { get; set; } = string.Empty;
    public string? ChangedBy { get; set; }
    public string? Reason { get; set; }
    public string? MetadataJson { get; set; }
}
