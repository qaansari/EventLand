import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, XCircle, ExternalLink, ShieldCheck, Copy, Check } from 'lucide-react';
import { payProApi } from '../services/paypro.api';

/**
 * PayProStatusTracker
 * Interactive real-time status inquiry widget for any PayPro Order / Invoice.
 * Supports automated polling with live pulsing badge, manual refresh, and Click2Pay redirect.
 */
export default function PayProStatusTracker({
  orderNumber,
  initialStatus = null,
  click2PayUrl = null,
  pollIntervalMs = 5000,
  maxPollAttempts = 24, // 2 minutes max auto-polling
  onStatusChange = null,
  className = ''
}) {
  const [statusData, setStatusData] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [isAutoPolling, setIsAutoPolling] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchStatus = useCallback(async (isBackground = false) => {
    if (!orderNumber) return;
    if (!isBackground) setLoading(true);
    setErrorMessage('');

    try {
      const res = await payProApi.getOrderStatus(orderNumber);
      setStatusData(res);

      if (onStatusChange) {
        onStatusChange(res);
      }

      // If terminal status reached, stop auto-polling
      if (res && (res.isPaid || res.orderStatus === 'Paid' || res.orderStatus === 'PAID' || res.orderStatus === 'Blocked')) {
        setIsAutoPolling(false);
      }
    } catch (err) {
      console.error('[PayProStatusTracker] Status fetch error:', err);
      if (!isBackground) {
        setErrorMessage(err.message || 'Unable to fetch status.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [orderNumber, onStatusChange]);

  // Initial fetch if no initialStatus provided
  useEffect(() => {
    if (!initialStatus && orderNumber) {
      fetchStatus(false);
    }
  }, [orderNumber, initialStatus, fetchStatus]);

  // Polling loop
  useEffect(() => {
    if (!isAutoPolling || !orderNumber) return;

    const isFinished = statusData?.isPaid || statusData?.orderStatus === 'Paid' || statusData?.orderStatus === 'PAID' || statusData?.orderStatus === 'Blocked';
    if (isFinished) return;

    if (pollCount >= maxPollAttempts) {
      setIsAutoPolling(false);
      return;
    }

    const timer = setTimeout(() => {
      setPollCount(prev => prev + 1);
      fetchStatus(true);
    }, pollIntervalMs);

    return () => clearTimeout(timer);
  }, [isAutoPolling, pollCount, maxPollAttempts, pollIntervalMs, statusData, orderNumber, fetchStatus]);

  const handleCopyOrderNumber = () => {
    if (!orderNumber) return;
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusStr = (statusData?.orderStatus || 'Pending').toLowerCase();
  const isPaid = statusData?.isPaid || statusStr === 'paid';
  const isBlocked = statusStr === 'blocked' || statusStr === 'expired';

  return (
    <div
      className={`glass-card ${className}`}
      style={{
        padding: '1.25rem',
        borderRadius: '14px',
        border: isPaid
          ? '1px solid rgba(45, 212, 191, 0.4)'
          : isBlocked
          ? '1px solid rgba(239, 68, 68, 0.4)'
          : '1px solid rgba(255, 255, 255, 0.12)',
        background: isPaid
          ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.12), rgba(15, 23, 42, 0.7))'
          : 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85))',
        backdropFilter: 'blur(12px)',
        position: 'relative'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} color="#2dd4bf" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em' }}>
            PayPro 1Link Gateway Status
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isAutoPolling && !isPaid && !isBlocked && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                border: '1px solid rgba(56, 189, 248, 0.25)'
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#38bdf8',
                  animation: 'pulse 1.5s infinite'
                }}
              />
              Live Polling
            </span>
          )}

          <button
            type="button"
            onClick={() => fetchStatus(false)}
            disabled={loading}
            title="Refresh payment status"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '0.35rem',
              color: '#94a3b8',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
          </button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          padding: '0.75rem',
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: '0.9rem'
        }}
      >
        <div>
          <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
            Order / Invoice #
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
              {orderNumber || '—'}
            </span>
            {orderNumber && (
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copied ? '#2dd4bf' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px'
                }}
                title="Copy order number"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            )}
          </div>
        </div>

        <div>
          <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
            Status
          </span>
          <div style={{ marginTop: '0.25rem' }}>
            {isPaid ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#2dd4bf',
                  background: 'rgba(45, 212, 191, 0.15)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(45, 212, 191, 0.3)'
                }}
              >
                <CheckCircle2 size={13} /> PAID
              </span>
            ) : isBlocked ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#f87171',
                  background: 'rgba(239, 68, 68, 0.15)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <XCircle size={13} /> {statusStr.toUpperCase()}
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#fbbf24',
                  background: 'rgba(251, 191, 36, 0.15)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(251, 191, 36, 0.3)'
                }}
              >
                <Clock size={13} /> UNPAID / PENDING
              </span>
            )}
          </div>
        </div>

        {statusData?.amountPaid !== undefined && statusData?.amountPaid > 0 ? (
          <div>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Amount Paid
            </span>
            <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#2dd4bf', marginTop: '0.2rem' }}>
              PKR {Number(statusData.amountPaid).toLocaleString()}
            </span>
          </div>
        ) : null}

        {statusData?.payProId ? (
          <div>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              PayPro Connect ID
            </span>
            <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#94a3b8', marginTop: '0.2rem', fontFamily: 'monospace' }}>
              {statusData.payProId}
            </span>
          </div>
        ) : null}
      </div>

      {errorMessage && (
        <div
          style={{
            fontSize: '0.78rem',
            color: '#f87171',
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <AlertTriangle size={14} />
          {errorMessage}
        </div>
      )}

      {/* Action: Click2Pay link if unpaid */}
      {!isPaid && (click2PayUrl || statusData?.click2PayUrl) && (
        <div style={{ marginTop: '0.5rem' }}>
          <a
            href={click2PayUrl || statusData?.click2PayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            <span>Proceed to PayPro Click2Pay</span>
            <ExternalLink size={15} />
          </a>
        </div>
      )}
    </div>
  );
}
