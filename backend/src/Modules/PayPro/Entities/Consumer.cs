namespace EventLand.Modules.PayPro.Entities;

/// <summary>
/// Represents a registered customer/consumer in PayPro's system.
/// </summary>
public class Consumer
{
    public int Id { get; set; }

    /// <summary>
    /// PayPro unique consumer identifier (up to 20 digits, includes 4-digit PayPro prefix once registered).
    /// </summary>
    public string ConsumerId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string? Mobile { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
