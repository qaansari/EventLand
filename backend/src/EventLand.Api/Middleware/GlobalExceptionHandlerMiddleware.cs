namespace EventLand.Api.Middleware;

using System.Net;
using System.Text.Json;

public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

    public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred during request processing.");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var statusCode = exception switch
        {
            KeyNotFoundException => HttpStatusCode.NotFound,
            InvalidOperationException => HttpStatusCode.Conflict,
            UnauthorizedAccessException => HttpStatusCode.Unauthorized,
            ArgumentException => HttpStatusCode.BadRequest,
            _ => HttpStatusCode.InternalServerError
        };

        context.Response.StatusCode = (int)statusCode;

        var response = new
        {
            statusCode = context.Response.StatusCode,
            message = exception.Message,
            detail = statusCode == HttpStatusCode.InternalServerError ? "An unexpected error occurred processing your request." : exception.Message
        };

        return context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
