import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Copy, 
  Check, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  QrCode, 
  ShieldCheck, 
  Send, 
  UploadCloud, 
  MessageSquare,
  FileText,
  CreditCard
} from 'lucide-react';
import QRCode from 'qrcode';
import { bookingsApi, bankAccountsApi, uploadApi, getEventImageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function CheckoutModal({ event, selectedSeats, onClose, onBookingSuccess, onInvoiceCreated }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [step, setStep] = useState(1); // 1: Buyer Info, 2: Bank Account Transfer & Proof, 3: Invoice & Confirmation

  // Authorization / Verified User check
  const loggedUserRaw = localStorage.getItem('eventland_logged_user');
  const loggedUser = loggedUserRaw ? JSON.parse(loggedUserRaw) : null;

  const [formData, setFormData] = useState({
    name: loggedUser?.name || loggedUser?.fullName || '',
    email: loggedUser?.email || '',
    phone: loggedUser?.phone || '',
    cnic: ''
  });

  // Active Bank Account from DB
  const [bankAccount, setBankAccount] = useState({
    bankName: 'Meezan Bank Limited',
    accountTitle: 'EventLand Official Pvt Ltd',
    accountNumber: '0102030405060701',
    iban: 'PK64MEZN0001020304050607',
    branchCode: '0102',
    branchName: 'Clifton Branch, Karachi',
    qrCodeImageUrl: '',
    instructions: 'Please transfer the exact booking amount via Mobile Banking App, Raast ID, or ATM. Mention your Booking Ref in transfer remarks.'
  });
  const [bankQrDataUrl, setBankQrDataUrl] = useState('');

  // Copy Feedback states
  const [copiedField, setCopiedField] = useState(null);

  // Bank Transfer Proof fields
  const [transactionRef, setTransactionRef] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 30-Minute Seat Reservation Hold Timer (30 mins = 1800s)
  const [timerSeconds, setTimerSeconds] = useState(1800);
  const [createdBooking, setCreatedBooking] = useState(null);

  // Promo Code
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);

  // 1. Fetch Active Bank Account from Database & generate QR
  useEffect(() => {
    async function loadActiveBank() {
      try {
        const active = await bankAccountsApi.getActive();
        if (active) {
          setBankAccount(active);
          generateBankQr(active);
        } else {
          generateBankQr(bankAccount);
        }
      } catch (err) {
        console.warn('Using default bank account fallback:', err);
        generateBankQr(bankAccount);
      }
    }
    loadActiveBank();
  }, []);

  const generateBankQr = async (bank) => {
    if (bank.qrCodeImageUrl) {
      setBankQrDataUrl(bank.qrCodeImageUrl);
      return;
    }
    try {
      const payload = `EVENTLAND BANK PAYMENT\nBank: ${bank.bankName}\nTitle: ${bank.accountTitle}\nAcc: ${bank.accountNumber}\nIBAN: ${bank.iban}`;
      const url = await QRCode.toDataURL(payload, {
        width: 360,
        margin: 1,
        color: { dark: '#061017', light: '#ffffff' }
      });
      setBankQrDataUrl(url);
    } catch (e) {
      console.warn('QR code generation error:', e);
    }
  };

  // 2. 30-Minute Countdown Timer for seat reservation hold
  useEffect(() => {
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
  }, []);

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

  // Pricing calculations (Direct Bank Transfer has NO gateway fees)
  const subtotal = selectedSeats.reduce((sum, s) => sum + (s.price || 1500), 0);
  const groupDiscount = selectedSeats.length >= 3 ? Math.round(subtotal * 0.1) : 0;
  const totalPayable = Math.max(0, subtotal - groupDiscount - discount);

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'EVENTLAND10') {
      const disc = Math.round(subtotal * 0.1);
      setDiscount(disc);
      showSuccess('Promo Applied! 🎉', `10% discount (-PKR ${disc.toLocaleString()}) applied.`);
    } else if (promoCode.trim().toUpperCase() === 'BANK500') {
      setDiscount(500);
      showSuccess('Promo Applied! 🎉', 'Flat PKR 500 discount applied.');
    } else {
      showError('Invalid Promo', 'Invalid promo code. Try "EVENTLAND10" or "BANK500"');
    }
  };

  const handleProofFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict image format extension check: webp, jpg, jpeg, png ONLY
    const allowedExtensions = ['.webp', '.jpg', '.jpeg', '.png'];
    const ext = file.name.slice(((file.name.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
    if (!allowedExtensions.includes('.' + ext)) {
      showError('Invalid File Format', 'Only webp, jpg, jpeg, and png payment slips are supported.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showError('File Too Large', 'Transaction slip image size must be under 25 MB.');
      return;
    }

    setIsUploadingProof(true);
    try {
      const res = await uploadApi.uploadFile(file, 'slips');
      setProofUrl(res.url);
      showSuccess('Receipt Uploaded 📎', 'Transaction slip image compressed & saved in organized slips directory.');
    } catch (err) {
      showError('Upload Failed', err.message || 'Could not upload payment slip.');
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleCreateBookingAndProceedToBank = (e) => {
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
    setStep(2);
  };

  const handleSubmitBankTransfer = async (e) => {
    e.preventDefault();
    if (!transactionRef.trim()) {
      showError('Transaction Ref Required', 'Please enter your Bank Transaction ID, Raast Reference # or Transfer TID.');
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
          paymentMethod: 'BankTransfer',
          selectedSeatIds: seatIds.length > 0 ? seatIds : null,
          eventShowId: showId
        };
        backendBooking = await bookingsApi.createBooking(dto);

        // Submit the Bank Transaction Reference & Receipt Proof
        if (backendBooking?.id) {
          backendBooking = await bookingsApi.submitPaymentProof(backendBooking.id, {
            bankTransactionRef: transactionRef.trim(),
            paymentProofUrl: proofUrl || null
          });
        }
      }

      setCreatedBooking(backendBooking);
      setStep(3); // Show Invoice & Verification Details

      if (onInvoiceCreated) {
        onInvoiceCreated({
          bookingRef: backendBooking?.bookingRef || (`EVL-` + Math.floor(100000 + Math.random() * 900000)),
          bookingId: backendBooking?.id,
          totalAmount: totalPayable,
          bankTransactionRef: transactionRef.trim(),
          eventTitle: event.title,
          showTitle: event.selectedShow?.showTitle || null,
          customerName: formData.name,
          customerEmail: formData.email,
          paymentStatus: 'PendingVerification',
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      showSuccess('Order Placed! 🏦', 'Payment proof submitted. Super Admin will verify and issue your official E-Ticket.');
      if (onBookingSuccess) {
        onBookingSuccess(backendBooking);
      }
    } catch (err) {
      console.error('Bank Transfer Checkout error:', err);
      showError('Booking Error', err.message || 'Failed to submit bank transfer booking.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getWhatsAppSupportLink = () => {
    const bookingRef = createdBooking?.bookingRef || 'EVL-100001';
    const message = `Hello EventLand Support,\n\nI have transferred PKR ${totalPayable.toLocaleString()} for Booking Ref: *${bookingRef}* (${event.title}).\nTransaction Reference: *${transactionRef}*.\n\nPlease verify my payment and issue my official E-Ticket pass. Thank you!`;
    return `https://api.whatsapp.com/send?phone=923079353185&text=${encodeURIComponent(message)}`;
  };

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
        padding: '2rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                <ShieldCheck size={14} /> DIRECT BANK TRANSFER
              </span>
              <span className="checkout-timer" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: timerSeconds > 300 ? '#2dd4bf' : '#f87171',
                background: timerSeconds > 300 ? 'rgba(13, 148, 136, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                border: `1px solid ${timerSeconds > 300 ? 'rgba(13, 148, 136, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
              }}>
                <Clock size={13} className={timerSeconds <= 300 ? 'animate-pulse' : ''} /> 
                Held for: {formatTimer(timerSeconds)}
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              {step === 1 && 'Buyer Details'}
              {step === 2 && 'Bank Transfer Details & Proof'}
              {step === 3 && 'Invoice & Verification Slip'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              {event.title} • {selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'}
            </p>
          </div>
          <button
            onClick={onClose}
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

        {/* Step Progress Tracker */}
        <div className="checkout-steps-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
          {[
            { num: 1, label: '1. Buyer Info' },
            { num: 2, label: '2. Bank Transfer' },
            { num: 3, label: '3. Invoice' }
          ].map(s => (
            <div key={s.num} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{
                height: '4px',
                borderRadius: '9999px',
                background: step >= s.num ? 'linear-gradient(90deg, #0d9488, #2dd4bf)' : 'rgba(255, 255, 255, 0.1)',
                transition: 'background 0.3s ease'
              }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: step >= s.num ? '#2dd4bf' : '#64748b' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Maintenance Notice Banner (if active) */}
        {bankAccount?.maintenanceNotice && (
          <div style={{
            margin: '0 0 1.25rem 0',
            padding: '0.75rem 1rem',
            backgroundColor: bankAccount.isUnderMaintenance ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.12)',
            border: `1px solid ${bankAccount.isUnderMaintenance ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: bankAccount.isUnderMaintenance ? '#fca5a5' : '#fbbf24',
            fontSize: '0.8rem'
          }}>
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#fff', display: 'block', fontSize: '0.82rem' }}>
                {bankAccount.isUnderMaintenance ? '⚠️ Bank Channel Maintenance Notice' : 'ℹ️ Scheduled Bank Maintenance Advisory'}
              </strong>
              {bankAccount.maintenanceNotice}
            </div>
          </div>
        )}

        {/* --- STEP 1: BUYER INFORMATION --- */}
        {step === 1 && (
          <form onSubmit={handleCreateBookingAndProceedToBank}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
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

              <div style={{ gridColumn: 'span 2' }}>
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

            {/* Promo Code & Order Summary */}
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Promo Code (e.g. EVENTLAND10)"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value)}
                  style={{ flex: 1, padding: '0.65rem 0.85rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="btn btn-outline-primary"
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
                >
                  Apply
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                <span>Selected Seats ({selectedSeats.length}):</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>PKR {subtotal.toLocaleString()}</span>
              </div>

              {groupDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#2dd4bf', marginBottom: '0.4rem' }}>
                  <span>Group Discount (10%):</span>
                  <span>-PKR {groupDiscount.toLocaleString()}</span>
                </div>
              )}

              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#2dd4bf', marginBottom: '0.4rem' }}>
                  <span>Promo Discount:</span>
                  <span>-PKR {discount.toLocaleString()}</span>
                </div>
              )}

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
              Continue to Bank Account Details →
            </button>
          </form>
        )}

        {/* --- STEP 2: BANK ACCOUNT TRANSFER & PROOF SUBMISSION --- */}
        {step === 2 && (
          <div>
            {/* Amount Payable Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.25), rgba(15, 23, 42, 0.7))',
              border: '1px solid rgba(13, 148, 136, 0.4)',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#2dd4bf', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Exact Amount to Transfer
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>
                  PKR {totalPayable.toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Payment Method</span>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2dd4bf' }}>Online Bank Transfer / Raast</div>
              </div>
            </div>

            {/* Official Bank Account Card with 1-Click Copy Buttons */}
            <div style={{
              background: 'rgba(10, 18, 30, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <Building2 size={20} color="#2dd4bf" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {bankAccount.bankName}
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Account Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Account Title</span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{bankAccount.accountTitle}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bankAccount.accountTitle, 'Account Title')}
                    style={{ background: copiedField === 'Account Title' ? '#059669' : 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                  >
                    {copiedField === 'Account Title' ? <><Check size={13} color="#fff" /> Copied!</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>

                {/* Account Number */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Account Number</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2dd4bf', letterSpacing: '0.05em' }}>{bankAccount.accountNumber}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bankAccount.accountNumber, 'Account Number')}
                    style={{ background: copiedField === 'Account Number' ? '#059669' : 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                  >
                    {copiedField === 'Account Number' ? <><Check size={13} color="#fff" /> Copied!</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>

                {/* IBAN */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>IBAN Number</span>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>{bankAccount.iban}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bankAccount.iban, 'IBAN Number')}
                    style={{ background: copiedField === 'IBAN Number' ? '#059669' : 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                  >
                    {copiedField === 'IBAN Number' ? <><Check size={13} color="#fff" /> Copied!</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>

                {/* Branch details if present */}
                {bankAccount.branchName && (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Branch: <strong>{bankAccount.branchName}</strong> {bankAccount.branchCode ? `(Code: ${bankAccount.branchCode})` : ''}
                  </div>
                )}
              </div>

              {/* Bank QR Code & Scan Option */}
              {bankQrDataUrl && (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '1.25rem',
                  border: '1px solid rgba(13, 148, 136, 0.3)',
                  borderRadius: '16px',
                  background: 'rgba(13, 148, 136, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.85rem',
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2dd4bf', fontWeight: 800, fontSize: '0.95rem' }}>
                    <QrCode size={20} /> Instant Banking App / Raast QR Scan
                  </div>

                  <div style={{
                    background: '#ffffff',
                    padding: '0.85rem',
                    borderRadius: '16px',
                    boxShadow: '0 0 25px rgba(13, 148, 136, 0.4), 0 10px 25px rgba(0, 0, 0, 0.5)',
                    border: '2px solid rgba(45, 212, 191, 0.6)',
                    display: 'inline-block'
                  }}>
                    <img
                      src={bankQrDataUrl}
                      alt="Bank QR Code"
                      style={{
                        width: '220px',
                        height: '220px',
                        display: 'block',
                        objectFit: 'contain',
                        borderRadius: '6px'
                      }}
                    />
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0, maxWidth: '440px', lineHeight: 1.45 }}>
                    Scan directly using your mobile banking app (Meezan / HBL / Raast / EasyPaisa / JazzCash / Any 1Link App) for instant transfer.
                  </p>
                </div>
              )}

              {/* Instructions */}
              {bankAccount.instructions && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(13, 148, 136, 0.1)', border: '1px solid rgba(13, 148, 136, 0.25)', borderRadius: '8px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                  💡 <strong>Instruction:</strong> {bankAccount.instructions}
                </div>
              )}
            </div>

            {/* Proof Submission Form */}
            <form onSubmit={handleSubmitBankTransfer}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Bank Transaction ID / Reference # / Raast TID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TXN-982314 or Raast TID / Ref #"
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                  style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '10px', color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}
                />
                <span style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '0.3rem', display: 'block' }}>
                  Enter the transaction ID shown on your mobile banking app / ATM receipt after transferring.
                </span>
              </div>

              {/* Payment Screenshot Slip Upload */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Upload Payment Screenshot / Transfer Slip (WEBP, JPG, PNG)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input
                      type="file"
                      accept=".webp,.jpg,.jpeg,.png"
                      id="proof-upload"
                      style={{ display: 'none' }}
                      onChange={handleProofFileUpload}
                    />
                    <label
                      htmlFor="proof-upload"
                      style={{
                        padding: '0.65rem 1.1rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(13, 148, 136, 0.35)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <UploadCloud size={16} color="#0d9488" /> {isUploadingProof ? 'Compressing & Uploading...' : (proofUrl ? 'Change Receipt Slip' : 'Choose Receipt Image')}
                    </label>
                    {proofUrl && (
                      <button
                        type="button"
                        onClick={() => setProofUrl('')}
                        style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.45rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        Remove Slip
                      </button>
                    )}
                  </div>
                  {proofUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.7)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(45, 212, 191, 0.35)', width: 'fit-content' }}>
                      <img
                        src={getPaymentSlipUrl(proofUrl)}
                        alt="Attached Slip Preview"
                        style={{ width: '56px', height: '42px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#2dd4bf', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle size={13} /> Transaction Slip Attached & Compressed!
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Saved in /assets/images/slips/</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-outline-secondary"
                  style={{ padding: '0.85rem 1.25rem', borderRadius: '10px' }}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.85rem', fontSize: '1rem', fontWeight: 700, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {isProcessing ? 'Processing Order...' : 'Submit Payment & Place Booking ✓'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- STEP 3: INVOICE & VERIFICATION CARD --- */}
        {step === 3 && (
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

            <span className="badge badge-primary" style={{ marginBottom: '0.75rem' }}>
              PAYMENT VERIFICATION PENDING
            </span>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Booking Invoice Generated!
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Your seats are securely locked for 30 minutes. Super Admin will verify your bank transfer (Ref: <strong>{transactionRef}</strong>) and confirm your booking.
            </p>

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
                <strong style={{ color: '#2dd4bf' }}>{createdBooking?.bookingRef || 'EVL-100001'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Event:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{event.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Pass Holder:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{formData.name} ({formData.email})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Bank Transaction TID:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{transactionRef}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.6rem' }}>
                <span style={{ color: '#fff' }}>Amount Paid:</span>
                <span style={{ color: '#2dd4bf' }}>PKR {totalPayable.toLocaleString()}</span>
              </div>
            </div>

            {/* Official WhatsApp Support Dispatch Option */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a
                href={getWhatsAppSupportLink()}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '0.85rem 1.25rem',
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <MessageSquare size={18} /> Send Receipt via WhatsApp Support ↗
              </a>

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
      </div>
    </div>
  );
}
