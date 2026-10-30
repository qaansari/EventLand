import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const recentToastsRef = useRef(new Map());
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title = '', message = '', duration = 4000 }) => {
    const now = Date.now();
    const exactKey = `${type}:${title}:${message}`;
    const titleKey = `${type}:${title}`;

    // Suppress identical notification alerts within a 1000ms window
    const lastExactTime = recentToastsRef.current.get(exactKey);
    if (lastExactTime && (now - lastExactTime) < 1000) {
      return null;
    }

    // Suppress rapid duplicate alerts with identical type and title within 500ms
    const lastTitleTime = recentToastsRef.current.get(titleKey);
    if (lastTitleTime && (now - lastTitleTime) < 500) {
      return null;
    }

    recentToastsRef.current.set(exactKey, now);
    recentToastsRef.current.set(titleKey, now);

    // Clean up stale entries older than 5 seconds to keep map lean
    if (recentToastsRef.current.size > 30) {
      for (const [k, ts] of recentToastsRef.current.entries()) {
        if (now - ts > 5000) {
          recentToastsRef.current.delete(k);
        }
      }
    }

    const id = `${now}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast = { id, type, title, message, duration };

    setToasts((prev) => {
      // Prevent duplicate if an identical alert is currently active on screen
      if (prev.some((t) => t.type === type && t.title === title && t.message === message)) {
        return prev;
      }
      return [newToast, ...prev].slice(0, 5); // Keep max 5 active toasts
    });

    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [removeToast]);

  const showSuccess = useCallback((title, message, duration) => {
    return addToast({ type: 'success', title, message, duration });
  }, [addToast]);

  const showError = useCallback((title, message, duration) => {
    return addToast({ type: 'error', title, message, duration });
  }, [addToast]);

  const showInfo = useCallback((title, message, duration) => {
    return addToast({ type: 'info', title, message, duration });
  }, [addToast]);

  const showWarning = useCallback((title, message, duration) => {
    return addToast({ type: 'warning', title, message, duration });
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
