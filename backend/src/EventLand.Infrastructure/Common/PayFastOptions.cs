namespace EventLand.Infrastructure.Common;

public class PayFastOptions
{
    public const string SectionName = "PayFast";

    /// <summary>
    /// Merchant ID assigned by PayFast Pakistan.
    /// </summary>
    public string MerchantId { get; set; } = string.Empty;

    /// <summary>
    /// Secured Key / Secret used for HMAC signature calculation.
    /// </summary>
    public string SecuredKey { get; set; } = string.Empty;

    /// <summary>
    /// Base URL for PayFast Pakistan endpoints.
    /// </summary>
    public string BaseUrl { get; set; } = "https://checkout.payfast.co.za";

    /// <summary>
    /// Checkout / Transaction URL format.
    /// </summary>
    public string CheckoutUrl { get; set; } = "https://checkout.payfast.co.za/eng/process";

    /// <summary>
    /// Webhook IPN Callback URL configured in PayFast portal.
    /// </summary>
    public string IpnUrl { get; set; } = string.Empty;
}
