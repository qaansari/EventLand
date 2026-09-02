namespace EventLand.Infrastructure.Persistence;

using System;
using EventLand.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public static class ModelBuilderExtensions
{
    public static void SeedDefaultData(this ModelBuilder modelBuilder)
    {
        var fixedDateOffset = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var fixedDateTime = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var passwordHasher = new PasswordHasher<User>();
        var adminPasswordHash = passwordHasher.HashPassword(null!, "SuperAdmin123!");

        // 1. Roles
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "SuperAdmin", Description = "Full system super admin privileges", CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new Role { Id = 2, Name = "Admin", Description = "Event management and administrative privileges", CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new Role { Id = 3, Name = "Organizer", Description = "Event organizer account", CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new Role { Id = 4, Name = "Customer", Description = "Standard customer account", CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset }
        );

        // 2. SuperAdmin User
        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = 1,
                Email = "admin@eventland.pk",
                FullName = "Super Admin",
                PhoneNumber = "+92 331 2541767",
                PasswordHash = adminPasswordHash,
                RoleId = 1,
                IsActive = true,
                CreatedAt = fixedDateOffset,
                UpdatedAt = fixedDateOffset
            }
        );

        // 3. Country & Cities
        modelBuilder.Entity<Country>().HasData(
            new Country { Id = 1, Name = "Pakistan", Code = "PK", DialingCode = "+92", IsActive = true, CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new Country { Id = 2, Name = "United Arab Emirates", Code = "AE", DialingCode = "+971", IsActive = true, CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new Country { Id = 3, Name = "Saudi Arabia", Code = "SA", DialingCode = "+966", IsActive = true, CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new Country { Id = 4, Name = "United Kingdom", Code = "GB", DialingCode = "+44", IsActive = true, CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new Country { Id = 5, Name = "United States", Code = "US", DialingCode = "+1", IsActive = true, CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset }
        );

        modelBuilder.Entity<City>().HasData(
            new City { Id = 1, CountryId = 1, Name = "Karachi", IsActive = true, CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new City { Id = 2, CountryId = 1, Name = "Lahore", IsActive = true, CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new City { Id = 3, CountryId = 1, Name = "Islamabad", IsActive = true, CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset }
        );

        // 4. Default "Event Land" Organizer
        modelBuilder.Entity<Organizer>().HasData(
            new Organizer
            {
                Id = 1,
                Name = "Event Land",
                Email = "support@eventland.pk",
                Phone = "+92 307 9353185",
                LogoUrl = "org_eventland_01.png",
                WebsiteUrl = "https://www.eventland.pk",
                IsVerified = true,
                CreatedAt = fixedDateOffset,
                UpdatedAt = fixedDateOffset
            }
        );

        // 5. Category Tags
        modelBuilder.Entity<Tag>().HasData(
            new Tag { Id = 1, Name = "Concerts", Slug = "concerts", CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new Tag { Id = 2, Name = "Theatre", Slug = "theatre", CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new Tag { Id = 3, Name = "Comedy", Slug = "comedy", CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new Tag { Id = 4, Name = "Festivals", Slug = "festivals", CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset },
            new Tag { Id = 5, Name = "Workshops", Slug = "workshops", CreatedAt = fixedDateOffset, UpdatedAt = fixedDateOffset }
        );

        // 6. FAQs
        modelBuilder.Entity<Faq>().HasData(
            new Faq
            {
                Id = 1,
                Question = "How do I book tickets on EventLand?",
                Answer = "Browse events on EventLand, select your desired city and ticket tier or interactive seat, and complete your booking via direct bank transfer. Once payment is verified by our team, your official digital E-Ticket with QR code is generated instantly.",
                DisplayOrder = 1,
                IsActive = true,
                CreatedAt = fixedDateTime,
                UpdatedAt = fixedDateTime
            },
            new Faq
            {
                Id = 2,
                Question = "What is EventLand's refund policy?",
                Answer = "Tickets are non-refundable unless an event is cancelled or rescheduled. If an event is cancelled, full refunds are issued within 5 business days.",
                DisplayOrder = 2,
                IsActive = true,
                CreatedAt = fixedDateTime,
                UpdatedAt = fixedDateTime
            },
            new Faq
            {
                Id = 3,
                Question = "Which major Pakistani cities are covered?",
                Answer = "EventLand features live concerts, comedy shows, bazaars, and theatre across Karachi, Lahore, Islamabad, Rawalpindi, Multan, Faisalabad, and Hyderabad.",
                DisplayOrder = 3,
                IsActive = true,
                CreatedAt = fixedDateTime,
                UpdatedAt = fixedDateTime
            },
            new Faq
            {
                Id = 4,
                Question = "Can I list my own event and sell tickets?",
                Answer = "Yes! Event organizers can list their event using our instant 'List Your Event' portal, set ticket tiers, and start selling tickets to audiences across Pakistan immediately.",
                DisplayOrder = 4,
                IsActive = true,
                CreatedAt = fixedDateTime,
                UpdatedAt = fixedDateTime
            }
        );

        // 7. FooterInfo
        modelBuilder.Entity<FooterInfo>().HasData(
            new FooterInfo
            {
                Id = 1,
                BrandName = "EventLand",
                Tagline = "Event Land is a single, user-friendly platform, we link fans, artists, and organizers for everything from comedy nights to concerts. 🎵🎭",
                Phone = "+92 307 9353185",
                Email = "support@eventland.pk",
                Address = "Karachi, Pakistan",
                CopyrightText = "© 2026 EventLand Pakistan. All rights reserved.",
                PrivacyPolicyUrl = "#",
                TermsOfServiceUrl = "#",
                OrganizerSupportUrl = "#",
                UpdatedAt = fixedDateTime
            }
        );
    }
}
