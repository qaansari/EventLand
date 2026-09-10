# EventLand Project Memory & Developer Documentation

## Overview
**EventLand** is a modern, high-performance event ticketing and management application designed for Pakistan's event ecosystem. It enables customers to discover events, select interactive seats or categorized ticket tiers, place 30-minute holds on tickets/seats, and complete payments via direct manual bank transfer. Monitoring admins and super admins review bank transfer proofs, confirm bookings, and issue digital E-Tickets with QR codes.

---

## Technical Stack

### Backend
- **Framework**: .NET 10 Web API (`backend/src/EventLand.Api`)
- **Architecture**: Clean / Layered Architecture (`Api` → `Infrastructure` → `Application` → `Domain`)
- **Database**: Microsoft SQL Server with Entity Framework Core 10 (Code-First)
- **Caching & Real-Time Locks**: Redis (`StackExchange.Redis`) with fallback to in-process `IMemoryCache`
- **Real-Time Communication**: ASP.NET Core SignalR (`/hubs/seating`) for live seat reservation broadcasts
- **Authentication**: JWT Bearer Authentication with ASP.NET Core Identity PasswordHasher
- **Image Processing**: SkiaSharp (free, cross-platform image compression for uploads > 1 MB)

### Frontend
- **Framework**: React 18 + Vite (`frontend/`)
- **Styling**: Vanilla CSS with modern Glassmorphism, CSS variables, dark mode aesthetics, and responsive dynamic layouts
- **Icons**: Lucide React icons
- **State & SignalR**: SignalR `@microsoft/signalr` client for real-time seat lock synchronization across browsers

---

## Key Domain Workflows & Business Rules

### 1. Direct Bank Transfer Payment Workflow
1. **Seat/Tier Selection**: Customer selects seats or ticket tier for an event.
2. **Booking & Seat Hold**:
   - Creating a booking issues a unique `EVL-XXXXXX` reference code.
   - The seats/tickets are locked in the DB and held for exactly **30 minutes** (`PaymentExpiresAt`).
   - Ephemeral locks in Redis are released once the DB transaction commits.
3. **Customer Transfer & Proof Submission**:
   - Checkout displays verified Bank Account details (Bank Name, Account Title, Account Number, IBAN, Branch Code, QR Code).
   - Customer completes bank transfer and submits `BankTransactionRef` and optional `PaymentProofUrl`.
   - Booking status changes to `PendingVerification`.
4. **Admin Manual Verification & Ticket Issuance**:
   - Super Admin or Admin verifies the transfer in the Admin Dashboard (`Unpaid Payment Invoices` modal / `Bookings` section).
   - Upon confirmation:
     - Booking status updates to `Paid` / `Confirmed`.
     - Seat status permanently changes from `Reserved` to `Booked`.
     - Confirmation email with E-Ticket pass is dispatched.
     - WhatsApp share link is generated.
   - If rejected, held seats are returned to `Available` pool and `SoldCount` is decremented.

### 2. Autonomous 30-Minute Hold Expiry (`PendingBookingExpiryService`)
- A background worker (`PendingBookingExpiryService`) runs every 60 seconds.
- Queries `Bookings` where `PaymentStatus == Pending` and `PaymentExpiresAt <= UtcNow`.
- Batches processing (200 records/tick) to prevent memory spikes.
- Marks expired bookings as `Expired` / `Cancelled`, decrements `SoldCount`, and returns seats to `Available` status.
- `BankAccountsController.GetActiveBankAccount` is annotated with `[AllowAnonymous]` so both guests and logged-in customers can fetch active bank details on checkout.
- `DataSeeder.cs` seeds an initial active Bank Account record into the `BankAccounts` table if empty.
- `CheckoutModal.jsx` imports `getQrCodeImageUrl` from `api.js` and fetches active bank details directly from `BankAccounts` DB table (`/api/bank-accounts/active`), displaying `qrCodeImageUrl` (e.g., United Bank Limited / active bank QR code) directly on the customer checkout page with fallbacks.
- `CheckoutModal.jsx`, `Booking.cs`, `BookingService.cs`, and `AdminDashboard.jsx` support an alternative payment proof verification fallback (`SenderAccountTitle`, `SenderBankName`, `SenderAccountLast4`) for customers whose bank apps enforce screenshot blocks (e.g. Standard Chartered).
- Event Detail pages use SEO URL Slugs (`/event/atif-aslam-live-in-concert-12`) via `toEventSlug` and `GetEventByIdentifierAsync`, completely hiding raw database numeric IDs from the frontend browser address bar.
- Web app is 100% SEO-friendly with Canonical links, OpenGraph, Twitter Cards, dynamic Schema.org Event & Organization JSON-LD rich snippets (`EventDetailPage.jsx`), semantic `<article>` tags (`EventCard.jsx`), and backend dynamic `/sitemap.xml` & `/robots.txt` endpoints (`SeoController.cs`).
- Vercel frontend (`https://eventland-qamar-ansari.vercel.app`) & Ngrok backend (`https://celiac-briley-commandingly.ngrok-free.dev`) connectivity configured with `isProductionDomain` failsafe in `api.js` (overriding any `localhost` env vars when deployed on Vercel), `ngrok-skip-browser-warning` header, `Accept: application/json`, top-level `UseCors` preflight middleware (`Program.cs`), and robust `Array.isArray(resEvents)` handling in `App.jsx`.

### 3. Bank Maintenance & Downtime Notice Guard
- Super Admin can set maintenance details on the active bank account: `MaintenanceNotice`, `MaintenanceStartUtc`, `MaintenanceEndUtc`, or force `IsMaintenanceMode`.
- Computed property `IsUnderMaintenance` evaluates active status dynamically.
- `InteractiveSeatPicker` and `CheckoutModal` enforce seat selection lockouts and display advisory banners when maintenance is active.

---

## Database Schema & Migrations

- **Database Migrations**:
  - `20260909105956_InitialCreate`: Consolidated baseline schema migration.
  - `20260910063614_AddTicketTierEventShowIndex`: Performance indexes including composite index on `TicketTiers(EventId, EventShowId)`.
- **Database Index Optimizations**:
  - `Events`: Composite index on `(IsPublished, IsDeleted, StartDateUtc)` for fast public listing and date-range queries.
  - `Users`: Unique index on `Email` to guarantee identity uniqueness and optimize login lookups.
  - `TicketTiers`: Composite index on `(EventId, EventShowId)` optimizing tier queries partitioned by specific show dates.
- **Primary Key Convention**: All domain entities inherit from `BaseEntity` with 4-digit integer IDs seeded at `1000`.
- **Soft Delete**: Global EF Core Query Filter (`!IsDeleted`) automatically applied to all entities inheriting `BaseEntity`.
- **Audit Fields**: `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsDeleted`, `DeletedAt` are auto-populated in `ApplicationDbContext.SaveChangesAsync()`.
- **Key Entities**:
  - `User`, `Role`
  - `Event`, `EventShow`, `Organizer`, `TicketTier`
  - `Venue`, `Auditorium`, `City`, `Country`
  - `SeatingZone`, `Seat`, `BookingSeat`, `Booking`
  - `BankAccount`, `RefundRecord`, `Tag`, `EventTag`, `Faq`, `FooterInfo`

---

## Security Hardening & Optimizations

1. **Authentication & Role Authorization**:
   - Public bank endpoints return safe projections without admin internal operational metadata.
   - Bank details and payment status checks are guarded with `[Authorize]` and ownership verification.
   - Admin endpoints use normalized PascalCase role policies: `[Authorize(Roles = "SuperAdmin,Admin")]`.
   - SuperAdmin default fallback credentials contain production-environment detection and high-severity security warnings.
   - Account lockout enforcement: 5 consecutive failed login attempts trigger a 15-minute temporary account lockout (`AccessFailedCount`, `LockoutEndUtc`) with clear remaining attempt feedback.
   - Organizer IDOR / BOLA defenses: Organizers are strictly constrained to viewing, updating, and managing their own events and bookings. Organizers cannot delete bookings or alter events of other organizers.
   - Country and City creation restricted to SuperAdmin and Admin.
   - Claims-bound email validation in `SeatHoldController` prevents client payload identity spoofing.
2. **XSS & Image Upload Protection**:
   - Email notifications encode user-controlled text using `HttpUtility.HtmlEncode`.
   - Security headers middleware enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `Cross-Origin-Resource-Policy: cross-origin`, and strict CSP headers.
   - Kestrel server banner suppression (`AddServerHeader = false`) and 30 MB maximum request body limits.
   - `UploadController` enforces role-scoped uploads: Customers can only upload payment slips (`type=slip`) and avatars (`type=user`). Bank QR codes require Admin; event banners, logos, and artist photos require Organizer/Admin.
   - Injected `ILogger<UploadController>` records structured warnings if physical file deletion fails on disk.
   - Rate limiting on file uploads (20 req/min) prevents storage exhaustion attacks.
   - Matching query filters on `BookingSeat` and `EventTag` join entities resolve EF Core model validation warnings.
   - User Registration (`AuthService`), Self-Registration Modal (`AuthModal.jsx`), and Admin User Management (`AdminService` & `AdminDashboard.jsx`) strictly enforce unique Email and unique Phone Number validations on both backend database (`IX_Users_Email`, `IX_Users_PhoneNumber`) and frontend UI forms.
3. **Frontend Session Integrity & Route Guards**:
   - Initial app load verifies stored JWT session with `/api/auth/me`. Tampered or expired sessions are cleanly flushed.
   - Reusable auth module (`frontend/src/utils/auth.js`) centralizes session storage (`getStoredToken`, `setStoredSession`, `clearStoredSession`), role normalization (`normalizeRole`), and boolean access checks (`isAdmin`, `isOrganizer`).
   - Direct `localStorage` calls in file uploads refactored to centralized `getStoredToken()`.
   - Dynamic host resolution in `api.js` replacing hardcoded ngrok fallbacks; query string parameters (such as customer emails) are sanitized with `encodeURIComponent`.
   - Automatic 401 interception in `api.js` clears zombie localStorage tokens and dispatches an auth-expired event.
   - Frontend route guards enforce role permissions on `admin` and `organizer` views.
   - Interactive password strength criteria indicators in `AuthModal.jsx` guide users to meet the 10+ character complexity rules on signup.
   - Vite dev proxy target reads from `.env.local` / `VITE_BACKEND_URL` dynamically.
4. **Code Reusability, Scalability & Architecture**:
   - **Global Exception Middleware Ordering**: Moved `app.UseCustomExceptionHandler()` before `app.UseRouting()` in `Program.cs` to ensure uniform JSON responses for routing and endpoint pipeline exceptions.
   - **Null Reference Guards**: Added null-safe navigation and fallbacks for `bs.Seat` in `AdminService.MapBookingToDto` and `ev.Organizer` in `AdminService.GetEventDetailDtoAsync`.
   - **Booking Reference Generation Guard**: Capped reference generation attempts (`maxAttempts = 10`) in `BookingService.cs` to eliminate infinite recursion/loop risk under concurrency.
   - **Clean Architecture Compliance**: `PaymentController` injects `IApplicationDbContext` rather than concrete `ApplicationDbContext`.
   - **Parallel Redis Invalidation**: `RemoveByPrefixAsync` parallelizes key deletions across clusters via `Task.WhenAll`.
   - **Batch Seat Release in Background Expiry**: `PendingBookingExpiryService` groups expired seats by `EventId` and fires consolidated notifications, avoiding broadcast stampedes.
   - **Database Round-Trip Minimization**: Show synchronization in `AdminService.UpdateEventAsync` batches show updates into a single `SaveChangesAsync()` call.
   - **Sargable Query Optimization**: `BookingService.GetBookingsByEmailAsync` leverages EF Core case-insensitive comparisons instead of non-sargable LINQ `.ToLower()` calls.
   - Single-query SQL-level authorization scoping: `IAdminService` methods (`UpdateEventAsync`, `DeleteEventAsync`, `GetBookingByIdAsync`, `UpdateBookingStatusAsync`) accept optional `int? organizerId = null`, eliminating redundant DB queries and cutting database round-trips by 50% for organizer actions.
   - Matching soft-delete query filters on `BookingSeat` (`!bs.Booking.IsDeleted`) and `EventTag` (`!et.Event.IsDeleted`) prevent orphaned joins and eliminate EF Core navigation warnings.

---

## Deployment & Hosting Architecture

### Windows Server 2022 VPS Recommendation (HosterPK)
- **Documented in**: `vps_hosting_recommendation.html` & `EventLand_Windows_VPS_Hosting_Recommendation.pdf`.
- **Recommended Plan**: **Standard VPS (4 vCPU, 8 GB RAM, 100 GB NVMe)**.
- **Components Co-hosted**:
  - IIS 10 + ASP.NET Core Hosting Bundle (.NET 10).
  - SQL Server Express / Developer (capped at 1.4 GB RAM for Express, or 4 GB instance cap).
  - Memurai / Redis for Windows (512 MB memory limit).
  - React SPA served as pre-built static assets via IIS URL Rewrite or reverse-proxied.
  - Automatic Let's Encrypt SSL via Win-ACME.

---

## Developer Commands & Verification

### Run Backend Locally
```powershell
cd d:\EventLand\backend\src\EventLand.Api
dotnet run
```

### Build Check (Backend & Frontend)
```powershell
# Backend Solution (.NET 10)
dotnet build d:\EventLand\backend\EventLand.slnx

# Frontend Production Build (React + Vite)
cd d:\EventLand\frontend
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
*Last Updated: September 2026 (Full-Stack Security Hardening, Database Indexes, Performance Optimization, Reusable Architecture & VPS Hosting Guide Completed)*

