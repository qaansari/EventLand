namespace EventLand.Application.Common;

/// <summary>
/// Canonical role-string constants for use in [Authorize(Roles = ...)] attributes.
/// Eliminates case-mismatch bugs by including both PascalCase and lowercase variants.
/// </summary>
public static class AppRoles
{
    /// <summary>SuperAdmin + Admin (both casings).</summary>
    public const string AdminOrSuperAdmin = "SuperAdmin,Admin,superadmin,admin";

    /// <summary>SuperAdmin + Admin + Organizer (both casings).</summary>
    public const string OrganizerOrAdmin = "SuperAdmin,Admin,Organizer,superadmin,admin,organizer";

    /// <summary>SuperAdmin only (both casings).</summary>
    public const string SuperAdminOnly = "SuperAdmin,superadmin";
}
