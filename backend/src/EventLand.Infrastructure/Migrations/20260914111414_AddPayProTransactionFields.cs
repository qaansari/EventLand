using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventLand.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPayProTransactionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ExpiresAt",
                table: "PaymentTransactions",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProviderOrderId",
                table: "PaymentTransactions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RawProviderResponse",
                table: "PaymentTransactions",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEMQTu+ykYUy7t8Do7TQF6ZeentFQPM45czbK4e0080N8Vy6ZOwP+xD/BKAdpL8nrfg==");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_ProviderOrderId",
                table: "PaymentTransactions",
                column: "ProviderOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_Status",
                table: "PaymentTransactions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Events_Published_City_Date",
                table: "Events",
                columns: new[] { "IsPublished", "CityId", "StartDateUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_CreatedAt",
                table: "Bookings",
                column: "CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PaymentTransactions_ProviderOrderId",
                table: "PaymentTransactions");

            migrationBuilder.DropIndex(
                name: "IX_PaymentTransactions_Status",
                table: "PaymentTransactions");

            migrationBuilder.DropIndex(
                name: "IX_Events_Published_City_Date",
                table: "Events");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_CreatedAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "ProviderOrderId",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "RawProviderResponse",
                table: "PaymentTransactions");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAECgRlR/0KDmv61u80Wt24hRgSE3iMdEt9dsDbEk5BQ5fmpGtMevDyzKGHPVji6tEvQ==");
        }
    }
}
