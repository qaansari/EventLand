namespace EventLand.Modules.PayPro.Services;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Client;
using EventLand.Modules.PayPro.Dtos;
using EventLand.Modules.PayPro.Entities;
using EventLand.Modules.PayPro.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

public class ConsumerService : IConsumerService
{
    private readonly IPayProApiClient _apiClient;
    private readonly IPayProDbContext _dbContext;
    private readonly ILogger<ConsumerService> _logger;

    public ConsumerService(
        IPayProApiClient apiClient,
        IPayProDbContext dbContext,
        ILogger<ConsumerService> logger)
    {
        _apiClient = apiClient;
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<PayProConsumerResult> CreateConsumerAsync(
        ConsumerRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var input = new PayProConsumerInput(
            ConsumerId: request.ConsumerId,
            Name: request.Name,
            Mobile: request.Mobile ?? "",
            Email: request.Email ?? "",
            Address: request.Address ?? ""
        );

        var result = await _apiClient.CreateConsumerAsync(input, cancellationToken);
        if (result.IsSuccess)
        {
            var existing = await _dbContext.Consumers
                .FirstOrDefaultAsync(c => c.ConsumerId == request.ConsumerId, cancellationToken);

            if (existing == null)
            {
                var newConsumer = new Consumer
                {
                    ConsumerId = request.ConsumerId,
                    Name = request.Name,
                    Mobile = request.Mobile,
                    Email = request.Email,
                    Address = request.Address,
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow
                };
                _dbContext.Consumers.Add(newConsumer);
            }
            else
            {
                existing.Name = request.Name;
                existing.Mobile = request.Mobile;
                existing.Email = request.Email;
                existing.Address = request.Address;
                existing.UpdatedAtUtc = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    public async Task<PayProBatchConsumerResult> CreateMultipleConsumersAsync(
        IEnumerable<ConsumerRequestDto> requests,
        CancellationToken cancellationToken = default)
    {
        var list = requests.ToList();
        var inputs = list.Select(r => new PayProConsumerInput(
            ConsumerId: r.ConsumerId,
            Name: r.Name,
            Mobile: r.Mobile ?? "",
            Email: r.Email ?? "",
            Address: r.Address ?? ""
        )).ToList();

        var result = await _apiClient.CreateMultipleConsumersAsync(inputs, cancellationToken);

        if (result.IsOverallSuccess)
        {
            foreach (var req in list)
            {
                var existing = await _dbContext.Consumers
                    .FirstOrDefaultAsync(c => c.ConsumerId == req.ConsumerId, cancellationToken);

                if (existing == null)
                {
                    _dbContext.Consumers.Add(new Consumer
                    {
                        ConsumerId = req.ConsumerId,
                        Name = req.Name,
                        Mobile = req.Mobile,
                        Email = req.Email,
                        Address = req.Address,
                        CreatedAtUtc = DateTime.UtcNow,
                        UpdatedAtUtc = DateTime.UtcNow
                    });
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    public async Task<PayProConsumerResult> UpdateConsumerAsync(
        ConsumerRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var input = new PayProConsumerInput(
            ConsumerId: request.ConsumerId,
            Name: request.Name,
            Mobile: request.Mobile ?? "",
            Email: request.Email ?? "",
            Address: request.Address ?? ""
        );

        var result = await _apiClient.UpdateConsumerAsync(input, cancellationToken);
        if (result.IsSuccess)
        {
            var existing = await _dbContext.Consumers
                .FirstOrDefaultAsync(c => c.ConsumerId == request.ConsumerId, cancellationToken);

            if (existing != null)
            {
                existing.Name = request.Name;
                existing.Mobile = request.Mobile;
                existing.Email = request.Email;
                existing.Address = request.Address;
                existing.UpdatedAtUtc = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        return result;
    }

    public async Task<PayProBatchConsumerResult> UpdateMultipleConsumersAsync(
        IEnumerable<ConsumerRequestDto> requests,
        CancellationToken cancellationToken = default)
    {
        var list = requests.ToList();
        var inputs = list.Select(r => new PayProConsumerInput(
            ConsumerId: r.ConsumerId,
            Name: r.Name,
            Mobile: r.Mobile ?? "",
            Email: r.Email ?? "",
            Address: r.Address ?? ""
        )).ToList();

        var result = await _apiClient.UpdateMultipleConsumersAsync(inputs, cancellationToken);

        if (result.IsOverallSuccess)
        {
            foreach (var req in list)
            {
                var existing = await _dbContext.Consumers
                    .FirstOrDefaultAsync(c => c.ConsumerId == req.ConsumerId, cancellationToken);

                if (existing != null)
                {
                    existing.Name = req.Name;
                    existing.Mobile = req.Mobile;
                    existing.Email = req.Email;
                    existing.Address = req.Address;
                    existing.UpdatedAtUtc = DateTime.UtcNow;
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    public async Task<IReadOnlyList<Consumer>> GetAllConsumersAsync(
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Consumers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(c => c.Name.ToLower().Contains(term) ||
                                     c.ConsumerId.ToLower().Contains(term) ||
                                     (c.Email != null && c.Email.ToLower().Contains(term)) ||
                                     (c.Mobile != null && c.Mobile.Contains(term)));
        }

        return await query.OrderByDescending(c => c.CreatedAtUtc).ToListAsync(cancellationToken);
    }

    public async Task<Consumer?> GetConsumerByPayProIdAsync(
        string consumerId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Consumers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ConsumerId == consumerId, cancellationToken);
    }
}
