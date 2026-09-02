import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, X, LogIn, UserPlus, Eye, EyeOff, Phone, Globe } from 'lucide-react';
import { authApi, locationsApi, formatPhoneNumberOnSubmit } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function AuthModal({ onClose, onLoginSuccess, initialMode = 'login' }) {
  const { showSuccess, showError } = useToast();
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
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

  useEffect(() => {
    async function fetchCountries() {
      try {
        const res = await locationsApi.getCountries();
        if (Array.isArray(res) && res.length > 0) {
          setCountries(res);
        }
      } catch (err) {
        console.warn('Could not fetch countries:', err);
      }
    }
    fetchCountries();
  }, []);

  const activeCountry = countries.find(c => c.id === Number(selectedCountryId)) || countries[0];
  const activeDialingCode = activeCountry?.dialingCode || '+92';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      const msg = 'Please enter a valid email and password.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          const msg = 'Please enter your full name to register.';
          setErrorMsg(msg);
          showError('Registration Error', msg);
          setLoading(false);
          return;
        }

        // Clean leading zero & concatenate dialing code
        const formattedPhone = formatPhoneNumberOnSubmit(phone, activeDialingCode);

        // Register with live .NET Backend API (auto-login: returns JWT)
        const authData = await authApi.register(name.trim(), email.trim(), password, formattedPhone, Number(selectedCountryId));
        showSuccess('Account Created! 🎉', `Welcome to EventLand, ${name.trim()}!`);
        onLoginSuccess({
          id: authData.user?.id,
          name: authData.user?.fullName || name.trim(),
          email: authData.user?.email || email.trim(),
          phone: authData.user?.phoneNumber || formattedPhone,
          countryId: authData.user?.countryId || Number(selectedCountryId),
          role: 'customer',
          token: authData.token
        });
      } else {
        // Authenticate with live .NET Backend API
        const authData = await authApi.login(email.trim(), password);

        const backendRole = (authData.user?.role || '').toLowerCase();
        let userRole = 'customer';
        if (backendRole.includes('admin')) userRole = 'admin';
        else if (backendRole.includes('organizer')) userRole = 'organizer';

        onLoginSuccess({
          id: authData.user?.id,
          name: authData.user?.fullName || authData.user?.email,
          email: authData.user?.email,
          phone: authData.user?.phoneNumber || '',
          countryId: authData.user?.countryId || 1,
          role: userRole,
          token: authData.token
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.message || 'Authentication failed. Check your credentials.';
      setErrorMsg(msg);
      showError('Authentication Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div 
        className="auth-modal-content modal-content glass-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#94a3b8',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Header with Logo Royal Blue Scheme */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div 
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.2), rgba(13, 148, 136, 0.25))',
              border: '1px solid rgba(13, 148, 136, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#0d9488',
              boxShadow: '0 0 20px rgba(13, 148, 136, 0.25)'
            }}
          >
            {isSignUp ? <UserPlus size={24} /> : <LogIn size={24} />}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
            {isSignUp ? 'Create an Account' : 'Welcome Back'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            {isSignUp 
              ? 'Join EventLand to book tickets and manage events' 
              : 'Sign in to access your dashboard and tickets'}
          </p>
        </div>

        {errorMsg && (
          <div 
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px',
              color: '#f87171',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem'
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isSignUp && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Qamar Ansari"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.75rem',
                      background: 'rgba(12, 23, 54, 0.6)',
                      border: '1px solid rgba(13, 148, 136, 0.2)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                  Country
                </label>
                <div style={{ position: 'relative' }}>
                  <Globe size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 1 }} />
                  <select
                    value={selectedCountryId}
                    onChange={(e) => setSelectedCountryId(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.75rem',
                      background: 'rgba(12, 23, 54, 0.6)',
                      border: '1px solid rgba(13, 148, 136, 0.2)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
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
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                  Mobile / WhatsApp Number
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{
                    padding: '0.75rem 0.85rem',
                    background: 'rgba(13, 148, 136, 0.15)',
                    border: '1px solid rgba(13, 148, 136, 0.35)',
                    borderRadius: '10px',
                    color: '#2dd4bf',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    whiteSpace: 'nowrap'
                  }}>
                    <Phone size={15} /> {activeDialingCode}
                  </div>
                  <input
                    type="tel"
                    placeholder="331 2541767"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      background: 'rgba(12, 23, 54, 0.6)',
                      border: '1px solid rgba(13, 148, 136, 0.2)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  If typed with leading '0', it will automatically be trimmed upon saving.
                </span>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  background: 'rgba(12, 23, 54, 0.6)',
                  border: '1px solid rgba(13, 148, 136, 0.2)',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 2.75rem 0.75rem 2.75rem',
                  background: 'rgba(12, 23, 54, 0.6)',
                  border: '1px solid rgba(13, 148, 136, 0.2)',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.25rem',
                  borderRadius: '6px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#94a3b8'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.875rem',
              background: 'linear-gradient(135deg, #0d9488, #0f766e)',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.9375rem',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(13, 148, 136, 0.4)'
            }}
          >
            {loading ? 'Authenticating...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8125rem', color: '#94a3b8' }}>
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button 
                onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
                style={{ background: 'none', border: 'none', color: '#2dd4bf', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button 
                onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
                style={{ background: 'none', border: 'none', color: '#2dd4bf', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
