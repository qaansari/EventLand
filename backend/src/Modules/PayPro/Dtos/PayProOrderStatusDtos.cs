namespace EventLand.Modules.PayPro.Dtos;

/// <summary>
/// Status result returned from PayPro order status inquiry (ggos or ggosboi).
/// </summary>
public record PayProOrderStatusResult(
    bool IsSuccess,
    string Status,                  // e.g. "PAID", "UNPAID", "BLOCKED", "CANCELLED", "00"
    string OrderNumber,
    string? PayProId,
    decimal AmountPayable,
    decimal AmountPaid,
    string? PaymentVia,             // "BAF" (Card), "1Link" (Bank), "Nift" (Nift ePay)
    DateTime? DatePaid,
    string? CustomerName,
    string? CustomerBank,
    string? Description,
    string? RawResponseJson
)
{
    public bool IsPaid => string.Equals(Status, "PAID", StringComparison.OrdinalIgnoreCase);
    public bool IsBlocked => string.Equals(Status, "BLOCKED", StringComparison.OrdinalIgnoreCase);
}

/// <summary>
/// Result of marking orders as Paid (moap) or Blocked (moab).
/// </summary>
public record PayProMarkOrderResult(
    bool IsSuccess,
    string Status,
    string CsvOrderNumbers,
    string? Description,
    string? RawResponseJson
);
