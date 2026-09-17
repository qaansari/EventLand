namespace EventLand.Modules.PayPro.Persistence;

using EventLand.Modules.PayPro.Persistence.Configurations;
using Microsoft.EntityFrameworkCore;

public static class PayProModelBuilderExtensions
{
    /// <summary>
    /// Applies entity configurations for all PayPro module entities (Orders, Consumers, PayProCallbackLogs).
    /// </summary>
    public static ModelBuilder ApplyPayProConfigurations(this ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OrderConfiguration());
        modelBuilder.ApplyConfiguration(new ConsumerConfiguration());
        modelBuilder.ApplyConfiguration(new PayProCallbackLogConfiguration());

        return modelBuilder;
    }
}
