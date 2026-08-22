import React, { useState } from 'react';
import { X, CreditCard, Smartphone, ShieldCheck } from 'lucide-react';
import { bookingsApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function CheckoutModal({ event, selectedSeats, onClose, onBookingSuccess }) {
  const { showSuccess, showError } = useToast();
  const [step, setStep] = useState(1); // 1: Info, 2: Payment & Review
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cnic: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('jazzcash');
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleCompleteBooking = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      showError('Validation Error', 'Please fill out all required attendee fields.');
      return;
    }

    setIsProcessing(true);

    try {
      // Map event ticket tier ID
      const ticketTierId = event.ticketTiers && event.ticketTiers.length > 0
        ? event.ticketTiers[0].id
        : 1000;

      const seatIds = selectedSeats.map(s => s.id).filter(id => typeof id === 'number');

      const dto = {
        eventId: typeof event.id === 'number' ? event.id : 1000,
        ticketTierId: ticketTierId,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        quantity: selectedSeats.length || 1,
        paymentMethod: paymentMethod === 'jazzcash' ? 'JazzCash' : (paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'CreditCard'),
        selectedSeatIds: seatIds
      };

      const backendBooking = await bookingsApi.createBooking(dto);

      const ticketObject = {
        ticketId: backendBooking.bookingRef || ('EVL-' + Math.floor(100000 + Math.random() * 900000)),
        eventTitle: event.title,
        venue: event.venue,
        date: event.date || 'TBA',
        time: event.time || 'TBA',
        attendeeName: formData.name,
        attendeeEmail: formData.email,
        phone: formData.phone,
        seats: selectedSeats,
        paymentMethod: paymentMethod.toUpperCase(),
        totalPaid: totalAmount,
        bookingTime: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      };

      onBookingSuccess(ticketObject);
    } catch (err) {
      console.error('Booking error:', err);
      // Fallback local ticket generation if offline
      const ticketObject = {
        ticketId: 'EVL-' + Math.floor(100000 + Math.random() * 900000),
        eventTitle: event.title,
        venue: event.venue,
        date: event.date || 'TBA',
        time: event.time || 'TBA',
        attendeeName: formData.name,
        attendeeEmail: formData.email,
        phone: formData.phone,
        seats: selectedSeats,
        paymentMethod: paymentMethod.toUpperCase(),
        totalPaid: totalAmount,
        bookingTime: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      };
      onBookingSuccess(ticketObject);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700 }}>STEP {step} OF 2</span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
              {step === 1 ? 'Attendee Details' : 'Payment & Order Review'}
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

        {/* Order Summary Strip */}
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.25)',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', display: 'block' }}>
              {event.title} {event.selectedShow ? `• ${event.selectedShow.showTitle}` : ''}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{selectedSeats.length} Ticket(s) selected</span>
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#60a5fa' }}>
            PKR {totalAmount.toLocaleString()}
          </span>
        </div>

        {/* Step 1: Attendee Info */}
        {step === 1 && (
          <form onSubmit={() => setStep(2)} style={{ padding: '1.5rem' }}>
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
                  Email Address (For instant E-Ticket delivery) *
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
                    Mobile Number *
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
              Proceed to Payment
            </button>
          </form>
        )}

        {/* Step 2: Payment & Review */}
        {step === 2 && (
          <div style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Select Payment Method</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div
                onClick={() => setPaymentMethod('jazzcash')}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: paymentMethod === 'jazzcash' ? 'rgba(59, 130, 246, 0.18)' : '#1e293b',
                  border: paymentMethod === 'jazzcash' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <Smartphone color="#ef4444" size={24} />
                <div>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', display: 'block' }}>JazzCash</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Mobile Wallet</span>
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod('easypaisa')}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: paymentMethod === 'easypaisa' ? 'rgba(59, 130, 246, 0.18)' : '#1e293b',
                  border: paymentMethod === 'easypaisa' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <Smartphone color="#10b981" size={24} />
                <div>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', display: 'block' }}>EasyPaisa</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Instant Payment</span>
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod('card')}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: paymentMethod === 'card' ? 'rgba(59, 130, 246, 0.18)' : '#1e293b',
                  border: paymentMethod === 'card' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <CreditCard color="#3b82f6" size={24} />
                <div>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', display: 'block' }}>Credit / Debit Card</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Visa / MasterCard</span>
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod('bank')}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: paymentMethod === 'bank' ? 'rgba(59, 130, 246, 0.18)' : '#1e293b',
                  border: paymentMethod === 'bank' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <ShieldCheck color="#f59e0b" size={24} />
                <div>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', display: 'block' }}>Direct Bank Transfer</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>1-Link / IBFT</span>
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

            {/* Discounts Breakdown */}
            <div style={{ backgroundColor: '#070c18', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.35rem' }}>
                <span>Subtotal ({selectedSeats.length} seats)</span>
                <span>PKR {subtotal.toLocaleString()}</span>
              </div>
              {groupDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', marginBottom: '0.35rem' }}>
                  <span>Group Discount (10% Off 3+ Seats)</span>
                  <span>- PKR {groupDiscount.toLocaleString()}</span>
                </div>
              )}
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', marginBottom: '0.35rem' }}>
                  <span>Promo Code Savings</span>
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
                onClick={handleCompleteBooking}
                disabled={isProcessing}
                className="btn btn-primary"
                style={{ width: '65%', padding: '0.85rem' }}
              >
                {isProcessing ? 'Processing Payment...' : 'Confirm & Generate Ticket'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
