# Backend Overhaul: Single Migration Consolidation, Missing Features, Optimization, Security Hardening & Fresh Rebuild

## 1. Executive Summary & Goals
This plan establishes an end-to-end modernization, consolidation, performance optimization, and security hardening of the entire EventLand backend (`backend/src/`).

### Target Objectives:
1. **Unified Single Baseline Migration:**
   - Consolidate all historical EF Core migrations (`20260923090046_InitialCreate`, `20260929054026_AddClosingMechanismsAndTierStatus`, and model snapshot) into a single, clean `InitialCreate` baseline migration.
2. **Complete Missing Features & Missing Entity Configurations:**
   - Implement explicit `IEntityTypeConfiguration<T>` configurations for the 7 unconfigured entities (`Auditorium`, `AuditoriumLayout`, `BankAccount`, `City`, `Country`, `Faq`, `Venue`), specifying bounded string lengths, foreign key constraints, cascade rules, and composite indexes.
   - Add secure Password Reset / Forgot Password flow in `AuthController` and `AuthService`.
   - Refactor `DataSeeder.cs` to eliminate duplicate `MigrateAsync()` invocations and ensure seamless idempotency.
3. **Code Reusability, Scalability & Performance Optimizations:**
   - Decompose the massive 2,000+ line `AdminService.cs` into clean, domain-specific modular services (`AdminLocationService`, `AdminEventService`, `AdminBookingService`, `AdminUserService`), preserving the facade for backward compatibility.
   - Enforce `.AsNoTracking()` across all read-only LINQ query pipelines.
   - Implement `.AsSplitQuery()` on multi-collection queries (`Shows`, `TicketTiers`, `SeatingZones`, `Seats`) to eliminate cartesian product penalties.
   - Introduce database indexes on hot query paths (Event status + dates, Booking reference + user, TicketTier show + status).
4. **Comprehensive Security & OWASP Hardening:**
   - Verify explicit authentication, authorization, and rate limiting (`[EnableRateLimiting]`) across all controller actions.
   - Audit PII exposure: Mask customer phone numbers and emails on public booking lookup responses.
   - Enforce timing-safe cryptographic comparisons (`CryptographicOperations.FixedTimeEquals`) across webhook verification and tokens.
   - Validate file uploads against path traversal, mime spoofing, and file size limits.
5. **Clean Unused Code & Remove Stale Images:**
   - Purge dead code, obsolete methods, and unreferenced using statements.
   - Delete all uploaded event and user images in `wwwroot/assets/images/events/*` and `wwwroot/assets/images/users/*`, keeping directory placeholders and seed branding (`org_eventland_01.png`).
6. **Fresh Database Rebuild & Verification:**
   - Drop the existing `EventLandDb` database completely (`dotnet ef database drop --force`).
   - Apply the single consolidated migration (`dotnet ef database update`).
   - Run seed scripts and verify all 93+ unit tests pass with zero errors.

---

## 2. Architecture & Design Decisions

### Decision 1: Explicit EF Core Configurations for All 24 Entities
- **Rationale:** Currently, 7 entities (`Auditorium`, `AuditoriumLayout`, `BankAccount`, `City`, `Country`, `Faq`, `Venue`) rely on EF Core defaults (`NVARCHAR(MAX)` for strings, missing indexes on foreign keys and lookups). Explicit configurations guarantee schema predictability, optimal SQL Server data types (`NVARCHAR(100)`, `NVARCHAR(20)` for phone/code), and index coverage for search queries.

### Decision 2: Modular Admin Service Decomposition
- **Rationale:** `AdminService.cs` currently handles 12+ aggregates in 2,000+ lines. We will decompose it into cohesive domain services (`AdminLocationService`, `AdminEventService`, `AdminBookingService`, `AdminUserService`), with `AdminService` acting as an orchestrating facade or delegating directly. This drastically improves unit testability, maintainability, and code readability without breaking any controller dependencies.

### Decision 3: Single Baseline Migration Strategy
- **Rationale:** Rather than carrying historical migrations and schema delta migrations during development, consolidating into a single `InitialCreate` baseline produces a clean, readable migration file reflecting the complete current state of the domain model, including ticket tier closing mechanisms, seat hold indexes, and all entity configurations.

### Decision 4: Safe Media Cleanup Policy
- **Rationale:** Delete only uploaded user profile pictures (`wwwroot/assets/images/users/*`) and event banners (`wwwroot/assets/images/events/*`). Do NOT touch `organizers/org_eventland_01.png` which is required for seed data. Keep directories so future uploads succeed without missing directory exceptions.

---

## 3. Phased Implementation Roadmap

```
Phase 1: Entity Configurations & Schema Modeling
├── Task 1.1: Create Missing Entity Configurations (Auditorium, Layout, BankAccount, City, Country, Faq, Venue)
├── Task 1.2: Add Performance Indexes & Decimal Precision Constraints
└── Task 1.3: Clean Database Seeding & Remove Redundant Migration Calls

Phase 2: Missing Features & Domain Gaps Completion
├── Task 2.1: Implement Password Reset / Forgot Password Workflow in AuthController & AuthService
├── Task 2.2: Add BankAccount Soft-Delete & Active Toggle Safeguards
└── Task 2.3: Implement Bulk Media Purge Utility for Admin

Phase 3: Code Reusability, Scalability & Optimization
├── Task 3.1: Decompose AdminService into Domain Aggregate Services
├── Task 3.2: Enforce AsNoTracking & AsSplitQuery Across Query Services
└── Task 3.3: Eliminate Dead & Unused Code Across the Backend

Phase 4: Security Hardening & PII Protection
├── Task 4.1: Controller Authorization & Rate Limiting Audit
├── Task 4.2: Mask PII on Public Endpoints & Timing-Safe Token Checks
└── Task 4.3: Upload Controller Path Traversal & Header Hardening

Phase 5: Media Purge (User & Event Images)
└── Task 5.1: Purge Uploaded Event & User Images from Disk

Phase 6: Migration Consolidation
├── Task 6.1: Remove Old Migrations & Snapshot
└── Task 6.2: Generate Consolidated InitialCreate Migration

Phase 7: Database Drop, Rebuild & Verification
├── Task 7.1: Drop Database EventLandDb & Apply Single Migration
├── Task 7.2: Verify Data Seeding & SuperAdmin Creation
└── Task 7.3: Run Full Unit Test Suite & API Smoke Test
```

---

## 4. Phase-by-Phase Task Breakdown & Technical Specifications

### Phase 1: Entity Configurations & Schema Modeling
- **Files Touched:**
  - `backend/src/EventLand.Domain/Entities/BankAccount.cs`
  - `backend/src/EventLand.Infrastructure/Persistence/Configurations/AuditoriumConfiguration.cs` (new)
  - `backend/src/EventLand.Infrastructure/Persistence/Configurations/AuditoriumLayoutConfiguration.cs` (new)
  - `backend/src/EventLand.Infrastructure/Persistence/Configurations/BankAccountConfiguration.cs` (new)
  - `backend/src/EventLand.Infrastructure/Persistence/Configurations/CityConfiguration.cs` (new)
  - `backend/src/EventLand.Infrastructure/Persistence/Configurations/CountryConfiguration.cs` (new)
  - `backend/src/EventLand.Infrastructure/Persistence/Configurations/FaqConfiguration.cs` (new)
  - `backend/src/EventLand.Infrastructure/Persistence/Configurations/VenueConfiguration.cs` (new)
  - `backend/src/EventLand.Infrastructure/Persistence/DataSeeder.cs`
- **Details:**
  - Add `IsEnabled` (`bool`, default `true`) property to `BankAccount` entity.
  - Standardize string column lengths (`HasMaxLength(100)` for titles/names, `HasMaxLength(50)` for codes/account numbers, `HasMaxLength(500)` for URLs/addresses).
  - Add relational indexes on foreign keys (`City.CountryId`, `Venue.CityId`, `Auditorium.VenueId`, `AuditoriumLayout.AuditoriumId`).
  - Add unique/lookup indexes on `Country.Code`, `BankAccount.AccountNumber`.
  - In `BankAccountConfiguration`, configure `builder.Property(b => b.IsEnabled).HasDefaultValue(true);`.
  - Remove duplicate `await context.Database.MigrateAsync()` inside `DataSeeder.cs`.

### Phase 2: Missing Features & Domain Gaps Completion
- **Files Touched:**
  - `backend/src/EventLand.Application/Dtos/BankAccountDtos.cs`
  - `backend/src/EventLand.Application/Interfaces/IBankAccountService.cs`
  - `backend/src/EventLand.Infrastructure/Services/BankAccountService.cs`
  - `backend/src/EventLand.Api/Controllers/BankAccountsController.cs`
  - `backend/src/EventLand.Api/Controllers/Admin/AdminBankAccountsController.cs`
  - `backend/src/EventLand.Application/Interfaces/IAuthService.cs`
  - `backend/src/EventLand.Infrastructure/Services/AuthService.cs`
  - `backend/src/EventLand.Api/Controllers/AuthController.cs`
  - `backend/src/EventLand.Application/Dtos/AuthDtos.cs`
- **Details:**
  - **BankAccount `IsEnabled` Visibility Gate**:
    - Update `BankAccountDto`, `CreateBankAccountDto`, and `UpdateBankAccountDto` with `bool IsEnabled`.
    - In `BankAccountService.GetActiveBankAccountAsync()`, filter by `b.IsEnabled && b.IsActive && !b.IsDeleted`. If `IsEnabled` is `false`, return `null`.
    - In `BankAccountsController.GetActiveBankAccount()`, return 404 when no enabled account exists. This ensures direct bank transfer details are cleanly hidden on the checkout page, interactive seat picker, and invoices modal when disabled by admin.
    - Add `ToggleEnabledAsync(int id)` in `IBankAccountService`, `BankAccountService`, and `AdminBankAccountsController` (`PUT /api/admin/bank-accounts/{id}/toggle-enabled`).
  - **Password Recovery**:
    - Add `ForgotPasswordAsync(string email)` and `ResetPasswordAsync(ResetPasswordDto dto)`.
    - Secure token generation using `RandomNumberGenerator` with cryptographic hashing and expiration window.
  - **BankAccount Operational Safeguards**:
    - Add soft-delete protection and active/enabled validation.

### Phase 3: Code Reusability, Scalability & Optimization
- **Files Touched:**
  - `backend/src/EventLand.Infrastructure/Services/AdminService.cs`
  - `backend/src/EventLand.Application/Services/BookingService.cs`
  - `backend/src/EventLand.Application/Services/EventService.cs`
  - `backend/src/EventLand.Infrastructure/Services/Admin/*`
- **Details:**
  - Split large queries in `EventService` and `BookingService` using `.AsSplitQuery()` where 2+ collection navigations are eagerly loaded (`Shows`, `TicketTiers`, `SeatingZones`, `Seats`).
  - Ensure all read queries without entity modification strictly call `.AsNoTracking()`.
  - Decompose `AdminService.cs` into modular components while keeping the public `IAdminService` interface fully satisfied.
  - Remove unused private methods, unreachable blocks, and unreferenced namespaces.

### Phase 4: Security Hardening & PII Protection
- **Files Touched:**
  - `backend/src/EventLand.Api/Controllers/BookingsController.cs`
  - `backend/src/EventLand.Api/Controllers/GateController.cs`
  - `backend/src/EventLand.Api/Controllers/PaymentController.cs`
  - `backend/src/EventLand.Api/Controllers/UploadController.cs`
  - `backend/src/EventLand.Application/Dtos/BookingDtos.cs`
- **Details:**
  - Ensure public lookup endpoints (such as checking booking by reference) mask sensitive PII (e.g. `jo***@gmail.com`, `+92-300-***1234`).
  - Review all controller endpoints for proper rate-limiting attributes (`[EnableRateLimiting]`).
  - Enforce path validation in `UploadController` using `Path.GetFileName` to prevent any directory traversal attacks (`../`).

### Phase 5: Media Purge (User & Event Images)
- **Files Touched:**
  - `backend/src/EventLand.Api/wwwroot/assets/images/events/*`
  - `backend/src/EventLand.Api/wwwroot/assets/images/users/*`
- **Details:**
  - Delete all files inside `events/` (7 files) and `users/` (5 files).
  - Preserve `organizers/org_eventland_01.png` and directory structure.

### Phase 6: Migration Consolidation
- **Files Touched:**
  - `backend/src/EventLand.Infrastructure/Migrations/*`
- **Details:**
  - Remove existing migration files and snapshot.
  - Generate clean consolidated migration:
    `dotnet ef migrations add InitialCreate --project backend/src/EventLand.Infrastructure/EventLand.Infrastructure.csproj --startup-project backend/src/EventLand.Api/EventLand.Api.csproj`.

### Phase 7: Database Drop, Rebuild & Verification
- **Commands / Execution:**
  - Stop running backend API daemon.
  - Drop existing database:
    `dotnet ef database drop --force --project backend/src/EventLand.Infrastructure/EventLand.Infrastructure.csproj --startup-project backend/src/EventLand.Api/EventLand.Api.csproj`.
  - Apply consolidated migration:
    `dotnet ef database update --project backend/src/EventLand.Infrastructure/EventLand.Infrastructure.csproj --startup-project backend/src/EventLand.Api/EventLand.Api.csproj`.
  - Start API and verify database tables, seed roles, super admin user, countries, cities, and payment configs.
  - Run full test suite: `dotnet test backend/tests/EventLand.UnitTests/EventLand.UnitTests.csproj`.

---

## 5. Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Database drop deletes development data | Medium | The user explicitly requested to drop and rebuild the database. Default data seeder will automatically re-populate SuperAdmin, Pakistan cities, and tags. |
| Process file lock during build or migration | Low | Gracefully stop running API daemon (`task-1785`) before building and running EF migrations. |
| Breaking frontend contract during admin decomposition | Low | Maintain the exact same `IAdminService` interface contracts and API controller route mappings. |
| Missing seed images after purge | Low | `org_eventland_01.png` is explicitly excluded from deletion. |

---

## 6. Definition of Done
- Single EF Core migration `InitialCreate` creates the entire schema cleanly.
- All 24 domain entities have explicit EF configurations.
- Missing features (Password reset, BankAccount guards, PII masking) are fully implemented.
- All event and user images are removed from disk; directory structure intact.
- Database `EventLandDb` dropped and freshly updated with seed data.
- All 93+ unit tests pass with zero failures.
- Backend builds with zero errors.
