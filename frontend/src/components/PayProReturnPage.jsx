import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, XCircle, ArrowRight, Download, Ticket, RefreshCw, ShieldCheck, Home } from 'lucide-react';
import { payProApi } from '../services/paypro.api';
import { paymentsApi } from '../services/api';

/**
 * PayProReturnPage
 * Hosted return page for users redirected back from PayPro Click2Pay.
 * Queries live status from backend, confirms tickets, and displays a receipt.
 */
export default function PayProReturnPage({
  onNavigateHome,
  onNavigateTickets,
  onViewTicket = null
}) {
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [returnStatus, setReturnStatus] = useState('');
  const [returnMsg, setReturnMsg] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const ordId = params.get('ordId') || params.get('orderNumber') || params.get('orderId') || params.get('bookingRef') || '';
    const status = params.get('status') || '';
    const msg = params.get('msg') || params.get('message') || '';

    setOrderNumber(ordId);
    setReturnStatus(status);
    setReturnMsg(msg);

    const verifyStatus = async () => {
      if (!ordId) {
        setLoading(false);
        return;
      }

      try {
        // Query PayPro live status first
        const payProStatus = await payProApi.getOrderStatus(ordId).catch(() => null);
        // Also query booking payment status to verify ticket issuance
        const bookingStatus = await paymentsApi.getPaymentStatus(ordId).catch(() => null);

        setStatusData({
          orderNumber: ordId,
          isPaid: payProStatus?.isPaid || bookingStatus?.isPaid || bookingStatus?.paymentStatus === 'Paid' || status.toLowerCase() === 'paid',
          amountPaid: payProStatus?.amountPaid || bookingStatus?.totalAmount || 0,
          payProId: payProStatus?.payProId || bookingStatus?.bankTransactionRef || '',
          orderStatus: payProStatus?.orderStatus || bookingStatus?.paymentStatus || status || 'Pending',
          bookingRef: bookingStatus?.bookingRef || ordId,
          ticketReady: bookingStatus?.ticketReady || bookingStatus?.isPaid
        });
      } catch (err) {
        console.error('[PayProReturnPage] Error verifying order status:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyStatus();
  }, []);

  const handleManualRecheck = async () => {
    if (!orderNumber) return;
    setLoading(true);
    try {
      const payProStatus = await payProApi.getOrderStatus(orderNumber);
      const bookingStatus = await paymentsApi.getPaymentStatus(orderNumber).catch(() => null);

      setStatusData({
        orderNumber,
        isPaid: payProStatus?.isPaid || bookingStatus?.isPaid || bookingStatus?.paymentStatus === 'Paid',
        amountPaid: payProStatus?.amountPaid || bookingStatus?.totalAmount || 0,
        payProId: payProStatus?.payProId || bookingStatus?.bankTransactionRef || '',
        orderStatus: payProStatus?.orderStatus || bookingStatus?.paymentStatus || 'Pending',
        bookingRef: bookingStatus?.bookingRef || orderNumber,
        ticketReady: bookingStatus?.ticketReady || bookingStatus?.isPaid
      });
    } catch (err) {
      console.error('Failed to recheck status:', err);
    } finally {
      setLoading(false);
    }
  };

  const isPaid = statusData?.isPaid || returnStatus.toLowerCase() === 'paid';
  const isFailed = returnStatus.toLowerCase() === 'failed' || returnStatus.toLowerCase() === 'cancelled' || statusData?.orderStatus === 'Blocked';

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 1.5rem', width: '48px', height: '48px' }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
          Verifying PayPro Transaction...
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
          Connecting with 1Link / PayPro network to confirm your invoice payment.
        </p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '640px', margin: '0 auto' }}>
      <div
        className="glass-card"
        style={{
          padding: '2.5rem 2rem',
          borderRadius: '20px',
          textAlign: 'center',
          border: isPaid
            ? '1px solid rgba(45, 212, 191, 0.4)'
            : isFailed
            ? '1px solid rgba(239, 68, 68, 0.4)'
            : '1px solid rgba(251, 191, 36, 0.4)',
          background: isPaid
            ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.15), rgba(15, 23, 42, 0.9))'
            : 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95))',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(16px)'
        }}
      >
        {/* Status Icon Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          {isPaid ? (
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(45, 212, 191, 0.2)',
                border: '2px solid #2dd4bf',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: '0 0 30px rgba(45, 212, 191, 0.3)'
              }}
            >
              <CheckCircle2 size={40} color="#2dd4bf" />
            </div>
          ) : isFailed ? (
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '2px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}
            >
              <XCircle size={40} color="#ef4444" />
            </div>
          ) : (
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(251, 191, 36, 0.2)',
                border: '2px solid #fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}
            >
              <Clock size={40} color="#fbbf24" />
            </div>
          )}

          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            {isPaid ? 'Payment Confirmed! 🎉' : isFailed ? 'Payment Not Completed' : 'Payment Under Processing ⏳'}
          </h1>

          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
            {isPaid
              ? 'Your transaction has been verified through PayPro & 1Link. Your e-tickets are issued and reserved.'
              : isFailed
              ? (returnMsg || 'The transaction could not be completed or was cancelled. Please try again or select another payment option.')
              : 'PayPro reported your payment is being processed. In 1Link OTC/banking transactions, confirmation may take up to a few minutes.'}
          </p>
        </div>

        {/* Receipt Information Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '1.75rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Order Reference:</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
              {orderNumber || 'N/A'}
            </span>
          </div>

          {statusData?.payProId ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>PayPro Connect ID:</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2dd4bf', fontFamily: 'monospace' }}>
                {statusData.payProId}
              </span>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Status:</span>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: isPaid ? '#2dd4bf' : isFailed ? '#f87171' : '#fbbf24'
              }}
            >
              {isPaid ? 'PAID / VERIFIED' : isFailed ? 'FAILED' : 'PENDING RECONCILIATION'}
            </span>
          </div>

          {statusData?.amountPaid ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Total Amount:</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                PKR {Number(statusData.amountPaid).toLocaleString()}
              </span>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {isPaid ? (
            <button
              type="button"
              onClick={onNavigateTickets}
              className="btn btn-primary"
              style={{
                padding: '0.85rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%'
              }}
            >
              <Ticket size={18} />
              <span>View My E-Tickets</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleManualRecheck}
              className="btn btn-primary"
              style={{
                padding: '0.85rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%'
              }}
            >
              <RefreshCw size={16} />
              <span>Re-check Payment Status</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateHome}
            className="btn btn-secondary"
            style={{
              padding: '0.8rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%'
            }}
          >
            <Home size={16} />
            <span>Return to Events</span>
          </button>
        </div>

        {/* Footer Security Badge */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.78rem',
            color: '#64748b'
          }}
        >
          <ShieldCheck size={14} color="#2dd4bf" />
          <span>Secured by PayPro (v2) Financial Switch & 1Link Payment Rails</span>
        </div>
      </div>
    </div>
  );
}
