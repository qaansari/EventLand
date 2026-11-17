using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventLand.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSeatStateAndZoneIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "State",
                table: "Seats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(@"
                UPDATE Seats
                SET State = CASE
                    WHEN Status = 1 THEN 1
                    WHEN Status = 2 THEN 2
                    WHEN Status = 3 THEN 3
                    ELSE 0
                END;
            ");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEG8a9kxcaFDI5KDVmGzG9jyNVZzLYj/zSmvIY9bAeR/Ya4XMZBppJqKa5GBpUZM2gA==");

            migrationBuilder.CreateIndex(
                name: "IX_Seats_ZoneId_State",
                table: "Seats",
                columns: new[] { "ZoneId", "State" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Seats_ZoneId_State",
                table: "Seats");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Seats");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEGcnSHKv7V3fTQyzr9YZK2cf2RQHyZ5wqhrRN3bpuhAwOINdufZtfjOY8Y1MbEJCsA==");
        }
    }
}
