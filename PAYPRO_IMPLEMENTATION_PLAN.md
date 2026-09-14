# Event Land — PayPro Demo Integration Implementation Plan

## Project Context

**Application:** Event Land — online event ticketing platform  
**Frontend:** React + Vite (JavaScript)  
**Backend:** ASP.NET Core 10 Web API  
**Payment Provider:** PayPro Pakistan  
**Environment:** PayPro Demo first, Live after successful testing  

> **Security:** PayPro credentials must remain exclusively on the .NET backend. Never expose the PayPro username, password, Client ID, or Client Secret to React/Vite, browser JavaScript, public environment variables, Git, or API responses.

---

# 1. Objective

Implement a production-quality PayPro payment integration for Event Land with:

- PayPro Demo environment support
- Server-side PayPro authentication
- Event Land booking/payment lifecycle
- Payment order creation
- Payment status verification
- Callback/webhook support if provided by the PayPro V2 API
- Idempotency / duplicate-payment protection
- Secure credential management
- Proper error handling and logging
- React checkout integration
- Database persistence for PayPro transaction information
- Clear separation between Event Land business logic and PayPro provider logic
- Easy switching from Demo to Live credentials later

The implementation MUST use the exact PayPro API V2 contract from the supplied Postman documentation. Do not guess endpoint names, authentication flows, request fields, response fields, or callback behavior.

---

# 2. PayPro Documentation / Environment

## Demo Base URL

```text
http://demoapi.paypro.com.pk/
```

## API V2 Documentation

```text
https://documenter.getpostman.com/view/14543555/2s847FutTd
```

## Demo Credentials

Credentials have been supplied separately to the developer.

Required configuration keys:

```text
PayPro:BaseUrl
PayPro:Username
PayPro:Password
PayPro:ClientId
PayPro:ClientSecret
```

**Do not hard-code actual credentials in source code.**

Use .NET User Secrets for local development and environment variables / secret manager in deployed environments.

---

# 3. Critical API Rule

There are older PayPro `/cpay/*` APIs documented on the demo server.

The project also has PayPro **API V2 credentials** consisting of:

```text
Client ID
Client Secret
```

Therefore:

> **Use API V2 as the implementation target.**

Before writing the PayPro client:

1. Inspect the supplied PayPro V2 Postman collection/documentation.
2. Identify the exact authentication endpoint/mechanism.
3. Identify token lifetime/refresh requirements, if applicable.
4. Identify the exact order/payment creation endpoint.
5. Identify payment-status endpoint.
6. Identify callback/webhook/return URL behavior.
7. Identify required headers.
8. Identify exact request and response schemas.
9. Identify PayPro error/status codes.
10. Verify all findings against the Postman examples.

Do not substitute the older `/cpay/co` flow unless PayPro explicitly confirms that it is the required flow for this account.

---

# 4. Recommended Architecture

```text
React + Vite
     |
     | HTTPS
     v
ASP.NET Core 10 API
     |
     +---- Booking Service
     |
     +---- Payment Service
     |
     +---- PayPro Service
     |
     +---- Ticket Service
     |
     v
Database
     |
     +---- Bookings
     +---- Payments
     +---- Tickets

ASP.NET Core PayPro Service
     |
     | HTTPS
     v
PayPro API V2
```

The React application should communicate only with Event Land APIs.

React should NEVER communicate directly with PayPro using merchant credentials or Client Secret.

---

# 5. Suggested Backend Structure

Use or adapt the existing project structure rather than unnecessarily restructuring the whole application.

Recommended structure:

```text
EventLand.Api/
│
├── Controllers/
│   ├── PaymentsController.cs
│   └── BookingsController.cs
│
├── Services/
│   ├── PayPro/
│   │   ├── IPayProService.cs
│   │   ├── PayProService.cs
│   │   ├── PayProClient.cs
│   │   ├── PayProOptions.cs
│   │   ├── PayProAuthenticationHandler.cs   # if required
│   │   └── Models/
│   │       ├── PayProAuthRequest.cs
│   │       ├── PayProAuthResponse.cs
│   │       ├── PayProCreateOrderRequest.cs
│   │       ├── PayProCreateOrderResponse.cs
│   │       ├── PayProStatusResponse.cs
│   │       └── PayProErrorResponse.cs
│   │
│   ├── Payments/
│   │   ├── IPaymentService.cs
│   │   └── PaymentService.cs
│   │
│   └── Bookings/
│       ├── IBookingService.cs
│       └── BookingService.cs
│
├── Data/
│   ├── ApplicationDbContext.cs
│   └── Entities/
│       ├── Booking.cs
│       ├── Payment.cs
│       └── Ticket.cs
│
└── Program.cs
```

If the existing application already has equivalent folders/classes, integrate into the current architecture instead of creating duplicate abstractions.

---

# 6. Configuration

Create a strongly typed options class:

```csharp
public sealed class PayProOptions
{
    public string BaseUrl { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
}
```

Register:

```csharp
builder.Services.Configure<PayProOptions>(
    builder.Configuration.GetSection("PayPro"));
```

Register an HttpClient:

```csharp
builder.Services.AddHttpClient<PayProClient>();
```

Use the exact Base URL and endpoints from the V2 documentation.

---

# 7. Secret Management

## Local Development

Use:

```bash
dotnet user-secrets init
```

Then configure:

```text
PayPro:BaseUrl
PayPro:Username
PayPro:Password
PayPro:ClientId
PayPro:ClientSecret
```

Do not commit real values to:

```text
appsettings.json
appsettings.Development.json
.env
.env.local
```

unless those files contain only placeholders.

Add secret-containing files to `.gitignore` where appropriate.

## Production

Use:

- Environment variables, or
- Azure Key Vault, AWS Secrets Manager, Google Secret Manager, or equivalent.

The application should be able to switch Demo/Live configuration without source-code changes.

---

# 8. Database Payment Model

Create or extend a `Payment` entity.

Recommended fields:

```text
Id
BookingId
Provider
ProviderTransactionId
ProviderOrderId
Amount
Currency
Status
CreatedAt
UpdatedAt
PaidAt
ExpiresAt
FailureReason
RawProviderResponse
```

Recommended provider:

```text
PayPro
```

Recommended payment statuses:

```text
Pending
Processing
Paid
Failed
Expired
Refunded
Cancelled
```

Use an enum where practical.

Do not use the PayPro transaction ID as the Event Land primary key.

---

# 9. Booking / Ticket Payment Lifecycle

Recommended lifecycle:

```text
Customer selects tickets
        |
        v
Create Event Land Booking
        |
        v
Booking = PaymentPending
        |
        v
Create PayPro payment/order
        |
        v
Save PayPro transaction/order ID
        |
        v
Customer completes payment
        |
        v
PayPro confirms payment
        |
        v
Verify payment server-side
        |
        v
Payment = Paid
        |
        v
Booking = Paid / Confirmed
        |
        v
Generate ticket
        |
        v
Generate QR code
        |
        v
Send/display ticket
```

Do NOT issue a ticket merely because PayPro order creation succeeded.

Order creation and payment completion are different states.

---

# 10. Amount Validation

Never trust the amount supplied by React.

React should send something similar to:

```json
{
  "bookingId": "EL-BOOK-123"
}
```

The backend must:

1. Load the booking.
2. Load ticket/event information.
3. Calculate or verify the amount from server-side data.
4. Verify the booking has not already been paid.
5. Verify the booking has not expired.
6. Verify ticket inventory/reservation state.
7. Send the verified amount to PayPro.

Do not accept a client-supplied amount as authoritative.

---

# 11. Booking Number / Order Number

Every Event Land payment order must have a unique Event Land booking/order number.

Example:

```text
EL-BOOK-00000123
```

or another format consistent with the existing application.

Ensure a database uniqueness constraint exists.

The same booking must not accidentally generate multiple PayPro orders.

---

# 12. Idempotency / Duplicate Payment Protection

The payment creation API must be safe against:

- Double-clicking Pay Now
- Browser retries
- Network retries
- React re-rendering
- User opening checkout in multiple tabs
- API retry after timeout

Before creating a new PayPro payment:

1. Check whether a successful payment already exists.
2. Check whether a pending/processing payment already exists.
3. If a valid existing PayPro payment exists, return its information instead of creating another payment.
4. Use database constraints/transactions where appropriate.

Recommended rule:

```text
One active payment attempt per booking
```

unless the business rules explicitly allow retry after failure/expiry.

---

# 13. PayPro Service

Create a provider abstraction:

```csharp
public interface IPayProService
{
    Task<PayProCreatePaymentResult> CreatePaymentAsync(
        Booking booking,
        CancellationToken cancellationToken = default);

    Task<PayProPaymentStatusResult> GetPaymentStatusAsync(
        string providerTransactionId,
        CancellationToken cancellationToken = default);
}
```

Adapt method names and models to the exact V2 API.

The rest of the application should not need to know PayPro's raw HTTP implementation.

---

# 14. PayPro HTTP Client

Implement all PayPro HTTP calls inside the PayPro integration layer.

Requirements:

- Use `HttpClientFactory`.
- Use async APIs.
- Set appropriate timeout.
- Use cancellation tokens.
- Serialize/deserialize strongly typed DTOs.
- Validate HTTP status codes.
- Validate PayPro business/status codes separately from HTTP status.
- Never log Client Secret or password.
- Never return raw authentication errors to the browser.
- Log safe diagnostic information.

Example concept:

```text
PaymentService
      |
      v
IPayProService
      |
      v
PayProService
      |
      v
PayProClient
      |
      v
PayPro API
```

---

# 15. Authentication

Implement the exact V2 authentication flow from the PayPro Postman documentation.

Determine from the documentation:

```text
Authentication endpoint
HTTP method
Required headers
Client ID location
Client Secret location
Username/password usage
Token response
Token expiration
Refresh mechanism
```

If V2 uses bearer tokens:

```text
Authorization: Bearer <token>
```

implement token acquisition and reuse securely.

Do not request a new token unnecessarily for every application request if the API provides reusable tokens.

Do not persist access tokens in the frontend.

---

# 16. Payment Creation Endpoint

Create an Event Land backend endpoint such as:

```text
POST /api/payments/create
```

Request:

```json
{
  "bookingId": "EL-BOOK-00000123"
}
```

Backend process:

```text
Authenticate Event Land user/customer if applicable
        |
        v
Load booking
        |
        v
Validate booking
        |
        v
Calculate/verify amount
        |
        v
Check existing payment
        |
        v
Create local Payment = Pending
        |
        v
Call PayPro V2
        |
        v
Store PayPro IDs
        |
        v
Return safe payment instructions to React
```

The response should contain only information React actually needs.

Example:

```json
{
  "success": true,
  "bookingId": "EL-BOOK-00000123",
  "paymentId": 501,
  "status": "Pending",
  "paymentUrl": "..."
}
```

Use the actual response shape required by the PayPro V2 flow.

---

# 17. Payment Status Verification

Create an internal service operation to verify a payment:

```text
PayProService.GetPaymentStatusAsync(...)
```

The backend should query PayPro using the exact V2 status endpoint.

Do not mark:

```text
Payment = Paid
```

based solely on:

- HTTP 200
- payment creation success
- frontend redirect
- customer claim
- query parameters supplied by the browser

Payment must be confirmed using trusted PayPro information.

---

# 18. Callback / Webhook / Return Handling

Inspect the PayPro V2 documentation for:

- Webhook
- Callback
- IPN
- Return URL
- Payment notification
- Redirect URL

If PayPro provides a server-to-server callback/webhook:

Create an endpoint such as:

```text
POST /api/payments/paypro/callback
```

The callback must:

1. Validate the request according to PayPro documentation.
2. Locate the corresponding Event Land payment.
3. Verify the transaction with PayPro where required/possible.
4. Update payment status.
5. Update booking status.
6. Issue ticket only after confirmed successful payment.
7. Be idempotent.
8. Return the exact success response expected by PayPro.

If PayPro only provides a browser return URL, treat that return as a signal to re-check the payment server-side rather than as proof of payment.

---

# 19. Ticket Issuing

Only issue the ticket after payment is confirmed.

Example:

```text
PayPro confirmed
      |
      v
Payment.Paid
      |
      v
Booking.Paid
      |
      v
Create Ticket
      |
      v
Generate QR
```

Ticket generation itself should be idempotent.

If the callback/status check is received twice, the system must not issue two tickets.

Use a database uniqueness constraint for the booking/ticket relationship where appropriate.

---

# 20. React Integration

React should call Event Land APIs only.

Example:

```javascript
const response = await fetch(
  `${API_URL}/api/payments/create`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      bookingId
    })
  }
);
```

Then use the safe backend response.

Possible flow:

```text
Checkout Page
    |
    v
POST /api/payments/create
    |
    v
Backend
    |
    v
PayPro
    |
    v
Payment URL / required payment data
    |
    v
React
    |
    v
Redirect / PayPro checkout
```

Use the exact PayPro V2 checkout mechanism.

---

# 21. Frontend Payment States

The React UI should handle at least:

```text
Preparing payment
Redirecting to payment
Payment pending
Payment successful
Payment failed
Payment expired
Payment verification
Unknown status
```

After returning from PayPro, React should call an Event Land endpoint such as:

```text
GET /api/payments/{paymentId}/status
```

The backend should perform or rely on trusted server-side verification.

Do not trust a frontend query parameter such as:

```text
?status=paid
```

as proof.

---

# 22. Payment Status API for React

Recommended endpoint:

```text
GET /api/payments/{paymentId}/status
```

Response example:

```json
{
  "paymentId": 501,
  "bookingId": "EL-BOOK-00000123",
  "status": "Paid",
  "ticketReady": true
}
```

Never expose:

```text
ClientSecret
PayPro password
PayPro access token
raw authentication response
```

---

# 23. Error Handling

Handle at least:

```text
Invalid credentials
Authentication failure
PayPro unavailable
Network timeout
Invalid PayPro request
Duplicate order
Payment rejected
Payment pending
Payment expired
Unknown transaction
Invalid callback
Database failure
Unexpected PayPro response
```

Do not expose provider internals to the customer.

Customer-facing:

```json
{
  "success": false,
  "message": "We could not start the payment. Please try again."
}
```

Server logs can contain a safe technical error identifier.

---

# 24. Logging

Use structured ASP.NET logging.

Good:

```text
Payment creation started
BookingId=123
PaymentId=501
Provider=PayPro
```

Good:

```text
PayPro payment creation failed
BookingId=123
PaymentId=501
ProviderStatus=...
```

Never log:

```text
ClientSecret
Password
Authorization header
Access token
Full customer payment credentials
```

Be careful with `RawProviderResponse` as well; only persist it if it is safe and redact sensitive fields.

---

# 25. Security Requirements

Implement:

- HTTPS in production.
- Secret storage outside source code.
- Authentication/authorization on payment APIs.
- Input validation.
- Rate limiting where appropriate.
- Anti-forgery considerations if applicable to cookie-based authentication.
- Safe logging.
- No sensitive credentials in React.
- No credentials in Git.
- No secrets in error responses.
- No trust in client-side payment amount.
- No trust in browser payment-success status.
- Server-side PayPro verification.

---

# 26. Transaction / Concurrency Handling

Payment creation can involve:

```text
Booking validation
+
Payment row creation
+
PayPro API request
+
Payment row update
```

Be careful with database transactions around external HTTP calls.

Do not hold a long database transaction open while waiting on PayPro.

Recommended pattern:

```text
Validate booking
      |
      v
Create/update local payment attempt
      |
      v
Commit local state
      |
      v
Call PayPro
      |
      v
Update local payment with provider result
```

Use appropriate concurrency controls so two requests cannot create duplicate active payments.

---

# 27. Timeout / Unknown Result Handling

Important scenario:

```text
.NET -> PayPro
          |
          | request succeeds at PayPro
          |
          X network timeout
          |
.NET doesn't know result
```

Do NOT automatically create another PayPro order.

Instead:

```text
Mark payment = Processing / Unknown
        |
        v
Query PayPro using order/transaction identifier
        |
        v
Determine final state
```

This is essential to avoid duplicate customer charges.

---

# 28. Retry Policy

Do not blindly retry payment creation requests.

Safe retries depend on PayPro's idempotency/order semantics.

For read/status operations, controlled retries may be appropriate.

For create-payment requests:

```text
First request timed out
      |
      v
Check existing PayPro order/status
      |
      v
Only create another order if it is confirmed that no order exists
```

Follow PayPro V2's documented idempotency mechanism if one exists.

---

# 29. Demo Environment Testing

Perform the following tests.

## Test A — Authentication

Verify:

```text
Valid credentials -> authenticated
Invalid credentials -> rejected
```

## Test B — Create payment

Verify:

```text
Event Land Booking
        |
        v
PayPro Demo Order
        |
        v
Provider ID returned
```

## Test C — Status

Verify payment status retrieval.

## Test D — Successful payment

Verify:

```text
PayPro Paid
    ->
Payment Paid
    ->
Booking Paid
    ->
Ticket Generated
```

## Test E — Failed payment

Verify:

```text
PayPro Failed
    ->
Payment Failed
    ->
No ticket generated
```

## Test F — Duplicate button click

Verify only one active PayPro payment/order is created.

## Test G — Browser closed

Close browser during payment and verify backend can determine payment status.

## Test H — Callback repeated

Send the same callback more than once and verify only one ticket is issued.

## Test I — Invalid callback

Verify unauthorized/invalid callbacks are rejected.

## Test J — Payment timeout

Simulate PayPro/network timeout and verify no duplicate order is created.

---

# 30. Automated Tests

Create unit/integration tests for:

### PayProService

- Authentication success
- Authentication failure
- Create payment success
- Create payment failure
- Status success
- Status failure
- Invalid response
- Timeout

### PaymentService

- Booking not found
- Booking expired
- Booking already paid
- Existing pending payment
- Amount mismatch
- Successful payment
- Failed payment

### Callback

- Valid callback
- Invalid callback
- Duplicate callback
- Unknown payment
- Already-paid payment

### Ticket generation

- One ticket per successful booking
- No ticket for failed payment
- Duplicate payment callback does not create duplicate ticket

---

# 31. API Contract

Keep Event Land's API independent from PayPro's raw response.

For example:

```text
POST /api/payments/create
GET  /api/payments/{paymentId}/status
POST /api/payments/paypro/callback
```

React should not need to know the details of PayPro's internal response schema.

This allows PayPro API changes to be isolated inside:

```text
Services/PayPro/
```

---

# 32. Demo-to-Live Configuration

The code should support:

```text
Environment = Demo
```

and later:

```text
Environment = Production
```

without code changes.

Only configuration should change:

```text
PayPro:BaseUrl
PayPro:Username
PayPro:Password
PayPro:ClientId
PayPro:ClientSecret
```

Do not create separate hard-coded demo/live code paths unless PayPro requires materially different APIs.

---

# 33. Deployment Checklist

Before deployment:

- [ ] Demo credentials removed from source.
- [ ] Secrets configured in production secret store.
- [ ] HTTPS enabled.
- [ ] CORS configured for actual Event Land frontend domain.
- [ ] PayPro callback URL configured.
- [ ] Database migrations applied.
- [ ] Payment uniqueness constraints verified.
- [ ] Logging configured.
- [ ] Sensitive logging disabled/redacted.
- [ ] Error responses sanitized.
- [ ] Payment status verification tested.
- [ ] Duplicate-payment test passed.
- [ ] Ticket idempotency test passed.
- [ ] Timeout/unknown-result test passed.
- [ ] PayPro demo certification/testing completed.
- [ ] PayPro live credentials received.
- [ ] Live endpoint configured.
- [ ] Live payment tested with PayPro-approved procedure.

---

# 34. Definition of Done

The PayPro integration is considered complete only when:

1. React can start a payment through Event Land's backend.
2. .NET authenticates with PayPro V2 using server-side credentials.
3. A PayPro payment/order can be created successfully in Demo.
4. PayPro transaction/order identifiers are persisted.
5. Payment status can be checked server-side.
6. Successful payment changes the Event Land payment to `Paid`.
7. Successful payment changes the booking to the correct paid/confirmed state.
8. Ticket generation happens only after confirmed payment.
9. QR/ticket generation is idempotent.
10. Failed/expired payments do not issue tickets.
11. Duplicate Pay Now requests do not create duplicate payments.
12. Browser refresh/closure does not incorrectly lose payment state.
13. Unknown payment results are reconciled through PayPro status.
14. Callback/webhook processing is idempotent if supported by PayPro.
15. Secrets are never exposed to React.
16. Secrets are never committed to Git.
17. Automated tests cover the critical payment paths.
18. Demo testing is successful.
19. Switching to Live requires configuration changes only.
20. The implementation is documented for future maintenance.

---

# 35. Antigravity Execution Instructions

## Phase 1 — Inspect Existing Application

Before modifying anything:

1. Inspect the entire existing React/Vite structure.
2. Inspect the existing ASP.NET Core 10 structure.
3. Identify:
   - Authentication
   - User/customer model
   - Event model
   - Ticket model
   - Booking/order model
   - Existing database
   - Existing payment abstractions
   - Existing API conventions
   - Existing configuration
   - Existing logging
4. Do not create duplicate models/services if equivalent functionality already exists.

Create a short implementation assessment before making structural changes.

---

## Phase 2 — Inspect PayPro V2 Documentation

Use the supplied PayPro V2 Postman documentation/collection.

Extract and document:

```text
Authentication
Base URL
Create Payment/Order
Payment Status
Callback/Webhook
Required headers
Request fields
Response fields
Error codes
Token behavior
```

Do not guess missing fields.

If the documentation is ambiguous, isolate the uncertainty and use the existing PayPro demo documentation/account behavior to verify it before implementation.

---

## Phase 3 — Backend PayPro Layer

Implement:

```text
PayProOptions
PayProClient
PayProService
PayPro DTOs
Authentication
Create payment
Status verification
Callback/webhook if supported
```

Keep PayPro-specific code isolated.

---

## Phase 4 — Event Land Payment Layer

Implement:

```text
Payment entity
Payment status enum
PaymentService
PaymentsController
Booking/payment integration
Idempotency
Concurrency protection
```

Integrate with existing database architecture.

---

## Phase 5 — React Checkout

Implement:

```text
Create payment request
Loading state
Redirect/payment UI
Return handling
Payment status verification
Success screen
Failure screen
Pending screen
```

Do not place PayPro secrets in the frontend.

---

## Phase 6 — Testing

Run:

```text
Build
Unit tests
Integration tests
Demo payment
Status verification
Failure scenario
Duplicate payment
Callback duplication
Timeout scenario
```

Fix issues before moving to Live.

---

# 36. Important Implementation Constraints

### MUST

- Use PayPro V2 documentation.
- Keep credentials server-side.
- Use strongly typed DTOs.
- Use `HttpClientFactory`.
- Use server-side amount calculation/validation.
- Persist provider transaction identifiers.
- Verify payment server-side.
- Protect against duplicate payment creation.
- Protect against duplicate ticket creation.
- Handle unknown payment states.
- Use safe structured logging.
- Keep Demo/Live configurable.

### MUST NOT

- Put PayPro credentials in React.
- Put Client Secret in Vite environment variables.
- Commit real credentials.
- Trust frontend payment status.
- Trust frontend amount.
- Mark booking as Paid merely because order creation succeeded.
- Generate tickets before payment confirmation.
- Automatically create a second payment after a timeout without reconciliation.
- Expose raw PayPro authentication responses to users.
- Guess undocumented V2 API fields/endpoints.
- Replace existing application architecture unnecessarily.

---

# 37. Expected Final Flow

```text
USER
 |
 | Select event/tickets
 v
REACT
 |
 | POST /api/bookings
 v
.NET
 |
 | Create booking
 v
BOOKING
 |
 | PaymentPending
 v
REACT
 |
 | POST /api/payments/create
 v
.NET PAYMENT SERVICE
 |
 | Validate booking
 | Validate amount
 | Check duplicate payment
 v
PAYPRO SERVICE
 |
 | Authenticate
 | Create PayPro payment
 v
PAYPRO DEMO
 |
 | Return provider payment/order information
 v
.NET
 |
 | Save provider IDs
 v
REACT
 |
 | Redirect/customer payment
 v
PAYPRO
 |
 | Payment completed
 v
PAYPRO CALLBACK / RETURN
 |
 v
.NET
 |
 | Server-side status verification
 v
PAYPRO
 |
 | Confirm Paid
 v
.NET
 |
 | Payment = Paid
 | Booking = Paid/Confirmed
 | Generate Ticket
 | Generate QR
 v
REACT
 |
 v
TICKET SUCCESS PAGE
```

---

# 38. Final Deliverables

Antigravity should leave the project with:

```text
1. Working PayPro V2 Demo integration
2. Secure configuration
3. PayPro service abstraction
4. Payment database model/migration
5. Payment API endpoints
6. React checkout integration
7. Payment status verification
8. Callback/webhook integration if supported
9. Idempotency protection
10. Ticket issuance protection
11. Automated tests
12. Developer documentation
13. Demo testing instructions
14. Demo -> Live configuration instructions
```

---

# 39. Security Reminder

The PayPro credentials supplied for the Demo account are sensitive even though they are demo credentials.

Treat them as secrets.

If the credentials have already been committed to a public repository, exposed in frontend code, or shared publicly, rotate them with PayPro before using them further.

---

# 40. Completion Report

After implementation, Antigravity should report:

```text
PayPro V2 integration status:
[PASS/FAIL]

Authentication:
[PASS/FAIL]

Create Payment:
[PASS/FAIL]

Payment Status:
[PASS/FAIL]

Callback/Webhook:
[PASS/FAIL/N/A]

Duplicate Protection:
[PASS/FAIL]

Ticket Issuance:
[PASS/FAIL]

React Checkout:
[PASS/FAIL]

Automated Tests:
[PASS/FAIL]

Demo Environment:
[PASS/FAIL]

Known Issues:
...

Files Changed:
...

Database Migrations:
...

Environment Variables Required:
...

Steps to Test:
...
```

Do not claim the integration is complete until the Demo payment flow has actually been tested end-to-end.

---

# 41. Scalability, Performance & Minimal-Code Requirements

The implementation must be **minimal, scalable, optimized, and maintainable**.

The goal is not to create a large enterprise architecture. The goal is to create the **smallest clean architecture that can safely support Event Land as traffic and transaction volume grow**.

## 41.1 General Principle

> Build the simplest implementation that is correct, secure, testable, observable, and capable of scaling. Do not introduce abstractions or infrastructure unless they solve an actual requirement.

## 41.2 Avoid Over-Engineering

Do NOT introduce unnecessary:

- Generic repositories
- Generic services
- Generic controllers
- Factory layers
- Mediator/CQRS frameworks
- Excessive interfaces
- Excessive DTO transformations
- Multiple wrapper classes around simple operations
- Microservices
- Message queues
- Distributed caches
- Event buses

unless the existing application or a demonstrated requirement actually needs them.

For the current PayPro integration, a focused structure such as:

```text
Controller
    ↓
PaymentService
    ↓
PayProService
    ↓
HttpClient
    ↓
PayPro
```

is preferred.

## 41.3 Thin Controllers

Controllers should:

- Validate basic request shape.
- Authenticate/authorize.
- Call the appropriate service.
- Return the appropriate HTTP response.

Controllers should NOT contain:

- PayPro HTTP implementation
- Complex payment business logic
- Database transaction logic
- Ticket-generation logic
- Credential handling

## 41.4 Efficient EF Core Usage

For read-only queries:

```csharp
.AsNoTracking()
```

Use projections when loading only a few fields:

```csharp
.Select(x => new
{
    x.Id,
    x.Amount,
    x.Status
})
```

Avoid loading entire object graphs when unnecessary.

## 41.5 Database Indexing

Add appropriate indexes for high-frequency payment operations.

At minimum, consider indexes/unique constraints for:

```text
Booking.Id
Booking.BookingNumber
Payment.BookingId
Payment.ProviderTransactionId
Payment.ProviderOrderId
Payment.Status
```

Enforce uniqueness at the database level where business rules require it.

Do not rely only on application-level duplicate checks.

## 41.6 Avoid N+1 Queries

Do not query the database repeatedly inside loops.

Prefer 1 query for required booking/payment data instead of multiple round trips.

## 41.7 HttpClient

Use `IHttpClientFactory`.

Do not instantiate `new HttpClient()` for every payment request.

Use:

- Connection pooling
- Appropriate timeout
- CancellationToken
- Reasonable retry behavior only where safe

Do NOT blindly retry payment-creation requests because a retry could create a duplicate payment.

## 41.8 PayPro Token Efficiency

If PayPro V2 authentication returns a reusable access token:

- Cache it server-side.
- Track expiration.
- Reuse valid tokens.
- Refresh/re-authenticate only when required.
- Never send the token to React.
- Never log the token.

Use a simple in-memory token cache initially.

## 41.9 Async Everything I/O-Bound

Use asynchronous APIs for:

- Database access
- PayPro HTTP calls
- File/storage operations
- External services

Use `CancellationToken` throughout the request path. Avoid `.Result` or `.Wait()`.

## 41.10 Database Transactions

Do not hold a database transaction open while waiting for PayPro.

Prefer:

```text
Validate
  ↓
Create local payment attempt
  ↓
Commit
  ↓
Call PayPro
  ↓
Update local payment state
```

Use short transactions around local state changes.

## 41.11 Scalability Path

The initial implementation should work efficiently on a single backend instance and avoid design decisions that prevent future horizontal scaling.

## 41.12 Background Jobs

Do not make payment confirmation depend on long-running HTTP requests.

If future PayPro reconciliation requires scheduled processing, implement a background worker when required.

## 41.13 API Payload Size

Keep API responses minimal. Do not return complete entity graphs, database fields, or raw provider secrets.

## 41.14 Caching

Do NOT cache payment status without a clear freshness strategy, payment credentials, or sensitive customer information. Payment status must remain authoritative.

## 41.15 Performance Monitoring

Monitor API response times, PayPro latency, error rates, and correlate transactions with request IDs.

---

# 42. High-End Application & Payment Security Requirements

Security must be treated as a **defense-in-depth system**, not as a single authentication mechanism.

## 42.1 Threat Model

Consider attacks including IDOR/BOLA, parameter tampering, price manipulation, duplicate payment, webhook forgery, SQL injection, XSS, CSRF, sensitive-data exposure, and session hijacking.

## 42.2 Never Trust the Client

Treat all React input as untrusted. Never trust client-supplied prices, discounts, or payment statuses.

## 42.3 Prevent IDOR / BOLA

Verify that the authenticated user owns or is authorized to access the associated booking/payment before returning information.

## 42.4 Authorization

Enforce authentication, authorization, and resource ownership server-side for every protected operation.

## 42.5 Payment Amount Protection

The backend is the only authority for payment amounts. Persist the finalized amount and verify provider amounts match expected figures.

## 42.6 Prevent Payment Replay & Webhook Security

Reject repeated processing of already-finalized payments. Validate callback signatures with constant-time comparisons where documented.

## 42.7 HTTPS & Security Headers

Enforce HTTPS in production with proper HSTS, CSP, and restrictive security headers.

## 42.8 SQL Injection & Mass Assignment Protection

Use EF Core parameterized queries/LINQ. Never bind database entities directly from arbitrary frontend JSON; use dedicated request DTOs.

## 42.9 Rate Limiting

Apply ASP.NET Core rate limiting to payment creation, status verification, and callback endpoints.

## 42.10 Secrets & Log Redaction

Never store secrets in browser storage or write credentials/tokens into logs.

---

# 43. Security Verification Checklist

Before Demo approval:

- [ ] PayPro secrets are backend-only.
- [ ] No secrets committed to Git.
- [ ] No secrets exposed in React.
- [ ] No secrets in browser network responses.
- [ ] Amount cannot be manipulated from React.
- [ ] Booking ownership is verified.
- [ ] Payment ownership is verified.
- [ ] Payment creation is idempotent.
- [ ] Duplicate callbacks are safe.
- [ ] Ticket issuance is idempotent.
- [ ] PayPro payment status is verified server-side.
- [ ] Invalid callbacks are rejected.
- [ ] Callback signature is verified if supported.
- [ ] Replay protection is implemented if supported.
- [ ] SQL injection protections verified.
- [ ] XSS protections verified.
- [ ] CSRF protections verified where cookie auth is used.
- [ ] Rate limiting configured.
- [ ] Input validation configured.
- [ ] Authorization enforced server-side.
- [ ] Sensitive errors are not exposed.
- [ ] Sensitive logs are redacted.
- [ ] HTTPS configured for production.
- [ ] Security headers configured appropriately.
- [ ] Dependencies checked for vulnerabilities.
- [ ] Database least privilege configured.
- [ ] Production secrets stored in a secret manager.
- [ ] No arbitrary user-controlled PayPro URLs.
- [ ] No open redirect vulnerability.
- [ ] Timeout/unknown-payment handling tested.
- [ ] Race-condition/duplicate-payment tests passed.

---

# 44. Performance & Security Priority Order

When making implementation decisions, use this priority:

```text
1. Payment correctness
2. Security
3. Data integrity
4. Idempotency
5. Reliability
6. Performance
7. Maintainability
8. Simplicity
9. Additional optimization
```

---

# 45. Antigravity Final Engineering Rule

> **Keep the implementation small, but make the security boundary strong.**
