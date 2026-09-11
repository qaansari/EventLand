namespace EventLand.Application.Services;

using System;
using System.Threading;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

public class PaymentFeeService : IPaymentFeeService
{
    private readonly IApplicationDbContext _context;

    public PaymentFeeService(IApplicationDbContext context)
    {
        _context = context;
    }

    public decimal CalculatePlatformFee(decimal subtotal)
    {
        if (subtotal <= 0) return 0m;

        if (subtotal <= 5000m)
            return 49m;
        if (subtotal <= 10000m)
            return 99m;
        if (subtotal <= 15000m)
            return 149m;

        return 199m;
    }

    public decimal CalculateProcessingFee(decimal subtotal, decimal percentageFee, decimal fixedFee = 0)
    {
        if (subtotal <= 0) return 0m;

        var rawFee = (subtotal * (percentageFee / 100m)) + fixedFee;
        return Math.Round(rawFee, 2, MidpointRounding.AwayFromZero);
    }

    public async Task<FeeCalculationResult> CalculateTotalAsync(
        decimal subtotal,
        string paymentMethod,
        CancellationToken cancellationToken = default)
    {
        if (subtotal < 0)
            throw new ArgumentOutOfRangeException(nameof(subtotal), "Subtotal cannot be negative.");

        var normalizedMethod = paymentMethod?.Trim().ToLowerInvariant() ?? string.Empty;

        var config = await _context.PaymentConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.PaymentMethod.ToLower() == normalizedMethod && c.IsActive && !c.IsDeleted, cancellationToken);

        if (config is null)
        {
            throw new InvalidOperationException($"Payment method '{paymentMethod}' is not supported or currently inactive.");
        }

        var platformFee = CalculatePlatformFee(subtotal);
        var processingFee = CalculateProcessingFee(subtotal, config.PercentageFee, config.FixedFee);
        var totalAmount = subtotal + platformFee + processingFee;

        return new FeeCalculationResult(
            Subtotal: subtotal,
            PlatformFee: platformFee,
            ProcessingFee: processingFee,
            TotalAmount: totalAmount,
            Currency: config.Currency,
            PaymentMethod: config.PaymentMethod,
            DisplayName: config.DisplayName,
            FeePercentageAtPurchase: config.PercentageFee
        );
    }
}
