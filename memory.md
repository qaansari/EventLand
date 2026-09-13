# EventLand Project Memory & Developer Documentation

## Overview
**EventLand** is a modern, high-performance event ticketing and management application designed for Pakistan's event ecosystem. It enables customers to discover events, select interactive seats or categorized ticket tiers, place 30-minute holds on tickets/seats, and complete payments via direct manual bank transfer or online payment gateway (PayPro). Monitoring admins and super admins review bank transfer proofs, confirm bookings, and issue digital E-Tickets with QR codes.

---

## Technical Stack

### Backend
- **Framework**: .NET 10 Web API (`backend/src/EventLand.Api`)
- **Architecture**: Clean / Layered Architecture (`Api` → `Infrastructure` → `Application` → `Domain`)
- **Database**: Microsoft SQL Server with Entity Framework Core 10 (Code-First)
- **Caching & Real-Time Locks**: Redis (`StackExchange.Redis`) with fallback to in-process `IMemoryCache`
- **Real-Time Communication**: ASP.NET Core SignalR (`/hubs/seating`) for live seat reservation broadcasts
- **Authentication**: JWT Bearer Authentication with ASP.NET Core Identity PasswordHasher
- **Bot Defense & Captcha**: Cloudflare Turnstile & Google reCAPTCHA server-side validation (`ICaptchaService`, `TurnstileService`)
- **Image Processing & Sanitization**: SkiaSharp (clean raster pixel re-encoding for all uploads, stripping malicious metadata/polyglots)

### Frontend
- **Framework**: React 18 + Vite (`frontend/`)
- **Styling**: Vanilla CSS with modern Glassmorphism, CSS variables, dark mode aesthetics, and responsive dynamic layouts
- **Icons**: Lucide React icons
- **State & SignalR**: SignalR `@microsoft/signalr` client for real-time seat lock synchronization across browsers
- **Bot Defense**: `@marsidev/react-turnstile` Cloudflare Turnstile widget on landing page

---

## Key Domain Workflows & Business Rules

### 1. Dual Payment Gateway & Direct Bank Transfer Workflows

#### A. PayPro 1Pay Instant Online Gateway Integration
1. **Payment Channel Selection**: Customer selects **PayPro Online Gateway ⚡** on `CheckoutModal.jsx` and chooses channel (`easypaisa_jazzcash` for 1Pay Portal/Cards/Wallets or `qr_code` for Dynamic Banking App QR Code).
2. **Invoice Generation**: Clicking proceed invokes `POST /api/payments/paypro/checkout` via `paymentsApi.initiatePayProCheckout` in `api.js`.
3. **PayPro Service & API Execution**: Backend `PayProService.cs` connects to PayPro API (`https://demoapi.paypro.com.pk`) to generate a unique **PayPro Consumer Voucher / OTC Number** and 1Pay portal URL (`connectUrl`).
4. **Instant Online Payment & IPN Webhook**:
   - Checkout modal displays the Consumer Voucher Number (with 1-click copy) and a direct **Pay Online via PayPro 1Pay** button opening `connectUrl`.
   - Customer pays via JazzCash app, EasyPaisa app, 1Link ATM, or Debit/Credit Card.
   - PayPro IPN Webhook (`POST /api/payments/paypro-ipn`) receives payment callback, validates signatures server-side, automatically updates booking status to `Paid`/`Confirmed`, permanently marks seats as `Booked`, and issues digital E-Ticket with QR code.

#### B. Direct Bank Transfer Payment Workflow
1. **Seat/Tier Selection**: Customer selects seats or ticket tier for an event.
2. **Booking & Seat Hold**:
   - Creating a booking issues a unique `EVL-XXXXXX` reference code.
   - The seats/tickets are locked in the DB and held for exactly **30 minutes** (`PaymentExpiresAt`).
   - Ephemeral locks in Redis are released once the DB transaction commits.
3. **Customer Transfer & Proof Submission**:
   - Checkout displays verified Bank Account details (Bank Name, Account Title, Account Number, IBAN, Branch Code, QR Code).
   - Customer completes bank transfer and submits `BankTransactionRef` and optional `PaymentProofUrl` OR alternative sender fields (`SenderAccountTitle`, `SenderBankName`, `SenderAccountLast4`).
   - Booking status changes to `PendingVerification`.
4. **Admin Manual Verification & Ticket Issuance**:
   - Super Admin or Admin verifies the transfer in the Admin Dashboard (`Unpaid Payment Invoices` modal / `Bookings` section).
   - Upon confirmation:
     - Booking status updates to `Paid` / `Confirmed`.
     - Seat status permanently changes from `Reserved` to `Booked`.
     - Confirmation email with E-Ticket pass is dispatched in background.
     - WhatsApp share link is generated.
   - If rejected, held seats are returned to `Available` pool and `SoldCount` is decremented.

### 2. Autonomous 30-Minute Hold Expiry (`PendingBookingExpiryService`)
- A background worker (`PendingBookingExpiryService`) runs every 60 seconds.
- Queries `Bookings` where `PaymentStatus == Pending` and `PaymentExpiresAt <= UtcNow` utilizing the composite index `IX_Bookings_PaymentStatus_PaymentExpiresAt`.
- Batches processing (200 records/tick) to prevent memory spikes.
- Marks expired bookings as `Expired` / `Cancelled`, decrements `SoldCount`, and returns seats to `Available` status.
- Groups seats by `EventId` using `TryGetValue` for single-batch Redis cache invalidation.

### 3. Bank Maintenance & Downtime Notice Guard
- Super Admin can set maintenance details on the active bank account: `MaintenanceNotice`, `MaintenanceStartUtc`, `MaintenanceEndUtc`, or force `IsMaintenanceMode`.
- Computed property `IsUnderMaintenance` evaluates active status dynamically.
- `InteractiveSeatPicker` and `CheckoutModal` enforce seat selection lockouts and display advisory banners when maintenance is active.

---

## Database Schema & Migrations

- **Database Migrations**:
  - `20260909105956_InitialCreate`: Consolidated baseline schema migration.
  - `20260910063614_AddTicketTierEventShowIndex`: Performance indexes including composite index on `TicketTiers(EventId, EventShowId)`.
- **Database Performance & Composite Indexing**:
  - `Bookings`:
    - `IX_Bookings_BookingRef`: Unique index on reference codes.
    - `IX_Bookings_CustomerEmail`: Direct email lookup index.
    - `IX_Bookings_CreatedAt`: High-performance index for admin sorting by creation timestamp.
    - `IX_Bookings_PaymentStatus_PaymentExpiresAt`: Composite index for the background expiry worker.
    - `IX_Bookings_EventId_Status`: Composite index for event booking state filtering.
  - `Events`:
    - `IX_Events_OrganizerId`: Fast join index for admin/organizer dashboards.
    - `IX_Events_Published_City_Date`: Composite index covering public multi-filter queries (`IsPublished, CityId, StartDateUtc`).
    - `IX_Events_Published_Date`: Index covering global published date ranges.
    - `IX_Events_IsFeatured`: Fast filter index for homepage hero slider queries.
  - `Tags`: `IX_Tags_Slug`: Unique index for tag route lookup.
  - `Seats`: `IX_Seats_Zone_Row_Col` (unique) & `IX_Seats_ZoneId_Status`.
  - `Users`: Unique index on `Email` and `PhoneNumber`.
- **Primary Key Convention**: All domain entities inherit from `BaseEntity<int>` (or `BaseEntity<TKey>`).
- **Zero-Reflection Auditing**: `BaseEntity<TKey>` implements the typed `IAuditableEntity` interface (`CreatedAt`, `UpdatedAt`, `IsDeleted`, `DeletedAt`). `ApplicationDbContext.SaveChangesAsync()` updates timestamps and soft-delete states with zero runtime reflection overhead.
- **Soft Delete**: Global EF Core Query Filter (`!IsDeleted`) automatically applied to all entities.

---

## Security Hardening & Threat Prevention

### 1. Virus, Malware & Malicious Upload Defense
- **Executable & Script Signature Scanning** (`UploadController.cs`):
  - Stream header inspection for PE executables (`MZ`), Linux ELF binaries (`\x7fELF`), and script signatures (`<?php`, `<script`, `<%`, `eval(`, `base64_decode(`, `system(`, `passthru(`). Disguised polyglots are rejected immediately.
- **Mandatory Pixel Sanitization (Zero Raw Copy)**:
  - All uploads are decoded into an in-memory `SKBitmap` and re-encoded into pure raster pixels (JPEG/WebP/PNG).
  - Stream fallback copying (`file.CopyToAsync()`) is eliminated: if decoding fails, the file is rejected with `400 Bad Request`.
  - Strips all executable steganography, embedded PHP web shells, malicious EXIF metadata, and corrupt chunk exploits.
- **Image Decompression Bomb Protection**: Enforces strict pixel dimension caps (maximum 4096 × 4096 px) before full decoding into memory to stop RAM exhaustion DoS attacks.
- **Path Traversal & Filename Sanitization**:
  - Uploaded files receive cryptographically random GUID-based names (`Guid.NewGuid().ToString("N")[..8]`).
  - Strict allowlisted folder paths (`assets/images/events`, `slips`, `qr_codes`, `organizers`, `users`).
  - Path traversal characters (`..`, `/`, `\`) in names or types are rejected.
- **Hardened Static File Serving**: Static files in `wwwroot` are served with `X-Content-Type-Options: nosniff` and client/CDN caching headers (`public,max-age=604800,immutable`).

### 2. Bot Defense & Production-Grade Rate Limiting
- **Global Application-Wide CAPTCHA / Cloudflare Turnstile Verification**:
  - **Auto-Hide Across Entire Application**: Once a user successfully passes a CAPTCHA challenge anywhere in the app (homepage security banner, authentication sign-in/sign-up modal, or newsletter subscription in footer), the challenge is permanently hidden across the entire application for the active session.
  - **State Persistence & Event Bus** (`frontend/src/utils/captcha.js`):
    - Stores verification state and token in `sessionStorage` (`eventland_captcha_verified = 'true'`, `eventland_captcha_token`).
    - Dispatches an application-wide custom window event (`eventland:captcha-verified` and `eventland:captcha-reset`) so all active components (`App.jsx`, `AuthModal.jsx`, `Footer.jsx`, `CloudflareTurnstile.jsx`) synchronize instantly.
  - **Clean Component Unmounting** (`CloudflareTurnstile.jsx`):
    - When `verified` is true (either on mount via `isCaptchaVerified()` or upon completing the challenge), the component returns `null`, removing the widget DOM tree.
    - Outer challenge containers (such as the homepage security card banner in `App.jsx`) evaluate `!isCaptchaVerified()` and unmount immediately.
  - **Backend Validation**:
    - Backend `TurnstileService` implements `ICaptchaService`, checking token validity with Cloudflare's challenge verification API (`/api/captcha/verify`).
- **Per-Client-IP Partitioned Rate Limiting** (`Program.cs`):
  - Resolves client IP prioritizing `CF-Connecting-IP` (Cloudflare) -> `X-Forwarded-For` (first entry) -> `RemoteIpAddress`.
  - **Login Policy (`"login"`)**: 30 attempts/min per IP (stops credential stuffing without causing global user collisions).
  - **Booking Policy (`"booking"`)**: 30 requests/min per IP (blocks scalping/reservation bot floods).
  - **Upload Policy (`"upload"`)**: 20 uploads/min per IP.
  - **Global Fallback Policy**: 300 requests/min per IP.
  - Controllers use `[EnableRateLimiting("login")]` and `[EnableRateLimiting("booking")]`.

### 3. Anti-Hacker (OWASP Top 10) & Header Protections
- **SQL Injection Prevention**:
  - All queries in `EventService`, `BookingService`, `AuthService`, and `AdminService` use EF Core parameterized queries and index-sargable expressions (`EF.Functions.Like`).
  - String concatenation in SQL is strictly prohibited.
- **Content Security Policy & Clickjacking** (`SecurityHeadersMiddleware.cs`):
  - Whitelists Cloudflare Turnstile (`challenges.cloudflare.com`) and Google reCAPTCHA in `script-src` and `frame-src`.
  - Enforces `frame-ancestors 'none'` to eliminate iframe clickjacking.
  - Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- **IDOR / Object-Level Authorization**:
  - `BookingsController` (`GetBookingById`, `GetBookingByRef`, `GetBookingsByEmail`, `SubmitPaymentProof`) strictly verifies that the booking's email matches `User.GetEmail()` or the user has Admin privileges (`User.IsAdmin()`).
- **Clean Exception Handling** (`GlobalExceptionHandlerMiddleware.cs`):
  - Suppresses client disconnection exceptions (`OperationCanceledException`) so network drops do not pollute logs.
  - Maps `InvalidOperationException` to `400 BadRequest`.
  - Masks internal exception details/stack traces on 500 responses.

---

## Frontend Architecture & Optimizations

- **Vite & Clean CSS**:
  - Purged ~185 lines of leftover Vite boilerplate classes from `App.css`, retaining only clean toast notification styles.
- **Deduplication & DRY Helpers**:
  - Extracted centralized `mapBookingToTicket()` utility in `App.jsx` replacing 3 identical 25-line mapping blocks.
- **Database-Wide Search**:
  - Connected `debouncedSearch` to backend `eventsApi.getEvents({ search })` so typing in the search bar queries the entire database, not just currently loaded items.
- **Clean Production API Layer** (`api.js`):
  - Removed obsolete development headers (`ngrok-skip-browser-warning`).
  - Centralized host resolution and 401 session clearing.
- **Performance & Hardware Acceleration**:
  - Added `willChange: 'transform'` in `EventCard.jsx` for smooth 60fps card hover transitions.
  - Fallback `alt` text on event cards for accessibility and SEO.

---

## Developer Commands & Verification

### Run Backend Locally
```powershell
cd e:\EventLand\backend\src\EventLand.Api
dotnet run
```

### Build Check (Backend & Frontend)
```powershell
# Backend Solution (.NET 10)
dotnet build e:\EventLand\backend\EventLand.slnx

# Frontend Production Build (React + Vite)
cd e:\EventLand\frontend
npm run build
```

### Database Migration Commands
```powershell
# Add Migration
dotnet ef migrations add <MigrationName> --project backend/src/EventLand.Infrastructure --startup-project backend/src/EventLand.Api

# Update Database
dotnet ef database update --project backend/src/EventLand.Infrastructure --startup-project backend/src/EventLand.Api
```

---
*Last Updated: September 2026 (Modern Security Hardening: Anti-Virus/Malware Pixel Re-encoding, App-Wide Cloudflare Turnstile Auto-Hide, Per-IP Rate Limiting, Full-Stack Latency & Index Optimizations Completed)*
