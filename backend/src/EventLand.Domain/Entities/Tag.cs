namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Categorical tag (e.g. "Live Music", "Fashion").
/// Uses 4-digit integer ID scheme.
/// </summary>
public class Tag : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;

    // Navigation
    public ICollection<EventTag> EventTags { get; set; } = new List<EventTag>();
}
