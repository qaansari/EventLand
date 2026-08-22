using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventLand.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddShowSeatingLayout : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EventShowId",
                table: "BookingSeats",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LayoutJson",
                table: "SeatingZones",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_BookingSeats_EventShowId",
                table: "BookingSeats",
                column: "EventShowId");

            migrationBuilder.AddForeignKey(
                name: "FK_BookingSeats_EventShows_EventShowId",
                table: "BookingSeats",
                column: "EventShowId",
                principalTable: "EventShows",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BookingSeats_EventShows_EventShowId",
                table: "BookingSeats");

            migrationBuilder.DropIndex(
                name: "IX_BookingSeats_EventShowId",
                table: "BookingSeats");
        }
    }
}
