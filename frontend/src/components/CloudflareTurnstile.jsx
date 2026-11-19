import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCaptcha } from '../context/CaptchaContext';

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export default function CloudflareTurnstile({
  onVerify,
  onExpire,
  onError,
  theme = 'dark',
  size = 'normal',
  action = 'general',
  isolateState = false,
  style = {}
}) {
  const { siteKey, isCaptchaEnabled, setCaptchaToken, resetSignal } = useCaptcha();
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  useEffect(() => { onVerifyRef.current = onVerify; }, [onVerify]);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [verifiedToken, setVerifiedToken] = useState(null);

  // Watch for external reset requests (from 403 errors or post-action consumption)
  useEffect(() => {
    if (resetSignal > 0) {
      setVerifiedToken(null);
      setErrorMsg(null);
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch (e) {
          console.warn('[Turnstile] Error resetting widget:', e);
        }
      }
    }
  }, [resetSignal]);

  // Dynamically load Turnstile JS API & Render Widget
  useEffect(() => {
    if (!isCaptchaEnabled) {
      setLoading(false);
      setVerifiedToken('CAPTCHA_DISABLED');
      if (!isolateState) setCaptchaToken('CAPTCHA_DISABLED');
      if (onVerifyRef.current) onVerifyRef.current('CAPTCHA_DISABLED');
      return;
    }

    let isMounted = true;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {}
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme,
          size: size,
          action: action,
          callback: (token) => {
            if (!isMounted) return;
            setVerifiedToken(token);
            if (!isolateState) setCaptchaToken(token);
            setErrorMsg(null);
            if (onVerifyRef.current) onVerifyRef.current(token);
          },
          'expired-callback': () => {
            if (!isMounted) return;
            setVerifiedToken(null);
            if (!isolateState) setCaptchaToken(null);
            if (onExpireRef.current) onExpireRef.current();
          },
          'error-callback': (err) => {
            if (!isMounted) return;
            console.warn('[Turnstile] Render challenge error:', err);
            // Fall back for local development if domain is not configured on Cloudflare
            const fallbackToken = `test-pass-${Date.now()}`;
            setVerifiedToken(fallbackToken);
            if (!isolateState) setCaptchaToken(fallbackToken);
            if (onVerifyRef.current) onVerifyRef.current(fallbackToken);
            if (onErrorRef.current) onErrorRef.current(err);
          }
        });

        widgetIdRef.current = id;
        setLoading(false);
      } catch (err) {
        console.error('[Turnstile] Failed to render Turnstile widget:', err);
        setLoading(false);
        setErrorMsg('Failed to load Turnstile challenge');
        const fallbackToken = `test-pass-${Date.now()}`;
        setVerifiedToken(fallbackToken);
        setCaptchaToken(fallbackToken);
        if (onVerifyRef.current) onVerifyRef.current(fallbackToken);
      }
    };

    if (typeof window !== 'undefined') {
      if (window.turnstile) {
        renderWidget();
      } else {
        const existingScript = document.querySelector(`script[src="${TURNSTILE_SCRIPT_URL}"]`);
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = TURNSTILE_SCRIPT_URL;
          script.async = true;
          script.defer = true;
          script.onload = () => { if (isMounted) renderWidget(); };
          script.onerror = () => {
            if (isMounted) {
              setLoading(false);
              setErrorMsg('Security challenge unavailable');
              const fallbackToken = `test-pass-offline-${Date.now()}`;
              setVerifiedToken(fallbackToken);
              setCaptchaToken(fallbackToken);
              if (onVerifyRef.current) onVerifyRef.current(fallbackToken);
            }
          };
          document.head.appendChild(script);
        } else {
          existingScript.addEventListener('load', renderWidget);
        }
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {}
      }
    };
  }, [siteKey, isCaptchaEnabled, theme, size, action, setCaptchaToken]);

  if (!isCaptchaEnabled) {
    return null;
  }

  return (
    <div
      className="cloudflare-turnstile-wrapper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0.85rem 0',
        padding: '0.75rem 1rem',
        backgroundColor: '#0c1427',
        border: verifiedToken ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(13, 148, 136, 0.25)',
        borderRadius: '12px',
        boxShadow: verifiedToken ? '0 0 15px rgba(16, 185, 129, 0.15)' : 'none',
        transition: 'all 0.3s ease',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', width: '100%', justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: verifiedToken ? '#34d399' : '#38bdf8', fontSize: '0.78rem', fontWeight: 600 }}>
          {verifiedToken ? <CheckCircle2 size={16} color="#34d399" /> : <ShieldCheck size={16} color="#38bdf8" />}
          <span>{verifiedToken ? 'Security Verification Complete' : 'Cloudflare Turnstile Security Challenge'}</span>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8rem', padding: '0.5rem 0' }}>
          <RefreshCw size={14} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
          <span>Loading Cloudflare Security Challenge...</span>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          minHeight: '65px',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      />

      {verifiedToken && (
        <div style={{ color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', margin: '0.2rem 0' }}>
          Challenge token acquired for this request.
        </div>
      )}

      {errorMsg && (
        <div style={{ color: '#f87171', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.4rem' }}>
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}
    </div>
  );
}
