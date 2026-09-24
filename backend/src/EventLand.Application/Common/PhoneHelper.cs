namespace EventLand.Application.Common;

using System;
using System.Linq;

public static class PhoneHelper
{
    /// <summary>
    /// Normalizes any phone number into canonical E.164 format (+[countryCode][nationalNumber])
    /// with zero whitespace, dashes, or parentheses.
    /// Example: "+92 331 2541767", "+92 3312541767", "0331 2541767" -> "+923312541767"
    /// </summary>
    public static string? Normalize(string? phone, string defaultDialingCode = "+92")
    {
        if (string.IsNullOrWhiteSpace(phone))
            return null;

        var trimmed = phone.Trim();
        bool hasPlus = trimmed.StartsWith("+");

        // Extract all digits
        var digits = new string(trimmed.Where(char.IsDigit).ToArray());
        if (string.IsNullOrEmpty(digits))
            return null;

        // Clean prefix digits from default dialing code (e.g. "+92" -> "92")
        var prefixDigits = new string((defaultDialingCode ?? "+92").Where(char.IsDigit).ToArray());
        if (string.IsNullOrEmpty(prefixDigits))
            prefixDigits = "92";

        if (hasPlus)
        {
            // Already includes international + prefix
            return $"+{digits}";
        }

        // If local format with trunk prefix (e.g. "0331..."), strip leading 0
        if (digits.StartsWith("0"))
        {
            digits = digits[1..];
        }

        // If the number already starts with the country code digits (e.g. "92331..."), use as is
        if (!string.IsNullOrEmpty(prefixDigits) && digits.StartsWith(prefixDigits) && digits.Length > prefixDigits.Length + 5)
        {
            return $"+{digits}";
        }

        return $"+{prefixDigits}{digits}";
    }

    /// <summary>
    /// Formats a canonical E.164 phone number for readable display in UI if desired.
    /// Example: "+923312541767" -> "+92 331 2541767"
    /// </summary>
    public static string FormatForDisplay(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return string.Empty;

        var clean = Normalize(phone);
        if (clean == null)
            return phone.Trim();

        // Format standard Pakistan numbers (+923XXXXXXXXX, 13 chars total)
        if (clean.StartsWith("+92") && clean.Length == 13)
        {
            return $"{clean[..3]} {clean[3..6]} {clean[6..]}";
        }

        return clean;
    }
}
