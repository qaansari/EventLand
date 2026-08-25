namespace EventLand.Application.Common;

using System;
using System.IO;
using System.Linq;

public static class FileUrlHelper
{
    /// <summary>
    /// Extracts just the filename with extension (e.g. "ev_suffinight_01.png") for database storage.
    /// </summary>
    public static string? ExtractFileName(string? inputPath)
    {
        if (string.IsNullOrWhiteSpace(inputPath)) return null;

        var trimmed = inputPath.Trim();

        // If it's a relative path or full URL pointing to assets/images/... or uploads/...
        if (trimmed.Contains("/assets/", StringComparison.OrdinalIgnoreCase) || 
            trimmed.Contains("/uploads/", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Contains('\\'))
        {
            return Path.GetFileName(trimmed);
        }

        // If it contains a slash, extract filename
        if (trimmed.Contains('/'))
        {
            return Path.GetFileName(trimmed);
        }

        return trimmed;
    }

    /// <summary>
    /// Formats an organizer logo URL for API responses. If only the filename is stored,
    /// prefixes it with the relative static route "/assets/images/organizers/".
    /// </summary>
    public static string FormatOrganizerLogoUrl(string? logoUrl)
    {
        if (string.IsNullOrWhiteSpace(logoUrl)) return string.Empty;

        var trimmed = logoUrl.Trim();

        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || 
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("/"))
        {
            return trimmed;
        }

        return $"/assets/images/organizers/{trimmed}";
    }

    /// <summary>
    /// Formats an event banner URL for API responses. If only the filename is stored,
    /// prefixes it with the relative static route "/assets/images/events/".
    /// </summary>
    public static string FormatEventBannerUrl(string? bannerUrl)
    {
        if (string.IsNullOrWhiteSpace(bannerUrl)) return string.Empty;

        var trimmed = bannerUrl.Trim();

        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || 
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("/"))
        {
            return trimmed;
        }

        return $"/assets/images/events/{trimmed}";
    }

    /// <summary>
    /// Formats an artist image URL for API responses.
    /// </summary>
    public static string FormatArtistImageUrl(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return string.Empty;

        var trimmed = imageUrl.Trim();

        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || 
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("/"))
        {
            return trimmed;
        }

        return $"/assets/images/artists/{trimmed}";
    }

    /// <summary>
    /// Generates structured image filename following strict naming convention:
    /// Organizers: org_[name]_[last2digitsofId].[ext] (e.g. org_eventland_01.png)
    /// Events: ev_[name]_[last2digitsofId].[ext] (e.g. ev_suffinight_01.jpg)
    /// </summary>
    public static string FormatEntityImageFileName(string type, string? entityName, int entityId, string extension)
    {
        extension = extension.ToLowerInvariant();
        if (extension == ".jpeg") extension = ".jpg";

        string prefix = (type?.ToLowerInvariant()) switch
        {
            "organizer" or "organizers" => "org",
            _ => "ev"
        };

        string rawName = entityName ?? "";
        string cleanName = new string(rawName
            .ToLowerInvariant()
            .Where(c => char.IsLetterOrDigit(c))
            .ToArray());

        if (string.IsNullOrWhiteSpace(cleanName))
        {
            cleanName = prefix == "org" ? "organizer" : "event";
        }

        int lastTwoDigits = Math.Abs(entityId % 100);
        string idSuffix = lastTwoDigits.ToString("D2");

        return $"{prefix}_{cleanName}_{idSuffix}{extension}";
    }
}
