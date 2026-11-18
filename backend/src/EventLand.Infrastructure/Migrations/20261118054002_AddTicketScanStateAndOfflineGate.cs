using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventLand.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketScanStateAndOfflineGate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CheckedInDeviceId",
                table: "Bookings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "GateScanSequence",
                table: "Bookings",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ScanState",
                table: "Bookings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Backfill ScanState for existing records:
            // 1 = ScannedAndAdmitted, 2 = Revoked, 0 = Issued
            migrationBuilder.Sql(@"
                UPDATE [Bookings]
                SET [ScanState] = CASE 
                    WHEN [IsCheckedIn] = 1 THEN 1 
                    WHEN [State] IN (5, 6, 7) THEN 2 
                    ELSE 0 
                END;
            ");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEJ0x/SY9wZ6R3ew4J2Sh1ZTwaH2VTNWxnOrFBSi1zUHa8Wgoq7kBmHNXW+lfcwMsZQ==");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_EventId_IsCheckedIn_ScanState",
                table: "Bookings",
                columns: new[] { "EventId", "IsCheckedIn", "ScanState" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bookings_EventId_IsCheckedIn_ScanState",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CheckedInDeviceId",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "GateScanSequence",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ScanState",
                table: "Bookings");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEG8a9kxcaFDI5KDVmGzG9jyNVZzLYj/zSmvIY9bAeR/Ya4XMZBppJqKa5GBpUZM2gA==");
        }
    }
}
