namespace EventLand.Modules.PayPro.Options;

/// <summary>
/// Strongly-typed configuration options for the PayPro (v2) Pakistan payment gateway.
/// Bound via IOptions<PayProOptions>.
/// Sensitive credentials (Password, ClientSecret) must never be committed to source control or logged.
/// </summary>
public class PayProOptions
{
    public const string SectionName = "PayPro";

    /// <summary>
    /// Environment descriptor: "Development", "Demo", "Staging", or "Production".
    /// </summary>
    public string Environment { get; set; } = "Development";

    /// <summary>
    /// PayPro V2 Base URL (Demo: https://demoapi.paypro.com.pk, Live: https://api.paypro.com.pk).
    /// </summary>
    public string BaseUrl { get; set; } = "https://demoapi.paypro.com.pk";

    /// <summary>
    /// Merchant Client ID issued by PayPro.
    /// </summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// Merchant Client Secret issued by PayPro.
    /// </summary>
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>
    /// Merchant Username / MerchantId.
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// Merchant Password for inbound webhook verification and API operations.
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Return URL where customers are redirected after completing Click2Pay card payment.
    /// </summary>
    public string ReturnUrl { get; set; } = string.Empty;

    /// <summary>
    /// Token pre-expiry buffer in minutes before refreshing cached auth token. Default is 15 minutes.
    /// </summary>
    public int TokenRefreshBufferMinutes { get; set; } = 15;

    /// <summary>
    /// Reconciliation interval in minutes for the background sync worker. Default is 10 minutes.
    /// </summary>
    public int ReconciliationIntervalMinutes { get; set; } = 10;

    /// <summary>
    /// Minimum age in minutes for pending orders before the reconciliation worker queries them. Default is 5 minutes.
    /// </summary>
    public int ReconciliationMinPendingMinutes { get; set; } = 5;

    /// <summary>
    /// Validates required options without logging secrets.
    /// </summary>
    public (bool IsValid, IReadOnlyList<string> MissingKeys) Validate()
    {
        var missing = new List<string>();

        if (string.IsNullOrWhiteSpace(BaseUrl)) missing.Add("PayPro:BaseUrl");
        if (string.IsNullOrWhiteSpace(ClientId)) missing.Add("PayPro:ClientId");
        if (string.IsNullOrWhiteSpace(ClientSecret)) missing.Add("PayPro:ClientSecret");
        if (string.IsNullOrWhiteSpace(Username)) missing.Add("PayPro:Username");
        if (string.IsNullOrWhiteSpace(Password)) missing.Add("PayPro:Password");

        return (missing.Count == 0, missing);
    }

    /// <summary>
    /// Returns a string representation with secrets masked for safe logging.
    /// </summary>
    public override string ToString()
    {
        var maskedSecret = string.IsNullOrEmpty(ClientSecret) ? "[EMPTY]" : "[REDACTED]";
        var maskedPassword = string.IsNullOrEmpty(Password) ? "[EMPTY]" : "[REDACTED]";
        return $"[PayProOptions: Environment={Environment}, BaseUrl={BaseUrl}, ClientId={ClientId}, Username={Username}, ClientSecret={maskedSecret}, Password={maskedPassword}]";
    }
}
