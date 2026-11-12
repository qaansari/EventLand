using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventLand.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizerAndEventEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BrandName",
                table: "Organizers",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CompanyNtn",
                table: "Organizers",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanyType",
                table: "Organizers",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Individual");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Organizers",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FacebookUrl",
                table: "Organizers",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InstagramUrl",
                table: "Organizers",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RegisteredAddress",
                table: "Organizers",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AttractionsOrActivities",
                table: "Events",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "X");

            migrationBuilder.AddColumn<string>(
                name: "AudienceRestrictions",
                table: "Events",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "DressCode",
                table: "Events",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EventType",
                table: "Events",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Event");

            migrationBuilder.AddColumn<bool>(
                name: "FoodDrinksAvailable",
                table: "Events",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "FoodDrinksIncluded",
                table: "Events",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "FoodDrinksRestrictions",
                table: "Events",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<bool>(
                name: "ParkingAvailable",
                table: "Events",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "PetsAllowed",
                table: "Events",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SeatChartUrl",
                table: "Events",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SeatingArrangement",
                table: "Events",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "Seating");

            migrationBuilder.AddColumn<string>(
                name: "SmokingRestrictions",
                table: "Events",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "TicketDaysInterchangeable",
                table: "Events",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "No");

            migrationBuilder.AddColumn<string>(
                name: "TicketNameChangeAllowed",
                table: "Events",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "Yes");

            migrationBuilder.AddColumn<string>(
                name: "TicketNamePolicy",
                table: "Events",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "Only the person whose name is on the ticket can use the ticket");

            migrationBuilder.AddColumn<bool>(
                name: "ValetAvailable",
                table: "Events",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "VenueEnvironment",
                table: "Events",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Indoor");

            migrationBuilder.AddColumn<bool>(
                name: "WheelchairAccessible",
                table: "Events",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "Organizers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "BrandName", "CompanyNtn", "CompanyType", "Description", "FacebookUrl", "InstagramUrl", "RegisteredAddress" },
                values: new object[] { "", null, "Individual", null, null, "", "" });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEPUGI4O0ECtZ1OqFvYP+T3BNeaViWCNehQE0vShI7Pvy4XKRZW84KKuYXqBhSm4xWQ==");

            migrationBuilder.CreateIndex(
                name: "IX_Events_EventType",
                table: "Events",
                column: "EventType");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Events_EventType",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "BrandName",
                table: "Organizers");

            migrationBuilder.DropColumn(
                name: "CompanyNtn",
                table: "Organizers");

            migrationBuilder.DropColumn(
                name: "CompanyType",
                table: "Organizers");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Organizers");

            migrationBuilder.DropColumn(
                name: "FacebookUrl",
                table: "Organizers");

            migrationBuilder.DropColumn(
                name: "InstagramUrl",
                table: "Organizers");

            migrationBuilder.DropColumn(
                name: "RegisteredAddress",
                table: "Organizers");

            migrationBuilder.DropColumn(
                name: "AttractionsOrActivities",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "AudienceRestrictions",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "DressCode",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "EventType",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "FoodDrinksAvailable",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "FoodDrinksIncluded",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "FoodDrinksRestrictions",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "ParkingAvailable",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "PetsAllowed",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "SeatChartUrl",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "SeatingArrangement",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "SmokingRestrictions",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "TicketDaysInterchangeable",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "TicketNameChangeAllowed",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "TicketNamePolicy",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "ValetAvailable",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "VenueEnvironment",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "WheelchairAccessible",
                table: "Events");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEHFJcnpn5a6JiXFJivaQ6fUDcqnBSEYz9bQm4n5fwcxaoMHROeWdtJJioz9LxgvhRA==");
        }
    }
}
