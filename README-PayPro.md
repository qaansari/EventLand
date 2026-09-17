# EventLand PayPro (v2) Financial Switch & Payment Gateway Integration

> **Production-Grade Payment Integration Documentation**  
> Target Framework: **.NET Core 10 (C# 14)**  
> Frontend Framework: **React 19 (Vite)**  
> Database: **PostgreSQL / SQL Server via EF Core 10**  

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Security Architecture & Zero Code Change Guarantee](#2-security-architecture--zero-code-change-guarantee)
3. [Configuration & Secret Rotation Guide](#3-configuration--secret-rotation-guide)
4. [PayPro V2 Endpoints Reference](#4-paypro-v2-endpoints-reference)
5. [Inbound Callback (Webhook) API (`POST /paypro/uis`)](#5-inbound-callback-webhook-api-post-payprouis)
6. [Automated Reconciliation Service](#6-automated-reconciliation-service)
7. [EF Core Migration Consolidation Notice](#7-ef-core-migration-consolidation-notice)
8. [Frontend Components & Integration](#8-frontend-components--integration)
9. [Verification & Testing](#9-verification--testing)

---

## 1. Architecture Overview

The integration is implemented as an isolated class library module in `backend/src/Modules/PayPro/EventLand.Modules.PayPro.csproj`, loosely coupled with EventLand's domain, application, and infrastructure layers.

```
                     ┌────────────────────────────────┐
                     │     React 19 / Vite Frontend   │
                     │  - CheckoutModal               │
                     │  - PayProStatusTracker         │
                     │  - PayProReturnPage            │
                     │  - PayProAdminPanel            │
                     └───────────────┬────────────────┘
                                     │ /api/paypro/*
                                     ▼
                     ┌────────────────────────────────┐
                     │      EventLand.Api (.NET 10)   │
                     │  - PayProAdminController       │
                     │  - PaymentController           │
                     └───────────────┬────────────────┘
                                     │
                     ┌───────────────▼────────────────┐
                     │   EventLand.Modules.PayPro     │
                     │  ┌──────────────────────────┐  │
                     │  │ IPayProApiClient         │  │ ──► PayPro V2 REST Gateway
                     │  │ (Polly HTTP Resilience)  │  │     (11 REST Endpoints)
                     │  ├──────────────────────────┤  │
                     │  │ PayProAuthTokenProvider  │  │ ──► Auth Token Cache (90% TTL)
                     │  ├──────────────────────────┤  │
                     │  │ OrderService             │  │ ◄── Database (Orders table)
                     │  ├──────────────────────────┤  │
                     │  │ ConsumerService          │  │ ◄── Database (Consumers table)
                     │  ├──────────────────────────┤  │
                     │  │ ReconciliationService    │  │ ◄── (Status, UpdatedAtUtc) index
                     │  ├──────────────────────────┤  │
                     │  │ PayProCallbackController │  │ ◄── Inbound Webhook (POST /paypro/uis)
                     │  ├──────────────────────────┤  │
                     │  │ PayProReconciliationJob  │  │ ──► BackgroundService (Every 10 min)
                     │  └──────────────────────────┘  │
                     └───────────────┬────────────────┘
                                     │
                     ┌───────────────▼────────────────┐
                     │   EventLand.Infrastructure     │
                     │  - ApplicationDbContext        │
                     │    (Implements IPayProDbContext│
                     │  - PayProBookingPaidHandler    │
                     │    (Issues Tickets & Seats)    │
                     └────────────────────────────────┘
```

---

## 2. Security Architecture & Zero Code Change Guarantee

- **Zero Hardcoded Secrets**: All credentials (`BaseUrl`, `Username`, `Password`, `ClientSecret`, `MerchantId`, `ConnectUrl`) are bound via `Microsoft.Extensions.Options.ConfigurationExtensions` and stored in `appsettings.Development.json` or Environment Variables / Azure Key Vault / AWS Secrets Manager in production.
- **Zero Code Changes for Live Deployment**: Moving from Demo / Staging to Live requires changing **only environment configuration or secrets**, never code.
- **Constant-Time Webhook Authentication**: Webhook authorization verifies credentials using `CryptographicOperations.FixedTimeEquals` to prevent side-channel timing attacks.
- **Strict Data Sanitization**: Passwords, client secrets, and sensitive tokens are systematically masked in logs and redacted before persisting to the `PayProCallbackLogs` audit table.
- **High Financial Precision**: All monetary values in `Orders` and callback payloads are stored as `decimal(18,4)` to prevent round-off errors.
- **Idempotent Webhook Processing**: Replaying webhooks for already-paid invoices yields `00` (Success) without duplicate processing or duplicate ticket issuance.

---

## 3. Configuration & Secret Rotation Guide

### Configuration Schema (`appsettings.json` / Environment Variables)

```json
{
  "PayPro": {
    "BaseUrl": "https://demo-api.paypro.com.pk",
    "ConnectUrl": "https://demo.paypro.com.pk/paypro_connect",
    "Username": "YOUR_MERCHANT_USERNAME",
    "Password": "YOUR_MERCHANT_PASSWORD",
    "ClientSecret": "YOUR_CLIENT_SECRET",
    "MerchantId": "YOUR_MERCHANT_ID",
    "DefaultExpiryMinutes": 1440,
    "UseAutoTokenRefresh": true,
    "ReconciliationIntervalMinutes": 10
  }
}
```

### Environment Variable Overrides (Production)

In Kubernetes, Docker, Azure App Service, or Linux VMs, set the following environment variables:

| Variable Name | Production Description | Example Value |
| :--- | :--- | :--- |
| `PayPro__BaseUrl` | Official PayPro Live Gateway Base URL | `https://api.paypro.com.pk` |
| `PayPro__ConnectUrl` | PayPro Hosted Checkout Portal Base URL | `https://connect.paypro.com.pk` |
| `PayPro__Username` | Production Merchant Portal Username | `MerchantCorpPk` |
| `PayPro__Password` | Production Merchant Portal Password | `Str0ngProdP@ss!` |
| `PayPro__ClientSecret` | Production API Client Secret | `sec_live_98319283` |
| `PayPro__MerchantId` | Assigned Live Merchant ID | `PK_MERCH_0012` |
| `PayPro__DefaultExpiryMinutes` | Unpaid Invoice Hold Time in Minutes | `1440` (24 Hours) |
| `PayPro__ReconciliationIntervalMinutes` | Background Auto-Reconciliation Interval | `10` |

> **Procedure to Switch from Demo to Live:**  
> 1. In your production hosting environment, update the environment variables above with your live PayPro credentials.  
> 2. Restart the .NET application.  
> 3. Zero re-compilation or code deployment is required.

---

## 4. PayPro V2 Endpoints Reference

All 11 PayPro V2 REST endpoints are implemented inside `PayProApiClient` with automated Polly resilience (timeout, retry with jitter, circuit breaker) and 401 token refresh:

| # | Operation Name | Method | PayPro V2 Path | Description |
|---|---|---|---|---|
| 1 | Create Token | `POST` | `/v2/ppro/auth` | Authenticates merchant & returns JWT token + expiry |
| 2 | Create Order | `POST` | `/v2/ppro/co` | Creates a single invoice / order with PayPro |
| 3 | Create Multiple Orders | `POST` | `/v2/ppro/cmo` | Batch creates multiple invoices in one request |
| 4 | Live Status (Master) | `POST` | `/v2/ppro/ggos` | Inquires status by Merchant ID |
| 5 | Live Status (By Order) | `POST` | `/v2/ppro/ggosboi` | Inquires live status for a specific Order ID |
| 6 | Mark Orders Paid | `POST` | `/v2/ppro/moap` | Administrative override: mark orders as Paid |
| 7 | Mark Orders Blocked | `POST` | `/v2/ppro/moab` | Administrative override: mark orders as Blocked |
| 8 | Create Consumer | `POST` | `/v2/ppro/cc` | Registers a single merchant consumer profile |
| 9 | Create Multiple Consumers | `POST` | `/v2/ppro/cmc` | Batch registers multiple consumer profiles |
| 10 | Update Consumer | `POST` | `/v2/ppro/uc` | Updates an existing consumer profile |
| 11 | Get Paid Orders Report | `POST` | `/v2/ppro/gpo` | Retrieves date-bounded paid orders report |

---

## 5. Inbound Callback (Webhook) API (`POST /paypro/uis`)

PayPro calls the merchant webhook when a consumer completes payment via 1Link, OTC, online banking, or card.

- **URL**: `POST /paypro/uis` (or `/api/paypro/uis`)
- **Headers**: `Content-Type: application/json`
- **Rate Limiting**: Protected by `"paypro-callback"` IP rate-limiting policy.

### Incoming Request Payload Example:
```json
{
  "username": "EVENTLAND_USER",
  "password": "EVENTLAND_PASSWORD",
  "csvinvoiceids": "EVL-10023,EVL-10024"
}
```

### Response Codes Contract:
The response is always an HTTP `200 OK` JSON array conforming to PayPro's switch specification:

```json
[
  {
    "StatusCode": "00",
    "InvoiceID": "EVL-10023",
    "Description": "Invoice successfully marked as paid"
  },
  {
    "StatusCode": "03",
    "InvoiceID": "EVL-10024",
    "Description": "No records found for that invoice"
  }
]
```

| StatusCode | Meaning | PayPro Action |
|---|---|---|
| `00` | Success | Payment recorded and order confirmed |
| `01` | Invalid Data | Missing or corrupt parameters |
| `02` | User Not Authorized / Service Failure | Bad credentials or unhandled exception |
| `03` | Records Not Found | The requested invoice ID does not exist in the merchant system |

---

## 6. Automated Reconciliation Service

The `PayProReconciliationJob` background service runs periodically (default: every 10 minutes):

1. Queries the local `Orders` table using the high-performance composite index:
   ```sql
   CREATE INDEX "IX_Orders_Status_UpdatedAtUtc" ON "Orders" ("Status", "UpdatedAtUtc");
   ```
2. Finds all orders with `Status = Unpaid` or `Status = Pending` whose `UpdatedAtUtc` is older than the configured threshold (e.g. 15 minutes).
3. Queries PayPro's live status endpoint (`/v2/ppro/ggosboi`) for each pending order.
4. If PayPro reports an order as paid, marks the order paid locally and dispatches `PayProBookingPaidHandler` to:
   - Issue confirmed tickets and generate digital QR codes.
   - Lock selected auditorium seats to `Confirmed`.
   - Update booking payment state to `Paid`.

---

## 7. EF Core Migration Consolidation Notice

> [!WARNING]
> **Consolidated Baseline Migration Alert**  
> On **2026-09-17**, all pre-existing fragmented migrations in `EventLand.Infrastructure` were squashed and consolidated into a single clean baseline migration:  
> `20260917071121_InitialBaseline.cs`

### For Existing Databases (Staging / Production)
Do not drop your database. Run the following EF Core script command to generate an idempotent script, or mark `InitialBaseline` as applied in the `__EFMigrationsHistory` table:

```sql
-- For existing databases where tables already exist:
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260917071121_InitialBaseline', '10.0.11')
ON CONFLICT ("MigrationId") DO NOTHING;
```

### For Fresh Environments:
```bash
dotnet ef database update --project backend/src/EventLand.Infrastructure --startup-project backend/src/EventLand.Api
```

---

## 8. Frontend Components & Integration

The frontend React application features 4 dedicated components:

1. **`services/paypro.api.js`**:
   - Typed client for all backend `/api/paypro/*` routes.
2. **`components/PayProStatusTracker.jsx`**:
   - Interactive live status polling widget.
   - Integrated into `CheckoutModal.jsx` (Step 3) with a pulse animation, real-time polling, and direct Click2Pay redirect.
3. **`components/PayProReturnPage.jsx`**:
   - Customer return handler for URL redirect callbacks (`/payments/return?ordId=...&status=...&msg=...`).
   - Automatically queries backend status and presents a receipt with direct navigation to E-Tickets.
4. **`components/PayProAdminPanel.jsx`**:
   - SuperAdmin control panel inside `AdminDashboard.jsx`:
     - **Paid Orders Tab (GPO)**: Paginated table with date range filter and revenue metrics.
     - **Consumers Tab**: Single registration form + Batch CSV import tool + live search.
     - **Reconciliation & Ops Tab**: Manual sweep trigger, live order inspector, and manual order override (`moap` / `moab`).

---

## 9. Verification & Testing

### Backend Unit Tests
Execute the full test suite (all 47 tests passing):
```bash
dotnet test backend/tests/EventLand.UnitTests/EventLand.UnitTests.csproj
```

### Frontend Build
Execute the production bundle build (Vite):
```bash
cd frontend && npm run build
```
