import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, ShieldCheck, Clock, AlertTriangle, ExternalLink, CheckCircle, Globe } from 'lucide-react';
import { bookingsApi, paymentsApi, getEventImageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function CheckoutModal({ event, selectedSeats, onClose, onBookingSuccess, onInvoiceCreated }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [step, setStep] = useState(1); // 1: Buyer Info, 2: Payment Gateway & Method, 3: PayFast Checkout Slip

  // Authorization / Verified User check
  const loggedUserRaw = localStorage.getItem('eventland_logged_user');
  const loggedUser = loggedUserRaw ? JSON.parse(loggedUserRaw) : null;

  const [formData, setFormData] = useState({
    name: loggedUser?.name || loggedUser?.fullName || '',
    email: loggedUser?.email || '',
    phone: loggedUser?.phone || '',
    cnic: ''
  });

  const [paymentMethodCode, setPaymentMethodCode] = useState('bank_wallet'); // 'bank_wallet', 'card_domestic', 'card_international'
  const [feeConfigs, setFeeConfigs] = useState([
    { paymentMethodCode: 'bank_wallet', displayName: 'Online Bank Transfer & Wallets', commissionPercentage: 2.53 },
    { paymentMethodCode: 'card_domestic', displayName: 'Debit / Credit Card (Domestic)', commissionPercentage: 3.39 },
    { paymentMethodCode: 'card_international', displayName: 'International Cards', commissionPercentage: 4.025 }
  ]);

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // PayFast Checkout & 60-Minute Payment Timer state
  const [checkoutData, setCheckoutData] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(3600); // 60 minutes = 3600s
  const [createdBooking, setCreatedBooking] = useState(null);

  // Fetch live fee configs from database
  useEffect(() => {
    async function loadFeeConfigs() {
      try {
        const configs = await paymentsApi.getFeeConfigs();
        if (configs && configs.length > 0) {
          setFeeConfigs(configs);
        }
      } catch (err) {
        console.warn('Could not fetch dynamic fee configs, using defaults:', err);
      }
    }
    loadFeeConfigs();
  }, []);

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
  const baseTicketAmount = Math.max(0, subtotal - groupDiscount - discount);

  // Current fee configuration for selected payment method
  const currentFeeConfig = feeConfigs.find(f => f.paymentMethodCode === paymentMethodCode) || { commissionPercentage: 2.53 };
  const commissionRate = currentFeeConfig.commissionPercentage || 2.53;
  const gatewayFee = Math.round((baseTicketAmount * (commissionRate / 100)) * 100) / 100;
  const grossPayableAmount = Math.round((baseTicketAmount + gatewayFee) * 100) / 100;

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

  const handleCreateBookingAndPayFastCheckout = async (e) => {
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
          paymentMethod: paymentMethodCode === 'card_international' ? 'CreditCard' : 'BankTransfer',
          selectedSeatIds: seatIds.length > 0 ? seatIds : null,
          eventShowId: showId
        };
        backendBooking = await bookingsApi.createBooking(dto);
      }

      setCreatedBooking(backendBooking);

      const bookingId = backendBooking?.id || 1000;
      const bookingRef = backendBooking?.bookingRef || (`EVL-` + Math.floor(100000 + Math.random() * 900000));
      const payableBase = backendBooking?.totalAmount ?? baseTicketAmount;

      if (backendBooking && (groupDiscount > 0 || discount > 0) && Number(payableBase) !== baseTicketAmount) {
        showWarning('Promo Notice', 'Promo/group discounts are not yet applied server-side — checkout uses the full booking subtotal.');
      }

      const payFastRes = await paymentsApi.createCheckout({
        bookingId: bookingId,
        bookingRef: bookingRef,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        amount: payableBase,
        paymentMethodCode: paymentMethodCode
      });

      setCheckoutData(payFastRes);
      setStep(3); // Show PayFast Payment Checkout Slip

      if (onInvoiceCreated) {
        onInvoiceCreated({
          bookingRef: payFastRes?.bookingRef || bookingRef,
          bookingId: backendBooking?.id ?? bookingId,
          transactionId: payFastRes?.transactionId,
          checkoutUrl: payFastRes?.checkoutUrl,
          baseAmount: payableBase,
          gatewayFee: payFastRes?.gatewayFee || gatewayFee,
          grossAmount: payFastRes?.grossAmount || grossPayableAmount,
          eventTitle: event.title,
          showTitle: event.selectedShow?.showTitle || null,
          customerName: formData.name,
          customerEmail: formData.email,
          paymentStatus: 'Pending',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      showSuccess('Checkout Generated', 'PayFast Pakistan Payment Link generated. Complete payment within 60 minutes.');
    } catch (err) {
      console.error('Booking/PayFast error:', err);
      showError('Payment Error', err.message || 'PayFast checkout creation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulatePayFastPaymentSuccess = async () => {
    setIsProcessing(true);
    try {
      const transactionId = checkoutData?.transactionId || `PF-EVL-${createdBooking?.bookingRef || '1001'}`;
      const bookingRef = createdBooking?.bookingRef || checkoutData?.bookingRef || 'EVL-100001';
      const confirmAmount = checkoutData?.grossAmount ?? grossPayableAmount;

      await paymentsApi.confirmPayment({
        transactionId: transactionId,
        bookingRef: bookingRef,
        amountPayable: String(confirmAmount),
        amountPaid: String(confirmAmount),
        status: 'PAID',
        paymentMethod: paymentMethodCode,
        signature: 'VALID_PAYFAST_SIG'
      });

      const dbRawBanner = event.banner || event.imageUrl || event.bannerUrl || '';
      const dbBannerUrl = getEventImageUrl(dbRawBanner);

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
        showDateTime: (dbShowDate && dbShowTime) ? `${dbShowDate} at ${dbShowTime}` : (dbShowDate || dbShowTime || 'Saturday, 10th January 2027 at 08:00 PM PKT'),
        showTitle: event.selectedShow?.showTitle || 'Main Show Slot',
        attendeeName: formData.name,
        attendeeEmail: formData.email,
        phone: formData.phone,
        seats: selectedSeats,
        paymentMethod: `PAYFAST (${currentFeeConfig.displayName || 'Online'})`,
        paymentStatus: 'Paid',
        totalPaid: confirmAmount,
        bookingTime: bookingTimestamp
      };

      showSuccess('Payment Confirmed! 🎉', 'PayFast payment verified. E-Ticket issued with QR Code!');
      onBookingSuccess(ticketObject);
    } catch (err) {
      console.error('PayFast payment confirmation error:', err);
      showError('Confirmation Error', err.message || 'Payment confirmation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid rgba(13, 148, 136, 0.25)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '540px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        position: 'relative'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0d9488', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              PAYFAST PAKISTAN 🇵🇰
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              {step === 1 ? 'Buyer Info & Verification' : (step === 2 ? 'Select PayFast Payment Option' : 'PayFast Payment Slip')}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
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
        </div>

        {/* 60-Minute Countdown Banner */}
        {step >= 2 && (
          <div style={{
            backgroundColor: timerSeconds < 300 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(13, 148, 136, 0.12)',
            borderBottom: timerSeconds < 300 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(13, 148, 136, 0.25)',
            padding: '0.65rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: timerSeconds < 300 ? '#fca5a5' : '#99f6e4' }}>
              <Clock size={16} />
              <span>Seat Reservation Hold Timer</span>
            </div>
            <strong style={{
              fontSize: '1rem',
              fontFamily: 'monospace',
              color: timerSeconds < 300 ? '#ef4444' : '#2dd4bf'
            }}>
              {formatTimer(timerSeconds)}
            </strong>
          </div>
        )}

        {/* Step 1: Buyer Information Form */}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                Full Name (Appears on E-Ticket) *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ali Ahmed"
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                Email Address (For E-Ticket & PayFast receipt) *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ali@example.com"
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                Mobile Number (SMS verification & E-Ticket) *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+92 300 1234567"
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            {!loggedUser && (
              <div style={{
                marginBottom: '1.5rem',
                padding: '0.85rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                color: '#fca5a5',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={18} color="#ef4444" />
                <span>You must be logged in to proceed with ticket booking.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!loggedUser}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem' }}
            >
              Proceed to PayFast Options
            </button>
          </form>
        )}

        {/* Step 2: Select PayFast Payment Category & Fee Breakdown */}
        {step === 2 && (
          <div style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Select Payment Method</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {feeConfigs.map(fee => {
                const isSelected = paymentMethodCode === fee.paymentMethodCode;
                const IconComponent = fee.paymentMethodCode === 'card_international' ? Globe : (fee.paymentMethodCode === 'card_domestic' ? CreditCard : Smartphone);
                const iconColor = fee.paymentMethodCode === 'card_international' ? '#a855f7' : (fee.paymentMethodCode === 'card_domestic' ? '#0d9488' : '#2dd4bf');
                
                return (
                  <div
                    key={fee.paymentMethodCode}
                    onClick={() => setPaymentMethodCode(fee.paymentMethodCode)}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.15)' : '#1e293b',
                      border: isSelected ? '2px solid #0d9488' : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <IconComponent color={iconColor} size={24} />
                      <div>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem', display: 'block' }}>{fee.displayName}</span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{fee.description || 'PayFast Gateway'}</span>
                      </div>
                    </div>
                    <span className="badge" style={{ backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.25)' : 'rgba(255,255,255,0.06)', color: isSelected ? '#2dd4bf' : '#94a3b8', fontWeight: 800 }}>
                      +{fee.commissionPercentage}% fee
                    </span>
                  </div>
                );
              })}
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
                  border: '1px solid rgba(13, 148, 136, 0.25)',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2dd4bf', marginBottom: '0.35rem' }}>
                  <span>Group Savings (10% Off 3+ Seats)</span>
                  <span>- PKR {groupDiscount.toLocaleString()}</span>
                </div>
              )}
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2dd4bf', marginBottom: '0.35rem' }}>
                  <span>Promo Code Discount</span>
                  <span>- PKR {discount.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.35rem' }}>
                <span>Base Ticket Amount</span>
                <span>PKR {baseTicketAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', marginBottom: '0.35rem' }}>
                <span>PayFast Gateway Fee ({commissionRate}%)</span>
                <span>+ PKR {gatewayFee.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 800, fontSize: '1.05rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span>Grand Total Payable</span>
                <span style={{ color: '#0d9488' }}>PKR {grossPayableAmount.toLocaleString()}</span>
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
                onClick={handleCreateBookingAndPayFastCheckout}
                disabled={isProcessing || timerSeconds <= 0}
                className="btn btn-primary"
                style={{ width: '65%', padding: '0.85rem' }}
              >
                {isProcessing ? 'Generating Checkout...' : 'Proceed to PayFast'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: PayFast Checkout Details */}
        {step === 3 && checkoutData && (
          <div style={{ padding: '1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <span style={{ display: 'inline-block', width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(13, 148, 136, 0.18)', color: '#2dd4bf', lineHeight: '54px', fontSize: '1.6rem', marginBottom: '0.5rem' }}>
                💳
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>PayFast Checkout Generated</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Complete payment within <strong>60 minutes</strong> to receive your E-Ticket with QR Code.
              </p>
            </div>

            {/* PayFast Checkout Details Box */}
            <div style={{ background: '#0f172a', border: '1px dashed rgba(13, 148, 136, 0.4)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>PayFast Transaction Ref</span>
                <strong style={{ color: '#2dd4bf' }}>{checkoutData.transactionId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Ticket Subtotal</span>
                <span>PKR {checkoutData.baseAmount?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Gateway Fee ({commissionRate}%)</span>
                <span style={{ color: '#f59e0b' }}>+ PKR {checkoutData.gatewayFee?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Total Amount Payable</span>
                <strong style={{ color: '#34d399', fontSize: '1.05rem' }}>PKR {checkoutData.grossAmount?.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Payment Status</span>
                <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '0.15rem 0.5rem', fontWeight: 800 }}>
                  UNPAID (Pending Payment)
                </span>
              </div>
            </div>

            {/* Notice: No Ticket Until Paid */}
            <div style={{ marginBottom: '1.5rem', padding: '0.85rem 1rem', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', color: '#fbbf24', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldCheck size={20} color="#fbbf24" />
              <span><strong>Ticket Issuance Guard:</strong> Your official E-Ticket with QR Code will be issued automatically as soon as PayFast Pakistan receives payment confirmation.</span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a
                href={checkoutData.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 800 }}
              >
                Pay Online via PayFast Portal <ExternalLink size={16} />
              </a>

              <button
                type="button"
                onClick={handleSimulatePayFastPaymentSuccess}
                disabled={isProcessing}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <CheckCircle size={18} /> {isProcessing ? 'Verifying PayFast Payment...' : 'Simulate PayFast Instant IPN Payment Success'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
