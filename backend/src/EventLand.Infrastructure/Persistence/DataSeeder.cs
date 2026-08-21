namespace EventLand.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

/// <summary>
/// Database Initializer.
/// Applies EF Core migrations on application startup to ensure schema is created.
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Automatically create DB and apply schema migrations on startup
        await context.Database.MigrateAsync();

        if (!await context.Tags.AnyAsync())
        {
            var defaultTags = new[]
            {
                new EventLand.Domain.Entities.Tag { Name = "Concerts", Slug = "concerts" },
                new EventLand.Domain.Entities.Tag { Name = "Festivals", Slug = "festivals" },
                new EventLand.Domain.Entities.Tag { Name = "Qawwali", Slug = "qawwali" },
                new EventLand.Domain.Entities.Tag { Name = "Theatre", Slug = "theatre" },
                new EventLand.Domain.Entities.Tag { Name = "Comedy", Slug = "comedy" },
                new EventLand.Domain.Entities.Tag { Name = "Food", Slug = "food" },
                new EventLand.Domain.Entities.Tag { Name = "Workshops", Slug = "workshops" },
                new EventLand.Domain.Entities.Tag { Name = "Corporate", Slug = "corporate" }
            };
            await context.Tags.AddRangeAsync(defaultTags);
            await context.SaveChangesAsync();
        }
    }
}
