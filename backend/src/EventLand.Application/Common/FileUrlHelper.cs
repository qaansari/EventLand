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
    /// Formats a user avatar URL for API responses.
    /// </summary>
    public static string FormatUserImageUrl(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return string.Empty;

        var trimmed = imageUrl.Trim();

        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("/"))
        {
            return trimmed;
        }

        return $"/assets/images/users/{trimmed}";
    }

    /// <summary>
    /// Formats a bank account QR code image URL for API responses.
    /// </summary>
    public static string FormatBankAccountQrCodeUrl(string? qrUrl)
    {
        if (string.IsNullOrWhiteSpace(qrUrl)) return string.Empty;

        var trimmed = qrUrl.Trim();

        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("/"))
        {
            return trimmed;
        }

        return $"/assets/images/qr_codes/{trimmed}";
    }

    /// <summary>
    /// Generates structured image filename following strict naming convention:
    /// Organizers: org_[name]_[fullId].[ext] (e.g. org_eventland_42.png)
    /// Users:      usr_[name]_[fullId].[ext] (e.g. usr_qamaransari_7.png)
    /// QR Codes:   qr_[name]_[fullId].[ext] (e.g. qr_meezanbank_1.png)
    /// Events:     ev_[name]_[fullId].[ext] (e.g. ev_suffinight_123.jpg)
    /// The full entity id is embedded (not modulo) so filenames never collide across ids.
    /// </summary>
    public static string FormatEntityImageFileName(string type, string? entityName, int entityId, string extension)
    {
        extension = extension.ToLowerInvariant();
        if (extension == ".jpeg") extension = ".jpg";

        string prefix = (type?.ToLowerInvariant()) switch
        {
            "organizer" or "organizers" => "org",
            "user" or "users" => "usr",
            "artist" or "artists" => "art",
            "qrcode" or "qr_code" or "qr_codes" or "bank" or "bankaccount" or "bankaccounts" => "qr",
            _ => "ev"
        };

        string rawName = entityName ?? "";
        string cleanName = new string(rawName
            .ToLowerInvariant()
            .Where(c => char.IsLetterOrDigit(c))
            .ToArray());

        if (string.IsNullOrWhiteSpace(cleanName))
        {
            cleanName = prefix switch
            {
                "org" => "organizer",
                "usr" => "user",
                "art" => "artist",
                "qr" => "bankqr",
                _ => "event"
            };
        }

        // Use the full id so ids that share the same last-two digits (e.g. 1 and 101)
        // produce distinct filenames. No modulo, no truncation.
        string idSuffix = Math.Abs(entityId).ToString();

        return $"{prefix}_{cleanName}_{idSuffix}{extension}";
    }
}
