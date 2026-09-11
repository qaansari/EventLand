namespace EventLand.UnitTests;

using System;
using System.Threading.Tasks;
using EventLand.Application.Services;
using EventLand.Domain.Entities;
using EventLand.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

public class PaymentFeeServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;

    public PaymentFeeServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    public void Dispose()
    {
        _connection.Close();
        _connection.Dispose();
    }

    private TestDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<TestDbContext>()
            .UseSqlite(_connection)
            .Options;

        var context = new TestDbContext(options);
        context.Database.EnsureCreated();

        // Add test payment configs
        context.PaymentConfigs.AddRange(
            new PaymentConfig
            {
                Id = 10,
                Provider = "paypro",
                PaymentMethod = "easypaisa_jazzcash",
                DisplayName = "EasyPaisa / JazzCash",
                PercentageFee = 2.8m,
                FixedFee = 0m,
                Currency = "PKR",
                IsActive = true,
                SortOrder = 1
            },
            new PaymentConfig
            {
                Id = 20,
                Provider = "paypro",
                PaymentMethod = "qr_code",
                DisplayName = "PayPro QR Code",
                PercentageFee = 0.8m,
                FixedFee = 0m,
                Currency = "PKR",
                IsActive = true,
                SortOrder = 2
            },
            new PaymentConfig
            {
                Id = 30,
                Provider = "paypro",
                PaymentMethod = "inactive_method",
                DisplayName = "Inactive Method",
                PercentageFee = 5.0m,
                FixedFee = 10m,
                Currency = "PKR",
                IsActive = false,
                SortOrder = 3
            }
        );

        context.SaveChanges();
        return context;
    }

    [Theory]
    [InlineData(4999, 49)]
    [InlineData(5000, 49)]
    [InlineData(5000.01, 99)]
    [InlineData(9999.99, 99)]
    [InlineData(10000, 99)]
    [InlineData(10000.01, 149)]
    [InlineData(15000, 149)]
    [InlineData(15000.01, 199)]
    [InlineData(25000, 199)]
    public void CalculatePlatformFee_ExactBoundaryTiers_ReturnsExpectedFee(double subtotalDouble, double expectedFeeDouble)
    {
        var subtotal = (decimal)subtotalDouble;
        var expectedFee = (decimal)expectedFeeDouble;

        using var context = CreateContext();
        var feeService = new PaymentFeeService(context);

        var actualFee = feeService.CalculatePlatformFee(subtotal);

        Assert.Equal(expectedFee, actualFee);
    }

    [Fact]
    public void CalculatePlatformFee_ZeroOrNegative_ReturnsZero()
    {
        using var context = CreateContext();
        var feeService = new PaymentFeeService(context);

        Assert.Equal(0m, feeService.CalculatePlatformFee(0m));
        Assert.Equal(0m, feeService.CalculatePlatformFee(-50m));
    }

    [Fact]
    public void CalculateProcessingFee_EasyPaisaJazzCash_2Point8PercentOf10000_Returns280()
    {
        using var context = CreateContext();
        var feeService = new PaymentFeeService(context);

        var fee = feeService.CalculateProcessingFee(10000m, 2.8m, 0m);

        Assert.Equal(280m, fee);
    }

    [Fact]
    public void CalculateProcessingFee_QrCode_0Point8PercentOf10000_Returns80()
    {
        using var context = CreateContext();
        var feeService = new PaymentFeeService(context);

        var fee = feeService.CalculateProcessingFee(10000m, 0.8m, 0m);

        Assert.Equal(80m, fee);
    }

    [Fact]
    public async Task CalculateTotalAsync_EasyPaisaJazzCash_Subtotal10000_Returns10379()
    {
        using var context = CreateContext();
        var feeService = new PaymentFeeService(context);

        var result = await feeService.CalculateTotalAsync(10000m, "easypaisa_jazzcash");

        Assert.Equal(10000m, result.Subtotal);
        Assert.Equal(99m, result.PlatformFee);
        Assert.Equal(280m, result.ProcessingFee);
        Assert.Equal(10379m, result.TotalAmount);
        Assert.Equal("PKR", result.Currency);
        Assert.Equal("easypaisa_jazzcash", result.PaymentMethod);
        Assert.Equal(2.8m, result.FeePercentageAtPurchase);
    }

    [Fact]
    public async Task CalculateTotalAsync_QrCode_Subtotal10000_Returns10179()
    {
        using var context = CreateContext();
        var feeService = new PaymentFeeService(context);

        var result = await feeService.CalculateTotalAsync(10000m, "qr_code");

        Assert.Equal(10000m, result.Subtotal);
        Assert.Equal(99m, result.PlatformFee);
        Assert.Equal(80m, result.ProcessingFee);
        Assert.Equal(10179m, result.TotalAmount);
        Assert.Equal("PKR", result.Currency);
        Assert.Equal("qr_code", result.PaymentMethod);
        Assert.Equal(0.8m, result.FeePercentageAtPurchase);
    }

    [Fact]
    public async Task CalculateTotalAsync_InactivePaymentMethod_ThrowsInvalidOperationException()
    {
        using var context = CreateContext();
        var feeService = new PaymentFeeService(context);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            feeService.CalculateTotalAsync(5000m, "inactive_method"));

        Assert.Contains("inactive", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CalculateTotalAsync_InvalidPaymentMethod_ThrowsInvalidOperationException()
    {
        using var context = CreateContext();
        var feeService = new PaymentFeeService(context);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            feeService.CalculateTotalAsync(5000m, "crypto_coin"));

        Assert.Contains("not supported", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CalculateTotalAsync_NegativeSubtotal_ThrowsArgumentOutOfRangeException()
    {
        using var context = CreateContext();
        var feeService = new PaymentFeeService(context);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            feeService.CalculateTotalAsync(-100m, "easypaisa_jazzcash"));
    }
}
