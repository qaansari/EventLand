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
    }
}
