namespace EventLand.Infrastructure.Persistence;

using System;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Database Initializer.
/// Applies EF Core migrations automatically on startup and seeds Countries, Cities, Venues, Auditoriums, Roles, and SuperAdmin.
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Apply schema migrations automatically
        await context.Database.MigrateAsync();

        var passwordHasher = new PasswordHasher<User>();

        // 1. Roles Seeding
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

        // 2. SuperAdmin User Seeding
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

        // 3. Country & Cities Seeding (Default: Pakistan -> Karachi, Lahore, Islamabad)
        if (!await context.Countries.AnyAsync())
        {
            var pakistan = new Country
            {
                Name = "Pakistan",
                Code = "PK",
                IsActive = true
            };
            context.Countries.Add(pakistan);
            await context.SaveChangesAsync();

            context.Cities.AddRange(
                new City { CountryId = pakistan.Id, Name = "Karachi", IsActive = true },
                new City { CountryId = pakistan.Id, Name = "Lahore", IsActive = true },
                new City { CountryId = pakistan.Id, Name = "Islamabad", IsActive = true }
            );
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
    }
}
