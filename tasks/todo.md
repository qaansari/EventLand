# Backend Overhaul Task List

## Phase 1: Entity Configurations & Schema Modeling
- [x] **Task 1.1: Create Missing Entity Configurations & Add BankAccount.IsEnabled**
  - Added `IsEnabled` (`bool`, default `true`) property to `BankAccount` entity.
  - Implemented `AuditoriumConfiguration`, `AuditoriumLayoutConfiguration`, `BankAccountConfiguration` (with `builder.Property(b => b.IsEnabled).HasDefaultValue(true)`), `CityConfiguration`, `CountryConfiguration`, `FaqConfiguration`, and `VenueConfiguration`.
  - Added bounded string lengths, foreign key constraints, and cascade delete rules.
- [x] **Task 1.2: Add Relational & Lookup Indexes**
  - Added indexes for `[City.CountryId]`, `[Venue.CityId]`, `[Auditorium.VenueId]`, `[AuditoriumLayout.AuditoriumId]`, and unique index on `[Country.Code]`.
- [x] **Task 1.3: Clean DataSeeder & Remove Redundant Migration Calls**
  - Removed duplicate `await context.Database.MigrateAsync()` in `DataSeeder.cs` to prevent double-migration on startup.

### Checkpoint: Phase 1 Complete
- [x] Application builds without configuration syntax errors.
- [x] Model snapshot includes all 24 entities with explicit configurations and `BankAccount.IsEnabled`.

---

## Phase 2: Missing Features & Domain Gaps Completion
- [x] **Task 2.1: Implement Password Reset / Forgot Password Workflow**
  - Added `ForgotPasswordAsync` and `ResetPasswordAsync` to `IAuthService` and `AuthService`.
  - Added `[HttpPost("forgot-password")]` and `[HttpPost("reset-password")]` endpoints in `AuthController` with rate limiting.
- [x] **Task 2.2: BankAccount.IsEnabled Visibility Gate & Operational Safeguards**
  - Updated `BankAccountDto`, `CreateBankAccountDto`, and `UpdateBankAccountDto` with `IsEnabled`.
  - Updated `BankAccountService.GetActiveBankAccountAsync()`: strictly filters by `b.IsEnabled && b.IsActive && !b.IsDeleted`. If `IsEnabled` is false, returns null so checkout and modals hide bank details.
  - Added `ToggleEnabledAsync(int id)` in `IBankAccountService`, `BankAccountService`, and `AdminBankAccountsController` (`PUT /api/admin/bank-accounts/{id}/toggle-enabled`).
  - Implemented soft-delete protection in `BankAccountService`.
- [x] **Task 2.3: Implement Bulk Media Purge Maintenance Utility**
  - Added `[HttpDelete("purge")]` endpoint in `UploadController` restricted to SuperAdmin with strict category validation.

### Checkpoint: Phase 2 Complete
- [x] Auth endpoints for password recovery respond appropriately with secure tokens.
- [x] BankAccount `IsEnabled` toggle controls checkout visibility (`api/bank-accounts/active` returns 404 when disabled).

---

## Phase 3: Code Reusability, Scalability & Optimization
- [x] **Task 3.1: AdminService Architecture & Organization**
  - Preserved `IAdminService` facade so all existing controllers remain 100% compatible.
- [x] **Task 3.2: Query Performance Optimization (.AsNoTracking & .AsSplitQuery)**
  - Enforced `.AsNoTracking()` across read-heavy queries in `EventService`, `BookingService`, and `AdminService`.
  - Added `.AsSplitQuery()` to multi-collection eager loads (`Shows`, `TicketTiers`, `SeatingZones`, `Seats`) to eliminate cartesian explosion.
- [x] **Task 3.3: Eliminate Dead & Unused Code**
  - Removed unused methods, unreferenced using statements, and dead code across backend projects.

### Checkpoint: Phase 3 Complete
- [x] Code compiles cleanly with zero broken controller references.
- [x] Unit test suite passes without regressions (93 passed, 0 failed).

---

## Phase 4: Security Hardening & PII Protection
- [x] **Task 4.1: Controller Authorization & Rate Limiting Audit**
  - Ensured all sensitive endpoints have appropriate `[Authorize]` and `[EnableRateLimiting]` policies.
- [x] **Task 4.2: PII Protection on Public Endpoints**
  - Masked administrator internal emails on payment status and verified owner-only access.
- [x] **Task 4.3: Upload Controller Path Traversal & Header Hardening**
  - Sanitized uploaded filenames via `Path.GetFileName` and enforced strict directory boundary checks.

### Checkpoint: Phase 4 Complete
- [x] Public endpoints do not leak full customer PII or staff emails.
- [x] Path traversal attempts on file upload return 400 Bad Request.

---

## Phase 5: Media Purge (User & Event Images)
- [x] **Task 5.1: Purge Uploaded Event & User Images**
  - Removed all files from `backend/src/EventLand.Api/wwwroot/assets/images/events/` (7 files).
  - Removed all files from `backend/src/EventLand.Api/wwwroot/assets/images/users/` (5 files).
  - Ensured directory structure and seed `organizers/org_eventland_01.png` remain intact.

### Checkpoint: Phase 5 Complete
- [x] `events` and `users` directories are empty.
- [x] `organizers/org_eventland_01.png` is preserved.

---

## Phase 6: Migration Consolidation
- [x] **Task 6.1: Delete Historical Migrations**
  - Deleted old migrations `20260923090046_InitialCreate`, `20260929054026_AddClosingMechanismsAndTierStatus`, and model snapshot.
- [x] **Task 6.2: Create Single Consolidated InitialCreate Migration**
  - Generated single baseline migration `20260929080134_InitialCreate.cs` covering all 24 entities, explicit configurations, indexes, and `BankAccount.IsEnabled`.

### Checkpoint: Phase 6 Complete
- [x] Exactly one migration file `InitialCreate.cs` exists in `Migrations/`.
- [x] Migration compiles cleanly.

---

## Phase 7: Database Drop, Rebuild & Verification
- [x] **Task 7.1: Stop Running API Daemon & Drop Database**
  - Terminated background API process to release database and file locks.
  - Dropped database `EventLandDb` cleanly with `dotnet ef database drop --force`.
- [x] **Task 7.2: Apply Consolidated Migration & Seed Data**
  - Applied single migration with `dotnet ef database update`.
  - Verified automatic seeding of SuperAdmin, Pakistan cities, tags, and default payment configs via `DataSeeder`.
- [x] **Task 7.3: Full Test Suite & End-to-End Verification**
  - Ran `dotnet test backend/tests/EventLand.UnitTests/EventLand.UnitTests.csproj` (93 passed, 0 failed).
  - Restarted API and verified endpoints (`/api/countries`, `/api/cities`, `/api/events`, `/api/auth/forgot-password`, `/api/bank-accounts/active`) return expected HTTP responses.

---

## Phase 8: Social Authentication (Google + Facebook)
- [x] **Task 8.1: Backend Infrastructure & Dependencies**
  - Added `Google.Apis.Auth` package to `EventLand.Infrastructure.csproj`.
  - Added `GoogleId`, `FacebookId`, and `AuthProvider` fields to `User` entity with explicit configuration and sparse indexes in `UserConfiguration.cs`.
- [x] **Task 8.2: Social Auth DTOs & Service Contracts**
  - Created `GoogleAuthRequestDto` and `FacebookAuthRequestDto` in `AuthDtos.cs`.
  - Added `GoogleAuthAsync` and `FacebookAuthAsync` to `IAuthService.cs`.
- [x] **Task 8.3: Verification Logic & Shared Account Provisioning**
  - Implemented Google ID Token (JWT) cryptographic validation via `GoogleJsonWebSignature`.
  - Implemented Facebook user access token validation via Facebook Graph API (`/debug_token` and `/me`).
  - Implemented shared `FindOrCreateSocialUserAsync` helper with provider lookup, email account linking, and avatar handling.
  - Registered named `FacebookGraph` HttpClient in `DependencyInjection.cs`.
- [x] **Task 8.4: API Controller Endpoints**
  - Added `POST /api/auth/google` and `POST /api/auth/facebook` in `AuthController.cs` under the `"login"` rate-limiting policy.
- [x] **Task 8.5: Frontend Integration & Modern UX**
  - Added `googleAuth` and `facebookAuth` methods to `authApi` in `frontend/src/services/api.js`.
  - Added Google and Facebook sign-in buttons with SVGs and loading spinners in `frontend/src/components/AuthModal.jsx`.
  - Integrated Google Identity Services (GSI) and Facebook JS SDK with graceful configuration checks and toasts.
  - Created `frontend/.env.example` and `frontend/.env.local` templates for `VITE_GOOGLE_CLIENT_ID` and `VITE_FACEBOOK_APP_ID`.
- [x] **Task 8.6: Database Migration & Verification**
  - Generated and applied `20260929093014_AddSocialAuthFields` EF migration adding columns and filtered indexes.
  - Added `SocialAuthTests.cs` covering token validation, configuration checks, and entity contracts (98 unit tests passing).
  - Verified live API endpoints return expected responses.
