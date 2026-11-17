# ADR 0001: Explicit State Machines Architecture

## Status
Accepted

## Context
An architectural audit of the EventLand codebase identified 14 implicit state machines. State management was previously characterized by:
- Contradictory dual enums (`Booking.Status` vs `Booking.PaymentStatus`).
- Scattered boolean flags, nullable timestamps (`PaidAt`, `VerifiedAt`, `RefundedAt`), and unvalidated string status fields (`RefundRecord.Status = "Processed"`).
- Race conditions between background expiry workers (`PendingBookingExpiryService`) and proof submissions at the 30-minute boundary.
- Seat locks split across a shared Redis `Set<int>` with sliding TTL and a SQL Server `Reserved` status.
- Untrusted client-side signals (e.g., query params in `/payment-return`, `sessionStorage` in Cloudflare Turnstile).

## Decisions

### 1. Phased Migration Strategy (Expand / Contract)
To maintain zero-downtime database continuity and backward compatibility for existing web, mobile, and PayPro API clients:
- **Phase 1 (Expand)**: Introduce canonical `BookingState` enum (`PendingHold`, `AwaitingBankVerification`, `PaymentProcessing`, `Confirmed`, `Expired`, `Rejected`, `Cancelled`, `Refunded`). Retain `Status` and `PaymentStatus` as computed read-only projections on `Booking`.
- **Domain Gate**: Every state transition must pass through atomic aggregate methods (`SubmitBankProof`, `BeginPayProPayment`, `ConfirmPayment`, `Reject`, `Expire`, `Refund`). Direct setter mutation outside the aggregate is prohibited.
- **Time Injection**: Inject `TimeProvider` (.NET 8+) across all state and domain calculations to enable deterministic testing using `FakeTimeProvider`.

### 2. Concurrency & Idempotency Rules
- **Conditional Atomic Updates**: All status changes against time or states (such as expiring pending holds or checking in tickets) must use compare-and-set semantics (e.g. `WHERE Id = @id AND State = @expected AND PaymentExpiresAt <= @now`) checking rows-affected.
- **Optimistic Concurrency**: Add a `rowversion` concurrency token to stateful entities (`Booking`, `Seat`) to handle race conditions safely via `DbUpdateConcurrencyException`.
- **Idempotent Ingress**: Webhooks and return reconciliation paths must execute within a transactional lock with an inbox/deduplication table (`PaymentWebhookInbox`).

### 3. Seat Inventory & Distributed Locking
- Replace shared sets in Redis with per-seat ownership keys (`seathold:{eventId}:{showId}:{seatId} = {holderId}`) with fixed TTL and atomic multi-seat hold Lua scripts.
- Treat SQL Server as the authoritative store; Redis acts strictly as an ephemeral 10-minute hold cache.

### 4. Gate Admission & Security
- Gate validation transitions to a typed `AdmissionResult` and atomic single-pass updates (`WHERE Id = @id AND IsCheckedIn = 0`).
- Check-in history is preserved in an append-only `TicketScanLog`.

### 5. Frontend Reactive State
- Replace numeric stepper indices and disjoint modal booleans with typed union reducers / XState machines (`'buyer_info' | 'payment_method' | 'redirecting' | 'voucher_pending' | 'confirmed' | 'failed'`).
- Enforce server-side authority for Cloudflare Turnstile verification instead of client-controlled `sessionStorage`.

## Consequences
- Single source of truth for all business lifecycles.
- No contradictory states are representable in domain or storage.
- Unit and integration tests can verify all state transitions deterministically.
