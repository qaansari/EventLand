namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Auditorium / Venue Seating Chart Template.
/// Stores structured layout blueprints, sections, rows, aisles, and capacities.
/// Uses 4-digit integer ID scheme.
/// </summary>
public class AuditoriumLayout : BaseEntity
{
    public string Name          { get; set; } = string.Empty; // e.g. "Arts Council of Pakistan (AC II)"
    public string Venue         { get; set; } = string.Empty; // e.g. "Arts Council of Pakistan"
    public string City          { get; set; } = string.Empty; // e.g. "Karachi"
    public string LayoutCode    { get; set; } = string.Empty; // e.g. "AC_II_ACP_KARACHI"
    public int    TotalCapacity { get; set; }
    public string Description   { get; set; } = string.Empty;
    public string LayoutJson    { get; set; } = string.Empty; // JSON schema of sections, rows, aisles, seats
    public bool   IsActive      { get; set; } = true;
}
