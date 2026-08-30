namespace EventLand.Application.Interfaces;

using System.Collections.Generic;
using System.Threading.Tasks;
using EventLand.Application.Dtos;

public interface IPayFastPaymentService
{
    Task<PayFastCheckoutResponseDto> CreateCheckoutAsync(PayFastCheckoutRequestDto request);
    Task<bool> ProcessIpnCallbackAsync(PayFastIpnPayloadDto payload);
    Task<ProcessRefundResponseDto> ExecuteRefundAsync(ProcessRefundRequestDto request, int? adminUserId = null, string? adminEmail = null);
    Task CheckAndExpirePendingBookingsAsync();

    // Fee Configuration Management
    Task<List<PaymentFeeConfigDto>> GetFeeConfigurationsAsync();
    Task<PaymentFeeConfigDto> UpdateFeeConfigurationAsync(int id, UpdatePaymentFeeConfigDto dto);
}
