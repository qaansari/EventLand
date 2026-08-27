namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;
using EventLand.Domain.Enums;

/// <summary>
/// Application user entity (SuperAdmin, Admin, Organizer, Customer).
/// Uses 4-digit integer Primary Key (int Id).
/// Linked to dedicated Role table via RoleId FK.
/// </summary>
public class User : BaseEntity
{
    public string    Email         { get; set; } = string.Empty;
    public string    PasswordHash  { get; set; } = string.Empty;
    public string    FullName      { get; set; } = string.Empty;
    public string?   PhoneNumber   { get; set; }
    public string?   ImageUrl      { get; set; }

    // Role Foreign Key & Navigation
    public int       RoleId        { get; set; }
    public Role      Role          { get; set; } = null!;

    public bool      IsActive      { get; set; } = true;
    public DateTimeOffset? LastLoginAt { get; set; }
}
