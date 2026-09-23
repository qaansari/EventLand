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

    // Country Foreign Key & Navigation
    public int?      CountryId     { get; set; }
    public Country?  Country       { get; set; }

    // Role Foreign Key & Navigation
    public int       RoleId        { get; set; }
    public Role      Role          { get; set; } = null!;

    // Organizer Company Foreign Key & Navigation (allows multiple users per organizer)
    public int?      OrganizerId   { get; set; }
    public Organizer? Organizer    { get; set; }

    public bool      IsActive      { get; set; } = true;
    public DateTimeOffset? LastLoginAt { get; set; }

    // Account lockout & brute-force defense
    public int       AccessFailedCount { get; set; } = 0;
    public DateTimeOffset? LockoutEndUtc { get; set; }
}

