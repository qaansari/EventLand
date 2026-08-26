namespace EventLand.Domain.Entities;

using System;
using System.ComponentModel.DataAnnotations.Schema;

[Table("FooterInfo")]
public class FooterInfo
{
    public int Id { get; set; }
    public string BrandName { get; set; } = "EventLand";
    public string Tagline { get; set; } = "Event Land is a single, user-friendly platform, we link fans, artists, and organizers for everything from comedy nights to concerts. 🎵🎭";
    public string Phone { get; set; } = "+92 307 9353185";
    public string Email { get; set; } = "support@eventland.pk";
    public string Address { get; set; } = "Karachi, Pakistan";
    public string CopyrightText { get; set; } = "© 2026 EventLand Pakistan. All rights reserved.";
    public string PrivacyPolicyUrl { get; set; } = "#";
    public string TermsOfServiceUrl { get; set; } = "#";
    public string OrganizerSupportUrl { get; set; } = "#";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

