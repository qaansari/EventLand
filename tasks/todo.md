# Tasks: Phone Number Canonical Normalization & Duplicate Validation

## Phase 1: Backend Normalization Engine
- [x] **Task 1**: Create `PhoneHelper` utility class in `EventLand.Application/Common/PhoneHelper.cs` with robust E.164 normalization logic (`Normalize` and `FormatForDisplay`).
- [x] **Task 2**: Integrate `PhoneHelper.Normalize` into `AuthService.cs` and `AdminService.cs` for user registration, user creation, and user update flows. Also update seed phone numbers in `DataSeeder.cs` and `ModelBuilderExtensions.cs`.
- [x] **Task 3**: Create unit tests in `PhoneHelperTests.cs` and update `AdminServiceEventAndTierTests.cs` to test that phone variations (`+92 331 2541767` vs `+92 3312541767` vs `0331 2541767`) are recognized as duplicates.

### Checkpoint: Backend Foundation
- [x] `dotnet build` compiles cleanly.
- [x] `dotnet test` passes all 85 unit tests (0 failed).

---

## Phase 2: Frontend Sanitization & Forms
- [x] **Task 4**: Update `formatPhoneNumberOnSubmit` and `splitPhoneNumberForEdit` in `frontend/src/services/api.js` to strip internal spaces and emit canonical E.164 strings.
- [x] **Task 5**: Verify `AuthModal.jsx`, `AdminDashboard.jsx`, and `AdminUserModal.jsx` to ensure consistent formatting and clean display when editing existing records.

### Checkpoint: Frontend Integration
- [x] `npm run build` succeeds cleanly (0 errors).
- [x] Client-side duplicate check in `AdminDashboard.jsx` canonicalizes numbers to prevent duplicates before submission.

---

## Phase 3: Database Data Sanitization & End-to-End Verification
- [x] **Task 6**: Sanitize existing records in `Users` table by executing an update to strip spaces/hyphens from existing stored `PhoneNumber` values:
  - User 1: `+923312541767`
  - User 1000: `+923312541768`
- [x] **Verification**: Verified with unit test `CreateUserAsync_SpacedAndUnspacedPhoneNumbers_ThrowsDuplicateException` and database queries that spaced vs unspaced numbers resolve to the identical canonical key and trigger duplicate conflict rejection.
