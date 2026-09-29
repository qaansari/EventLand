import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowRight, 
  Ticket, 
  RefreshCw, 
  ShieldCheck, 
  Home, 
  ExternalLink, 
  Mail, 
  MapPin, 
  Receipt,
  Calendar
} from 'lucide-react';
import { payProApi } from '../services/paypro.api';
import EventLandPreloader from './EventLandPreloader';

/**
 * PayProReturnPage
 * Hosted return page for attendees redirected back from PayPro Click2Pay.
 * Queries live status from backend, confirms tickets, and displays a sanitized receipt.
 * Mirrors the enterprise flow used by leading Pakistani ticketing platforms (e.g. Arts Council Karachi).
 */
export default function PayProReturnPage({
  onNavigateHome,
  onNavigateTickets,
  onViewTicket = null
}) {
  const [loading, setLoading] = useState(true);
  const [rechecking, setRechecking] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [returnStatus, setReturnStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchReceipt = async (ordId, isManualRecheck = false) => {
    if (!ordId) {
      setLoading(false);
      return;
    }

    if (isManualRecheck) {
      setRechecking(true);
    }

    try {
      // 1. Primary: Use dedicated sanitized, rate-limited public return endpoint
      const receipt = await payProApi.getReturnReceipt(ordId);

      if (receipt && (receipt.orderNumber || receipt.bookingRef)) {
        setReceiptData(receipt);
        setErrorMessage('');
      } else {
        // 2. Fallback: Query direct PayPro order status
        const fallbackStatus = await payProApi.getOrderStatus(ordId);
        const storedTitle = typeof window !== 'undefined' ? localStorage.getItem('last_event_title') : '';

        setReceiptData({
          orderNumber: ordId,
          bookingRef: ordId,
          eventTitle: storedTitle || 'Event Reservation',
          venueName: 'EventLand Partner Venue',
          maskedEmail: '',
          totalAmount: fallbackStatus?.amountPaid || 0,
          status: fallbackStatus?.isPaid ? 'Paid' : fallbackStatus?.orderStatus || 'Pending',
          isPaid: fallbackStatus?.isPaid || false,
          payProId: fallbackStatus?.payProId || '',
          connectUrl: fallbackStatus?.connectUrl || '',
          message: fallbackStatus?.isPaid ? 'Payment successfully reconciled.' : 'Payment awaiting bank confirmation.'
        });
      }
    } catch (err) {
      console.warn('[PayProReturnPage] Error fetching return receipt, falling back to direct check:', err);

      try {
        const fallbackStatus = await payProApi.getOrderStatus(ordId);
        const storedTitle = typeof window !== 'undefined' ? localStorage.getItem('last_event_title') : '';

        setReceiptData({
          orderNumber: ordId,
          bookingRef: ordId,
          eventTitle: storedTitle || 'Event Reservation',
          venueName: 'EventLand Partner Venue',
          maskedEmail: '',
          totalAmount: fallbackStatus?.amountPaid || 0,
          status: fallbackStatus?.isPaid ? 'Paid' : fallbackStatus?.orderStatus || 'Pending',
          isPaid: fallbackStatus?.isPaid || false,
          payProId: fallbackStatus?.payProId || '',
          connectUrl: fallbackStatus?.connectUrl || '',
          message: fallbackStatus?.isPaid ? 'Payment confirmed.' : 'Payment pending reconciliation.'
        });
      } catch (innerErr) {
        console.error('[PayProReturnPage] Reconciliation failure:', innerErr);
        setErrorMessage('Unable to reconcile transaction with PayPro. If your bank account was debited, your reservation will update automatically once 1Link settles.');
      }
    } finally {
      setLoading(false);
      setRechecking(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const ordId = params.get('ordId') 
      || params.get('orderNumber') 
      || params.get('orderId') 
      || params.get('bookingRef') 
      || localStorage.getItem('last_order_number') 
      || localStorage.getItem('last_booking_ref') 
      || '';

    const statusParam = params.get('status') || '';
    const msgParam = params.get('msg') || params.get('message') || '';

    setOrderNumber(ordId);
    setReturnStatus(statusParam);
    if (msgParam) {
      setErrorMessage(msgParam);
    }

    fetchReceipt(ordId);
  }, []);

  const handleManualRecheck = () => {
    if (!orderNumber) return;
    fetchReceipt(orderNumber, true);
  };

  const isPaid = receiptData?.isPaid || (receiptData?.status || '').toLowerCase() === 'paid' || returnStatus.toLowerCase() === 'paid';
  const isFailed = (receiptData?.status || '').toLowerCase() === 'failed' || (receiptData?.status || '').toLowerCase() === 'cancelled' || returnStatus.toLowerCase() === 'failed' || returnStatus.toLowerCase() === 'cancelled';
  const isPending = !isPaid && !isFailed;

  const handleViewTicketClick = () => {
    if (onViewTicket && receiptData?.ticketId) {
      onViewTicket({
        id: receiptData.ticketId,
        ticketId: receiptData.ticketId,
        ticketNumber: receiptData.ticketNumber || receiptData.bookingRef,
        bookingRef: receiptData.bookingRef,
        eventTitle: receiptData.eventTitle,
        venueName: receiptData.venueName,
        paymentStatus: 'Paid',
        status: 'Paid',
        totalAmount: receiptData.totalAmount,
        qrCode: receiptData.qrCode,
        customerEmail: receiptData.maskedEmail
      });
    } else if (onNavigateTickets) {
      onNavigateTickets();
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '5rem 1rem', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
        <EventLandPreloader text="Reconciling PayPro 1Link Payment..." minHeight="50vh" />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '660px', margin: '0 auto' }}>
      <div
        className="glass-card"
        style={{
          padding: '2.5rem 2rem',
          borderRadius: '24px',
          textAlign: 'center',
          border: isPaid
            ? '1px solid rgba(45, 212, 191, 0.45)'
            : isFailed
            ? '1px solid rgba(239, 68, 68, 0.45)'
            : '1px solid rgba(251, 191, 36, 0.45)',
          background: isPaid
            ? 'linear-gradient(145deg, rgba(13, 148, 136, 0.18), rgba(15, 23, 42, 0.95))'
            : isFailed
            ? 'linear-gradient(145deg, rgba(239, 68, 68, 0.15), rgba(15, 23, 42, 0.95))'
            : 'linear-gradient(145deg, rgba(251, 191, 36, 0.12), rgba(15, 23, 42, 0.95))',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Status Icon Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          {isPaid ? (
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'rgba(45, 212, 191, 0.2)',
                border: '2px solid #2dd4bf',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: '0 0 35px rgba(45, 212, 191, 0.35)'
              }}
            >
              <CheckCircle2 size={44} color="#2dd4bf" />
            </div>
          ) : isFailed ? (
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '2px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: '0 0 30px rgba(239, 68, 68, 0.25)'
              }}
            >
              <XCircle size={44} color="#ef4444" />
            </div>
          ) : (
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'rgba(251, 191, 36, 0.2)',
                border: '2px solid #fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: '0 0 30px rgba(251, 191, 36, 0.25)'
              }}
            >
              <Clock size={44} color="#fbbf24" />
            </div>
          )}

          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            {isPaid ? 'Payment Confirmed! 🎉' : isFailed ? 'Payment Not Completed' : 'Payment Awaiting Confirmation ⏳'}
          </h1>

          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto' }}>
            {isPaid
              ? 'Your payment was successfully reconciled via PayPro 1Link. Your e-tickets are issued and ready.'
              : isFailed
              ? (errorMessage || 'The payment could not be confirmed or was cancelled. Please try again or choose another payment method.')
              : 'PayPro reported your invoice is under processing. 1Link 1Bill and Over-The-Counter transactions may take 1 to 5 minutes to clear.'}
          </p>
        </div>

        {/* Receipt Information Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.5rem',
            textAlign: 'left',
            marginBottom: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          {receiptData?.eventTitle && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={14} /> Event:
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', textAlign: 'right', maxWidth: '60%' }}>
                {receiptData.eventTitle}
              </span>
            </div>
          )}

          {receiptData?.venueName && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} /> Venue:
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', textAlign: 'right' }}>
                {receiptData.venueName}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Receipt size={14} /> Order Reference:
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
              {orderNumber || receiptData?.orderNumber || receiptData?.bookingRef || 'N/A'}
            </span>
          </div>

          {receiptData?.payProId ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>PayPro ID (1Link):</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2dd4bf', fontFamily: 'monospace' }}>
                {receiptData.payProId}
              </span>
            </div>
          ) : null}

          {receiptData?.maskedEmail ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} /> Confirmation To:
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', fontFamily: 'monospace' }}>
                {receiptData.maskedEmail}
              </span>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Payment Status:</span>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: isPaid ? '#2dd4bf' : isFailed ? '#f87171' : '#fbbf24'
              }}
            >
              {isPaid ? 'PAID & VERIFIED' : isFailed ? 'FAILED' : 'AWAITING SETTLEMENT'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>Total Paid:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>
              PKR {Number(receiptData?.totalAmount || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {isPaid ? (
            <button
              type="button"
              onClick={handleViewTicketClick}
              className="btn btn-primary"
              style={{
                padding: '0.95rem 1.75rem',
                fontSize: '1rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                width: '100%',
                borderRadius: '14px'
              }}
            >
              <Ticket size={20} />
              <span>View My E-Ticket</span>
              <ArrowRight size={18} />
            </button>
          ) : isPending ? (
            <>
              <button
                type="button"
                onClick={handleManualRecheck}
                disabled={rechecking}
                className="btn btn-primary"
                style={{
                  padding: '0.9rem 1.75rem',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  width: '100%',
                  borderRadius: '14px',
                  opacity: rechecking ? 0.7 : 1
                }}
              >
                <RefreshCw size={18} className={rechecking ? 'spin' : ''} />
                <span>{rechecking ? 'Checking PayPro Network...' : 'Re-check Payment Status'}</span>
              </button>

              {receiptData?.connectUrl && (
                <a
                  href={receiptData.connectUrl}
                  target="_self"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{
                    padding: '0.85rem 1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    borderRadius: '14px'
                  }}
                >
                  <ExternalLink size={16} />
                  <span>Resume PayPro Checkout</span>
                </a>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onNavigateHome}
              className="btn btn-primary"
              style={{
                padding: '0.9rem 1.75rem',
                fontSize: '0.95rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                width: '100%',
                borderRadius: '14px'
              }}
            >
              <RefreshCw size={18} />
              <span>Browse Events & Try Again</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateHome}
            className="btn btn-secondary"
            style={{
              padding: '0.85rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              borderRadius: '14px'
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
            fontSize: '0.8rem',
            color: '#64748b'
          }}
        >
          <ShieldCheck size={16} color="#2dd4bf" />
          <span>Secured by PayPro (v2) Financial Switch & 1Link Payment Rails</span>
        </div>
      </div>
    </div>
  );
}
