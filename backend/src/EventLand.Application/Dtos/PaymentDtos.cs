namespace EventLand.Application.Dtos;

using System;
using System.Collections.Generic;

public record CalculatePaymentQuoteRequestDto(
    decimal Subtotal,
    string  PaymentMethod
);

public record PaymentFeeQuoteDto(
    decimal Subtotal,
    decimal PlatformFee,
    decimal PaymentProcessingFee,
    decimal TotalAmount,
    string  Currency,
    string  PaymentMethod,
    string  DisplayName
);

public record AvailablePaymentMethodDto(
    int     Id,
    string  Provider,
    string  PaymentMethod,
    string  DisplayName,
    string  Currency,
    decimal PlatformFee,
    decimal PaymentProcessingFee,
    decimal TotalAmount
);

public record InitiatePayProCheckoutRequestDto(
    string BookingRef,
    string? PaymentMethod = "paypro",
    string? ReturnUrl = null
);

public record CreatePaymentRequestDto(
    string BookingRef,
    string? PaymentMethod = "paypro",
    string? ReturnUrl = null
);

public record CreatePaymentResponseDto(
    bool Success,
    string BookingRef,
    int PaymentId,
    string Status,
    decimal Amount,
    string Currency,
    string? PaymentUrl,
    string? VoucherCode,
    DateTimeOffset? ExpiresAt,
    string? Message = null
);

public record PaymentStatusResponseDto(
    int PaymentId,
    string BookingRef,
    string Status,
    string PaymentStatus,
    bool IsPaid,
    bool TicketReady,
    decimal TotalAmount,
    string Currency,
    string? PaymentMethod,
    string? VoucherCode,
    string? PaymentUrl,
    DateTimeOffset? PaidAt,
    DateTimeOffset? ExpiresAt
);

public record PayProCheckoutResponseDto(
    bool    Success,
    string  BookingRef,
    string  PaymentMethod,
    decimal TotalAmount,
    string  Currency,
    string? InvoiceId,
    string? ConnectUrl,
    string? OtcVoucherCode,
    DateTimeOffset? ExpiresAt,
    string? Message = null,
    int?    PaymentId = null
);

public record PayProIpnRequestDto(
    string? InvoiceId,
    string? BookingRef,
    decimal AmountPayable,
    decimal AmountPaid,
    string? Status,
    string? TransactionId,
    DateTimeOffset? PaymentDate,
    string? Signature
);

public record PayProIpnResponseDto(
    bool   Success,
    string Status,
    string Message
);

public record PayProOrderStatusResult(
    bool IsSuccess,
    string Status,
    decimal AmountPaid,
    decimal AmountPayable,
    string? OrderNumber,
    string? PayProId,
    DateTimeOffset? DatePaid,
    string? Description = null
);

public record PayProCreateOrderResult(
    bool IsSuccess,
    string Status,
    string? OrderNumber,
    string? PayProId,
    string? ConnectPayId,
    string? Click2PayUrl,
    string? BillUrl,
    decimal OrderAmount,
    string? Description = null
);
