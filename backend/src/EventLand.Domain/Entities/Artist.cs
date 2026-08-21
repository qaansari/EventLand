namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Performing artist entity.
/// Uses 4-digit integer ID scheme.
/// </summary>
public class Artist : BaseEntity
{
    public string  Name         { get; set; } = string.Empty;
    public string  Genre        { get; set; } = string.Empty;
    public string  Role         { get; set; } = string.Empty;
    public string  City         { get; set; } = string.Empty;
    public string  ImageUrl     { get; set; } = string.Empty;
    public string  Bio          { get; set; } = string.Empty;
    public string? Availability { get; set; }

    public decimal StartingRate { get; set; }
    public decimal Rating       { get; set; } = 5.0m;
    public int     ShowsDone    { get; set; } = 0;
    public bool    IsFeatured   { get; set; } = false;
}
