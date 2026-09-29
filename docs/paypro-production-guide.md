# PayPro Payment Gateway Production Integration Guide

This guide details the architecture, configuration, security safeguards, and deployment checklist for the **PayPro (v2) Financial Switch & 1Link Payment Gateway** integration in **EventLand**, following the enterprise architecture utilized by leading Pakistani ticketing platforms (such as the Arts Council Karachi at `acpkhi.com/events`).

---

## 1. Architecture Overview

EventLand implements a **full-page hosted redirect and decoupled reconciliation model**:

```
+----------------------------------------------------------------------------------------------------+
|                                    EVENTLAND PAYPRO V2 WORKFLOW                                     |
+----------------------------------------------------------------------------------------------------+

1. User selects seats/tickets in EventLand Checkout
2. Backend creates booking hold & calls PayPro /v2/ppro/co
   - Passes clean 11-digit phone (03XXXXXXXXX)
   - Passes Ecommerce_return_url = https://eventland.pk/payment-return
3. PayPro returns Order Connect URL (Click2Pay) & PayPro ID
4. EventLand saves order reference in localStorage & redirects (window.location.assign)
5. User completes payment on PayPro (Debit/Credit Card, 1Link 1Bill, JazzCash, EasyPaisa, OTC)
6. PayPro redirects user back to:
   https://eventland.pk/payment-return?ordId={OrderNumber}&status=PAID
7. EventLand Return Page calls public rate-limited endpoint:
   GET /api/payments/paypro-return?ordId={OrderNumber}
8. Backend verifies order against PayPro network, confirms tickets, masks PII, and returns receipt
9. EventLand Return Page displays receipt & provides instant 1-click access to QR E-Ticket Gate Pass!
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Current Working Mode (Demo vs. Production)

### Is PayPro in Working Mode Right Now?
**YES.** The demo credentials configured in `backend/src/EventLand.Api/appsettings.Development.json` are **active and verified live against the PayPro sandbox network**:
- **Biller ID:** `3223`
- **Username:** `Event_land`
- **Base URL:** `https://demoapi.paypro.com.pk/v2/ppro`
- **Live Test Verified:** Generated real PayPro IDs (e.g. `32232627100001`) and valid Click2Pay hosted checkout URLs (`https://marketplace.paypro.com.pk/pyb-demo/?bid=...`).

### When are Live Credentials Needed?
Live credentials are required **only when accepting real money from customers in production**. The code in EventLand is 100% production-ready and switches between Sandbox and Production via environment variables or `appsettings.Production.json` with **zero code modifications**.

---

## 3. Configuration & Environment Variables

### Production `appsettings.json` / Environment Variables
Configure the following environment variables in your production hosting environment (e.g., Docker, Kubernetes, Azure App Service, AWS ECS, or systemd):

| Setting Key | Environment Variable Key | Sandbox / Demo Value | Production Example Value |
|---|---|---|---|
| `PayPro:BaseUrl` | `PayPro__BaseUrl` | `https://demoapi.paypro.com.pk/v2/ppro` | `https://api.paypro.com.pk/v2/ppro` |
| `PayPro:ClientId` | `PayPro__ClientId` | `8mZHsWr6QZpcmpe` | *Provided by PayPro onboarding team* |
| `PayPro:ClientSecret` | `PayPro__ClientSecret` | `BpfL4ioclo4D8dN` | *Provided by PayPro onboarding team* |
| `PayPro:Username` | `PayPro__Username` | `Event_land` | *Provided by PayPro onboarding team* |
| `PayPro:Password` | `PayPro__Password` | *(Demo auth token)* | *Provided by PayPro onboarding team* |
| `PayPro:ReturnUrl` | `PayPro__ReturnUrl` | `http://localhost:5173/payment-return` | `https://eventland.pk/payment-return` |
| `PayPro:DefaultBillerId` | `PayPro__DefaultBillerId` | `3223` | *Assigned Merchant Biller ID* |
| `PayPro:MerchantBillerId` | `PayPro__MerchantBillerId` | `3223` | *Assigned Merchant Biller ID* |

---

## 4. Webhook & IPN Setup (UIS - Universal Interface Switch)

PayPro sends server-to-server payment notifications (Instant Payment Notifications) when an attendee pays via 1Link ATM, OTC cash at a bank counter, or an external mobile banking app.

### Endpoint URL:
```
POST https://api.eventland.pk/paypro/uis
```

### Action Required with PayPro Account Representative:
Provide your PayPro Technical Account Manager with your IPN endpoint URL:
- **IPN URL:** `https://<YOUR_BACKEND_DOMAIN>/paypro/uis`
- **Method:** `POST`
- **Content-Type:** `application/json`

### Redundancy & Idempotency:
EventLand's `PayProService.cs` implements strict idempotency guards:
1. `ApplySuccessfulPaymentAsync` checks if the booking is already in `PaymentStatus.Paid`.
2. Duplicate webhooks or concurrent browser redirects will **never** generate duplicate tickets or re-send duplicate confirmation emails.
3. If an attendee pays and returns to the browser before the IPN fires, the browser reconciliation endpoint (`/api/payments/paypro-return`) verifies live with PayPro and issues tickets immediately without waiting for the webhook.

---

## 5. Security & Reliability Highlights

1. **Decoupled Public Receipt API (`/api/payments/paypro-return`):**
   - Attendees returning from external bank gateways do not require active JWT authentication.
   - PII is masked (e.g. `fa**********@example.com`).
   - Endpoint is protected by an ASP.NET Core Token Bucket Rate Limiter (`paypro-return` policy: 60 requests/minute, QueueLimit: 5).
2. **Pakistani Phone Number Normalization:**
   - PayPro strictly requires standard Pakistani mobile numbers starting with `03` (11 digits).
   - `PayProClient.cs` automatically normalizes `+923001234567`, `923001234567`, `03001234567`, and `3001234567` into `03001234567`.
3. **Cross-Tab & Crash Recovery:**
   - `CheckoutModal.jsx` records `last_order_number`, `last_booking_ref`, and `last_event_title` in browser `localStorage`.
   - If a browser tab is accidentally closed or mobile browser memory terminates the tab during payment on the bank app, navigating back to `/payment-return` automatically retrieves and validates the active order.
4. **Zero-Mock Production Guard:**
   - All mock simulation links (`/invoice/PP-...`) have been purged from the core payment services.
   - All orders route through genuine PayPro Click2Pay endpoints.

---

## 6. Pre-Launch Deployment Checklist

- [ ] Execute PayPro contract and obtain production merchant credentials (`ClientId`, `ClientSecret`, `Username`, `Password`, `MerchantBillerId`).
- [ ] Configure production environment variables in host (`PayPro__BaseUrl`, `PayPro__ClientId`, `PayPro__ReturnUrl`, etc.).
- [ ] Provide PayPro integration team with production IPN URL: `https://<domain>/paypro/uis`.
- [ ] Verify SSL certificate on production domain (PayPro blocks non-HTTPS webhook callbacks in production).
- [ ] Perform live end-to-end test with a PKR 10 transaction using a personal debit card.
- [ ] Confirm automatic ticket generation, QR code rendering, and email dispatch.
- [ ] Void or refund test transaction in the PayPro Merchant Portal.
