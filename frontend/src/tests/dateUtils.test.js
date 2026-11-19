import test from 'node:test';
import assert from 'node:assert/strict';
import { toDateTimeLocalValue, fromDateTimeLocalValue, normalizeEventStatus } from '../utils/dateUtils.js';

test('toDateTimeLocalValue: accurately converts UTC ISO string to PKT (+05:00) datetime-local format', () => {
  // 15:00 UTC = 20:00 PKT (Asia/Karachi)
  const utcStr = '2026-11-20T15:00:00.000Z';
  const localVal = toDateTimeLocalValue(utcStr);
  assert.equal(localVal, '2026-11-20T20:00');
});

test('fromDateTimeLocalValue: accurately converts PKT datetime-local string to UTC ISO string', () => {
  // 20:00 PKT = 15:00 UTC
  const localVal = '2026-11-20T20:00';
  const utcStr = fromDateTimeLocalValue(localVal);
  assert.equal(utcStr, '2026-11-20T15:00:00.000Z');
});

test('Round-trip fidelity: preserves exact time with zero hour-shifting drift', () => {
  const originalUtc = '2026-11-20T15:00:00.000Z';
  const localVal = toDateTimeLocalValue(originalUtc);
  const roundTripUtc = fromDateTimeLocalValue(localVal);
  assert.equal(roundTripUtc, originalUtc);
});

test('normalizeEventStatus: correctly handles all status variations', () => {
  assert.equal(normalizeEventStatus('LIVE'), 'Live');
  assert.equal(normalizeEventStatus('live'), 'Live');
  assert.equal(normalizeEventStatus('SELLING FAST'), 'SellingFast');
  assert.equal(normalizeEventStatus('selling_fast'), 'SellingFast');
  assert.equal(normalizeEventStatus('SOLD OUT'), 'SoldOut');
  assert.equal(normalizeEventStatus('UPCOMING'), 'Upcoming');
  assert.equal(normalizeEventStatus('CLOSED'), 'Closed');
  assert.equal(normalizeEventStatus('COMPLETED'), 'Closed');
  assert.equal(normalizeEventStatus('DRAFT'), 'Draft');
  assert.equal(normalizeEventStatus('CANCELLED'), 'Cancelled');
  assert.equal(normalizeEventStatus(''), 'Live');
  assert.equal(normalizeEventStatus(null), 'Live');
});
