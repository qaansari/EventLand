namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Dynamic platform fee configuration tier for ticketing orders.
/// Enables admins to configure subtotal boundaries and fixed platform fee amounts in PKR.
/// </summary>
public class PlatformFeeConfig : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public decimal MinSubtotal { get; set; } = 0m;
    public decimal? MaxSubtotal { get; set; }
    public decimal FeeAmount { get; set; } = 0m;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;
    public string? Description { get; set; }
}

