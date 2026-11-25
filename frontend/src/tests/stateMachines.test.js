import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveSeatVisualState } from '../utils/deriveSeatVisualState.ts';
import { checkoutReducer, getInitialContext } from '../machines/checkoutReducer.ts';
import { authReducer } from '../machines/authReducer.ts';
import { gateScannerReducer, initialGateScannerState } from '../machines/gateScannerReducer.ts';
import { payproTrackerReducer, createInitialPayProTrackerState } from '../machines/payproTrackerReducer.ts';
import { unpaidInvoicesReducer, initialUnpaidInvoicesState } from '../machines/unpaidInvoicesReducer.ts';
import { overlayReducer } from '../machines/overlayReducer.ts';
import { adminFeedbackReducer, initialAdminFeedbackState } from '../machines/adminFeedbackReducer.ts';

// ── 1. Pure Seat Visual Calculation Tests (Audit #9) ──────────────────────────
test('deriveSeatVisualState: blocked takes top precedence', () => {
  const seat = { id: 101, label: 'A1', status: 'Blocked' };
  const ctx = {
    selectedIds: new Set([101]),
    heldByOthersIds: new Set([101]),
    bookedIds: new Set([101]),
    blockedIds: new Set([101])
  };
  const visualState = deriveSeatVisualState(seat, ctx);
  assert.equal(visualState, 'blocked');
});

test('deriveSeatVisualState: booked takes precedence over selected', () => {
  const seat = { id: 102, label: 'A2', status: 'Booked' };
  const ctx = {
    selectedIds: new Set([102]),
    heldByOthersIds: new Set([102]),
    bookedIds: new Set([102]),
    blockedIds: new Set()
  };
  const visualState = deriveSeatVisualState(seat, ctx);
  assert.equal(visualState, 'booked');
});

test('deriveSeatVisualState: selected takes precedence over heldByOthers', () => {
  const seat = { id: 103, label: 'A3', status: 'Available' };
  const ctx = {
    selectedIds: new Set([103]),
    heldByOthersIds: new Set([103]),
    bookedIds: new Set(),
    blockedIds: new Set()
  };
  const visualState = deriveSeatVisualState(seat, ctx);
  assert.equal(visualState, 'selected');
});

test('deriveSeatVisualState: heldByOthers takes precedence over reserved and available', () => {
  const seat = { id: 104, label: 'A4', status: 'Available' };
  const ctx = {
    selectedIds: new Set(),
    heldByOthersIds: new Set([104]),
    bookedIds: new Set(),
    blockedIds: new Set(),
    reservedIds: new Set([104])
  };
  const visualState = deriveSeatVisualState(seat, ctx);
  assert.equal(visualState, 'heldByOthers');
});

test('deriveSeatVisualState: reserved displays 30-min hold', () => {
  const seat = { id: 105, label: 'A5', status: 'Reserved' };
  const ctx = {
    selectedIds: new Set(),
    heldByOthersIds: new Set(),
    bookedIds: new Set(),
    blockedIds: new Set(),
    reservedIds: new Set([105])
  };
  const visualState = deriveSeatVisualState(seat, ctx);
  assert.equal(visualState, 'reserved');
});

test('deriveSeatVisualState: available when unselected and clear', () => {
  const seat = { id: 106, label: 'A6', status: 'Available' };
  const ctx = {
    selectedIds: new Set(),
    heldByOthersIds: new Set(),
    bookedIds: new Set(),
    blockedIds: new Set()
  };
  const visualState = deriveSeatVisualState(seat, ctx);
  assert.equal(visualState, 'available');
});

// ── 2. Checkout Modal State Machine Tests (Audit #8) ──────────────────────────
test('checkoutReducer: transitions through full payment lifecycle', () => {
  let ctx = getInitialContext();
  assert.equal(ctx.state, 'buyer_info');

  // Proceed to payment selection
  ctx = checkoutReducer(ctx, { type: 'PROCEED' });
  assert.equal(ctx.state, 'payment_method');

  // Can go back to buyer_info
  ctx = checkoutReducer(ctx, { type: 'BACK' });
  assert.equal(ctx.state, 'buyer_info');

  // Proceed again
  ctx = checkoutReducer(ctx, { type: 'PROCEED' });
  assert.equal(ctx.state, 'payment_method');

  // Hosted redirect flow
  ctx = checkoutReducer(ctx, {
    type: 'START_REDIRECT',
    payload: { booking: { bookingRef: 'EVL-999' }, paymentUrl: 'https://paypro.example.com' }
  });
  assert.equal(ctx.state, 'redirecting');
  assert.equal(ctx.paymentUrl, 'https://paypro.example.com');

  // OTC Voucher issued flow
  ctx = checkoutReducer({ ...getInitialContext(), state: 'payment_method' }, {
    type: 'VOUCHER_ISSUED',
    payload: { booking: { bookingRef: 'EVL-888' }, voucher: '1BILL-12345' }
  });
  assert.equal(ctx.state, 'voucher_pending');
  assert.equal(ctx.voucherCode, '1BILL-12345');

  // Payment status check succeeds
  ctx = checkoutReducer(ctx, { type: 'STATUS_CHECKED', status: 'paid' });
  assert.equal(ctx.state, 'confirmed');

  // Payment failure transitions to failed state
  const failedCtx = checkoutReducer({ ...getInitialContext(), state: 'voucher_pending' }, {
    type: 'STATUS_CHECKED',
    status: 'failed',
    message: 'Card declined'
  });
  assert.equal(failedCtx.state, 'failed');
  assert.equal(failedCtx.errorMessage, 'Card declined');

  // Timer expiration ticks down to failure
  const expiringCtx = checkoutReducer({ ...getInitialContext(), state: 'payment_method', secondsRemaining: 1 }, {
    type: 'TICK'
  });
  assert.equal(expiringCtx.state, 'failed');
  assert.equal(expiringCtx.secondsRemaining, 0);
});

// ── 3. Auth Modal State Machine Tests (Audit #11) ────────────────────────────
test('authReducer: transitions between login, signup, forgot, and reset', () => {
  let ctx = { state: 'login', email: '', error: null, authData: null };

  // Switch to signup
  ctx = authReducer(ctx, { type: 'SWITCH_TO_SIGNUP' });
  assert.equal(ctx.state, 'signup');

  // Switch back to login
  ctx = authReducer(ctx, { type: 'SWITCH_TO_LOGIN' });
  assert.equal(ctx.state, 'login');

  // Forgot password flow
  ctx = authReducer(ctx, { type: 'SWITCH_TO_FORGOT' });
  assert.equal(ctx.state, 'forgot_request');

  ctx = authReducer(ctx, { type: 'FORGOT_SENT', email: 'test@eventland.pk' });
  assert.equal(ctx.state, 'forgot_verify');
  assert.equal(ctx.email, 'test@eventland.pk');

  // Reset token flow
  ctx = authReducer(ctx, { type: 'SWITCH_TO_RESET' });
  assert.equal(ctx.state, 'reset');
  assert.equal(ctx.email, 'test@eventland.pk');

  // Successful authentication
  ctx = authReducer(ctx, { type: 'START_SUBMIT' });
  assert.equal(ctx.isSubmitting, true);
  assert.equal(ctx.socialProvider, null);

  ctx = authReducer(ctx, { type: 'AUTH_SUCCESS', authData: { token: 'jwt-xyz', user: { fullName: 'Ali' } } });
  assert.equal(ctx.state, 'authenticated');
  assert.equal(ctx.isSubmitting, false);
  assert.equal(ctx.authData.token, 'jwt-xyz');
});

// ── 4. Gate Scanner State Machine Tests ─────────────────────────────────────
test('gateScannerReducer: prevents simultaneous result and error states', () => {
  let s = initialGateScannerState;
  s = gateScannerReducer(s, { type: 'VALIDATE_START' });
  assert.equal(s.status, 'validating');
  assert.equal(s.result, null);
  assert.equal(s.error, null);

  s = gateScannerReducer(s, { type: 'VALIDATE_SUCCESS', result: { valid: true } });
  assert.equal(s.status, 'verified');
  assert.equal(s.result.valid, true);

  s = gateScannerReducer(s, { type: 'RESET_START' });
  assert.equal(s.status, 'resetting');

  s = gateScannerReducer(s, { type: 'RESET_ERROR', error: 'Supervisor required' });
  assert.equal(s.status, 'error');
  assert.equal(s.result, null);
  assert.equal(s.error, 'Supervisor required');
});

// ── 5. PayPro Tracker State Machine Tests ───────────────────────────────────
test('payproTrackerReducer: halts auto-polling on terminal Paid or Blocked status', () => {
  let s = createInitialPayProTrackerState(null);
  assert.equal(s.isAutoPolling, true);

  s = payproTrackerReducer(s, { type: 'FETCH_START', isBackground: false });
  assert.equal(s.status, 'loading');

  s = payproTrackerReducer(s, { type: 'FETCH_SUCCESS', data: { orderStatus: 'Paid', isPaid: true } });
  assert.equal(s.status, 'terminal_paid');
  assert.equal(s.isAutoPolling, false);
});

// ── 6. Unpaid Invoices Modal State Machine Tests ────────────────────────────
test('unpaidInvoicesReducer: blocks concurrent invoice mutations', () => {
  let s = initialUnpaidInvoicesState;
  s = unpaidInvoicesReducer(s, { type: 'LOAD_SUCCESS' });
  assert.equal(s.listStatus, 'idle');

  s = unpaidInvoicesReducer(s, { type: 'ACTION_START', action: { type: 'upload', invoiceKey: 'INV-1' } });
  assert.equal(s.activeAction?.type, 'upload');

  // Second concurrent action is ignored while upload is active
  s = unpaidInvoicesReducer(s, { type: 'ACTION_START', action: { type: 'submit_proof', invoiceKey: 'INV-1' } });
  assert.equal(s.activeAction?.type, 'upload');

  s = unpaidInvoicesReducer(s, { type: 'ACTION_DONE' });
  assert.equal(s.activeAction, null);
});

// ── 7. Global Overlay State Machine Tests ───────────────────────────────────
test('overlayReducer: enforces single active overlay and clears on auth expiry', () => {
  let o = overlayReducer(null, { type: 'OPEN_SEAT_PICKER', event: { id: 1 } });
  assert.equal(o?.type, 'seat_picker');

  o = overlayReducer(o, { type: 'OPEN_AUTH', role: 'customer', pendingBooking: { event: { id: 1 } } });
  assert.equal(o?.type, 'auth');
  assert.equal(o?.role, 'customer');

  o = overlayReducer(o, { type: 'AUTH_EXPIRED' });
  assert.equal(o, null);
});

// ── 8. Admin Feedback State Machine Tests ───────────────────────────────────
test('adminFeedbackReducer: keeps error and success mutually exclusive', () => {
  let s = initialAdminFeedbackState;
  assert.equal(s.asyncStatus, 'loading');

  s = adminFeedbackReducer(s, { type: 'SET_LOADING', active: false });
  assert.equal(s.asyncStatus, 'idle');

  s = adminFeedbackReducer(s, { type: 'SET_ERROR', message: 'Save failed' });
  assert.equal(s.feedback?.type, 'error');
  assert.equal(s.feedback?.message, 'Save failed');

  s = adminFeedbackReducer(s, { type: 'SET_SUCCESS', message: 'Event saved' });
  assert.equal(s.feedback?.type, 'success');
  assert.equal(s.feedback?.message, 'Event saved');
});
