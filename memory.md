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
- Vercel frontend (`https://eventland-eblm0be23-qamar-ansari.vercel.app`) & Ngrok backend (`https://celiac-briley-commandingly.ngrok-free.dev`) connectivity configured with `ngrok-skip-browser-warning` header (`api.js`) and `SetIsOriginAllowed(_ => true)` CORS policy (`Program.cs`).

### 3. Bank Maintenance & Downtime Notice Guard
- Super Admin can set maintenance details on the active bank account: `MaintenanceNotice`, `MaintenanceStartUtc`, `MaintenanceEndUtc`, or force `IsMaintenanceMode`.
- Computed property `IsUnderMaintenance` evaluates active status dynamically.
- `InteractiveSeatPicker` and `CheckoutModal` enforce seat selection lockouts and display advisory banners when maintenance is active.

---

## Database Schema & Migrations

- **Consolidated Migration**: The entire database schema is represented by a single clean migration: `20260901072315_InitialCreate`.
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
   - Admin endpoints use normalized role policies: `[Authorize(Roles = "SuperAdmin,Admin")]`.
2. **XSS & Image Upload Protection**:
   - Email notifications encode user-controlled text using `HttpUtility.HtmlEncode`.
   - Security headers middleware enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and strict CSP headers.
   - `UploadController` enforces image magic-byte header validation (JPEG, PNG, WebP), file size limits, and path traversal sanitization.
   - User Registration (`AuthService`), Self-Registration Modal (`AuthModal.jsx`), and Admin User Management (`AdminService` & `AdminDashboard.jsx`) strictly enforce unique Email and unique Phone Number validations on both backend database (`IX_Users_Email`, `IX_Users_PhoneNumber`) and frontend UI forms.
   - Bank Account QR code images are resolved via `getQrCodeImageUrl` and displayed in a scannable right-aligned side-by-side card preview box in the Super Admin Bank Accounts console and the customer Checkout Modal.
3. **Database Indexing & Latency Optimizations**:
   - Composite index on `(PaymentStatus, PaymentExpiresAt)` optimizes the 60-second expiry background service worker.
   - Composite index on `(EventId, Status)` speeds up event seat map queries.
   - Streamlined query projections in `EventService` by eliminating redundant `.Include()` chains prior to `.Select()`.
   - Fixed missing `.ThenInclude(e => e.Venue)` in `BookingService` queries to ensure venue names populate accurately in booking DTOs.
   - Batch-processed database operations in `AdminService` to eliminate N+1 `SaveChangesAsync()` calls inside loops.
   - Applied Redis/Memory caching for high-traffic public lookup endpoints (`/api/faqs`, `/api/footer`).
   - Decimal precision explicitly set to `(18, 2)` across all monetary fields.
4. **Environment Isolation & Rate Limiting**:
   - Swagger UI is strictly guarded behind `builder.Environment.IsDevelopment()`.
   - Rate limiting policies (`login` window: 10 req/min, `general`: 100 req/min, global per-IP fallback).

---

## Developer Commands & Verification

### Run Backend Locally
```powershell
cd d:\EventLand\backend\src\EventLand.Api
dotnet run
```

### Build Check (Backend & Frontend)
```powershell
# Backend
dotnet build d:\EventLand\backend\src\EventLand.Api

# Frontend
cd d:\EventLand\frontend
npx vite build
```

### Database Migration Update
```powershell
dotnet ef database update --project backend/src/EventLand.Infrastructure --startup-project backend/src/EventLand.Api
```

---
*Last Updated: September 2026 (System-wide Optimization & Latency Hardening Completed)*
