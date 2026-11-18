# EventLand High-Concurrency Load Testing (k6)

This directory contains automated k6 load testing scripts designed to stress-test EventLand under high concurrency conditions.

## Objective
Simulate **2,000 concurrent attendees** contending for the same limited pool of seats and verify:
1. **Zero Oversells (`oversell_count == 0`)**: No seat or inventory tier is ever double-booked.
2. **Sub-second Latency**:
   - `hold_duration_ms`: p95 < 300ms (Redis distributed CAS check-and-set).
   - `booking_duration_ms`: p95 < 500ms (Database transaction with row-version validation).
3. **Webhook Replay Idempotency**: Duplicate payment notifications from PayPro return 200 OK without double-crediting tickets or sending multiple confirmation emails.

## Prerequisites
- [k6](https://k6.io/docs/get-started/installation/) installed (`winget install k6` or `brew install k6`).
- Backend API running (`http://localhost:5000` or configured via `BASE_URL`).
- Redis instance running (`localhost:6379`).

## Execution

### Run Default 2,000 VU Concurrency Test
```bash
k6 run loadtests/k6-seat-concurrency.js
```

### Run Against Custom Environment or Endpoint
```bash
k6 run -e BASE_URL=https://staging.eventland.pk -e SHOW_ID=10 -e EVENT_ID=4 loadtests/k6-seat-concurrency.js
```

### Interpreting Thresholds
- `oversell_count`: Must be exactly **0**. Any number > 0 indicates a race condition failure.
- `hold_duration_ms`: Tracks Redis CAS execution under 2,000 concurrent threads.
- `duplicate_webhooks_handled`: Tracks successful deduplication across simultaneous IPN delivery.
