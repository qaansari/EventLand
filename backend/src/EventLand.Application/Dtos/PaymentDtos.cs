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
    string PaymentMethod,
    string? ReturnUrl = null
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
    string? Message = null
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
