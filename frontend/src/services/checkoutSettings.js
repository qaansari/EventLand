import { useState, useEffect } from 'react';

const CHECKOUT_ENABLED_KEY = 'eventland_checkout_enabled';
const CHECKOUT_STATUS_EVENT = 'eventland_checkout_status_change';

/**
 * Checks whether the customer checkout is currently enabled.
 * Defaults to `false` (Coming Soon mode is active).
 */
export function isCheckoutEnabled() {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(CHECKOUT_ENABLED_KEY);
  // Default is disabled ('false')
  if (stored === null || stored === undefined) {
    return false;
  }
  return stored === 'true';
}

/**
 * Updates the checkout enabled status (Admin only).
 * Dispatches an event so all listening components update synchronously.
 * @param {boolean} enabled
 */
export function setCheckoutEnabled(enabled) {
  if (typeof window === 'undefined') return;
  const val = Boolean(enabled);
  localStorage.setItem(CHECKOUT_ENABLED_KEY, val ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent(CHECKOUT_STATUS_EVENT, { detail: { enabled: val } }));
}

/**
 * Custom React hook to subscribe to checkout enabled status in real time.
 */
export function useCheckoutStatus() {
  const [enabled, setEnabled] = useState(() => isCheckoutEnabled());

  useEffect(() => {
    const handleStatusChange = (e) => {
      if (e?.detail?.enabled !== undefined) {
        setEnabled(e.detail.enabled);
      } else {
        setEnabled(isCheckoutEnabled());
      }
    };

    window.addEventListener(CHECKOUT_STATUS_EVENT, handleStatusChange);
    window.addEventListener('storage', handleStatusChange);

    return () => {
      window.removeEventListener(CHECKOUT_STATUS_EVENT, handleStatusChange);
      window.removeEventListener('storage', handleStatusChange);
    };
  }, []);

  return {
    isCheckoutEnabled: enabled,
    setCheckoutEnabled: (val) => setCheckoutEnabled(val),
    toggleCheckout: () => setCheckoutEnabled(!enabled)
  };
}
