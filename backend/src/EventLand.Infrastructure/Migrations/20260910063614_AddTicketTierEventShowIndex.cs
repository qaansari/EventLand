using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventLand.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketTierEventShowIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEHlvRJk+0aGoMT+j70pF93yX5wjh0ewSxoIVz0qx59qFpv6f7Auqsom9HDU+wn0EFA==");

            migrationBuilder.CreateIndex(
                name: "IX_TicketTiers_EventId_EventShowId",
                table: "TicketTiers",
                columns: new[] { "EventId", "EventShowId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TicketTiers_EventId_EventShowId",
                table: "TicketTiers");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEHmufhGsvmYBwIEyjQ5YdStLNQqn9TFxCdT61rU/W2AWNRPx8HvWLmGl8Ae9b31riw==");
        }
    }
}
