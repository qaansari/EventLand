import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Mail, X, LogIn, UserPlus, Eye, EyeOff, Phone, Globe, RefreshCw, KeyRound, ArrowLeft } from 'lucide-react';
import { authApi, locationsApi, formatPhoneNumberOnSubmit } from '../services/api';
import { useToast } from '../context/ToastContext';
import { getStoredCaptchaToken } from '../utils/captcha';
import CloudflareTurnstile from './CloudflareTurnstile';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" style={{ flexShrink: 0 }}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// view modes: 'login' | 'signup' | 'forgot' | 'reset'
export default function AuthModal({ onClose, onLoginSuccess, initialMode = 'login' }) {
  const { showSuccess, showError } = useToast();
  const [view, setView] = useState(initialMode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [captchaToken, setCaptchaToken] = useState(() => getStoredCaptchaToken());
  const [countries, setCountries] = useState([
    { id: 1, name: 'Pakistan', code: 'PK', dialingCode: '+92' },
    { id: 2, name: 'United Arab Emirates', code: 'AE', dialingCode: '+971' },
    { id: 3, name: 'Saudi Arabia', code: 'SA', dialingCode: '+966' },
    { id: 4, name: 'United Kingdom', code: 'GB', dialingCode: '+44' },
    { id: 5, name: 'United States', code: 'US', dialingCode: '+1' }
  ]);
  const [selectedCountryId, setSelectedCountryId] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null); // 'google' | 'facebook' | null

  // Social Auth Environment Configuration
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const facebookAppId = (import.meta.env.VITE_FACEBOOK_APP_ID || '').trim();
  const googleBtnContainerRef = useRef(null);

  // Forgot / Reset password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    locationsApi.getCountries()
      .then(res => { if (Array.isArray(res) && res.length > 0) setCountries(res); })
      .catch(() => {/* use defaults */});
  }, []);

  useEffect(() => {
    const handleVerified = (e) => { if (e.detail?.token) setCaptchaToken(e.detail.token); };
    const handleReset = () => setCaptchaToken('');
    window.addEventListener('eventland:captcha-verified', handleVerified);
    window.addEventListener('eventland:captcha-reset', handleReset);
    return () => {
      window.removeEventListener('eventland:captcha-verified', handleVerified);
      window.removeEventListener('eventland:captcha-reset', handleReset);
    };
  }, []);

  // Unified authentication success dispatcher
  const handleAuthSuccess = (authData, isNewRegistration = false) => {
    const rawRole = authData.user?.role || '';
    const backendRole = rawRole.toLowerCase();
    let userRole = 'customer';
    if (backendRole.includes('admin')) userRole = 'admin';
    else if (backendRole.includes('organizer')) userRole = 'organizer';

    if (isNewRegistration) {
      showSuccess('Account Created! 🎉', `Welcome to EventLand, ${authData.user?.fullName || ''}!`);
    } else {
      showSuccess('Welcome Back! 🎉', `Signed in as ${authData.user?.fullName || authData.user?.email}`);
    }

    onLoginSuccess({
      id: authData.user?.id,
      name: authData.user?.fullName || authData.user?.email,
      email: authData.user?.email,
      phone: authData.user?.phoneNumber || '',
      countryId: authData.user?.countryId || 1,
      role: userRole,
      rawRole,
      roleName: rawRole,
      imageUrl: authData.user?.imageUrl || null,
      token: authData.token
    });
  };

  const initializedGsiRef = useRef(false);
  const handleCredentialResponseRef = useRef();

  handleCredentialResponseRef.current = (response) => {
    if (!response?.credential) return;
    setSocialLoading('google');
    setErrorMsg('');
    authApi.googleAuth(response.credential)
      .then((authData) => {
        handleAuthSuccess(authData);
      })
      .catch((err) => {
        const msg = err.message || 'Google sign-in failed. Please try again.';
        setErrorMsg(msg);
        showError('Google Sign-In Failed', msg);
      })
      .finally(() => {
        setSocialLoading(null);
      });
  };

  // Google Identity Services (GSI) loader & initialization
  useEffect(() => {
    if (!googleClientId) return;

    const renderGoogleBtn = () => {
      if (!window.google?.accounts?.id || !googleBtnContainerRef.current) return;
      try {
        googleBtnContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          theme: 'outline',
          size: 'large',
          width: 376,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        });
      } catch (err) {
        console.warn('Google renderButton warning:', err);
      }
    };

    const initGsi = () => {
      if (!window.google?.accounts?.id) return;
      try {
        if (!initializedGsiRef.current) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: function (response) {
              handleCredentialResponseRef.current?.(response);
            },
            use_fedcm_for_prompt: false,
            auto_select: false,
            cancel_on_tap_outside: true
          });
          initializedGsiRef.current = true;
        }
        renderGoogleBtn();
      } catch (err) {
        console.warn('Google GSI initialization warning:', err);
      }
    };

    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.body.appendChild(script);
    } else {
      initGsi();
    }
  }, [googleClientId, view]);

  // Facebook JS SDK loader & initialization
  useEffect(() => {
    if (!facebookAppId) return;

    if (!document.getElementById('facebook-jssdk')) {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: facebookAppId,
          cookie: true,
          xfbml: true,
          version: 'v19.0'
        });
      };
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else if (window.FB) {
      window.FB.init({
        appId: facebookAppId,
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
    }
  }, [facebookAppId]);

  // Social Auth Handlers
  const handleGoogleSignIn = () => {
    if (!googleClientId) {
      const msg = 'Google authentication is not configured on this environment. Set VITE_GOOGLE_CLIENT_ID in your .env.local file.';
      setErrorMsg(msg);
      showError('Google Auth Not Configured', msg);
      return;
    }
    const innerBtn = googleBtnContainerRef.current?.querySelector('div[role="button"]')
      || googleBtnContainerRef.current?.querySelector('button');
    if (innerBtn && innerBtn !== document.activeElement) {
      innerBtn.click();
      return;
    }
    if (!window.google?.accounts?.id) {
      showError('Google Sign-In', 'Google Identity Services are still loading. Please try again in a moment.');
      return;
    }
    try {
      window.google.accounts.id.prompt();
    } catch (err) {
      console.warn('Google prompt exception:', err);
    }
  };

  const handleFacebookSignIn = () => {
    if (!facebookAppId) {
      const msg = 'Facebook authentication is not configured on this environment. Set VITE_FACEBOOK_APP_ID in your .env.local file.';
      setErrorMsg(msg);
      showError('Facebook Auth Not Configured', msg);
      return;
    }

    setSocialLoading('facebook');
    setErrorMsg('');

    // If running under HTTPS and FB SDK is available, use native FB.login()
    if (window.location.protocol === 'https:' && window.FB) {
      window.FB.login(
        async (response) => {
          if (response.authResponse?.accessToken) {
            try {
              const authData = await authApi.facebookAuth(response.authResponse.accessToken);
              handleAuthSuccess(authData);
            } catch (err) {
              const msg = err.message || 'Facebook authentication failed. Please try again.';
              setErrorMsg(msg);
              showError('Facebook Sign-In Failed', msg);
            } finally {
              setSocialLoading(null);
            }
          } else {
            setSocialLoading(null);
            if (response.status !== 'unknown') {
              showError('Facebook Sign-In', 'Facebook login was cancelled or denied.');
            }
          }
        },
        { scope: 'public_profile,email' }
      );
      return;
    }

    // When on HTTP (e.g. http://localhost), Meta blocks FB.login() in sdk.js.
    // Use the official Meta OAuth Dialog in a standard popup window.
    const redirectUri = window.location.origin;
    const fbOAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(facebookAppId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=email,public_profile`;

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      fbOAuthUrl,
      'facebook_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );

    if (!popup) {
      setSocialLoading(null);
      showError('Popup Blocked', 'Please allow popups for this site to sign in with Facebook.');
      return;
    }

    const timer = setInterval(async () => {
      try {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setSocialLoading(null);
          return;
        }

        // Check if redirected back to our origin with hash fragment containing access_token
        if (popup.location.origin === window.location.origin) {
          const hash = popup.location.hash;
          if (hash && hash.includes('access_token=')) {
            clearInterval(timer);
            const params = new URLSearchParams(hash.replace(/^#/, ''));
            const accessToken = params.get('access_token');
            popup.close();

            if (accessToken) {
              try {
                const authData = await authApi.facebookAuth(accessToken);
                handleAuthSuccess(authData);
              } catch (err) {
                const msg = err.message || 'Facebook authentication failed. Please try again.';
                setErrorMsg(msg);
                showError('Facebook Sign-In Failed', msg);
              } finally {
                setSocialLoading(null);
              }
            } else {
              setSocialLoading(null);
            }
          } else if (hash && (hash.includes('error=') || hash.includes('error_reason='))) {
            clearInterval(timer);
            popup.close();
            setSocialLoading(null);
            showError('Facebook Sign-In', 'Facebook sign-in was denied or cancelled.');
          }
        }
      } catch {
        // Cross-origin access throws DOMException while popup is on facebook.com — ignore until redirected back
      }
    }, 500);
  };

  const activeCountry = countries.find(c => c.id === Number(selectedCountryId)) || countries[0];
  const activeDialingCode = activeCountry?.dialingCode || '+92';

  const switchView = (next) => {
    setErrorMsg('');
    setView(next);
  };

  // ── Login / Register ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailPattern.test(email.trim())) {
      const msg = 'Please enter a valid email address (e.g. user@example.com).';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    if (view === 'signup') {
      if (!password || password.length < 10) {
        const msg = 'Password must be at least 10 characters long.';
        setErrorMsg(msg); showError('Validation Error', msg); return;
      }
      if (!/[A-Z]/.test(password)) {
        const msg = 'Password must contain at least one uppercase letter (A-Z).';
        setErrorMsg(msg); showError('Validation Error', msg); return;
      }
      if (!/[a-z]/.test(password)) {
        const msg = 'Password must contain at least one lowercase letter (a-z).';
        setErrorMsg(msg); showError('Validation Error', msg); return;
      }
      if (!/[0-9]/.test(password)) {
        const msg = 'Password must contain at least one number (0-9).';
        setErrorMsg(msg); showError('Validation Error', msg); return;
      }
      if (!/[^a-zA-Z0-9]/.test(password)) {
        const msg = 'Password must contain at least one special character (!@#$%^&*).';
        setErrorMsg(msg); showError('Validation Error', msg); return;
      }
    } else {
      if (!password.trim()) {
        const msg = 'Password is required.';
        setErrorMsg(msg); showError('Validation Error', msg); return;
      }
    }

    setLoading(true);
    try {
      if (view === 'signup') {
        if (!name.trim()) {
          const msg = 'Please enter your full name to register.';
          setErrorMsg(msg); showError('Registration Error', msg);
          setLoading(false); return;
        }
        if (phone && phone.trim()) {
          const digitsOnly = phone.replace(/\D/g, '');
          if (digitsOnly.length < 7 || digitsOnly.length > 15) {
            const msg = 'Please enter a valid phone number (7-15 digits).';
            setErrorMsg(msg); showError('Registration Error', msg);
            setLoading(false); return;
          }
        }
        const formattedPhone = formatPhoneNumberOnSubmit(phone, activeDialingCode);
        const authData = await authApi.register(name.trim(), email.trim(), password, formattedPhone, Number(selectedCountryId));
        handleAuthSuccess(authData, true);
      } else {
        const authData = await authApi.login(email.trim(), password);
        handleAuthSuccess(authData, false);
      }
    } catch (err) {
      const msg = err.message || 'Authentication failed. Check your credentials.';
      setErrorMsg(msg);
      showError('Authentication Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ─────────────────────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!forgotEmail.trim() || !emailPattern.test(forgotEmail.trim())) {
      const msg = 'Please enter a valid email address.';
      setErrorMsg(msg); showError('Validation Error', msg); return;
    }
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(forgotEmail.trim());
      // In development the API returns a resetToken for testing — pre-fill it
      if (res?.resetToken) setResetToken(res.resetToken);
      setForgotSent(true);
      showSuccess('Email Sent', 'If an account exists for that email, a reset code has been issued.');
    } catch (err) {
      const msg = err.message || 'Failed to send reset request.';
      setErrorMsg(msg); showError('Request Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password ──────────────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!resetToken.trim()) {
      const msg = 'Please enter the reset token from your email.';
      setErrorMsg(msg); showError('Validation Error', msg); return;
    }
    if (!newPassword || newPassword.length < 10) {
      const msg = 'New password must be at least 10 characters.';
      setErrorMsg(msg); showError('Validation Error', msg); return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
      const msg = 'Password must include uppercase, lowercase, number, and special character.';
      setErrorMsg(msg); showError('Validation Error', msg); return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(forgotEmail.trim(), resetToken.trim(), newPassword);
      showSuccess('Password Reset! ✓', 'Your password has been updated. Please sign in.');
      setForgotSent(false);
      setResetToken('');
      setNewPassword('');
      setEmail(forgotEmail);
      switchView('login');
    } catch (err) {
      const msg = err.message || 'Failed to reset password. Token may be invalid or expired.';
      setErrorMsg(msg); showError('Reset Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Shared styles ───────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 2.75rem',
    background: 'rgba(12, 23, 54, 0.6)',
    border: '1px solid rgba(13, 148, 136, 0.2)',
    borderRadius: '10px',
    color: '#f8fafc',
    fontSize: '0.875rem',
    outline: 'none'
  };

  const labelStyle = { display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay modal-dialog-centered">
      <div
        className="auth-modal-content modal-content glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', padding: 'clamp(1.25rem, 4vw, 2rem)', position: 'relative' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.25rem', right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.08)', border: 'none',
            color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Back button for forgot/reset views */}
        {(view === 'forgot' || view === 'reset') && (
          <button
            onClick={() => { setForgotSent(false); switchView('login'); }}
            style={{
              position: 'absolute', top: '1.25rem', left: '1.25rem',
              background: 'rgba(255, 255, 255, 0.08)', border: 'none',
              color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.2), rgba(13, 148, 136, 0.25))',
            border: '1px solid rgba(13, 148, 136, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', color: '#0d9488', boxShadow: '0 0 20px rgba(13, 148, 136, 0.25)'
          }}>
            {view === 'signup' ? <UserPlus size={24} /> : view === 'forgot' || view === 'reset' ? <KeyRound size={24} /> : <LogIn size={24} />}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
            {view === 'signup' ? 'Create an Account' : view === 'forgot' ? 'Forgot Password' : view === 'reset' ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            {view === 'signup' ? 'Join EventLand to book tickets and manage events'
              : view === 'forgot' ? 'Enter your email to receive a password reset token'
              : view === 'reset' ? 'Enter the reset token and your new password'
              : 'Sign in to access your dashboard and tickets'}
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '10px', color: '#f87171', fontSize: '0.8125rem', marginBottom: '1.25rem'
          }}>
            {errorMsg}
          </div>
        )}

        {/* ── Forgot Password Form ── */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.875rem', background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 600,
                fontSize: '0.9375rem', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, boxShadow: '0 4px 16px rgba(13, 148, 136, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {loading ? <><RefreshCw size={16} className="animate-spin" /><span>Sending...</span></> : 'Send Reset Token'}
            </button>

            {forgotSent && (
              <p style={{ color: '#10b981', fontSize: '0.8125rem', textAlign: 'center' }}>
                Reset token sent! Check your email or{' '}
                <button
                  type="button"
                  onClick={() => switchView('reset')}
                  style={{ background: 'none', border: 'none', color: '#2dd4bf', fontWeight: 600, cursor: 'pointer' }}
                >
                  enter it here
                </button>.
              </p>
            )}

            <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#94a3b8' }}>
              <button onClick={() => switchView('login')} style={{ background: 'none', border: 'none', color: '#2dd4bf', fontWeight: 600, cursor: 'pointer' }}>
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ── Reset Password Form ── */}
        {view === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Reset Token</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Paste your reset token"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem', borderRadius: '6px' }}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div style={{ marginTop: '0.45rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.65rem', fontSize: '0.72rem' }}>
                <span style={{ color: newPassword.length >= 10 ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>{newPassword.length >= 10 ? '✓' : '○'} 10+ chars</span>
                <span style={{ color: /[A-Z]/.test(newPassword) ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>{/[A-Z]/.test(newPassword) ? '✓' : '○'} Uppercase</span>
                <span style={{ color: /[a-z]/.test(newPassword) ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>{/[a-z]/.test(newPassword) ? '✓' : '○'} Lowercase</span>
                <span style={{ color: /[0-9]/.test(newPassword) ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>{/[0-9]/.test(newPassword) ? '✓' : '○'} Number</span>
                <span style={{ color: /[^a-zA-Z0-9]/.test(newPassword) ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>{/[^a-zA-Z0-9]/.test(newPassword) ? '✓' : '○'} Symbol</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.875rem', background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 600,
                fontSize: '0.9375rem', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, boxShadow: '0 4px 16px rgba(13, 148, 136, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {loading ? <><RefreshCw size={16} className="animate-spin" /><span>Resetting...</span></> : 'Reset Password'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#94a3b8' }}>
              Don&apos;t have a token?{' '}
              <button onClick={() => switchView('forgot')} style={{ background: 'none', border: 'none', color: '#2dd4bf', fontWeight: 600, cursor: 'pointer' }}>
                Request one
              </button>
            </div>
          </form>
        )}

        {/* ── Login / Signup Form ── */}
        {(view === 'login' || view === 'signup') && (
          <>
            {/* Social Authentication Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
              {/* Google Button */}
              <div
                ref={googleBtnContainerRef}
                style={{
                  width: '100%',
                  minHeight: '44px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || !!socialLoading}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: (loading || !!socialLoading) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                >
                  {socialLoading === 'google' ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>Continue with Google</span>
                </button>
              </div>

              {/* Facebook Button */}
              <button
                type="button"
                onClick={handleFacebookSignIn}
                disabled={loading || !!socialLoading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(24, 119, 242, 0.12)',
                  border: '1px solid rgba(24, 119, 242, 0.3)',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: (loading || !!socialLoading) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(24, 119, 242, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(24, 119, 242, 0.12)'}
              >
                {socialLoading === 'facebook' ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <FacebookIcon />
                )}
                <span>Continue with Facebook</span>
              </button>

              {/* Or Divider */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0', gap: '0.75rem' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  or continue with email
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="auth-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {view === 'signup' && (
              <>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Qamar Ansari"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Country</label>
                  <div style={{ position: 'relative' }}>
                    <Globe size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 1 }} />
                    <select
                      value={selectedCountryId}
                      onChange={(e) => setSelectedCountryId(Number(e.target.value))}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {countries.map(c => (
                        <option key={c.id} value={c.id} style={{ background: '#0b1328', color: '#fff' }}>
                          {c.name} ({c.dialingCode || c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Mobile / WhatsApp Number</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{
                      padding: '0.75rem 0.85rem',
                      background: 'rgba(13, 148, 136, 0.15)', border: '1px solid rgba(13, 148, 136, 0.35)',
                      borderRadius: '10px', color: '#2dd4bf', fontWeight: 700, fontSize: '0.875rem',
                      display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap'
                    }}>
                      <Phone size={15} /> {activeDialingCode}
                    </div>
                    <input
                      type="tel"
                      placeholder="331 2541767"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        flex: 1, padding: '0.75rem 1rem',
                        background: 'rgba(12, 23, 54, 0.6)', border: '1px solid rgba(13, 148, 136, 0.2)',
                        borderRadius: '10px', color: '#f8fafc', fontSize: '0.875rem', outline: 'none'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    If typed with leading &apos;0&apos;, it will automatically be trimmed upon saving.
                  </span>
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                {view === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); switchView('forgot'); }}
                    style={{ background: 'none', border: 'none', color: '#2dd4bf', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0.25rem', borderRadius: '6px', transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#94a3b8'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {view === 'signup' && (
                <div style={{ marginTop: '0.45rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.65rem', fontSize: '0.72rem' }}>
                  <span style={{ color: password.length >= 10 ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>{password.length >= 10 ? '✓' : '○'} 10+ chars</span>
                  <span style={{ color: /[A-Z]/.test(password) ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>{/[A-Z]/.test(password) ? '✓' : '○'} Uppercase</span>
                  <span style={{ color: /[a-z]/.test(password) ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>{/[a-z]/.test(password) ? '✓' : '○'} Lowercase</span>
                  <span style={{ color: /[0-9]/.test(password) ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>{/[0-9]/.test(password) ? '✓' : '○'} Number</span>
                  <span style={{ color: /[^a-zA-Z0-9]/.test(password) ? '#10b981' : '#64748b', transition: 'color 0.2s' }}>{/[^a-zA-Z0-9]/.test(password) ? '✓' : '○'} Symbol</span>
                </div>
              )}
            </div>

            <CloudflareTurnstile
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken('')}
              onError={() => setCaptchaToken('')}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.5rem', padding: '0.875rem',
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 600,
                fontSize: '0.9375rem', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, boxShadow: '0 4px 16px rgba(13, 148, 136, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {loading ? (
                <><RefreshCw size={16} className="animate-spin" /><span>Authenticating...</span></>
              ) : (
                view === 'signup' ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>
          </>
        )}

        {/* Login / Signup switcher */}
        {(view === 'login' || view === 'signup') && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8125rem', color: '#94a3b8' }}>
            {view === 'signup' ? (
              <span>
                Already have an account?{' '}
                <button onClick={() => switchView('login')} style={{ background: 'none', border: 'none', color: '#2dd4bf', fontWeight: 600, cursor: 'pointer' }}>
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don&apos;t have an account?{' '}
                <button onClick={() => switchView('signup')} style={{ background: 'none', border: 'none', color: '#2dd4bf', fontWeight: 600, cursor: 'pointer' }}>
                  Sign Up
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
