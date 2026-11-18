using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventLand.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundStatusAndUniqueActiveIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RefundRecords_BookingId",
                table: "RefundRecords");

            migrationBuilder.AddColumn<int>(
                name: "ProcessedByAdminId",
                table: "RefundRecords",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProviderRefundRef",
                table: "RefundRecords",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            // Safe case-insensitive data backfill for existing records
            migrationBuilder.Sql(@"
                UPDATE RefundRecords
                SET Status = CASE
                    WHEN LOWER(Status) = 'processed' THEN 'Processed'
                    WHEN LOWER(Status) = 'approved' THEN 'Approved'
                    WHEN LOWER(Status) = 'requested' THEN 'Requested'
                    WHEN LOWER(Status) = 'rejected' THEN 'Rejected'
                    WHEN LOWER(Status) = 'failed' THEN 'Failed'
                    ELSE 'Processed'
                END;
            ");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEBfwNOTc9KUjGCB2rW9dfjR8HV5oRlkVlKoe4rQTXK2+KxX46BE67Oxi42vu564IiQ==");

            migrationBuilder.CreateIndex(
                name: "IX_RefundRecords_BookingId_Active",
                table: "RefundRecords",
                column: "BookingId",
                unique: true,
                filter: "Status IN ('Requested', 'Approved', 'Processed')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RefundRecords_Status",
                table: "RefundRecords",
                sql: "Status IN ('Requested', 'Approved', 'Processed', 'Rejected', 'Failed')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RefundRecords_BookingId_Active",
                table: "RefundRecords");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RefundRecords_Status",
                table: "RefundRecords");

            migrationBuilder.DropColumn(
                name: "ProcessedByAdminId",
                table: "RefundRecords");

            migrationBuilder.DropColumn(
                name: "ProviderRefundRef",
                table: "RefundRecords");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEJ0x/SY9wZ6R3ew4J2Sh1ZTwaH2VTNWxnOrFBSi1zUHa8Wgoq7kBmHNXW+lfcwMsZQ==");

            migrationBuilder.CreateIndex(
                name: "IX_RefundRecords_BookingId",
                table: "RefundRecords",
                column: "BookingId");
        }
    }
}
