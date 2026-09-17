namespace EventLand.Modules.PayPro.Services;

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Dtos;
using EventLand.Modules.PayPro.Entities;

public interface IConsumerService
{
    Task<PayProConsumerResult> CreateConsumerAsync(ConsumerRequestDto request, CancellationToken cancellationToken = default);
    Task<PayProBatchConsumerResult> CreateMultipleConsumersAsync(IEnumerable<ConsumerRequestDto> requests, CancellationToken cancellationToken = default);
    Task<PayProConsumerResult> UpdateConsumerAsync(ConsumerRequestDto request, CancellationToken cancellationToken = default);
    Task<PayProBatchConsumerResult> UpdateMultipleConsumersAsync(IEnumerable<ConsumerRequestDto> requests, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Consumer>> GetAllConsumersAsync(string? search = null, CancellationToken cancellationToken = default);
    Task<Consumer?> GetConsumerByPayProIdAsync(string consumerId, CancellationToken cancellationToken = default);
}
