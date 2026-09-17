namespace EventLand.Modules.PayPro.Dtos;

/// <summary>
/// Individual paid order record returned by PayPro's gpo endpoint.
/// </summary>
public record PayProPaidOrderRecord(
    string OrderId,
    string? PayProId,
    string? ConsumerId,
    decimal OrderAmount,
    decimal AmountPaid,
    DateTime? DatePaid,
    DateTime? DateCreated,
    DateTime? OrderDueDate,
    string? TransactionStatus,
    string? PaymentMode,
    string? CustomerEmail,
    string? CustomerMobile,
    string? CustomerAddress,
    decimal TotalPenalty
);

/// <summary>
/// Result of querying paid orders across a date range.
/// </summary>
public record PayProPaidOrdersReportResult(
    bool IsSuccess,
    string Status,
    IReadOnlyList<PayProPaidOrderRecord> PaidOrders,
    int TotalCount,
    string? Description,
    string? RawResponseJson
);

/// <summary>
/// Paginated report response for frontend consumption.
/// </summary>
public record PaginatedPaidOrdersResponse(
    IReadOnlyList<PayProPaidOrderRecord> Items,
    int PageNumber,
    int PageSize,
    int TotalItems,
    int TotalPages,
    decimal TotalAmountPaid
);
