import React, { useState } from 'react';
import { User, Lock, Mail, X, LogIn, UserPlus, ShieldCheck, Building2, Sparkles } from 'lucide-react';

export default function AuthModal({ onClose, onLoginSuccess, initialMode = 'login' }) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // One-click demo credential helper to demonstrate role auto-detection
  const handleQuickLogin = (demoType) => {
    setErrorMsg('');
    if (demoType === 'admin') {
      onLoginSuccess({
        name: 'Super Admin',
        email: 'admin@eventland.pk',
        role: 'admin'
      });
    } else if (demoType === 'organizer') {
      onLoginSuccess({
        name: 'Rangrez Events & PR',
        email: 'organizer@eventland.pk',
        role: 'organizer'
      });
    } else {
      onLoginSuccess({
        name: 'Qamar Ansari',
        email: 'qamar@example.com',
        role: 'customer'
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter a valid email and password.');
      return;
    }

    if (isSignUp) {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name to register.');
        return;
      }
      // Self registration ALWAYS creates a General User (Attendee) role
      onLoginSuccess({
        name: name.trim(),
        email: email.trim(),
        role: 'customer' // Automatically allocated as Attendee
      });
    } else {
      // Automatic Role Allocation based on Account Database Record / Email
      const lowerEmail = email.trim().toLowerCase();
      let allocatedRole = 'customer';

      // Check registered system credentials
      if (lowerEmail.includes('admin@eventland.pk') || lowerEmail.includes('admin')) {
        allocatedRole = 'admin';
      } else if (lowerEmail.includes('organizer@eventland.pk') || lowerEmail.includes('organizer') || lowerEmail.includes('rangrez')) {
        allocatedRole = 'organizer';
      }

      onLoginSuccess({
        name: name.trim() || lowerEmail.split('@')[0].toUpperCase(),
        email: lowerEmail,
        role: allocatedRole
      });
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

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem'
          }}>
            {isSignUp ? <UserPlus size={26} color="#60a5fa" /> : <LogIn size={26} color="#60a5fa" />}
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.35rem' }}>
            {isSignUp ? 'Create Attendee Account' : 'Sign In to Event Land'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.86rem' }}>
            {isSignUp 
              ? 'Register as an attendee to book passes & manage digital tickets.' 
              : 'Enter your credentials. Your account role will be detected automatically.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            marginBottom: '1.2rem'
          }}>
            {errorMsg}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
                Full Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  required
                  type="text"
                  placeholder="e.g. Qamar Ansari"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#16233f',
                    color: '#fff',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '0.65rem 1rem 0.65rem 2.3rem',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
              Email Address *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                required
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#16233f',
                  color: '#fff',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '0.65rem 1rem 0.65rem 2.3rem',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
              Password *
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#16233f',
                  color: '#fff',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '0.65rem 1rem 0.65rem 2.3rem',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0.8rem', marginTop: '0.4rem', fontSize: '0.92rem' }}
          >
            {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />} {isSignUp ? 'Create Account & Sign In' : 'Sign In'}
          </button>
        </form>

        {/* Toggle Login vs Sign Up */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.84rem', color: '#94a3b8' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSignUp ? 'Sign In' : 'Register as Attendee'}
          </button>
        </div>

        {/* One-Click Quick Logins for Testing */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', marginBottom: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚡ Demo Accounts (Role Auto-Detected)
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
            <button
              onClick={() => handleQuickLogin('customer')}
              title="Sign in as General Attendee"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '0.4rem 0.2rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              👤 Attendee
            </button>
            <button
              onClick={() => handleQuickLogin('organizer')}
              title="Sign in as Admin-Allocated Organizer"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.4rem 0.2rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🏢 Organizer
            </button>
            <button
              onClick={() => handleQuickLogin('admin')}
              title="Sign in as Super Admin"
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                color: '#c084fc',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                padding: '0.4rem 0.2rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🛡️ Super Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
