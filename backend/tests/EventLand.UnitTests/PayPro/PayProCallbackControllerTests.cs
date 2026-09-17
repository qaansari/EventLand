namespace EventLand.UnitTests.PayPro;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EventLand.Modules.PayPro.Dtos;
using EventLand.Modules.PayPro.Entities;
using EventLand.Modules.PayPro.Options;
using EventLand.Modules.PayPro.Persistence;
using EventLand.Modules.PayPro.Services;
using EventLand.Modules.PayPro.Webhooks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

public class TestPayProDbContext : DbContext, IPayProDbContext
{
    public TestPayProDbContext(DbContextOptions<TestPayProDbContext> options) : base(options) { }

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Consumer> Consumers => Set<Consumer>();
    public DbSet<PayProCallbackLog> PayProCallbackLogs => Set<PayProCallbackLog>();
}

public class PayProCallbackControllerTests
{
    private readonly IOptions<PayProOptions> _options = Options.Create(new PayProOptions
    {
        BaseUrl = "https://demoapi.paypro.com.pk",
        ClientId = "8mZHsWr6QZpcmpe",
        ClientSecret = "BpfL4ioclo4D8dN",
        Username = "Event_land",
        Password = "Demo@EV26"
    });

    private (TestPayProDbContext Db, SqliteConnection Conn) CreateSqliteDb()
    {
        var conn = new SqliteConnection("DataSource=:memory:");
        conn.Open();
        var options = new DbContextOptionsBuilder<TestPayProDbContext>()
            .UseSqlite(conn)
            .Options;
        var db = new TestPayProDbContext(options);
        db.Database.EnsureCreated();
        return (db, conn);
    }

    [Fact]
    public async Task HandlePayProCallback_InvalidCredentials_Returns02()
    {
        var (db, conn) = CreateSqliteDb();
        using (conn)
        using (db)
        {
            var orderService = new OrderService(null!, db, new DefaultPayProOrderPaidHandler(), _options, NullLogger<OrderService>.Instance);
            var controller = new PayProCallbackController(orderService, db, _options, NullLogger<PayProCallbackController>.Instance);

            var dto = new PayProCallbackRequestDto
            {
                Username = "WrongUser",
                Password = "WrongPassword",
                CsvInvoiceIds = "INV001"
            };

            var actionResult = await controller.HandlePayProCallback(dto);
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var items = Assert.IsAssignableFrom<List<PayProCallbackResponseItem>>(okResult.Value);

            Assert.Single(items);
            Assert.Equal("02", items[0].StatusCode);
        }
    }

    [Fact]
    public async Task HandlePayProCallback_UnknownInvoice_Returns03()
    {
        var (db, conn) = CreateSqliteDb();
        using (conn)
        using (db)
        {
            var orderService = new OrderService(null!, db, new DefaultPayProOrderPaidHandler(), _options, NullLogger<OrderService>.Instance);
            var controller = new PayProCallbackController(orderService, db, _options, NullLogger<PayProCallbackController>.Instance);

            var dto = new PayProCallbackRequestDto
            {
                Username = "Event_land",
                Password = "Demo@EV26",
                CsvInvoiceIds = "UNKNOWN-999"
            };

            var actionResult = await controller.HandlePayProCallback(dto);
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var items = Assert.IsAssignableFrom<List<PayProCallbackResponseItem>>(okResult.Value);

            Assert.Single(items);
            Assert.Equal("03", items[0].StatusCode);
            Assert.Equal("UNKNOWN-999", items[0].InvoiceID);
        }
    }

    [Fact]
    public async Task HandlePayProCallback_ValidInvoice_MarksPaidAndReturns00()
    {
        var (db, conn) = CreateSqliteDb();
        using (conn)
        using (db)
        {
            db.Orders.Add(new Order
            {
                OrderNumber = "INV0011",
                Amount = 1500,
                Status = OrderStatus.Unpaid
            });
            await db.SaveChangesAsync();

            var orderService = new OrderService(null!, db, new DefaultPayProOrderPaidHandler(), _options, NullLogger<OrderService>.Instance);
            var controller = new PayProCallbackController(orderService, db, _options, NullLogger<PayProCallbackController>.Instance);

            var dto = new PayProCallbackRequestDto
            {
                Username = "Event_land",
                Password = "Demo@EV26",
                CsvInvoiceIds = "INV0011"
            };

            var actionResult = await controller.HandlePayProCallback(dto);
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var items = Assert.IsAssignableFrom<List<PayProCallbackResponseItem>>(okResult.Value);

            Assert.Single(items);
            Assert.Equal("00", items[0].StatusCode);
            Assert.Equal("INV0011", items[0].InvoiceID);

            // Verify local order was updated to Paid
            var updatedOrder = await db.Orders.FirstAsync(o => o.OrderNumber == "INV0011");
            Assert.Equal(OrderStatus.Paid, updatedOrder.Status);
            Assert.NotNull(updatedOrder.DatePaid);

            // Verify audit log exists and password is NOT present
            var auditLog = await db.PayProCallbackLogs.FirstAsync();
            Assert.DoesNotContain("Demo@EV26", auditLog.RequestBody);
            Assert.Contains("[REDACTED]", auditLog.RequestBody);
        }
    }

    [Fact]
    public async Task HandlePayProCallback_DuplicateCall_IsIdempotent()
    {
        var (db, conn) = CreateSqliteDb();
        using (conn)
        using (db)
        {
            db.Orders.Add(new Order
            {
                OrderNumber = "INV0012",
                Amount = 3000,
                Status = OrderStatus.Paid // Already paid
            });
            await db.SaveChangesAsync();

            var orderService = new OrderService(null!, db, new DefaultPayProOrderPaidHandler(), _options, NullLogger<OrderService>.Instance);
            var controller = new PayProCallbackController(orderService, db, _options, NullLogger<PayProCallbackController>.Instance);

            var dto = new PayProCallbackRequestDto
            {
                Username = "Event_land",
                Password = "Demo@EV26",
                CsvInvoiceIds = "INV0012"
            };

            var actionResult = await controller.HandlePayProCallback(dto);
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            var items = Assert.IsAssignableFrom<List<PayProCallbackResponseItem>>(okResult.Value);

            Assert.Single(items);
            Assert.Equal("00", items[0].StatusCode);
            Assert.Equal("INV0012", items[0].InvoiceID);
        }
    }
}
