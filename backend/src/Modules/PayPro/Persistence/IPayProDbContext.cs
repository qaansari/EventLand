namespace EventLand.Modules.PayPro.Persistence;

using System.Threading;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Entities;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Abstraction for database operations required by the PayPro module.
/// Implemented by ApplicationDbContext.
/// </summary>
public interface IPayProDbContext
{
    DbSet<Order> Orders { get; }
    DbSet<Consumer> Consumers { get; }
    DbSet<PayProCallbackLog> PayProCallbackLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
