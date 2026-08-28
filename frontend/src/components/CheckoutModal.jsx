import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, ShieldCheck, Clock, AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react';
import { bookingsApi, paymentsApi, getEventImageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function CheckoutModal({ event, selectedSeats, onClose, onBookingSuccess, onInvoiceCreated }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [step, setStep] = useState(1); // 1: Info, 2: Payment & Timer, 3: PayPro Invoice OTC / Redirect

  // Authorization / Verified User check
  const loggedUserRaw = localStorage.getItem('eventland_logged_user');
  const loggedUser = loggedUserRaw ? JSON.parse(loggedUserRaw) : null;

  const [formData, setFormData] = useState({
    name: loggedUser?.name || loggedUser?.fullName || '',
    email: loggedUser?.email || '',
    phone: loggedUser?.phone || '',
    cnic: ''
  });

  const [paymentMethod, setPaymentMethod] = useState('paypro_1pay'); // paypro_1pay, jazzcash, easypaisa, otc_bank
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // PayPro Invoice & 60-Minute Payment Timer state
  const [invoiceData, setInvoiceData] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(3600); // 60 minutes = 3600s
  const [createdBooking, setCreatedBooking] = useState(null);

  // 60-Minute Countdown Timer for seat reservation hold
  useEffect(() => {
    if (step < 2) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const subtotal = selectedSeats.reduce((sum, s) => sum + (s.price || 1500), 0);
  const groupDiscount = selectedSeats.length >= 3 ? Math.round(subtotal * 0.1) : 0;
  const totalAmount = Math.max(0, subtotal - groupDiscount - discount);

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'EVENTLAND10') {
      const disc = Math.round(subtotal * 0.1);
      setDiscount(disc);
      showSuccess('Promo Applied! 🎉', `10% discount (-PKR ${disc.toLocaleString()}) applied.`);
    } else if (promoCode.trim().toUpperCase() === 'JAZZCASH500') {
      setDiscount(500);
      showSuccess('Promo Applied! 🎉', 'Flat PKR 500 discount applied.');
    } else {
      showError('Invalid Promo', 'Invalid promo code. Try "EVENTLAND10" or "JAZZCASH500"');
    }
  };

  const handleCreateBookingAndPayProInvoice = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      showError('Validation Error', 'Please fill out Name, Email, and Mobile Number.');
      return;
    }

    if (!loggedUser) {
      showError('Authorization Required', 'Only authorized and verified users can purchase tickets. Please log in first.');
      return;
    }

    if (timerSeconds <= 0) {
      showError('Hold Expired', 'Seat hold timer has expired. Please select your seats again.');
      onClose();
      return;
    }

    setIsProcessing(true);

    try {
      // Resolve ticket tier ID
      const explicitTierId = selectedSeats.find(s => s.tierId)?.tierId;
      const selectedShowTiers = event.selectedShow?.ticketTiers || [];
      const firstShowTierId = selectedShowTiers[0]?.id;
      const firstEventShowTierId = event.shows?.find(s => s.ticketTiers?.length > 0)?.ticketTiers?.[0]?.id;
      const eventTierId = event.ticketTiers?.[0]?.id;
      const ticketTierId = explicitTierId || firstShowTierId || firstEventShowTierId || eventTierId;

      const isNumericEventId = typeof event.id === 'number' || (!isNaN(event.id) && !String(event.id).startsWith('custom-'));

      if (!ticketTierId && isNumericEventId) {
        showError('Booking Error', 'No active ticket tier found for this event.');
        setIsProcessing(false);
        return;
      }

      const seatIds = selectedSeats.map(s => s.id).filter(id => typeof id === 'number');
      const showId = event.selectedShow?.id || selectedSeats?.[0]?.showId || null;

      let backendBooking = null;
      if (isNumericEventId && ticketTierId) {
        const dto = {
          eventId: typeof event.id === 'number' ? event.id : parseInt(event.id, 10),
          ticketTierId: ticketTierId,
          customerName: formData.name.trim(),
          customerEmail: formData.email.trim(),
          customerPhone: formData.phone.trim(),
          quantity: selectedSeats.length || 1,
          paymentMethod: 'CreditCard',
          selectedSeatIds: seatIds.length > 0 ? seatIds : null,
          eventShowId: showId
        };
        backendBooking = await bookingsApi.createBooking(dto);
      }

      setCreatedBooking(backendBooking);

      // Create PayPro Invoice
      const bookingId = backendBooking?.id || 1000;
      const bookingRef = backendBooking?.bookingRef || (`EVL-` + Math.floor(100000 + Math.random() * 900000));

      // The booking amount computed server-side is the source of truth for what is payable;
      // client-side promo/group discounts are display-only until a server-side coupon engine exists.
      const payableAmount = backendBooking?.totalAmount ?? totalAmount;
      if (backendBooking && (groupDiscount > 0 || discount > 0) && Number(payableAmount) !== totalAmount) {
        showWarning('Promo Notice', 'Promo/group discounts are not yet applied server-side — the invoice uses the full booking amount.');
      }

      const payProRes = await paymentsApi.createInvoice({
        bookingId: bookingId,
        bookingRef: bookingRef,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        amount: payableAmount,
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 3600000).toISOString()
      });

      setInvoiceData(payProRes);
      setStep(3); // Show PayPro Payment Invoice & OTC Details

      // Record the unpaid invoice so the user can leave and pay later from "My Tickets".
      if (onInvoiceCreated) {
        onInvoiceCreated({
          bookingRef: payProRes?.bookingRef || bookingRef,
          bookingId: backendBooking?.id ?? bookingId,
          invoiceId: payProRes?.invoiceId,
          otcVoucherCode: payProRes?.otcVoucherCode,
          connectUrl: payProRes?.connectUrl,
          amount: payableAmount,
          eventTitle: event.title,
          showTitle: event.selectedShow?.showTitle || null,
          customerName: formData.name,
          customerEmail: formData.email,
          paymentStatus: 'Pending',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      showSuccess('Invoice Created', 'PayPro Pakistan Payment Invoice generated. Complete payment within 60 minutes.');
    } catch (err) {
      console.error('Booking/PayPro error:', err);
      showError('Payment Error', err.message || 'PayPro invoice creation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulatePayProPaymentSuccess = async () => {
    setIsProcessing(true);
    try {
      const invoiceId = invoiceData?.invoiceId || `PP-EVL-${createdBooking?.bookingRef || '1001'}`;
      const bookingRef = createdBooking?.bookingRef || invoiceData?.bookingRef || 'EVL-100001';

      // Call PayPro IPN confirmation endpoint — the paid amount must cover the
      // server-computed booking total, otherwise the backend rejects the confirmation.
      const confirmAmount = createdBooking?.totalAmount ?? totalAmount;
      await paymentsApi.confirmPayment({
        invoiceId: invoiceId,
        bookingRef: bookingRef,
        amountPayable: String(confirmAmount),
        amountPaid: String(confirmAmount),
        status: 'PAID',
        transactionId: `TXN-PAYPRO-${Date.now()}`,
        paymentDate: new Date().toISOString(),
        signature: 'VALID_PAYPRO_SIG'
      });

      // Resolve real event image from database
      const dbRawBanner = event.banner || event.imageUrl || event.bannerUrl || '';
      const dbBannerUrl = getEventImageUrl(dbRawBanner);

      // Resolve real show date & start time from database show slot or event date
      let dbShowDate = event.date || '';
      let dbShowTime = event.time || '';

      if (event.selectedShow) {
        if (event.selectedShow.showTitle) {
          dbShowTime = event.selectedShow.showTitle;
        }
        if (event.selectedShow.startTimeUtc) {
          const dt = new Date(event.selectedShow.startTimeUtc);
          if (!isNaN(dt.getTime())) {
            dbShowDate = dt.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const timePart = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' PKT';
            dbShowTime = dbShowTime ? `${dbShowTime} (${timePart})` : timePart;
          }
        }
      } else if (event.startDateUtc) {
        const dt = new Date(event.startDateUtc);
        if (!isNaN(dt.getTime())) {
          dbShowDate = dt.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          dbShowTime = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' PKT';
        }
      }

      // Exact current booking timestamp
      const now = new Date();
      const bookingTimestamp = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + ' at ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const ticketObject = {
        ticketId: bookingRef,
        eventTitle: event.title,
        banner: dbBannerUrl,
        venue: event.venueName || event.venue || 'Arts Council of Pakistan, Karachi',
        cityName: event.cityName || event.city || 'Karachi',
        date: dbShowDate || 'Saturday, 10th January 2027',
        time: dbShowTime || '08:00 PM PKT',
        showTitle: event.selectedShow?.showTitle || 'Main Show Slot',
        attendeeName: formData.name,
        attendeeEmail: formData.email,
        phone: formData.phone,
        seats: selectedSeats,
        paymentMethod: 'PAYPRO PAKISTAN',
        paymentStatus: 'Paid',
        totalPaid: totalAmount,
        bookingTime: bookingTimestamp
      };

      showSuccess('Payment Confirmed! 🎉', 'PayPro payment verified. E-Ticket issued with QR Code!');
      onBookingSuccess(ticketObject);
    } catch (err) {
      console.error('Confirm error:', err);
      showError('Confirmation Failed', err.message || 'Payment confirmation error.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', border: '1px solid rgba(59, 130, 246, 0.3)', padding: 0 }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 800 }}>STEP {step} OF 3</span>
              <span className="badge" style={{ backgroundColor: 'rgba(37, 99, 235, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>
                PAYPRO PAKISTAN 🇵🇰
              </span>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
              {step === 1 ? 'Buyer Info & Verification' : (step === 2 ? 'Review & Select Payment Method' : 'PayPro Pakistan Invoice Slip')}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 60-Minute Countdown Timer & Order Summary Strip */}
        <div style={{
          backgroundColor: 'rgba(30, 41, 59, 0.9)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', display: 'block' }}>
              {event.title} {event.selectedShow ? `• ${event.selectedShow.showTitle}` : ''}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{selectedSeats.length} Ticket(s) selected</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* 60-Min Timer Display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: timerSeconds < 300 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.15)', border: timerSeconds < 300 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '0.35rem 0.75rem' }}>
              <Clock size={15} color={timerSeconds < 300 ? '#f87171' : '#60a5fa'} />
              <div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', lineHeight: 1 }}>Seat Hold Timer</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: timerSeconds < 300 ? '#f87171' : '#60a5fa' }}>{formatTimer(timerSeconds)}</span>
              </div>
            </div>

            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#60a5fa' }}>
              PKR {totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Step 1: Buyer Info & Verification */}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} style={{ padding: '1.5rem' }}>
            {!loggedUser && (
              <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', color: '#f87171', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertTriangle size={18} color="#f87171" />
                <span><strong>Authorization Required:</strong> Only logged in, verified users can buy tickets. Please log in to complete checkout.</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Full Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Muhammad Ali"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Email Address (For instant E-Ticket & PayPro receipt) *
                </label>
                <input
                  required
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Mobile Number (Pakistan 03XX) *
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="0300 1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    CNIC (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="42101-XXXXXXX-X"
                    value={formData.cnic}
                    onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
              Proceed to PayPro Payment
            </button>
          </form>
        )}

        {/* Step 2: Select PayPro Payment Method & Review */}
        {step === 2 && (
          <div style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Select PayPro Payment Gateway Options</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div
                onClick={() => setPaymentMethod('paypro_1pay')}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: paymentMethod === 'paypro_1pay' ? 'rgba(59, 130, 246, 0.2)' : '#1e293b',
                  border: paymentMethod === 'paypro_1pay' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <CreditCard color="#3b82f6" size={24} />
                <div>
                  <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem', display: 'block' }}>PayPro 1Pay (Online)</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Debit / Credit Card / 1-Link</span>
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod('jazzcash')}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: paymentMethod === 'jazzcash' ? 'rgba(59, 130, 246, 0.2)' : '#1e293b',
                  border: paymentMethod === 'jazzcash' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <Smartphone color="#ef4444" size={24} />
                <div>
                  <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem', display: 'block' }}>JazzCash via PayPro</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Mobile Wallet / OTC</span>
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod('easypaisa')}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: paymentMethod === 'easypaisa' ? 'rgba(59, 130, 246, 0.2)' : '#1e293b',
                  border: paymentMethod === 'easypaisa' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <Smartphone color="#60a5fa" size={24} />
                <div>
                  <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem', display: 'block' }}>EasyPaisa via PayPro</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Instant Wallet Deposit</span>
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod('otc_bank')}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: paymentMethod === 'otc_bank' ? 'rgba(59, 130, 246, 0.2)' : '#1e293b',
                  border: paymentMethod === 'otc_bank' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <ShieldCheck color="#f59e0b" size={24} />
                <div>
                  <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem', display: 'block' }}>Bank OTC / IBFT</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>PayPro Voucher Code</span>
                </div>
              </div>
            </div>

            {/* Promo Code Input */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Enter Promo Code (e.g. EVENTLAND10)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                style={{
                  flexGrow: 1,
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.85rem',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                className="btn btn-secondary"
                style={{ borderRadius: '8px', fontSize: '0.82rem' }}
              >
                Apply
              </button>
            </div>

            {/* Cost Breakdown */}
            <div style={{ backgroundColor: '#070c18', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.35rem' }}>
                <span>Subtotal ({selectedSeats.length} seats)</span>
                <span>PKR {subtotal.toLocaleString()}</span>
              </div>
              {groupDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', marginBottom: '0.35rem' }}>
                  <span>Group Savings (10% Off 3+ Seats)</span>
                  <span>- PKR {groupDiscount.toLocaleString()}</span>
                </div>
              )}
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', marginBottom: '0.35rem' }}>
                  <span>Promo Code Discount</span>
                  <span>- PKR {discount.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 800, fontSize: '1.05rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span>Grand Total</span>
                <span style={{ color: '#3b82f6' }}>PKR {totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
                style={{ width: '35%' }}
              >
                Back
              </button>
              <button
                onClick={handleCreateBookingAndPayProInvoice}
                disabled={isProcessing || timerSeconds <= 0}
                className="btn btn-primary"
                style={{ width: '65%', padding: '0.85rem' }}
              >
                {isProcessing ? 'Generating PayPro Invoice...' : 'Generate PayPro Invoice'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: PayPro Invoice Slip & OTC Voucher */}
        {step === 3 && invoiceData && (
          <div style={{ padding: '1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <span style={{ display: 'inline-block', width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', lineHeight: '54px', fontSize: '1.6rem', marginBottom: '0.5rem' }}>
                💳
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>PayPro Invoice Generated</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Complete payment within <strong>60 minutes</strong> to receive your E-Ticket with QR Code.
              </p>
            </div>

            {/* PayPro Invoice Details Box */}
            <div style={{ background: '#0f172a', border: '1px dashed rgba(59, 130, 246, 0.4)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>PayPro Invoice ID</span>
                <strong style={{ color: '#60a5fa' }}>{invoiceData.invoiceId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>PayPro Consumer / Voucher ID</span>
                <strong style={{ color: '#f59e0b', fontSize: '0.95rem' }}>{invoiceData.otcVoucherCode}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Amount Payable</span>
                <strong style={{ color: '#34d399', fontSize: '1.05rem' }}>PKR {totalAmount.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Invoice Status</span>
                <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '0.15rem 0.5rem', fontWeight: 800 }}>
                  UNPAID (Pending Payment)
                </span>
              </div>
            </div>

            {/* Notice: No Ticket Until Paid */}
            <div style={{ marginBottom: '1.5rem', padding: '0.85rem 1rem', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', color: '#fbbf24', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldCheck size={20} color="#fbbf24" />
              <span><strong>Ticket Issuance Guard:</strong> Your official E-Ticket with QR Code will be issued automatically as soon as PayPro Pakistan receives payment confirmation.</span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a
                href={invoiceData.connectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 800 }}
              >
                Pay Online via PayPro 1Pay portal <ExternalLink size={16} />
              </a>

              <button
                type="button"
                onClick={handleSimulatePayProPaymentSuccess}
                disabled={isProcessing}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <CheckCircle size={18} /> {isProcessing ? 'Verifying PayPro Payment...' : 'Simulate PayPro Instant IPN Payment Success'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
