namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Event organizer/company entity.
/// Uses 4-digit integer ID scheme.
/// </summary>
public class Organizer : BaseEntity
{
    public string  Name        { get; set; } = string.Empty;
    public string  Email       { get; set; } = string.Empty;
    public string  Phone       { get; set; } = string.Empty;
    public string? LogoUrl     { get; set; }
    public string? WebsiteUrl  { get; set; }
    public bool    IsVerified  { get; set; } = false;

    // Navigation — Events organized by this company
    public ICollection<Event> Events { get; set; } = new List<Event>();
}
