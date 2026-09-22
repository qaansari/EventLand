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
- **CORS & Reverse Proxy Ingress Policy** (`Program.cs`, `api.js`):
  - Dynamic CORS Validator (`SetIsOriginAllowed`): Permits explicitly configured origins (`Cors:AllowedOrigins`), all Vercel deployments (`*.vercel.app` production and preview domains), localhost dev ports, and ngrok tunnels with full credential support for SignalR.
  - Ngrok Interstitial Bypass: `api.js` and SignalR connection include `'ngrok-skip-browser-warning': 'true'` to prevent free ngrok tunnels from intercepting API calls with HTML interstitial warning pages (`ERR_NGROK_6024`) that lack CORS headers.
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
  - Standardized `ngrok-skip-browser-warning` header on all API and multipart upload requests to prevent ngrok edge HTML interstitial blocks on remote deployments (e.g. Vercel).
  - Centralized host resolution and 401 session clearing.
- **Performance & Hardware Acceleration**:
  - Added `willChange: 'transform'` in `EventCard.jsx` for smooth 60fps card hover transitions.
  - Fallback `alt` text on event cards for accessibility and SEO.

- **Header Profile Image & Dynamic Avatar System**:
  - **Dynamic Image vs Avatar Fallback**: In the top navigation header (`Navbar.jsx`), the authenticated user profile badge inspects `currentUser.imageUrl || currentUser.avatar`. If a valid uploaded photo exists and loads, it renders the circular photo with role-colored borders (`#c084fc` for Admin, `#2dd4bf` for Organizer, `#34d399` for Customer). If no custom image is present or if loading fails (`onError`), it automatically falls back to an inline role-themed gradient avatar circle (`getInitials`) with zero layout shift or broken image icons.
  - **End-to-End Session & Auth Synchronization**:
    - `AuthModal.jsx`: Preserves `imageUrl` in `onLoginSuccess` payload for both sign-in and new user registration.
    - `App.jsx`: Retains `imageUrl` in `authApi.getMe()` JWT verification on app boot and subscribes to `eventland:user-updated` window events.
    - `AdminDashboard.jsx`: When a user (including Super Admin) edits their own account or uploads a new photo in the Users management tab, changes are instantly synced to `currentUser` and dispatched via `eventland:user-updated`, immediately updating the header badge.
    - `AttendeeDashboard.jsx`: Displays the user photo / avatar in the verified attendee portal welcome banner and profile tab.
    - `api.js`: `getUserImageUrl` supports external URLs (`http/https`), inline `data:`/`blob:` URLs, and relative `/assets/images/users/` paths across Vite dev-server proxy and production CDN hosting.

- **High-Definition Auditorium Seating Chart PDF Export System**:
  - **Direct PDF Download & Anti-Popup-Blocker Architecture** (`pdfChartExporter.js`):
    - Generates clean, high-contrast, pure-white background, single-page printable PDF seating charts matching real-world auditorium blueprints.
    - Employs direct dynamic imports of `html2canvas` and `jsPDF` on-demand (chunked into separate vendor bundle to preserve fast initial page load). Renders DOM elements to canvas via `html2canvas` at 2x scale and triggers an immediate client-side file download (`<Auditorium_Name>_Seating_Chart.pdf`).
    - Multi-point pixel sampling in `isCanvasBlank` detects actual dark pixels across top, middle, and bottom regions before creating the PDF; automatically triggers a hidden `iframe` print dialog fallback if blank canvas is detected.
    - Eliminates browser popup blocker interruptions previously caused by `window.open('', '_blank')` calls.
  - **Universal Zero-Trimming & Dynamic Scaling (10 to 10,000+ Seats)**:
    - **Proportional Column & Row Analysis**: Dynamically computes `maxColsInAnyRow`, `totalRowsCount`, and `maxAislesInAnyRow` across all sections and blocks.
    - **Auto-Calculated Seat Dimensions**:
      - Calculates available seating width within high-definition base canvas (`1600px`).
      - Caches dynamic `seatSizePx`: `20px` for small halls (10-30 cols), `12px-18px` for medium halls (40-70 cols), `8px-12px` for large auditoriums (70-130 cols), and `3.5px-8px` for mega stadiums / arena layouts (130-300+ cols up to 10,000+ seats).
      - If column count exceeds 300+, canvas width dynamically expands beyond `1600px` (`Math.max(1600, maxColsInAnyRow * 4.2 + 200)`), completely preventing seat truncation.
    - **Dual-Axis Fit (`Math.min(scaleX, scaleY)`)**:
      - `jsPDF` calculates both `scaleX = availWidth / canvas.width` and `scaleY = availHeight / canvas.height`.
      - Proportionally scales by `Math.min(scaleX, scaleY)` and centers with `xOffset` and `yOffset`, guaranteeing 100% visibility on any paper type (A4, US Letter, Legal, A3) with zero clipping on left, right, top, or bottom.
    - **Anti-Clipping html2canvas Capture**:
      - Passes explicit `windowWidth` and `windowHeight` matching `containerWidthPx + 60` and `renderedHeight + 60` to html2canvas, eliminating browser viewport clipping on laptops or small screens.
    - **Micro-Seat Optimization for Mega Venues**:
      - For venues with 10,000+ seats, micro-seat tiles automatically suppress text overflow when seat size is `< 5.5px`, maintaining clean architectural stadium masterplan visuals.
  - **Landscape Orientation & Multi-Paper Compatibility**:
    - Generates PDFs in **Landscape Orientation** (`orientation: 'landscape'`, format: `'a4'`, 297mm × 210mm) matching the natural wide aspect ratio of auditorium seat columns.
  - **Multi-Point Availability Across Application**:
    - `InteractiveSeatPicker.jsx`: "Download Chart (PDF)" button in the seat picker header with async `isExportingPdf` loading spinner, disabled state, and toast feedback.
    - `AdminDashboard.jsx`: Direct "Download PDF" button on every auditorium blueprint card in the Auditorium Charts tab, enabling 1-click exports without opening the preview modal.
    - `EventOrganizerWizard.jsx`: "Download Chart (PDF)" button upon selecting an auditorium blueprint during event creation, complete with async spinner and toast alerts.

### 8. App-Wide Disabled & In-Button Animated Spinner on Save / CRUD Operations
- **Core Standard**:
  - Every "Save", "Submit", or CRUD execution button across the entire application must be explicitly disabled (`disabled={isSaving || isSubmitting}`) throughout the asynchronous operation lifecycle.
  - While active, the button renders an animated spinning loader (`<RefreshCw className="animate-spin" />`) alongside contextual dynamic loading text directly **inside** the button (e.g., `"Saving Event..."`, `"Saving Organizer..."`, `"Publishing Event..."`, `"Processing Order..."`, `"Submitting Claim..."`).
  - The button styling applies `cursor: 'not-allowed'` and `opacity: 0.7 - 0.75` while disabled.
  - Handlers consistently implement `setIsSaving(true)` / `setIsSubmitting(true)` followed by a `try ... finally` block ensuring that the button is reliably re-enabled if errors occur or after completion.
- **Components Covered**:
  - `AdminDashboard.jsx`: All 14 CRUD save operations (Event, Organizer, Artist, Ticket Tier, User, Role, Tag, Auditorium Blueprint, Country, City, Venue, FAQ, Footer Info, Bank Account).
  - `AttendeeDashboard.jsx`: Profile preferences save button (`Saving Preferences...`), refund claim button (`Submitting Claim...`), and booking search button (`Searching...`).
  - `EventOrganizerWizard.jsx`: Live event publishing button (`Publishing Event...`).
  - `OrganizerDashboard.jsx`: Payout settlement request button (`Processing Settlement...`) and promo code creation button (`Creating Code...`).
  - `PayProAdminPanel.jsx`: Single consumer registration (`Registering...`), batch CSV import (`Processing...`), and order inspection query (`Querying...`).
  - `UnpaidInvoicesModal.jsx`: Bank transaction proof submission button (`Saving Proof...`).
  - `CheckoutModal.jsx`: PayPro gateway checkout initiation (`Connecting to PayPro Gateway...`), bank transfer order submission (`Processing Order...`), and status verification (`Verifying with PayPro...`).
  - `AuthModal.jsx`: User login and registration button (`Authenticating...`).
  - `ArtistBookings.jsx`: Artist management booking inquiry button (`Sending Inquiry...`).
  - `Footer.jsx`: Newsletter email subscription button (`animate-spin` icon).
  - `index.css`: Added global `@keyframes spin` and `.animate-spin` / `.spin-animation` utility classes (`animation: spin 0.8s linear infinite !important;`).

### 9. App-Wide Branded Preloader (Designed from Existing Logo)
- **Signature Visual Identity**:
  - Center emblem with radial ambient glow aura (`rgba(16, 185, 129, 0.35)` to `rgba(13, 148, 136, 0.15)`), dual counter-rotating orbit rings (outer conic/neon ring + inner dashed ring), and centered `/logo-icon.png` badge featuring gentle breathing pulse (`@keyframes preloaderLogoPulse`).
  - Stylized brand typography: `Event` in white + `Land` in emerald `#10b981` with neon text-shadow, paired with golden uppercase tagline `DISCOVER • BOOK • EXPERIENCE` (`#d9a05b`).
  - High-tech glowing progress energy bar (`@keyframes preloaderBeam`) and shimmering status message.
- **Implementations**:
  - **`index.html` Initial Boot Splash**: Embedded directly inside `<div id="root">` so visitors immediately see the logo preloader while JavaScript bundles download, eliminating any white or empty screen.
  - **`EventLandPreloader.jsx` Component**: Reusable component supporting `fullScreen`, `compact`, inline `minHeight`, and custom status text.
  - **`App.jsx`**: Integrated for `LazyFallback` on code-split views/modals and during initial event discovery (`loadingEvents`).
  - **`EventDetailPage.jsx`**: Displays during event and seating blueprint fetching.
  - **`ArtistBookings.jsx`**: Displays during artist roster fetching.
  - **`PayProReturnPage.jsx`**: Displays during 1Link / PayPro transaction verification.
  - **`PayProAdminPanel.jsx`**: Displays compact preloader during GPO report and consumer database queries.

### 10. Admin Role User Management & Roles Tab Access Restrictions (Fine-Grained RBAC)
- **Roles Tab Access Control**:
  - The Roles management tab button (`<ShieldCheck /> Roles`) is strictly restricted to `SuperAdmin`. Users with the `Admin` role cannot view or click the Roles tab.
  - Active tab auto-redirect: if a non-superadmin user navigates to or opens the roles tab, the dashboard automatically redirects to `'events'`.
  - Roles tab content (`activeAdminTab === 'roles'`) and Role creation/editing modal (`showRoleModal`) are gated with `isSuperAdmin &&`.
  - Backend `AdminRolesController.cs`: Role creation (`POST`), update (`PUT`), and deletion (`DELETE`) are strictly guarded with `[Authorize(Roles = "SuperAdmin,superadmin")]`.
- **Users Tab Visibility Filtering**:
  - In `AdminDashboard.jsx`, the Users tab table dynamically filters users so that `Admin` role users can only see `Organizer` and `Attendee` (Customer) accounts.
  - `Admin` and `SuperAdmin` accounts are completely excluded from the table view when viewed by an `Admin`.
  - The Users count badge in the navigation bar reflects visible users (`visibleUsersList.length`).
  - Backend `AdminUsersController.cs` & `AdminService.cs`: `GetUsersAsync` and `GetUserByIdAsync` inspect caller claims (`IsSuperAdmin()`) and filter out `Admin` and `SuperAdmin` accounts when called by an `Admin`.
- **Role Selection in User Create / Update Modal**:
  - When an `Admin` adds or updates a user, the Role dropdown (`SearchableSelect`) strictly offers **Organizer** and **Attendee** options only (Admin and SuperAdmin options are completely hidden).
  - When clicking "Create User Account", the default role is initialized to Organizer (ID 3) or Attendee (ID 4) rather than Admin (ID 2).
  - When saving (`handleSaveUser`), frontend validates that non-superadmins cannot assign role IDs 1 or 2.
- **Privilege Escalation & Modification Protection**:
  - In `AdminDashboard.jsx`, `handleEditUser` and `handleDeleteUser` block any attempt by an `Admin` to modify or delete an `Admin` or `SuperAdmin` account.
  - In `AdminService.cs`, `CreateUserAsync`, `UpdateUserAsync`, and `DeleteUserAsync` check `isSuperAdmin` and throw `UnauthorizedAccessException` (handled as HTTP 403 Forbidden by `AdminUsersController`) if an `Admin` attempts to create, modify, promote to, or delete an `Admin` or `SuperAdmin` account.
- **Session Role Fidelity**:
  - `auth.js` (`isSuperAdmin(user)`), `AuthModal.jsx`, and `App.jsx` preserve `rawRole` and `roleName` from JWT authentication so that `SuperAdmin` is never collapsed into a generic `admin` string.

### 14. Official E-Ticket PDF Export
- **Exact In-Browser Visual Fidelity**:
  - The exported PDF renders an exact 1:1 replica of the in-browser digital pass from `DigitalTicketModal.jsx`:
    - Luxury midnight dark gradient card (`linear-gradient(135deg, #10192d, #1a294a)`) with cyan dashed border (`2px dashed rgba(13, 148, 136, 0.45)`) and 20px rounded corners.
    - Brand header with EventLand logo, `EVENTLAND PAKISTAN` branding, VIP Category/Tier badge, and `CONFIRMED PASS` badge.
    - High-definition event banner image.
    - Prominent Show Date & Time highlight box (`📅 SHOW DATE & TIME` and `⏰ SHOW SLOT / TIME`).
    - Specifications grid (Pass Holder, Ticket Tier/Category, Reserved Seats, Total Paid in PKR, Booked At).
    - HD scannable QR Code pass on white card with verification status label.
    - Security verification barcode strip and ticket reference number.
- **Strict Ticket Number Filename**:
  - The downloaded filename strictly equals `${ticketNumber}.pdf` (e.g. `EVL-10023.pdf`, `EVL-100001.pdf`).
  - Leading hashes or illegal filename characters are sanitized.
- **Dual-Mode Export Mechanism (`ticketPdfExporter.js`)**:
  - **Live DOM Capture**: When exported from `DigitalTicketModal.jsx`, `html2canvas` directly captures `ticketCardRef.current` at high resolution (`scale: 2.5`), ensuring zero visual discrepancies.
  - **Headless Offscreen Mode**: When exported from table or card views in `AttendeeDashboard.jsx` or `AdminBookingsTab.jsx`, an offscreen element matching the exact pass structure and styles is mounted, rendered, and cleaned up automatically.
  - Both modes scale and center the rendered card proportionally onto an A4 portrait PDF with luxury midnight background (`#070c18`), downloading directly via `pdf.save(fileName)`.
- **Loading & Disabled States**:
  - `DigitalTicketModal.jsx`, `AttendeeDashboard.jsx`, and `AdminBookingsTab.jsx` provide disabled state and animated spinning loader (`<RefreshCw className="animate-spin" />`) during export.
  - Success toast displays `${fileName} downloaded successfully!`.

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
*Last Updated: September 2026 (Fine-Grained RBAC for Admin Role: Hidden Roles Tab, Attendee & Organizer Only Role Assignment, Admin/SuperAdmin Visibility Masking & Anti-Escalation Protection; App-Wide Branded Logo Preloader & Initial Splash Screen; App-Wide In-Button Animated Spinner & Disabled State on Save / CRUD Operations; Auditorium Seating Chart PDF Exporter with html2pdf & Anti-Popup-Blocker Fallback; Multi-Point Chart PDF Export; Header Dynamic User Image vs Role Avatar Fallback; Full-Stack Auth Image Sync; Anti-Virus/Malware Pixel Re-encoding; App-Wide Cloudflare Turnstile Auto-Hide; Dynamic CORS & Vercel/Ngrok Reverse-Proxy Ingress; Per-IP Rate Limiting; Full-Stack Latency & Index Optimizations Completed)*

