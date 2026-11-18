namespace EventLand.Application.Common;

/// <summary>
/// Canonical authorization policy names registered in ASP.NET Core authorization options.
/// Eliminates ad-hoc role string checks and unifies RBAC policy enforcement across API endpoints.
/// </summary>
public static class AppPolicies
{
    public const string RequireAdmin = "RequireAdmin";
    public const string RequireSuperAdmin = "RequireSuperAdmin";
    public const string RequireOrganizerOrAdmin = "RequireOrganizerOrAdmin";
    public const string RequireGatekeeper = "RequireGatekeeper";
}
