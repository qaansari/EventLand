namespace EventLand.Application.Common.Models;

/// <summary>
/// Strongly-typed configuration options for PayPro Pakistan payment gateway.
/// Injected via IOptions<PayProOptions> or IOptionsSnapshot<PayProOptions>.
/// Sensitive properties (Password, ClientSecret) MUST NEVER be committed to source control.
/// </summary>
public class PayProOptions
{
    public const string SectionName = "PayPro";

    /// <summary>
    /// Environment: "Test" (Sandbox) or "Production" (Live). Defaults to "Test".
    /// </summary>
    public string Environment { get; set; } = "Test";

    /// <summary>
    /// PayPro 1Pay portal base URL (e.g. "https://sandbox.paypro.com.pk/1pay" or "https://connect.paypro.com.pk/1pay").
    /// </summary>
    public string BaseUrl { get; set; } = "https://sandbox.paypro.com.pk/1pay";

    /// <summary>
    /// PayPro REST API URL (e.g. "https://sandbox.paypro.com.pk/api" or "https://api.paypro.com.pk").
    /// </summary>
    public string ApiUrl { get; set; } = "https://sandbox.paypro.com.pk/api";

    /// <summary>
    /// PayPro API Username (Secret - supplied via User Secrets or PayPro__Username env var).
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// PayPro API Password (Secret - supplied via User Secrets or PayPro__Password env var).
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// PayPro Client ID / Merchant ID (Secret - supplied via User Secrets or PayPro__ClientId env var).
    /// </summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// PayPro Client Secret / HMAC Key (Secret - supplied via User Secrets or PayPro__ClientSecret env var).
    /// </summary>
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>
    /// Indicates whether the gateway is configured in Sandbox/Test mode.
    /// </summary>
    public bool IsTest => string.Equals(Environment, "Test", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Validates configuration without revealing any sensitive values in messages.
    /// Returns a list of missing configuration key names.
    /// </summary>
    public (bool IsValid, IReadOnlyList<string> MissingKeys) Validate()
    {
        var missing = new List<string>();

        if (string.IsNullOrWhiteSpace(BaseUrl)) missing.Add("PayPro:BaseUrl");
        if (string.IsNullOrWhiteSpace(ApiUrl)) missing.Add("PayPro:ApiUrl");
        if (string.IsNullOrWhiteSpace(Username)) missing.Add("PayPro:Username");
        if (string.IsNullOrWhiteSpace(Password)) missing.Add("PayPro:Password");
        if (string.IsNullOrWhiteSpace(ClientId)) missing.Add("PayPro:ClientId");
        if (string.IsNullOrWhiteSpace(ClientSecret)) missing.Add("PayPro:ClientSecret");

        return (missing.Count == 0, missing);
    }
}
