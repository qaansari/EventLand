import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Copy,
  Clock,
  CheckCircle,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  ExternalLink,
  Zap,
  RefreshCw,
  Sparkles,
  Smartphone,
  MessageCircle
} from 'lucide-react';
import { bookingsApi, paymentsApi } from '../services/api';
import PayProStatusTracker from './PayProStatusTracker';
import { useToast } from '../context/ToastContext';
import { useCheckoutMachine } from '../hooks/useCheckoutMachine';
import { useCheckoutStatus } from '../services/checkoutSettings';

export default function CheckoutModal({ event, selectedSeats, onClose, onBookingSuccess, onInvoiceCreated }) {
  const { showSuccess, showError, showWarning } = useToast();
  const { state, context, dispatch, pollStatus } = useCheckoutMachine();
  const { isCheckoutEnabled, toggleCheckout } = useCheckoutStatus();

  const [selectedPayProMethod, setSelectedPayProMethod] = useState('easypaisa_jazzcash');
  const [payproResponse, setPayproResponse] = useState(null);
  const [isInitiatingPayPro, setIsInitiatingPayPro] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);

  // Authorization / Verified User check
  const loggedUserRaw = localStorage.getItem('eventland_logged_user');
  const loggedUser = loggedUserRaw ? JSON.parse(loggedUserRaw) : null;
  const rawRole = (loggedUser?.rawRole || loggedUser?.roleName || loggedUser?.role || '').trim().toLowerCase();
  const isAdmin = rawRole === 'admin' || rawRole === 'superadmin' || loggedUser?.roleId === 1 || loggedUser?.roleId === 2;

  const [formData, setFormData] = useState({
    name: loggedUser?.name || loggedUser?.fullName || '',
    email: loggedUser?.email || '',
    phone: loggedUser?.phone || '',
    cnic: ''
  });

  // Copy Feedback state
  const [copiedField, setCopiedField] = useState(null);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showSuccess('Copied to Clipboard! 📋', `${fieldName}: ${text}`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Pricing calculations (memoized for efficiency and reactivity)
  const subtotal = useMemo(() => {
    return (selectedSeats || []).reduce((sum, s) => sum + (Number(s.price) || 1500), 0);
  }, [selectedSeats]);
  const totalPayable = subtotal;

  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      showError('Validation Error', 'Please fill out Name, Email, and Mobile Number.');
      return;
    }
    if (!loggedUser) {
      showError('Authorization Required', 'Only authorized and verified users can purchase tickets. Please log in first.');
      return;
    }
    if (context.secondsRemaining <= 0) {
      showError('Hold Expired', 'Seat hold timer has expired. Please select your seats again.');
      onClose();
      return;
    }
    dispatch({ type: 'PROCEED' });
  };

  // Helper to create a backend booking record if not already created
  const createBookingRecord = async (paymentMethod = 'PayPro') => {
    if (createdBooking) return createdBooking;
    if (context.booking) return context.booking;

    const explicitTierId = selectedSeats.find(s => s.tierId)?.tierId;
    const selectedShowTiers = event.selectedShow?.ticketTiers || [];
    const firstShowTierId = selectedShowTiers[0]?.id;
    const firstEventShowTierId = event.shows?.find(s => s.ticketTiers?.length > 0)?.ticketTiers?.[0]?.id;
    const eventTierId = event.ticketTiers?.[0]?.id;
    const ticketTierId = explicitTierId || firstShowTierId || firstEventShowTierId || eventTierId;

    const isNumericEventId = typeof event.id === 'number' || (!isNaN(event.id) && !String(event.id).startsWith('custom-'));
    if (!ticketTierId && isNumericEventId) {
      throw new Error('No active ticket tier found for this event.');
    }

    const seatIds = selectedSeats.map(s => s.id).filter(id => typeof id === 'number');
    const showId = event.selectedShow?.id || selectedSeats?.[0]?.showId || null;

    if (isNumericEventId && ticketTierId) {
      const dto = {
        eventId: typeof event.id === 'number' ? event.id : parseInt(event.id, 10),
        ticketTierId: ticketTierId,
        customerName: formData.name.trim(),
        customerEmail: formData.email.trim(),
        customerPhone: formData.phone.trim(),
        quantity: selectedSeats.length || 1,
        paymentMethod: paymentMethod,
        selectedSeatIds: seatIds.length > 0 ? seatIds : null,
        eventShowId: showId
      };
      const booking = await bookingsApi.createBooking(dto);
      setCreatedBooking(booking);
      return booking;
    }
    return null;
  };

  const handleInitiatePayProCheckout = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      showError('Validation Error', 'Please fill out Name, Email, and Mobile Number.');
      return;
    }
    if (!loggedUser) {
      showError('Authorization Required', 'Only authorized and verified users can purchase tickets. Please log in first.');
      return;
    }
    if (context.secondsRemaining <= 0) {
      showError('Hold Expired', 'Seat hold timer has expired. Please select your seats again.');
      onClose();
      return;
    }

    setIsInitiatingPayPro(true);
    try {
      const booking = await createBookingRecord('PayPro');
      const bookingRefToUse = booking?.bookingRef;
      if (!bookingRefToUse) {
        throw new Error('Could not generate booking reference for PayPro session.');
      }

      const returnUrl = `${window.location.origin}/payments/return`;
      const response = await paymentsApi.createPayment(
        bookingRefToUse,
        selectedPayProMethod,
        returnUrl
      );

      setPayproResponse(response);
      const paymentUrl = response?.paymentUrl || response?.click2PayUrl || response?.connectUrl;
      const voucher = response?.voucherCode || response?.otcVoucherCode || response?.invoiceId || bookingRefToUse;

      // Save order metadata to localStorage for cross-tab or recovery
      try {
        localStorage.setItem('last_order_number', voucher);
        localStorage.setItem('last_booking_ref', bookingRefToUse);
        localStorage.setItem('last_event_title', event?.title || '');
      } catch { }

      if (onBookingSuccess) {
        onBookingSuccess(booking);
      }

      if (onInvoiceCreated) {
        onInvoiceCreated({
          bookingRef: bookingRefToUse,
          bookingId: booking?.id,
          totalAmount: totalPayable,
          voucherCode: voucher,
          eventTitle: event.title,
          showTitle: event.selectedShow?.showTitle || null,
          customerName: formData.name,
          customerEmail: formData.email,
          paymentStatus: 'Pending',
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      // Seamless hosted redirect matching ACPKHI (acpkhi.com/events)
      if (paymentUrl) {
        dispatch({
          type: 'START_REDIRECT',
          payload: { booking, paymentUrl, voucher }
        });
        showSuccess('Redirecting to PayPro 💳', 'Connecting to PayPro checkout portal...');
        setTimeout(() => {
          window.location.assign(paymentUrl);
        }, 350);
        return;
      }

      dispatch({
        type: 'VOUCHER_ISSUED',
        payload: {
          booking,
          voucher,
          expiresAt: new Date(Date.now() + 1800000).toISOString()
        }
      });
      showSuccess('PayPro Invoice Ready 💳', `PayPro Voucher #: ${voucher}`);
    } catch (err) {
      console.error('PayPro Checkout error:', err);
      dispatch({ type: 'FAIL', message: err.message || 'Failed to initiate PayPro Online Gateway session.' });
      showError('PayPro Gateway Error', err.message || 'Failed to initiate PayPro Online Gateway session.');
    } finally {
      setIsInitiatingPayPro(false);
    }
  };

  const handleManualStatusCheck = async () => {
    try {
      await pollStatus();
      if (state === 'confirmed') {
        showSuccess('Payment Confirmed! 🎉', 'Your payment was verified and tickets are confirmed!');
        if (onBookingSuccess) {
          onBookingSuccess({ ...(createdBooking || context.booking), status: 'Confirmed', paymentStatus: 'Paid' });
        }
      } else {
        showWarning('Payment Pending ⏳', 'Payment has not been confirmed yet. If you have completed payment, please allow a moment and try again.');
      }
    } catch (err) {
      showError('Status Check Failed', err.message || 'Could not verify payment status.');
    }
  };

  // Step tracker mapping
  const stepNumber = useMemo(() => {
    switch (state) {
      case 'buyer_info': return 1;
      case 'payment_method': return 2;
      case 'redirecting': return 2;
      case 'voucher_pending': return 3;
      case 'confirmed': return 3;
      case 'failed': return 3;
      default: return 1;
    }
  }, [state]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel modal-content animate-scale-up" style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        overflowY: 'auto',
        borderRadius: '24px',
        border: '1px solid rgba(13, 148, 136, 0.35)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
        padding: 'clamp(1rem, 3.5vw, 2rem)'
      }}>
        {/* --- ADMIN TOOLBAR (ONLY FOR ADMINS) --- */}
        {isAdmin && (
          <div style={{
            background: 'rgba(13, 148, 136, 0.12)',
            border: '1px solid rgba(45, 212, 191, 0.35)',
            borderRadius: '12px',
            padding: '0.65rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#e2e8f0' }}>
              <ShieldCheck size={16} color="#2dd4bf" />
              <span>
                <strong>Admin Mode:</strong> Checkout is currently <strong>{isCheckoutEnabled ? '🟢 LIVE' : '🟠 COMING SOON'}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                toggleCheckout();
                showSuccess('Status Updated', !isCheckoutEnabled ? 'Live PayPro checkout enabled' : 'Coming Soon mode activated');
              }}
              style={{
                background: isCheckoutEnabled ? 'linear-gradient(135deg, #d97706, #b45309)' : 'linear-gradient(135deg, #059669, #047857)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              {isCheckoutEnabled ? 'Switch to Coming Soon' : 'Enable Live Checkout'}
            </button>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                <Zap size={14} /> {isCheckoutEnabled ? 'PAYPRO ONLINE GATEWAY' : 'PAYPRO GATEWAY (IN PROCESS)'}
              </span>
              <span className="checkout-timer" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: context.secondsRemaining > 300 ? '#2dd4bf' : '#f87171',
                background: context.secondsRemaining > 300 ? 'rgba(13, 148, 136, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                border: `1px solid ${context.secondsRemaining > 300 ? 'rgba(13, 148, 136, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
              }}>
                <Clock size={13} className={context.secondsRemaining <= 300 ? 'animate-pulse' : ''} />
                Held for: {formatTimer(context.secondsRemaining)}
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              {!isCheckoutEnabled ? 'Online Checkout (Coming Soon)' : (
                state === 'buyer_info' ? 'Buyer Details' :
                state === 'payment_method' ? 'PayPro Online Payment' :
                state === 'redirecting' ? 'Connecting to Gateway...' :
                state === 'voucher_pending' ? 'PayPro Invoice & Status' :
                state === 'confirmed' ? 'Payment Confirmed' :
                'Payment Unsuccessful'
              )}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              {event.title} • {selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {!isCheckoutEnabled ? (
          /* ========================================================================= */
          /* --- COMING SOON VIEW (ACTIVE WHEN CHECKOUT IS DISABLED) --- */
          /* ========================================================================= */
          <div className="checkout-coming-soon-container" style={{ padding: '0.5rem 0' }}>
            {/* Hero / Notification */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(13, 148, 136, 0.2))',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.25)'
              }}>
                <Clock size={32} color="#fbbf24" className="animate-pulse" />
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.85rem',
                borderRadius: '9999px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#fbbf24',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: '0.6rem'
              }}>
                <Sparkles size={14} /> PAYPRO LIVE GATEWAY ONBOARDING IN PROCESS
              </div>

              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                Online Checkout Coming Soon
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
                Our automated PayPro payment gateway is currently completing final banking integration & regulatory certification. EasyPaisa/JazzCash and Zindagi QR Code payments will launch shortly.
              </p>
            </div>

            {/* Selected Tickets Summary Card */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#fff' }}>
                    {event.title}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {event.eventDate || event.date || 'Upcoming'} • {event.venueName || event.venue || event.auditoriumName || 'Main Hall'}, {event.cityName || event.city || 'Pakistan'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Total Amount</span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2dd4bf' }}>
                    PKR {totalPayable.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                  Reserved Tickets ({selectedSeats.length})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedSeats.map((s, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '0.35rem 0.65rem',
                        background: 'rgba(13, 148, 136, 0.15)',
                        border: '1px solid rgba(45, 212, 191, 0.25)',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        color: '#e2e8f0',
                        fontWeight: 500
                      }}
                    >
                      {s.tierName || s.tier || 'Ticket'}: {s.label || s.name || `Seat #${s.id}`} (PKR {Number(s.price || 0).toLocaleString()})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Upcoming Channels Grid */}
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
                Upcoming Instant Payment Channels
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Smartphone size={18} color="#38bdf8" />
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>Coming Soon</span>
                  </div>
                  <strong style={{ fontSize: '0.85rem', color: '#fff' }}>EasyPaisa & JazzCash</strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Instant Mobile Wallets</span>
                </div>

                <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <QrCode size={18} color="#a78bfa" />
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>Coming Soon</span>
                  </div>
                  <strong style={{ fontSize: '0.85rem', color: '#fff' }}>Zindagi QR Code</strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Scan & Pay via Zindagi App</span>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Concierge Reservation Alternative */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.12), rgba(15, 23, 42, 0.8))',
              border: '1px solid rgba(37, 211, 102, 0.35)',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <MessageCircle size={18} color="#25D366" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    Need Your Tickets Confirmed Immediately?
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  Our EventLand ticketing desk is available on WhatsApp to reserve and confirm your tickets directly.
                </p>
              </div>

              <a
                href={`https://wa.me/923079353185?text=${encodeURIComponent(
                  `Hello EventLand Support! I would like to reserve tickets for "${event.title}".\nSeats: ${selectedSeats.map(s => s.label || s.name || s.id).join(', ')}\nTotal: PKR ${totalPayable.toLocaleString()}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.4rem',
                  borderRadius: '12px',
                  background: '#25D366',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <MessageCircle size={16} /> Book via WhatsApp (+92 307 9353185)
              </a>
            </div>

            {/* Bottom Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline-secondary"
                style={{ padding: '0.75rem 1.75rem', borderRadius: '12px', fontWeight: 700 }}
              >
                Back to Event
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* --- LIVE PAYPRO CHECKOUT FLOW (ACTIVE WHEN CHECKOUT IS ENABLED) --- */
          /* ========================================================================= */
          <>
            {/* Step Progress Tracker */}
            <div className="checkout-steps-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
              {[
                { num: 1, label: '1. Buyer Info' },
                { num: 2, label: '2. Online Payment' },
                { num: 3, label: '3. Confirmation' }
              ].map(s => (
                <div key={s.num} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{
                    height: '4px',
                    borderRadius: '9999px',
                    background: stepNumber >= s.num ? 'linear-gradient(90deg, #0d9488, #2dd4bf)' : 'rgba(255, 255, 255, 0.1)',
                    transition: 'background 0.3s ease'
                  }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: stepNumber >= s.num ? '#2dd4bf' : '#64748b' }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

        {/* --- REDIRECTING STATE (ACPKHI Hosted Checkout Redirect) --- */}
        {state === 'redirecting' && (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              border: '3px solid rgba(45, 212, 191, 0.2)',
              borderTopColor: '#2dd4bf',
              animation: 'spin 0.8s linear infinite'
            }} />
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: '0.6rem' }}>
              Redirecting to PayPro Portal...
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
              Securing your reservation for <strong>{event.title}</strong>. Taking you directly to PayPro's official payment portal to complete payment via EasyPaisa/JazzCash or Zindagi QR Code.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.8rem' }}>
              <ShieldCheck size={14} color="#2dd4bf" /> 256-bit Bank Grade Encrypted Session
            </div>
          </div>
        )}

        {/* --- STEP 1: BUYER INFORMATION --- */}
        {state === 'buyer_info' && (
          <form onSubmit={handleProceedToPayment}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Ali"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Email Address * (E-Ticket Destination)
                </label>
                <input
                  type="email"
                  required
                  placeholder="ali@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Mobile / WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0300 1234567"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
                  CNIC Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="42101-1234567-1"
                  value={formData.cnic}
                  onChange={e => setFormData({ ...formData, cnic: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {/* Order Summary */}
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#94a3b8', marginBottom: '0.6rem' }}>
                <span>Selected Seats ({selectedSeats.length}):</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>PKR {subtotal.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: '#fff', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <span>Total Amount Payable:</span>
                <span style={{ color: '#2dd4bf' }}>PKR {totalPayable.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 700, borderRadius: '12px' }}
            >
              Continue to Payment Options →
            </button>
          </form>
        )}

        {/* --- STEP 2: PAYMENT METHOD SELECTION & DETAILS --- */}
        {state === 'payment_method' && (
          <div>
            {/* Amount Payable Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.25), rgba(15, 23, 42, 0.7))',
              border: '1px solid rgba(45, 212, 191, 0.35)',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Total Amount Due (PayPro)
                </span>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2dd4bf', letterSpacing: '-0.02em' }}>
                  PKR {totalPayable.toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#94a3b8' }}>
                <div>{selectedSeats.length} {selectedSeats.length === 1 ? 'ticket' : 'tickets'} reserved</div>
                <div style={{ color: '#2dd4bf', fontWeight: 600 }}>⚡ Instant 1Pay Verification</div>
              </div>
            </div>

            {/* Channels Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 700, marginBottom: '0.75rem' }}>
                Select Instant Payment Channel:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0.75rem' }}>
                {/* Channel 1: EasyPaisa & JazzCash */}
                <div
                  onClick={() => setSelectedPayProMethod('easypaisa_jazzcash')}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    border: selectedPayProMethod === 'easypaisa_jazzcash' ? '2px solid #2dd4bf' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: selectedPayProMethod === 'easypaisa_jazzcash' ? 'rgba(13, 148, 136, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: selectedPayProMethod === 'easypaisa_jazzcash' ? '#2dd4bf' : '#64748b' }} />
                    <Smartphone size={18} color="#38bdf8" />
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>EasyPaisa / JazzCash</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, paddingLeft: '1.6rem' }}>
                    Instant mobile wallet & OTC voucher payment
                  </p>
                </div>

                {/* Channel 2: Zindagi QR Code */}
                <div
                  onClick={() => setSelectedPayProMethod('zindagi_qr')}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    border: selectedPayProMethod === 'zindagi_qr' ? '2px solid #2dd4bf' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: selectedPayProMethod === 'zindagi_qr' ? 'rgba(13, 148, 136, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: selectedPayProMethod === 'zindagi_qr' ? '#2dd4bf' : '#64748b' }} />
                    <QrCode size={18} color="#a78bfa" />
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>Zindagi QR Code</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, paddingLeft: '1.6rem' }}>
                    Scan & Pay instantly via Zindagi App
                  </p>
                </div>
              </div>
            </div>

            {/* PayPro Security & Instructions Badge */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '1rem',
              marginBottom: '1.5rem',
              fontSize: '0.8rem',
              color: '#94a3b8',
              lineHeight: 1.5
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2dd4bf', fontWeight: 700, marginBottom: '0.4rem' }}>
                <ShieldCheck size={16} /> 100% SBP Authorized PayPro Gateway Integration
              </div>
              When you click proceed, you will connect to PayPro to complete your payment via EasyPaisa/JazzCash or scan the Zindagi QR Code.
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => dispatch({ type: 'BACK' })}
                className="btn btn-outline-secondary"
                style={{ padding: '0.85rem 1.25rem', borderRadius: '10px' }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleInitiatePayProCheckout}
                disabled={isInitiatingPayPro}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                  cursor: isInitiatingPayPro ? 'not-allowed' : 'pointer',
                  opacity: isInitiatingPayPro ? 0.75 : 1
                }}
              >
                {isInitiatingPayPro ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Connecting to PayPro Gateway...</span>
                  </>
                ) : (
                  'Proceed to PayPro Online Gateway →'
                )}
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3: PAYPRO INVOICE & STATUS TRACKER --- */}
        {state === 'voucher_pending' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(13, 148, 136, 0.2)',
              border: '2px solid #2dd4bf',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <CheckCircle size={36} color="#2dd4bf" />
            </div>

            <span className="badge badge-primary" style={{ marginBottom: '0.75rem', fontSize: '0.78rem' }}>
              ⚡ PAYPRO ONLINE INVOICE GENERATED
            </span>

            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              PayPro 1Pay Invoice Ready!
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', maxWidth: '500px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Use your PayPro Consumer Voucher Number or click the direct payment link below to complete payment instantly via EasyPaisa, JazzCash, or Zindagi QR Code.
            </p>

            {/* PayPro Voucher Box */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.15), rgba(15, 23, 42, 0.8))',
              border: '1px solid rgba(45, 212, 191, 0.4)',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.3rem' }}>
                PayPro Consumer Voucher / OTC Number
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#2dd4bf', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                {context.voucherCode || payproResponse?.voucherCode || payproResponse?.otcVoucherCode || payproResponse?.invoiceId || createdBooking?.bookingRef || '1PAY-PAYPRO-01'}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(context.voucherCode || payproResponse?.voucherCode || payproResponse?.otcVoucherCode || payproResponse?.invoiceId || createdBooking?.bookingRef, 'PayPro Consumer Voucher')}
                style={{
                  background: 'rgba(13, 148, 136, 0.25)',
                  border: '1px solid rgba(45, 212, 191, 0.5)',
                  borderRadius: '8px',
                  color: '#2dd4bf',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <Copy size={14} /> Copy Voucher Number
              </button>
            </div>

            {/* Direct PayPro 1Pay / Click2Pay Link */}
            {(payproResponse?.paymentUrl || payproResponse?.connectUrl || payproResponse?.click2PayUrl || context.paymentUrl) && (
              <div style={{ marginBottom: '1.5rem' }}>
                <a
                  href={payproResponse?.click2PayUrl || payproResponse?.paymentUrl || payproResponse?.connectUrl || context.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '0.9rem 1.5rem',
                    background: 'linear-gradient(135deg, #0d9488, #047857)',
                    borderRadius: '14px',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    boxShadow: '0 8px 24px rgba(13, 148, 136, 0.35)'
                  }}
                >
                  <ExternalLink size={18} /> Pay Online Now via PayPro 1Pay Portal ↗
                </a>
              </div>
            )}

            {/* Invoice Summary Box */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '1.25rem',
              textAlign: 'left',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Booking Reference:</span>
                <strong style={{ color: '#2dd4bf' }}>{context.booking?.bookingRef || createdBooking?.bookingRef || payproResponse?.bookingRef || 'EVL-100001'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Event:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{event.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Customer:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{formData.name} ({formData.email})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.6rem' }}>
                <span style={{ color: '#fff' }}>Amount Payable:</span>
                <span style={{ color: '#2dd4bf' }}>PKR {(payproResponse?.amount || totalPayable).toLocaleString()}</span>
              </div>
            </div>

            {/* Live PayPro Status Tracker Widget */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <PayProStatusTracker
                orderNumber={context.voucherCode || payproResponse?.voucherCode || payproResponse?.invoiceId || createdBooking?.bookingRef || payproResponse?.bookingRef}
                click2PayUrl={payproResponse?.click2PayUrl || payproResponse?.paymentUrl || payproResponse?.connectUrl || context.paymentUrl}
                onStatusChange={(statusRes) => {
                  if (statusRes && (statusRes.isPaid || statusRes.orderStatus === 'Paid' || statusRes.orderStatus === 'PAID')) {
                    dispatch({ type: 'STATUS_CHECKED', status: 'paid' });
                    showSuccess('Payment Confirmed! 🎉', 'Your payment was verified and tickets are confirmed!');
                    if (onBookingSuccess) {
                      onBookingSuccess({ ...(createdBooking || context.booking), status: 'Confirmed', paymentStatus: 'Paid' });
                    }
                  }
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={handleManualStatusCheck}
                disabled={context.isCheckingStatus}
                className="btn btn-primary"
                style={{
                  padding: '0.85rem',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  background: 'linear-gradient(135deg, #0d9488, #0284c7)',
                  border: 'none',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: context.isCheckingStatus ? 'not-allowed' : 'pointer',
                  opacity: context.isCheckingStatus ? 0.75 : 1
                }}
              >
                {context.isCheckingStatus ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Verifying with PayPro...</span>
                  </>
                ) : (
                  'I Have Paid — Verify Payment & Issue Tickets 🎟️'
                )}
              </button>
              <button
                onClick={onClose}
                className="btn btn-outline-secondary"
                style={{ padding: '0.75rem', borderRadius: '10px', fontSize: '0.9rem' }}
              >
                Close & View My Bookings
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 4: PAYMENT CONFIRMED / E-TICKETS READY --- */}
        {state === 'confirmed' && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(13, 148, 136, 0.2)',
              border: '2px solid #2dd4bf',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <CheckCircle size={44} color="#2dd4bf" />
            </div>

            <span className="badge badge-primary" style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
              PAYMENT VERIFIED & CONFIRMED
            </span>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Your E-Tickets Are Ready!
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Your payment has been successfully confirmed via PayPro. Your official digital pass is ready for gate admission.
            </p>

            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{
                padding: '0.85rem 2rem',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.95rem'
              }}
            >
              View My E-Tickets 🎟️
            </button>
          </div>
        )}

        {/* --- FAILED STATE --- */}
        {state === 'failed' && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <AlertTriangle size={44} color="#ef4444" />
            </div>

            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
              PAYMENT UNSUCCESSFUL
            </span>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Checkout Expired or Declined
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              {context.errorMessage || 'Your reservation window has elapsed or the transaction was declined. Your held seats have been released.'}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => dispatch({ type: 'RESET' })}
                className="btn btn-primary"
                style={{
                  padding: '0.85rem 1.75rem',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.95rem'
                }}
              >
                Try Again 🔄
              </button>
              <button
                onClick={onClose}
                className="btn btn-outline-secondary"
                style={{
                  padding: '0.85rem 1.5rem',
                  borderRadius: '12px',
                  fontSize: '0.95rem'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    )}
      </div>
    </div>
  );
}
