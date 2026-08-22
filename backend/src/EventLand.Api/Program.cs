using EventLand.Api.Hubs;
using EventLand.Api.Middleware;
using EventLand.Application.Interfaces;
using EventLand.Infrastructure;
using EventLand.Infrastructure.Persistence;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalR();

// Configure Swagger UI
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "EventLand API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
});

// Register Infrastructure & Application Services (Includes DbContext, Auth, Redis/MemoryCache)
builder.Services.AddInfrastructureServices(builder.Configuration);

// Configure CORS for Frontend & WebSockets
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Global Exception Handler
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

// Enable Swagger & Swagger UI (Served at application root http://localhost:4257/)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "EventLand API v1");
    c.RoutePrefix = string.Empty;
});

app.UseStaticFiles();
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<SeatingHub>("/hubs/seating");

// Auto-migrate database & seed Super Admin account on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await DataSeeder.SeedAsync(dbContext);

    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
    await authService.EnsureSuperAdminCreatedAsync();
}

app.Run();
