using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventLand.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingUnifiedStateAndOutbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Bookings",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<int>(
                name: "State",
                table: "Bookings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Data backfill mapping existing rows based on (Status, PaymentStatus) tuple
            migrationBuilder.Sql(@"
                UPDATE Bookings
                SET State = CASE
                    WHEN Status = 1 OR PaymentStatus = 1 THEN 3
                    WHEN PaymentStatus = 3 THEN 7
                    WHEN PaymentStatus = 4 THEN 4
                    WHEN PaymentStatus = 6 THEN 1
                    WHEN Status = 2 OR PaymentStatus = 2 THEN 6
                    ELSE 0
                END;
            ");

            migrationBuilder.CreateTable(
                name: "BookingStateHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1000, 1"),
                    BookingId = table.Column<int>(type: "int", nullable: false),
                    FromState = table.Column<int>(type: "int", nullable: false),
                    ToState = table.Column<int>(type: "int", nullable: false),
                    Trigger = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ChangedBy = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    MetadataJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookingStateHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BookingStateHistories_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OutboxMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProcessedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Error = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    RetryCount = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMessages", x => x.Id);
                });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEGcnSHKv7V3fTQyzr9YZK2cf2RQHyZ5wqhrRN3bpuhAwOINdufZtfjOY8Y1MbEJCsA==");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_EventId_State",
                table: "Bookings",
                columns: new[] { "EventId", "State" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_State_PaymentExpiresAt",
                table: "Bookings",
                columns: new[] { "State", "PaymentExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BookingStateHistories_BookingId",
                table: "BookingStateHistories",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_BookingStateHistories_BookingId_CreatedAt",
                table: "BookingStateHistories",
                columns: new[] { "BookingId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_ProcessedAtUtc",
                table: "OutboxMessages",
                column: "ProcessedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_Unprocessed_CreatedAt",
                table: "OutboxMessages",
                columns: new[] { "ProcessedAtUtc", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BookingStateHistories");

            migrationBuilder.DropTable(
                name: "OutboxMessages");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_EventId_State",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_State_PaymentExpiresAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Bookings");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEPUGI4O0ECtZ1OqFvYP+T3BNeaViWCNehQE0vShI7Pvy4XKRZW84KKuYXqBhSm4xWQ==");
        }
    }
}
