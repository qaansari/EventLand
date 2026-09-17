namespace EventLand.Modules.PayPro.Dtos;

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

/// <summary>
/// Payload received from PayPro when invoking the merchant callback URL (POST /paypro/uis).
/// </summary>
public class PayProCallbackRequestDto
{
    [JsonPropertyName("username")]
    [Required]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    [Required]
    public string Password { get; set; } = string.Empty;

    [JsonPropertyName("csvinvoiceids")]
    [Required]
    public string CsvInvoiceIds { get; set; } = string.Empty;
}

/// <summary>
/// Status item returned by the merchant to PayPro in a JSON array.
/// StatusCodes:
/// "00": Success (invoice marked paid)
/// "01": Invalid Data (bad username/password)
/// "02": User not authorized / service failure
/// "03": No records found for that invoice
/// </summary>
public record PayProCallbackResponseItem(
    [property: JsonPropertyName("StatusCode")] string StatusCode,
    [property: JsonPropertyName("InvoiceID")] string InvoiceID,
    [property: JsonPropertyName("Description")] string Description
);
