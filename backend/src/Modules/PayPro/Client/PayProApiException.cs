namespace EventLand.Modules.PayPro.Client;

using System;
using System.Net;

/// <summary>
/// Typed exception thrown when a PayPro API operation fails or returns an error status code.
/// </summary>
public class PayProApiException : Exception
{
    public string? PayProStatusCode { get; }
    public HttpStatusCode? HttpStatusCode { get; }
    public string? Endpoint { get; }
    public string? RawResponse { get; }

    public PayProApiException(string message) : base(message)
    {
    }

    public PayProApiException(
        string message,
        string? payProStatusCode,
        HttpStatusCode? httpStatusCode = null,
        string? endpoint = null,
        string? rawResponse = null,
        Exception? innerException = null)
        : base(message, innerException)
    {
        PayProStatusCode = payProStatusCode;
        HttpStatusCode = httpStatusCode;
        Endpoint = endpoint;
        RawResponse = rawResponse;
    }

    public static string MapStatusDescription(string? code) => code switch
    {
        "00" => "Success",
        "01" => "Invalid Data (e.g. empty or invalid username/password/fields)",
        "02" => "Service Failed / Unauthorized",
        "03" => "No data available / Record not found",
        _    => $"PayPro status code '{code}'"
    };
}
