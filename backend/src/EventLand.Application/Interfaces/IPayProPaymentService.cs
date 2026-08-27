namespace EventLand.Application.Interfaces;

using EventLand.Application.Dtos;

public interface IPayProPaymentService
{
    Task<PayProInvoiceResponseDto> CreateInvoiceAsync(PayProInvoiceRequestDto request);
    Task<bool> ProcessIpnCallbackAsync(PayProIpnPayloadDto payload);
    Task<ProcessRefundResponseDto> ExecuteRefundAsync(ProcessRefundRequestDto request, int? adminUserId = null, string? adminEmail = null);
    Task CheckAndExpirePendingBookingsAsync();
}
