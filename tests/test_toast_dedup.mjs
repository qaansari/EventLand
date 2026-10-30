import assert from 'assert';

// Simulating the ToastContext deduplication logic
class ToastManager {
  constructor() {
    this.toasts = [];
    this.recentToasts = new Map();
    this.timers = new Map();
  }

  removeToast(id) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  addToast({ type = 'info', title = '', message = '', duration = 4000 }) {
    const now = Date.now();
    const exactKey = `${type}:${title}:${message}`;
    const titleKey = `${type}:${title}`;

    // Suppress identical notification alerts within a 1000ms window
    const lastExactTime = this.recentToasts.get(exactKey);
    if (lastExactTime && (now - lastExactTime) < 1000) {
      return null;
    }

    // Suppress rapid duplicate alerts with identical type and title within 500ms
    const lastTitleTime = this.recentToasts.get(titleKey);
    if (lastTitleTime && (now - lastTitleTime) < 500) {
      return null;
    }

    this.recentToasts.set(exactKey, now);
    this.recentToasts.set(titleKey, now);

    const id = `${now}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast = { id, type, title, message, duration };

    // Prevent duplicate if an identical alert is currently active on screen
    if (this.toasts.some(t => t.type === type && t.title === title && t.message === message)) {
      return null;
    }

    this.toasts = [newToast, ...this.toasts].slice(0, 5);
    return id;
  }
}

// TEST 1: Rapid identical toast suppression
console.log('--- RUNNING TOAST DEDUPLICATION VERIFICATION ---');
const tm = new ToastManager();

const id1 = tm.addToast({ type: 'success', title: 'Welcome Back! 🎉', message: 'Signed in as user@example.com' });
assert.ok(id1 !== null, 'First toast must be accepted');
assert.strictEqual(tm.toasts.length, 1, 'Should have 1 active toast');

// Immediate second identical toast (e.g. StrictMode, double click, duplicate event)
const id2 = tm.addToast({ type: 'success', title: 'Welcome Back! 🎉', message: 'Signed in as user@example.com' });
assert.strictEqual(id2, null, 'Second rapid identical toast must be suppressed');
assert.strictEqual(tm.toasts.length, 1, 'Active toasts must still be exactly 1');
console.log('✅ TEST 1 PASSED: Rapid identical toast suppressed.');

// TEST 2: Same title rapid cascade suppression (e.g. AuthModal + App.jsx firing together)
const tm2 = new ToastManager();
const t1 = tm2.addToast({ type: 'success', title: 'Welcome Back! 🎉', message: 'Signed in as user@example.com' });
assert.ok(t1 !== null, 'First login toast accepted');
const t2 = tm2.addToast({ type: 'success', title: 'Welcome Back! 🎉', message: 'Logged in as user@example.com (CUSTOMER)' });
assert.strictEqual(t2, null, 'Cascade duplicate login toast with same title within 500ms must be suppressed');
assert.strictEqual(tm2.toasts.length, 1, 'Active toasts must still be exactly 1');
console.log('✅ TEST 2 PASSED: Same title cascade toast suppressed.');

// TEST 3: Distinct toasts are allowed
const t3 = tm2.addToast({ type: 'info', title: 'Different Alert', message: 'Some different info' });
assert.ok(t3 !== null, 'Distinct toast must be allowed');
assert.strictEqual(tm2.toasts.length, 2, 'Should now have 2 active toasts');
console.log('✅ TEST 3 PASSED: Distinct toasts are properly allowed.');

console.log('🎉 ALL TOAST DEDUPLICATION TESTS PASSED!');

