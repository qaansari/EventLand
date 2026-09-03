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
        var existingSuperAdmin = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@eventland.pk" && !u.IsDeleted);
        if (existingSuperAdmin == null)
        {
            var superAdmin = new User
            {
                Email = "admin@eventland.pk",
                FullName = "Super Admin",
                PhoneNumber = "+92 331 2541767",
                RoleId = superAdminRole.Id,
                IsActive = true
            };
            superAdmin.PasswordHash = passwordHasher.HashPassword(superAdmin, "SuperAdmin123!");
            context.Users.Add(superAdmin);
            await context.SaveChangesAsync();
        }
        else if (existingSuperAdmin.PhoneNumber != "+92 331 2541767")
        {
            existingSuperAdmin.PhoneNumber = "+92 331 2541767";
            await context.SaveChangesAsync();
        }

        // 3. Default Countries Seeding
        var countriesToSeed = new[]
        {
            new { Name = "Pakistan", Code = "PK", DialingCode = "+92" },
            new { Name = "United Arab Emirates", Code = "AE", DialingCode = "+971" },
            new { Name = "Saudi Arabia", Code = "SA", DialingCode = "+966" },
            new { Name = "United Kingdom", Code = "GB", DialingCode = "+44" },
            new { Name = "United States", Code = "US", DialingCode = "+1" }
        };

        foreach (var item in countriesToSeed)
        {
            var existingCountry = await context.Countries.FirstOrDefaultAsync(c => c.Code == item.Code);
            if (existingCountry == null)
            {
                context.Countries.Add(new Country { Name = item.Name, Code = item.Code, DialingCode = item.DialingCode, IsActive = true });
            }
            else if (existingCountry.DialingCode != item.DialingCode)
            {
                existingCountry.DialingCode = item.DialingCode;
            }
        }
        await context.SaveChangesAsync();

        var pakistan = await context.Countries.FirstOrDefaultAsync(c => c.Code == "PK" || c.Name == "Pakistan");

        if (pakistan != null)
        {
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
        }

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

        // 8. Default Active Bank Account Seeding
        if (!await context.BankAccounts.AnyAsync())
        {
            context.BankAccounts.Add(new BankAccount
            {
                BankName = "Meezan Bank Limited",
                AccountTitle = "EventLand Official Pvt Ltd",
                AccountNumber = "0102030405060701",
                Iban = "PK64MEZN0001020304050607",
                BranchCode = "0102",
                BranchName = "Clifton Branch, Karachi",
                QrCodeImageUrl = "qr_meezanbank_1000.png",
                Instructions = "Please transfer the exact booking amount via Mobile Banking App, Raast ID, or ATM. Mention your Booking Ref in transfer remarks.",
                IsActive = true,
                DisplayOrder = 1
            });
            await context.SaveChangesAsync();
        }
    }
}
