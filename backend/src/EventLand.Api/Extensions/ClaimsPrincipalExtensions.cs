namespace EventLand.Api.Extensions;

using System.Security.Claims;

/// <summary>
/// Reusable extensions for ClaimsPrincipal to eliminate duplicated claims parsing and role inspection.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Extracts the integer user identifier from NameIdentifier or sub claim.
    /// </summary>
    public static int? GetUserId(this ClaimsPrincipal principal)
    {
        var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
        return int.TryParse(raw, out var id) ? id : null;
    }

    /// <summary>
    /// Extracts the authenticated user's email address.
    /// </summary>
    public static string? GetEmail(this ClaimsPrincipal principal) =>
        principal.FindFirstValue(ClaimTypes.Email) ?? principal.FindFirstValue("email");

    /// <summary>
    /// Extracts the integer organizer ID associated with an organizer account.
    /// </summary>
    public static int? GetOrganizerId(this ClaimsPrincipal principal)
    {
        var raw = principal.FindFirst("organizerId")?.Value;
        return int.TryParse(raw, out var orgId) ? orgId : null;
    }

    /// <summary>
    /// Determines whether the user possesses SuperAdmin or Admin role privileges.
    /// </summary>
    public static bool IsAdmin(this ClaimsPrincipal principal) =>
        principal.IsInRole("SuperAdmin") || principal.IsInRole("Admin") ||
        principal.IsInRole("superadmin") || principal.IsInRole("admin");

    /// <summary>
    /// Determines whether the user possesses Organizer role privileges.
    /// </summary>
    public static bool IsOrganizer(this ClaimsPrincipal principal) =>
        principal.IsInRole("Organizer") || principal.IsInRole("organizer");

    /// <summary>
    /// Determines whether the user possesses SuperAdmin role privileges.
    /// </summary>
    public static bool IsSuperAdmin(this ClaimsPrincipal principal) =>
        principal.IsInRole("SuperAdmin") || principal.IsInRole("superadmin");
}
