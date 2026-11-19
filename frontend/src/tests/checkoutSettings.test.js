import test from 'node:test';
import assert from 'node:assert/strict';
import { isCheckoutEnabled, setCheckoutEnabled } from '../services/checkoutSettings.js';

// Mock localStorage and window CustomEvent for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    dispatchEvent: () => true
  };
}

test('isCheckoutEnabled: defaults to false (Coming Soon mode active)', () => {
  localStorage.removeItem('eventland_checkout_enabled');
  assert.equal(isCheckoutEnabled(), false);
});

test('setCheckoutEnabled: enables checkout when set to true', () => {
  setCheckoutEnabled(true);
  assert.equal(isCheckoutEnabled(), true);
  assert.equal(localStorage.getItem('eventland_checkout_enabled'), 'true');
});

test('setCheckoutEnabled: disables checkout when set to false', () => {
  setCheckoutEnabled(false);
  assert.equal(isCheckoutEnabled(), false);
  assert.equal(localStorage.getItem('eventland_checkout_enabled'), 'false');
});
