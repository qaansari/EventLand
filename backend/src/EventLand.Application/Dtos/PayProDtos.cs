namespace EventLand.Application.Dtos;

public record PayProInvoiceRequestDto(
    int BookingId,
    string BookingRef,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    decimal Amount,
    string IssueDate,
    string DueDate
);

public record PayProInvoiceResponseDto(
    bool Success,
    string InvoiceId,
    string BookingRef,
    decimal Amount,
    string ConnectUrl,
    string OtcVoucherCode,
    string Status,
    string Message
);

public record PayProIpnPayloadDto(
    string InvoiceId,
    string BookingRef,
    string AmountPayable,
    string AmountPaid,
    string Status, // PAID, EXPIRED, CANCELLED
    string TransactionId,
    string PaymentDate,
    string Signature
);

public record ProcessRefundRequestDto(
    int BookingId,
    decimal Amount,
    string Reason
);

public record ProcessRefundResponseDto(
    bool Success,
    int RefundRecordId,
    int BookingId,
    decimal Amount,
    string Status,
    string Message
);
