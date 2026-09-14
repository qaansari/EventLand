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
    /// Environment: "Demo" (Sandbox) or "Production" (Live). Defaults to "Demo".
    /// </summary>
    public string Environment { get; set; } = "Demo";

    /// <summary>
    /// PayPro V2 API Base URL (Default: "http://demoapi.paypro.com.pk/").
    /// </summary>
    public string BaseUrl { get; set; } = "http://demoapi.paypro.com.pk/";

    /// <summary>
    /// Backward-compatibility alias for BaseUrl.
    /// </summary>
    public string ApiUrl
    {
        get => BaseUrl;
        set => BaseUrl = value;
    }

    /// <summary>
    /// PayPro Merchant Username (Secret - supplied via User Secrets or PayPro__Username env var).
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// PayPro Merchant Password (Secret - supplied via User Secrets or PayPro__Password env var).
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// PayPro Client ID (Secret - supplied via User Secrets or PayPro__ClientId env var).
    /// </summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// PayPro Client Secret (Secret - supplied via User Secrets or PayPro__ClientSecret env var).
    /// </summary>
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>
    /// Indicates whether the gateway is configured in Demo / Sandbox mode.
    /// </summary>
    public bool IsDemo => string.Equals(Environment, "Demo", StringComparison.OrdinalIgnoreCase) ||
                          string.Equals(Environment, "Test", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Backward compatibility alias for IsDemo.
    /// </summary>
    public bool IsTest => IsDemo;

    /// <summary>
    /// Validates configuration without revealing any sensitive values in messages.
    /// Returns a list of missing configuration key names.
    /// </summary>
    public (bool IsValid, IReadOnlyList<string> MissingKeys) Validate()
    {
        var missing = new List<string>();

        if (string.IsNullOrWhiteSpace(BaseUrl)) missing.Add("PayPro:BaseUrl");
        if (string.IsNullOrWhiteSpace(Username)) missing.Add("PayPro:Username");
        if (string.IsNullOrWhiteSpace(ClientId)) missing.Add("PayPro:ClientId");
        if (string.IsNullOrWhiteSpace(ClientSecret)) missing.Add("PayPro:ClientSecret");

        return (missing.Count == 0, missing);
    }
}
