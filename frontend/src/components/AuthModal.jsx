import React, { useState } from 'react';
import { User, Lock, Mail, X, LogIn, UserPlus } from 'lucide-react';
import { authApi } from '../services/api';

export default function AuthModal({ onClose, onLoginSuccess, initialMode = 'login' }) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter a valid email and password.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setErrorMsg('Please enter your full name to register.');
          setLoading(false);
          return;
        }
        // General customer registration simulation
        onLoginSuccess({
          name: name.trim(),
          email: email.trim(),
          role: 'customer'
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
          role: userRole,
          token: authData.token
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-card" 
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
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.25))',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#3b82f6',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.25)'
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="e.g. Qamar Ansari"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.75rem',
                    background: 'rgba(12, 23, 54, 0.6)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                placeholder="admin@eventland.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  background: 'rgba(12, 23, 54, 0.6)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
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
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  background: 'rgba(12, 23, 54, 0.6)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.875rem',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.9375rem',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)'
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
                style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button 
                onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
                style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 600, cursor: 'pointer' }}
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
