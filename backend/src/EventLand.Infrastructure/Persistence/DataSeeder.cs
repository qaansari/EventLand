namespace EventLand.Infrastructure.Persistence;

using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Database Initializer.
/// Applies EF Core migrations on application startup.
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Apply schema migrations on startup
        await context.Database.MigrateAsync();
    }
}
