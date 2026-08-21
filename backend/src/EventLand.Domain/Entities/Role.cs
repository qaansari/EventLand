namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;

/// <summary>
/// Dedicated Role entity in database.
/// Uses 4-digit integer Primary Key (int Id).
/// </summary>
public class Role : BaseEntity
{
    public string Name        { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Navigation — Users belonging to this role
    public ICollection<User> Users { get; set; } = new List<User>();
}
