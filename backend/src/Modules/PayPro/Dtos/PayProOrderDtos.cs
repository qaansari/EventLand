namespace EventLand.Modules.PayPro.Dtos;

/// <summary>
/// Individual order input data passed when creating single or multiple orders.
/// </summary>
public record PayProOrderInput(
    string OrderNumber,
    decimal Amount,
    string CustomerName,
    string CustomerMobile,
    string CustomerEmail,
    string CustomerAddress = "",
    DateTime? DueDate = null,
    DateTime? IssueDate = null,
    int ExpireAfterSeconds = 0,
    string? ReusableConsumerId = null,
    int? BookingId = null
);

/// <summary>
/// Structured result of a single order creation operation.
/// </summary>
public record PayProCreateOrderResult(
    bool IsSuccess,
    string Status,
    string OrderNumber,
    string? PayProId,
    string? ConnectPayId,
    string? Click2PayUrl,
    string? BillUrl,
    decimal Amount,
    string? Description,
    string? RawResponseJson
);

/// <summary>
/// Structured result of multiple orders creation operation (ppro/cmo).
/// </summary>
public record PayProBatchOrderResult(
    bool IsOverallSuccess,
    string Status,
    IReadOnlyList<PayProCreateOrderResult> Orders,
    string? Description,
    string? RawResponseJson
);

/// <summary>
/// Frontend request DTO to initiate a PayPro order for a booking or checkout.
/// </summary>
public record CreatePayProOrderRequestDto(
    string? BookingRef,
    string? OrderNumber,
    decimal Amount,
    string CustomerName,
    string CustomerEmail,
    string CustomerMobile,
    DateTime? DueDate = null,
    string? ReturnUrl = null,
    string? ConsumerId = null
);

/// <summary>
/// Frontend response DTO returned to caller.
/// </summary>
public record CreatePayProOrderResponseDto(
    bool Success,
    string OrderNumber,
    string? PayProId,
    string? Click2PayUrl,
    string? BillUrl,
    decimal Amount,
    string Status,
    string Message
);
