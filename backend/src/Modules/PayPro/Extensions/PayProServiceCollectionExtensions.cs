namespace EventLand.Modules.PayPro.Extensions;

using System;
using System.Net.Http;
using EventLand.Modules.PayPro.BackgroundJobs;
using EventLand.Modules.PayPro.Client;
using EventLand.Modules.PayPro.Options;
using EventLand.Modules.PayPro.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.Extensions.Options;
using Polly;

public static class PayProServiceCollectionExtensions
{
    public static IServiceCollection AddPayProModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // 1. Strongly-typed configuration options
        services.Configure<PayProOptions>(configuration.GetSection(PayProOptions.SectionName));

        // 2. Memory cache (ensures IMemoryCache is present)
        services.AddMemoryCache();

        // 3. HTTP Client for Auth Token Provider
        services.AddHttpClient<IPayProAuthTokenProvider, PayProAuthTokenProvider>((sp, client) =>
        {
            var options = sp.GetRequiredService<IOptions<PayProOptions>>().Value;
            if (Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out var baseUri))
            {
                client.BaseAddress = baseUri;
            }
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        // 4. Resilient Typed HttpClient for PayPro API Client
        services.AddHttpClient<IPayProApiClient, PayProApiClient>((sp, client) =>
        {
            var options = sp.GetRequiredService<IOptions<PayProOptions>>().Value;
            if (Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out var baseUri))
            {
                client.BaseAddress = baseUri;
            }
            client.Timeout = TimeSpan.FromSeconds(25);
        })
        .AddResilienceHandler("paypro-resilience-pipeline", builder =>
        {
            // Per-request timeout
            builder.AddTimeout(TimeSpan.FromSeconds(15));

            // Retry policy: exponential backoff with jitter on transient 5xx or timeouts (max 3 attempts)
            builder.AddRetry(new HttpRetryStrategyOptions
            {
                MaxRetryAttempts = 3,
                Delay = TimeSpan.FromSeconds(1),
                BackoffType = DelayBackoffType.Exponential,
                UseJitter = true,
                ShouldHandle = args =>
                {
                    if (args.Outcome.Exception is HttpRequestException || args.Outcome.Exception is TimeoutException)
                    {
                        return ValueTask.FromResult(true);
                    }

                    if (args.Outcome.Result != null)
                    {
                        var status = (int)args.Outcome.Result.StatusCode;
                        // Retry only transient 5xx or 408 Request Timeout. Never retry 4xx business errors.
                        return ValueTask.FromResult(status >= 500 || status == 408);
                    }

                    return ValueTask.FromResult(false);
                }
            });

            // Circuit breaker: opens on sustained downstream failure
            builder.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
            {
                FailureRatio = 0.5,
                SamplingDuration = TimeSpan.FromSeconds(30),
                MinimumThroughput = 5,
                BreakDuration = TimeSpan.FromSeconds(15)
            });
        });

        // 5. Domain Services
        services.TryAddScoped<IPayProOrderPaidHandler, DefaultPayProOrderPaidHandler>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IConsumerService, ConsumerService>();
        services.AddScoped<IReconciliationService, ReconciliationService>();

        // 6. Background Reconciliation Worker
        services.AddHostedService<PayProReconciliationJob>();

        return services;
    }
}
