import { useReducer, useEffect, useCallback, useRef } from 'react';
import { paymentsApi } from '../services/api';
import {
  checkoutReducer,
  getInitialContext,
  CheckoutState,
  CheckoutContext,
  CheckoutEvent
} from '../machines/checkoutReducer';

export type { CheckoutState, CheckoutContext, CheckoutEvent };
export { checkoutReducer, getInitialContext };

const CHECKOUT_SESSION_KEY = 'eventland_active_checkout_booking';

export function useCheckoutMachine(initialExpiresAt?: string | null) {
  const [context, dispatch] = useReducer(checkoutReducer, getInitialContext());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Resume active booking from sessionStorage if available
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(CHECKOUT_SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.booking?.bookingRef && parsed?.voucher) {
          dispatch({
            type: 'VOUCHER_ISSUED',
            payload: {
              booking: parsed.booking,
              voucher: parsed.voucher,
              expiresAt: parsed.expiresAt
            }
          });
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Persist active booking reference to resume after refresh
  useEffect(() => {
    if (context.state === 'voucher_pending' && context.booking?.bookingRef) {
      try {
        sessionStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify({
          booking: context.booking,
          voucher: context.voucherCode,
          expiresAt: context.expiresAt
        }));
      } catch { /* ignore */ }
    } else if (context.state === 'confirmed' || context.state === 'failed') {
      try {
        sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
      } catch { /* ignore */ }
    }
  }, [context.state, context.booking, context.voucherCode, context.expiresAt]);

  // Expose countdown driven by server's PaymentExpiresAt
  useEffect(() => {
    if (context.expiresAt) {
      const expTime = new Date(context.expiresAt).getTime();
      const diffSecs = Math.max(0, Math.floor((expTime - Date.now()) / 1000));
      dispatch({ type: 'SYNC_EXPIRY', secondsRemaining: diffSecs });
    }
  }, [context.expiresAt]);

  // Second-by-second countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling with backoff and auto-stop on terminal states (confirmed / failed)
  const pollStatus = useCallback(async () => {
    const bookingRef = context.booking?.bookingRef;
    if (!bookingRef || context.state !== 'voucher_pending') return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    dispatch({ type: 'STATUS_CHECK_START' });
    try {
      const res = await paymentsApi.getPaymentStatus(bookingRef);
      if (res && (res.isPaid || res.ticketReady || res.paymentStatus === 'Paid')) {
        dispatch({ type: 'STATUS_CHECKED', status: 'paid' });
      } else if (res && (res.paymentStatus === 'Failed' || res.status === 'Cancelled')) {
        dispatch({ type: 'STATUS_CHECKED', status: 'failed', message: res.failureReason || 'Payment rejected.' });
      } else {
        dispatch({ type: 'STATUS_CHECKED', status: 'pending' });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        dispatch({ type: 'STATUS_CHECKED', status: 'pending' });
      }
    }
  }, [context.booking?.bookingRef, context.state]);

  // Polling loop with backoff (starts at 5s, ramps up to 15s)
  useEffect(() => {
    if (context.state !== 'voucher_pending') return undefined;

    let delay = 5000;
    let timerId: any = null;

    const tick = async () => {
      await pollStatus();
      delay = Math.min(delay + 2000, 15000);
      timerId = setTimeout(tick, delay);
    };

    timerId = setTimeout(tick, delay);

    return () => {
      clearTimeout(timerId);
      abortControllerRef.current?.abort();
    };
  }, [context.state, pollStatus]);

  return {
    state: context.state,
    context,
    dispatch,
    pollStatus,
  };
}
