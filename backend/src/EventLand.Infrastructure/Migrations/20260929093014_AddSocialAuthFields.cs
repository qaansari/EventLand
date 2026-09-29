using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventLand.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSocialAuthFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AuthProvider",
                table: "Users",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "local");

            migrationBuilder.AddColumn<string>(
                name: "FacebookId",
                table: "Users",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GoogleId",
                table: "Users",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "AuthProvider", "FacebookId", "GoogleId", "PasswordHash" },
                values: new object[] { "local", null, null, "AQAAAAIAAYagAAAAEEt6iX/B/+oJvua6ANY4TSc3g+XS/U+BaVgLoCXBAZycIOoKWMdmzBYIr7YtHFPriw==" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_FacebookId",
                table: "Users",
                column: "FacebookId",
                unique: true,
                filter: "[IsDeleted] = 0 AND [FacebookId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Users_GoogleId",
                table: "Users",
                column: "GoogleId",
                unique: true,
                filter: "[IsDeleted] = 0 AND [GoogleId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_FacebookId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_GoogleId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AuthProvider",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "FacebookId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "GoogleId",
                table: "Users");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAECVq9OMdNiKbNLWFM+qBlM3n55yPeW/1GJRpuh29tdlc8PmHVnkkUay6RnkC0+JOGg==");
        }
    }
}
