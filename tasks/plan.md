# Implementation Plan: Phone Number Canonical Normalization & Duplicate Validation

## Overview
Phone numbers entered with varying whitespace or formatting (e.g. `"+92 3312541767"` vs `"+92 331 2541767"` or `"0331-2541767"`) currently bypass duplicate validation because SQL Server and EF Core perform exact string equality queries on un-normalized strings.

This plan implements end-to-end canonical E.164 normalization (`+<countryCode><digits>`, e.g., `+923312541767`) at the system boundary in both Backend and Frontend, cleans up existing database records, and guarantees lightning-fast $O(\log N)$ unique index lookups without full-table scans.

---

## Architecture Decisions

1. **Standardize on ITU-T E.164 Canonical Format (`+<digits>`)**:
   - Format: `+<countryCode><subscriberDigits>` with NO internal spaces, dashes, or parentheses (e.g. `+923312541767`).
   - Standard across industry SMS gateways (Twilio, WhatsApp Business API, AWS SNS) and telecom registries.
   - Eliminates all string variation while fitting cleanly in existing `nvarchar(20)`.

2. **Normalize at Ingestion / Mutation Boundaries (Do NOT wrap SQL columns in queries)**:
   - Always normalize before saving (`user.PhoneNumber = PhoneHelper.Normalize(dto.PhoneNumber)`) and before querying (`u.PhoneNumber == cleanPhone`).
   - Avoid `REPLACE(u.PhoneNumber, ' ', '')` in LINQ queries because it makes expressions non-sargable in SQL Server, forcing expensive table scans instead of using index `IX_Users_PhoneNumber`.

3. **Two-Way Frontend Handling (Canonical Submit, Human-Friendly Edit)**:
   - On submit: `formatPhoneNumberOnSubmit` converts raw input into canonical E.164.
   - On edit load: `splitPhoneNumberForEdit` strips country prefix and isolates national digits so form inputs remain clean and intuitive for users.

---

## Task Breakdown & Dependency Graph

```
Task 1: Backend PhoneHelper & Normalization Engine
    │
    ├── Task 2: Backend AuthService & AdminService Integration
    │       │
    │       └── Task 3: Backend Unit Tests for Phone Normalization & Duplicate Detection
    │
    ├── Task 4: Frontend api.js Normalization & Split Helper Update
    │       │
    │       └── Task 5: Frontend Form Verification (AuthModal & AdminUserModal)
    │
    └── Task 6: Database Data Sanitization (Clean Existing Rows & Verify Unique Index)
```

---

## Detailed Tasks

### Phase 1: Backend Canonical Normalization

#### Task 1: Create `PhoneHelper` in Domain/Application layer
**Description:** Implement a high-performance, allocation-efficient `PhoneHelper.Normalize` utility to canonicalize international and domestic phone numbers.
**Acceptance Criteria:**
- Returns null if input is null, empty, or whitespace.
- Strips all whitespace, dashes, dots, and parentheses.
- Handles domestic leading `0` (e.g. `0331...` -> `+92331...`).
- Handles `+` prefix correctly (e.g. `+92 331 2541767` -> `+923312541767`).
**Files touched:**
- `backend/src/EventLand.Application/Common/Helpers/PhoneHelper.cs` (new)
**Verification:**
- Unit tests covering all edge cases (null, empty, with spaces, with dashes, leading 0, foreign numbers).

#### Task 2: Integrate `PhoneHelper` into `AuthService` and `AdminService`
**Description:** Update user registration, profile updates, super admin seeding, and admin user creation/updates to normalize phone numbers before duplicate check and persistence.
**Acceptance Criteria:**
- `AuthService.RegisterAsync`: validates duplicate against `PhoneHelper.Normalize(dto.PhoneNumber)`.
- `AdminService.CreateUserAsync`: validates duplicate against `PhoneHelper.Normalize(dto.PhoneNumber)`.
- `AdminService.UpdateUserAsync`: validates duplicate against `PhoneHelper.Normalize(dto.PhoneNumber)` excluding current user ID.
- `DataSeeder.cs` and `ModelBuilderExtensions.cs`: update seeded superadmin phone to canonical `+923312541767`.
**Files touched:**
- `backend/src/EventLand.Infrastructure/Services/AuthService.cs`
- `backend/src/EventLand.Infrastructure/Services/AdminService.cs`
- `backend/src/EventLand.Infrastructure/Persistence/DataSeeder.cs`
- `backend/src/EventLand.Infrastructure/Persistence/ModelBuilderExtensions.cs`
**Verification:**
- `dotnet build` succeeds.

#### Task 3: Unit Tests for Phone Normalization & Duplicate Prevention
**Description:** Add unit tests testing that different variations of the same phone number (e.g., `+92 331 2541767` vs `+923312541767` vs `0331 2541767`) are correctly detected as duplicates.
**Files touched:**
- `backend/tests/EventLand.UnitTests/PhoneHelperTests.cs` (new)
- `backend/tests/EventLand.UnitTests/AdminServiceEventAndTierTests.cs`
**Verification:**
- `dotnet test` passes 100%.

---

### Phase 2: Frontend Sanitization & Integration

#### Task 4: Enhance `formatPhoneNumberOnSubmit` and `splitPhoneNumberForEdit` in `api.js`
**Description:** Ensure frontend helper completely strips whitespace, hyphens, and leading zeros when preparing phone payloads for the API.
**Acceptance Criteria:**
- Input `" 331 254 1767 "` with prefix `"+92"` outputs `"+923312541767"`.
- Input `"+92 331 2541767"` outputs `"+923312541767"`.
- `splitPhoneNumberForEdit` properly parses `+923312541767` into dialing code `+92` and national number `3312541767`.
**Files touched:**
- `frontend/src/services/api.js`
**Verification:**
- Node test execution on regex / parsing logic.

#### Task 5: Verify AuthModal & AdminUserModal Forms
**Description:** Ensure `AuthModal.jsx` and `AdminDashboard.jsx` pass sanitized values to the API, and edit modals display clean split national numbers without country prefix duplication.
**Files touched:**
- `frontend/src/components/AuthModal.jsx`
- `frontend/src/components/AdminDashboard.jsx`
- `frontend/src/components/admin/modals/AdminUserModal.jsx`
**Verification:**
- `npm run build` succeeds without warnings or errors.

---

### Phase 3: Data Migration & Verification

#### Task 6: Sanitize Existing Database Records
**Description:** Execute a safe SQL update on existing `Users` table rows to remove all internal spaces and formatting from existing phone numbers, preventing legacy data collisions.
**Acceptance Criteria:**
- All existing phone numbers match regex `^\+[0-9]{7,15}$`.
- Existing unique filtered index `IX_Users_PhoneNumber` is intact and active.
**Verification:**
- Query database for any phone numbers containing whitespace (`WHERE PhoneNumber LIKE '% %'`). Count must be 0.

---

## Checkpoints

- **Checkpoint 1 (After Tasks 1-3):** All backend tests pass; duplicate detection succeeds regardless of spaces or dashes.
- **Checkpoint 2 (After Tasks 4-5):** Frontend build clean; submitting user with or without spaces produces identical E.164 payload.
- **Checkpoint 3 (After Task 6):** End-to-end integration verified: attempting to create a user with `+92 331 2541767` when `+923312541767` exists triggers duplicate phone validation error.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing database records have duplicates once spaces are stripped | Medium | Run a pre-check query to identify any duplicate numbers before applying unique index cleanup. |
| User inputs international number from a country with variable dialing codes | Low | The frontend already captures `countryId` and dialing code via dropdown; `PhoneHelper` preserves the selected country prefix. |
| Invalidation of superadmin phone check in seeder | Low | Seeders and auth bootstrap updated synchronously to the canonical format `+923312541767`. |
