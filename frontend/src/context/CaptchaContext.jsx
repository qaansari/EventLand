import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { captchaApi } from '../services/api';

const CaptchaContext = createContext(null);

const DEFAULT_TEST_SITEKEY = '1x00000000000000000000AA'; // Cloudflare's official test sitekey

export function CaptchaProvider({ children }) {
  const [siteKey, setSiteKey] = useState(DEFAULT_TEST_SITEKEY);
  const [isCaptchaEnabled, setIsCaptchaEnabled] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [captchaToken, setCaptchaTokenState] = useState(null);
  const [resetSignal, setResetSignal] = useState(0);

  // Keep a ref to the current token for synchronous consumption
  const tokenRef = useRef(captchaToken);
  tokenRef.current = captchaToken;

  useEffect(() => {
    let isMounted = true;
    captchaApi.getConfig()
      .then((config) => {
        if (!isMounted) return;
        if (config?.siteKey) setSiteKey(config.siteKey);
        if (typeof config?.enabled === 'boolean') setIsCaptchaEnabled(config.enabled);
        setIsReady(true);
      })
      .catch((err) => {
        console.warn('[CaptchaProvider] Could not load backend captcha config, using defaults:', err);
        if (isMounted) setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setCaptchaToken = useCallback((token) => {
    setCaptchaTokenState(token);
  }, []);

  // Consumes the current captcha token for a sensitive action and resets it for replay protection
  const consumeCaptchaToken = useCallback(() => {
    const current = tokenRef.current;
    setCaptchaTokenState(null);
    return current;
  }, []);

  // Triggers challenge widget reset (e.g. after consumption, 403 bot error, or expiry)
  const resetCaptcha = useCallback(() => {
    setCaptchaTokenState(null);
    setResetSignal((prev) => prev + 1);
  }, []);

  const value = {
    siteKey,
    isCaptchaEnabled,
    isReady,
    captchaToken,
    setCaptchaToken,
    consumeCaptchaToken,
    resetCaptcha,
    resetSignal
  };

  return (
    <CaptchaContext.Provider value={value}>
      {children}
    </CaptchaContext.Provider>
  );
}

export function useCaptcha() {
  const context = useContext(CaptchaContext);
  if (!context) {
    return {
      siteKey: DEFAULT_TEST_SITEKEY,
      isCaptchaEnabled: true,
      isReady: true,
      captchaToken: null,
      setCaptchaToken: () => {},
      consumeCaptchaToken: () => null,
      resetCaptcha: () => {},
      resetSignal: 0
    };
  }
  return context;
}
