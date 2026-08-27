using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventLand.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPayProAndRefundFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PayProConnectUrl",
                table: "Bookings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayProInvoiceId",
                table: "Bookings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PaymentExpiresAt",
                table: "Bookings",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundReason",
                table: "Bookings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RefundedAt",
                table: "Bookings",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RefundRecords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1000, 1"),
                    BookingId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PayProRefundId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProcessedByUserId = table.Column<int>(type: "int", nullable: true),
                    ProcessedByEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProcessedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefundRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefundRecords_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RefundRecords_BookingId",
                table: "RefundRecords",
                column: "BookingId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RefundRecords");

            migrationBuilder.DropColumn(
                name: "PayProConnectUrl",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PayProInvoiceId",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PaymentExpiresAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RefundReason",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RefundedAt",
                table: "Bookings");
        }
    }
}
