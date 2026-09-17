namespace EventLand.Modules.PayPro.Dtos;

/// <summary>
/// Payload sent to POST /v2/ppro/auth to generate session token.
/// </summary>
public record PayProAuthRequest(
    string clientid,
    string clientsecret
);

/// <summary>
/// Internal result of PayPro authentication attempt.
/// </summary>
public record PayProAuthResult(
    bool IsSuccess,
    string? Token,
    int TokenExpiryMinutes,
    string? ErrorMessage
);
