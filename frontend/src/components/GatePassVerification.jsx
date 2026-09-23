import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, ArrowLeft, RefreshCw, LogIn, Lock } from 'lucide-react';
import { gateApi } from '../services/api';
import { isAdmin } from '../utils/auth';

export default function GatePassVerification({ ticketId, currentUser, onNavigateHome, onOpenLogin }) {
  const isAuthorized = isAdmin(currentUser);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!isAuthorized) return;
    if (!ticketId) return;

    let isMounted = true;
    setIsValidating(true);
    setErrorMsg(null);

    gateApi.validate({ ticketCode: ticketId, checkIn: true, gateName: 'Mobile QR Gate' })
      .then(res => {
        if (isMounted) setResult(res);
      })
      .catch(err => {
        if (isMounted) setErrorMsg(err.message || 'Validation request failed.');
      })
      .finally(() => {
        if (isMounted) setIsValidating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [ticketId, isAuthorized]);

  const handleResetCheckIn = async () => {
    if (!ticketId || isResetting) return;
    setIsResetting(true);
    try {
      const res = await gateApi.reset({ ticketCode: ticketId, reason: 'Re-entry / supervisor reset' });
      setResult(res);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset check-in status.');
    } finally {
      setIsResetting(false);
    }
  };

  // ── Unauthorized State (Public / Attendees / Unauthenticated) ──────────────
  if (!isAuthorized) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem'
      }}>
        <div className="glass-card" style={{
          maxWidth: '540px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: '20px',
          textAlign: 'center',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          background: 'radial-gradient(circle at top, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: '#ef4444'
          }}>
            <Lock size={38} />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.75rem' }}>
            Access Denied
          </h2>

          <p style={{ color: '#fca5a5', fontWeight: 600, fontSize: '0.95rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Ticket validation and venue admission are restricted to authorized EventLand Gate Administrators and SuperAdmins only.
          </p>

          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: '#94a3b8',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span>Target Pass Reference:</span>
              <strong style={{ color: '#06b6d4' }}>{ticketId || 'N/A'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Current Session:</span>
              <span style={{ color: currentUser ? '#e2e8f0' : '#f59e0b' }}>
                {currentUser ? `${currentUser.email} (${currentUser.role || 'User'})` : 'Unauthenticated Guest'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
            <button
              onClick={() => onOpenLogin && onOpenLogin('admin')}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: 700
              }}
            >
              <LogIn size={18} /> Log In as Administrator
            </button>
            <button
              onClick={onNavigateHome}
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <ArrowLeft size={18} /> Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Authorized State: Live Validation Display ──────────────────────────────
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div className="glass-card" style={{
        maxWidth: '580px',
        width: '100%',
        padding: '2.5rem',
        borderRadius: '20px',
        border: result?.isValid
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : result?.status === 'ALREADY_CHECKED_IN'
            ? '1px solid rgba(245, 158, 11, 0.5)'
            : '1px solid rgba(239, 68, 68, 0.4)',
        background: result?.isValid
          ? 'radial-gradient(circle at top, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.96) 100%)'
          : result?.status === 'ALREADY_CHECKED_IN'
            ? 'radial-gradient(circle at top, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.96) 100%)'
            : 'radial-gradient(circle at top, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.96) 100%)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)'
      }}>
        {isValidating ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <RefreshCw size={42} className="animate-spin" style={{ color: '#06b6d4', margin: '0 auto 1.5rem' }} />
            <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>Verifying Ticket with Gate Server...</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>Pass ID: {ticketId}</p>
          </div>
        ) : errorMsg ? (
          <div style={{ textAlign: 'center' }}>
            <XCircle size={56} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
            <h2 style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Validation Error</h2>
            <p style={{ color: '#fca5a5', marginBottom: '1.5rem' }}>{errorMsg}</p>
            <button onClick={onNavigateHome} className="btn btn-secondary" style={{ width: '100%' }}>
              <ArrowLeft size={16} /> Return to Home
            </button>
          </div>
        ) : result ? (
          <div>
            {/* Status Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              {result.isValid ? (
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '2px solid #10b981' }}>
                  <CheckCircle2 size={42} />
                </div>
              ) : result.status === 'ALREADY_CHECKED_IN' ? (
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '2px solid #f59e0b' }}>
                  <AlertTriangle size={40} />
                </div>
              ) : (
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '2px solid #ef4444' }}>
                  <XCircle size={42} />
                </div>
              )}

              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: result.isValid ? '#34d399' : result.status === 'ALREADY_CHECKED_IN' ? '#fbbf24' : '#f87171', marginBottom: '0.4rem' }}>
                {result.isValid ? 'ENTRY APPROVED' : result.status === 'ALREADY_CHECKED_IN' ? 'DUPLICATE ENTRY DETECTED' : 'ENTRY DENIED'}
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: '0.95rem', fontWeight: 500 }}>
                {result.message}
              </p>
            </div>

            {/* Ticket Metadata Card */}
            {result.bookingRef && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pass Holder</span>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1rem' }}>{result.customerName || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking Ref</span>
                    <div style={{ fontWeight: 700, color: '#06b6d4', fontSize: '1rem' }}>{result.bookingRef}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Title</span>
                  <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{result.eventTitle || 'Event'}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category / Tier</span>
                    <div style={{ fontWeight: 600, color: '#a78bfa' }}>{result.ticketTierName || 'General'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seats / Quantity</span>
                    <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                      {result.seatLabels?.length > 0 ? result.seatLabels.join(', ') : `${result.quantity} Pass(es)`}
                    </div>
                  </div>
                </div>

                {result.checkedInAt && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem', marginTop: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <span>Checked in at: </span>
                    <strong style={{ color: '#f1f5f9' }}>{new Date(result.checkedInAt).toLocaleString()}</strong>
                    {result.checkedInBy && <span> by <strong style={{ color: '#f1f5f9' }}>{result.checkedInBy}</strong></span>}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
              {result.status === 'ALREADY_CHECKED_IN' && (
                <button
                  onClick={handleResetCheckIn}
                  disabled={isResetting}
                  className="btn btn-secondary"
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fbbf24',
                    padding: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isResetting ? <RefreshCw size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
                  {isResetting ? 'Resetting Check-In...' : 'Supervisor: Reset Check-In Status'}
                </button>
              )}

              <button
                onClick={onNavigateHome}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 700
                }}
              >
                <ArrowLeft size={18} /> Return to Home
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
