namespace EventLand.UnitTests.PayPro;

using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

public class MockHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _handler;
    public List<HttpRequestMessage> CapturedRequests { get; } = new();

    public MockHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> handler)
    {
        _handler = handler;
    }

    public MockHttpMessageHandler(HttpResponseMessage staticResponse)
    {
        _handler = _ => Task.FromResult(staticResponse);
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        CapturedRequests.Add(request);
        return await _handler(request);
    }
}
