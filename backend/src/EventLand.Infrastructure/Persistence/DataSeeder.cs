namespace EventLand.Infrastructure.Persistence;

using System;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Database Initializer & Seeder.
/// Applies EF Core migrations automatically on startup and seeds default Roles, SuperAdmin User, "Event Land" Organizer, Tags, Country & Cities, FAQs, Footer Info, and Bank Account.
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Apply schema. If migrations exist, run MigrateAsync.
        if (context.Database.GetMigrations().Any())
        {
            await context.Database.MigrateAsync();
        }
        else
        {
            await context.Database.EnsureCreatedAsync();
        }

        var passwordHasher = new PasswordHasher<User>();

        // 1. Default Roles Seeding
        if (!await context.Roles.AnyAsync())
        {
            context.Roles.AddRange(
                new Role { Name = "SuperAdmin", Description = "Full system super admin privileges" },
                new Role { Name = "Admin", Description = "Event management and administrative privileges" },
                new Role { Name = "Organizer", Description = "Event organizer account" },
                new Role { Name = "Customer", Description = "Standard customer account" }
            );
            await context.SaveChangesAsync();
        }

        var superAdminRole = await context.Roles.FirstAsync(r => r.Name == "SuperAdmin");

        // 2. Default SuperAdmin User Seeding
        if (!await context.Users.AnyAsync(u => u.Email == "admin@eventland.pk" && !u.IsDeleted))
        {
            var superAdmin = new User
            {
                Email = "admin@eventland.pk",
                FullName = "Super Admin",
                RoleId = superAdminRole.Id,
                IsActive = true
            };
            superAdmin.PasswordHash = passwordHasher.HashPassword(superAdmin, "SuperAdmin123!");
            context.Users.Add(superAdmin);
            await context.SaveChangesAsync();
        }

        // 3. Default Country & Major Cities Seeding (Pakistan -> Karachi, Lahore, Islamabad)
        var pakistan = await context.Countries.FirstOrDefaultAsync(c => c.Code == "PK" || c.Name == "Pakistan");
        if (pakistan == null)
        {
            pakistan = new Country
            {
                Name = "Pakistan",
                Code = "PK",
                IsActive = true
            };
            context.Countries.Add(pakistan);
            await context.SaveChangesAsync();
        }

        var defaultCities = new[] { "Karachi", "Lahore", "Islamabad" };
        foreach (var cityName in defaultCities)
        {
            var cityExists = await context.Cities.AnyAsync(c => c.CountryId == pakistan.Id && c.Name.ToLower() == cityName.ToLower() && !c.IsDeleted);
            if (!cityExists)
            {
                context.Cities.Add(new City
                {
                    CountryId = pakistan.Id,
                    Name = cityName,
                    IsActive = true
                });
            }
        }
        await context.SaveChangesAsync();

        // 4. Default "Event Land" Organizer Seeding
        var defaultOrg = await context.Organizers.FirstOrDefaultAsync(o => o.Name == "Event Land" && !o.IsDeleted);
        if (defaultOrg == null)
        {
            defaultOrg = new Organizer
            {
                Name = "Event Land",
                Email = "support@eventland.pk",
                Phone = "+92 307 9353185",
                LogoUrl = "org_eventland_01.png",
                WebsiteUrl = "https://www.eventland.pk",
                IsVerified = true
            };
            context.Organizers.Add(defaultOrg);
            await context.SaveChangesAsync();
        }
        else
        {
            defaultOrg.Email = "support@eventland.pk";
            defaultOrg.Phone = "+92 307 9353185";
            defaultOrg.WebsiteUrl = "https://www.eventland.pk";
            defaultOrg.LogoUrl = "org_eventland_01.png";
            defaultOrg.IsVerified = true;
            await context.SaveChangesAsync();
        }

        // 5. Default Category Tags Seeding
        if (!await context.Tags.AnyAsync())
        {
            context.Tags.AddRange(
                new Tag { Name = "Concerts", Slug = "concerts" },
                new Tag { Name = "Theatre", Slug = "theatre" },
                new Tag { Name = "Comedy", Slug = "comedy" },
                new Tag { Name = "Festivals", Slug = "festivals" },
                new Tag { Name = "Workshops", Slug = "workshops" }
            );
            await context.SaveChangesAsync();
        }

        // 6. Default FAQs Seeding
        if (!await context.Faqs.AnyAsync())
        {
            context.Faqs.AddRange(
                new Faq
                {
                    Question = "How do I book tickets on EventLand?",
                    Answer = "Browse events on EventLand, select your desired city and ticket tier or interactive seat, and complete your booking via direct bank transfer. Once payment is verified by our team, your official digital E-Ticket with QR code is generated instantly.",
                    DisplayOrder = 1,
                    IsActive = true
                },
                new Faq
                {
                    Question = "What is EventLand's refund policy?",
                    Answer = "Tickets are non-refundable unless an event is cancelled or rescheduled. If an event is cancelled, full refunds are issued within 5 business days.",
                    DisplayOrder = 2,
                    IsActive = true
                },
                new Faq
                {
                    Question = "Which major Pakistani cities are covered?",
                    Answer = "EventLand features live concerts, comedy shows, bazaars, and theatre across Karachi, Lahore, Islamabad, Rawalpindi, Multan, Faisalabad, and Hyderabad.",
                    DisplayOrder = 3,
                    IsActive = true
                },
                new Faq
                {
                    Question = "Can I list my own event and sell tickets?",
                    Answer = "Yes! Event organizers can list their event using our instant 'List Your Event' portal, set ticket tiers, and start selling tickets to audiences across Pakistan immediately.",
                    DisplayOrder = 4,
                    IsActive = true
                }
            );
            await context.SaveChangesAsync();
        }

        // 7. Default Footer Info Seeding
        if (!await context.FooterInfo.AnyAsync())
        {
            context.FooterInfo.Add(new FooterInfo
            {
                BrandName = "EventLand",
                Tagline = "Event Land is a single, user-friendly platform, we link fans, artists, and organizers for everything from comedy nights to concerts. 🎵🎭",
                Phone = "+92 307 9353185",
                Email = "support@eventland.pk",
                Address = "Karachi, Pakistan",
                CopyrightText = "© 2026 EventLand Pakistan. All rights reserved.",
                PrivacyPolicyUrl = "#",
                TermsOfServiceUrl = "#",
                OrganizerSupportUrl = "#"
            });
            await context.SaveChangesAsync();
        }
    }
}
