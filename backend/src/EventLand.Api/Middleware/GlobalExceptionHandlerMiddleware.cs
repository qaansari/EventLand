namespace EventLand.Api.Middleware;

using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

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
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            _logger.LogDebug("Request execution was canceled by the client.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred during request processing.");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        if (context.Response.HasStarted)
        {
            return Task.CompletedTask;
        }

        context.Response.ContentType = "application/json";

        var statusCode = exception switch
        {
            KeyNotFoundException => HttpStatusCode.NotFound,
            InvalidOperationException => HttpStatusCode.BadRequest,
            // Authenticated users who lack privileges get 403 Forbidden (not 401 which triggers logout)
            UnauthorizedAccessException when context.User.Identity?.IsAuthenticated == true
                => HttpStatusCode.Forbidden,
            UnauthorizedAccessException => HttpStatusCode.Unauthorized,
            DbUpdateConcurrencyException => HttpStatusCode.Conflict,
            DbUpdateException => HttpStatusCode.BadRequest,
            ArgumentException => HttpStatusCode.BadRequest,
            _ => HttpStatusCode.InternalServerError
        };

        context.Response.StatusCode = (int)statusCode;

        // Client-facing errors (4xx) carry the exception message; 500s return a generic
        // message so stack details and internal exceptions never reach the caller.
        var response = new
        {
            statusCode = context.Response.StatusCode,
            message = statusCode == HttpStatusCode.InternalServerError
                ? "An unexpected error occurred processing your request. Please try again later."
                : exception.Message
        };

        return context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
