namespace EventLand.Application.Dtos;

using System;

public record PayFastCheckoutRequestDto(
    int BookingId,
    string BookingRef,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    decimal Amount,
    string PaymentMethodCode // "bank_wallet", "card_domestic", "card_international"
);

public record PayFastCheckoutResponseDto(
    bool Success,
    string TransactionId,
    string BookingRef,
    decimal BaseAmount,
    decimal GatewayFee,
    decimal GrossAmount,
    string CheckoutUrl,
    string Status,
    string Message
);

public record PayFastIpnPayloadDto(
    string TransactionId,
    string BookingRef,
    string AmountPayable,
    string AmountPaid,
    string Status, // PAID, EXPIRED, CANCELLED
    string PaymentMethod,
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

public record PaymentFeeConfigDto(
    int Id,
    string PaymentMethodCode,
    string DisplayName,
    decimal CommissionPercentage,
    string Description,
    bool IsActive,
    DateTimeOffset UpdatedAt
);

public record UpdatePaymentFeeConfigDto(
    decimal CommissionPercentage,
    bool? IsActive,
    string? DisplayName,
    string? Description
);
