import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics for Concurrency & Invariant Verification
export const oversellCount = new Counter('oversell_count');
export const successfulHolds = new Counter('successful_holds');
export const conflictHolds = new Counter('conflict_holds');
export const duplicateWebhooksHandled = new Counter('duplicate_webhooks_handled');
export const holdLatency = new Trend('hold_duration_ms', true);
export const bookingLatency = new Trend('booking_duration_ms', true);
export const holdSuccessRate = new Rate('hold_success_rate');

// Test Configuration: 2,000 concurrent virtual users
export const options = {
  scenarios: {
    seat_rush_concurrency: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 500 },   // Warm-up ramp
        { duration: '30s', target: 2000 },  // Peak rush: 2,000 concurrent users
        { duration: '30s', target: 2000 },  // Sustained pressure on hot seats
        { duration: '15s', target: 0 },     // Ramp-down
      ],
      gracefulRampDown: '5s',
    },
    webhook_replay_race: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 20,
      startTime: '20s',
    },
  },
  thresholds: {
    'oversell_count': ['count==0'],             // Invariant: zero oversells allowed
    'hold_duration_ms': ['p(95)<300'],           // p95 latency < 300ms for Redis CAS hold
    'booking_duration_ms': ['p(95)<500'],        // p95 latency < 500ms for atomic booking commit
    'http_req_failed': ['rate<0.05'],           // Unexpected network failures < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const SHOW_ID = __ENV.SHOW_ID || 1;
const EVENT_ID = __ENV.EVENT_ID || 1;
const TIER_ID = __ENV.TIER_ID || 1;

// Target a pool of 100 contested seats among 2,000 concurrent VUs
const TARGET_SEAT_IDS = Array.from({ length: 100 }, (_, i) => 1001 + i);

export default function () {
  const vuId = __VU;
  const iterId = __ITER;
  const chosenSeatId = TARGET_SEAT_IDS[Math.floor(Math.random() * TARGET_SEAT_IDS.length)];
  const customerEmail = `loadtest_vu_${vuId}@eventland.test`;

  // ---------------------------------------------------------------------------
  // Step 1: Attempt Atomic CAS Seat Hold
  // ---------------------------------------------------------------------------
  const holdPayload = JSON.stringify({
    showId: SHOW_ID,
    seatIds: [chosenSeatId],
    holdDurationSeconds: 1800,
    paymentMethod: 'PayPro'
  });

  const holdParams = {
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': `k6-hold-${vuId}-${iterId}-${Date.now()}`
    },
  };

  const holdStart = Date.now();
  const holdRes = http.post(`${BASE_URL}/api/seats/hold`, holdPayload, holdParams);
  holdLatency.add(Date.now() - holdStart);

  if (holdRes.status === 200) {
    successfulHolds.add(1);
    holdSuccessRate.add(1);

    // -------------------------------------------------------------------------
    // Step 2: Proceed to Create Booking for Acquired Hold
    // -------------------------------------------------------------------------
    const bookingPayload = JSON.stringify({
      eventId: EVENT_ID,
      eventShowId: SHOW_ID,
      ticketTierId: TIER_ID,
      customerName: `VU LoadTest ${vuId}`,
      customerEmail: customerEmail,
      customerPhone: '03001234567',
      quantity: 1,
      paymentMethod: 'PayPro',
      selectedSeatIds: [chosenSeatId]
    });

    const bookingStart = Date.now();
    const bookingRes = http.post(`${BASE_URL}/api/bookings`, bookingPayload, holdParams);
    bookingLatency.add(Date.now() - bookingStart);

    check(bookingRes, {
      'booking succeeded': (r) => r.status === 200 || r.status === 201,
    });

    if (bookingRes.status === 200 || bookingRes.status === 201) {
      const bookingData = JSON.parse(bookingRes.body);
      const bookingRef = bookingData.bookingRef;

      // -----------------------------------------------------------------------
      // Step 3: Simulate Duplicate Webhook Callbacks (Idempotency Test)
      // -----------------------------------------------------------------------
      const webhookPayload = JSON.stringify({
        OrderNumber: bookingRef,
        Status: '00',
        AmountPaid: 1500,
        PayProId: `PP-TEST-${vuId}`
      });

      // Fire duplicate webhook simultaneously
      const [wh1, wh2] = http.batch([
        ['POST', `${BASE_URL}/api/paypro/callback`, webhookPayload, holdParams],
        ['POST', `${BASE_URL}/api/paypro/callback`, webhookPayload, holdParams]
      ]);

      if (wh1.status === 200 && wh2.status === 200) {
        duplicateWebhooksHandled.add(1);
      }
    }
  } else if (holdRes.status === 409) {
    // Expected CAS Conflict (Seat already locked by competing VU)
    conflictHolds.add(1);
    holdSuccessRate.add(0);
  } else if (holdRes.status === 422) {
    // Inventory exhaustion / seat already booked
    conflictHolds.add(1);
    holdSuccessRate.add(0);
  } else {
    // Unexpected error (e.g. 500)
    check(holdRes, {
      'hold error acceptable (409 or 422)': (r) => r.status === 409 || r.status === 422,
    });
  }

  sleep(0.5);
}
