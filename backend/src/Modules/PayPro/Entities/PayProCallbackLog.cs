namespace EventLand.Modules.PayPro.Entities;

/// <summary>
/// Audit trail for all inbound callbacks received from PayPro servers.
/// RequestBody MUST always have merchant password redacted before persisting.
/// </summary>
public class PayProCallbackLog
{
    public int Id { get; set; }

    public DateTime ReceivedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Raw payload received, with password sanitization applied.
    /// </summary>
    public string RequestBody { get; set; } = string.Empty;

    /// <summary>
    /// JSON response array returned back to PayPro.
    /// </summary>
    public string ResponseBody { get; set; } = string.Empty;

    /// <summary>
    /// Indicates whether the callback was processed successfully without errors.
    /// </summary>
    public bool Success { get; set; }
}
