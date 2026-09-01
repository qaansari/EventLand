import React, { useState, useEffect } from 'react';
import { X, Clock, ExternalLink, CheckCircle, Trash2, Search, AlertCircle, RefreshCw, FileText, CreditCard, ShieldCheck } from 'lucide-react';
import { bookingsApi, paymentsApi, getEventImageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function UnpaidInvoicesModal({ currentUser, onClose, onPaymentSuccess, onInvoicePaid }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [timers, setTimers] = useState({});

  // Fetch unpaid invoices from API and localStorage
  const loadUnpaidInvoices = async () => {
    setLoading(true);
    try {
      const localInvoicesRaw = localStorage.getItem('eventland_unpaid_invoices');
      let localInvoices = localInvoicesRaw ? JSON.parse(localInvoicesRaw) : [];

      let apiInvoices = [];
      const userEmail = currentUser?.email || localStorage.getItem('eventland_user_email');
      
      if (userEmail) {
        try {
          const bksRes = await bookingsApi.getBookingsByEmail(userEmail, 1, 50);
          const bksList = Array.isArray(bksRes) ? bksRes : (bksRes?.items || []);
          
          apiInvoices = bksList
            .filter(b => b.paymentStatus === 'Pending' || b.paymentStatus === 0 || b.status === 'Pending')
            .map(b => {
              const baseAmt = b.totalAmount || b.unitPrice * b.quantity || 1500;
              const feeAmt = b.gatewayFee || 0;
              const grossAmt = b.grossAmount || (baseAmt + feeAmt);
              return {
                id: b.id,
                bookingId: b.id,
                bookingRef: b.bookingRef || `EVL-${b.id}`,
                transactionId: b.payFastTransactionId || `PF-EVL-${b.bookingRef || b.id}`,
                checkoutUrl: b.payFastUrl || '#',
                customerName: b.customerName,
                customerEmail: b.customerEmail,
                customerPhone: b.customerPhone,
                eventTitle: b.eventTitle || 'Live Event',
                venueName: b.venueName || 'Arts Council of Pakistan, Karachi',
                date: b.showDate || 'Upcoming Show',
                time: b.showTime || '08:00 PM PKT',
                baseAmount: baseAmt,
                gatewayFee: feeAmt,
                grossAmount: grossAmt,
                quantity: b.quantity || 1,
                paymentStatus: 'Pending',
                createdAt: b.createdAt || new Date().toISOString(),
                expiresAt: b.paymentExpiresAt || new Date(Date.now() + 3600000).toISOString()
              };
            });
        } catch (e) {
          console.warn('Could not fetch API bookings for unpaid invoices:', e);
        }
      }

      // Merge API unpaid invoices with local un-synced invoice slips
      const mergedMap = new Map();
      [...localInvoices, ...apiInvoices].forEach(inv => {
        const key = inv.bookingRef || inv.transactionId || String(inv.bookingId || inv.id);
        if (!mergedMap.has(key)) {
          mergedMap.set(key, inv);
        }
      });

      const finalInvoices = Array.from(mergedMap.values());
      setInvoices(finalInvoices);

      // Initialize hold countdown timers
      const initTimers = {};
      finalInvoices.forEach(inv => {
        const expMs = inv.expiresAt ? new Date(inv.expiresAt).getTime() : (Date.now() + 3600000);
        const remSecs = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
        initTimers[inv.bookingRef || inv.id] = remSecs;
      });
      setTimers(initTimers);

    } catch (err) {
      console.error('Error loading unpaid invoices:', err);
      showError('Error', 'Failed to load unpaid invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnpaidInvoices();
  }, [currentUser]);

  // Interval timer for 60-minute reservation countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (next[key] > 0) {
            next[key] -= 1;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (secs) => {
    if (!secs || secs <= 0) return 'Expired';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Simulate payment confirmation
  const handleConfirmPayFastPayment = async (invoice) => {
    const refKey = invoice.bookingRef || invoice.id;
    setProcessingId(refKey);

    try {
      const confirmAmount = invoice.grossAmount || invoice.baseAmount || 1500;
      await paymentsApi.confirmPayment({
        transactionId: invoice.transactionId || `PF-EVL-${refKey}`,
        bookingRef: invoice.bookingRef || `EVL-${refKey}`,
        amountPayable: String(confirmAmount),
        amountPaid: String(confirmAmount),
        status: 'PAID',
        paymentMethod: 'PayFast Pakistan',
        signature: 'VALID_PAYFAST_SIG'
      });

      // Remove from unpaid invoices state & localStorage
      const updatedList = invoices.filter(inv => (inv.bookingRef || inv.id) !== refKey);
      setInvoices(updatedList);

      const localInvoicesRaw = localStorage.getItem('eventland_unpaid_invoices');
      if (localInvoicesRaw) {
        const localList = JSON.parse(localInvoicesRaw);
        const filteredLocal = localList.filter(inv => (inv.bookingRef || inv.id) !== refKey);
        localStorage.setItem('eventland_unpaid_invoices', JSON.stringify(filteredLocal));
      }

      const ticketObject = {
        ticketId: invoice.bookingRef || `EVL-${invoice.id || '1001'}`,
        eventTitle: invoice.eventTitle || 'Live Concert Experience',
        banner: getEventImageUrl(invoice.banner),
        venue: invoice.venueName || 'Arts Council of Pakistan, Karachi',
        cityName: invoice.cityName || 'Karachi',
        date: invoice.date || 'Upcoming Date',
        time: invoice.time || '08:00 PM PKT',
        attendeeName: invoice.customerName || currentUser?.fullName || 'Customer',
        attendeeEmail: invoice.customerEmail || currentUser?.email || 'customer@example.com',
        phone: invoice.customerPhone || '+92 300 0000000',
        seats: invoice.seats || [{ label: `${invoice.quantity || 1} Ticket Pass` }],
        paymentMethod: 'PAYFAST PAKISTAN',
        paymentStatus: 'Paid',
        totalPaid: confirmAmount,
        bookingTime: new Date().toLocaleDateString('en-US')
      };

      showSuccess('Payment Confirmed! 🎉', `Invoice ${invoice.bookingRef} paid successfully. E-Ticket issued!`);

      if (onPaymentSuccess) onPaymentSuccess(ticketObject);
      if (onInvoicePaid) onInvoicePaid(invoice);

    } catch (err) {
      console.error('PayFast confirm error:', err);
      showError('Confirmation Failed', err.message || 'Payment confirmation failed.');
    } finally {
      setProcessingId(null);
    }
  };

  // Cancel / Delete Unpaid Invoice
  const handleCancelInvoice = (refKey) => {
    if (!window.confirm(`Are you sure you want to cancel unpaid invoice #${refKey}? This will release your seat reservation.`)) {
      return;
    }

    const updatedList = invoices.filter(inv => (inv.bookingRef || inv.id) !== refKey);
    setInvoices(updatedList);

    const localInvoicesRaw = localStorage.getItem('eventland_unpaid_invoices');
    if (localInvoicesRaw) {
      const localList = JSON.parse(localInvoicesRaw);
      const filteredLocal = localList.filter(inv => (inv.bookingRef || inv.id) !== refKey);
      localStorage.setItem('eventland_unpaid_invoices', JSON.stringify(filteredLocal));
    }

    showSuccess('Invoice Cancelled', `Unpaid invoice #${refKey} has been removed.`);
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.bookingRef?.toLowerCase().includes(q) ||
      inv.transactionId?.toLowerCase().includes(q) ||
      inv.eventTitle?.toLowerCase().includes(q) ||
      inv.customerName?.toLowerCase().includes(q)
    );
  });

  const totalOutstanding = filteredInvoices.reduce((sum, inv) => sum + (inv.grossAmount || inv.baseAmount || 0), 0);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1150,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid rgba(13, 148, 136, 0.3)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '840px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        overflow: 'hidden'
      }}>

        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0b1329'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 800, fontSize: '0.75rem' }}>
                PAYFAST PAKISTAN 🇵🇰
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                60-Min Payment Window Holds
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0.2rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={22} color="#0d9488" /> Unpaid Payment Invoices ({invoices.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Refresh Bar */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#070c18', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Ref # (e.g. EVL-10001), Event, or Name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.5rem',
                backgroundColor: '#1e293b',
                border: '1px solid rgba(13, 148, 136, 0.25)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Total Outstanding: <strong style={{ color: '#2dd4bf', fontSize: '0.95rem' }}>PKR {totalOutstanding.toLocaleString()}</strong>
            </div>
            <button
              onClick={loadUnpaidInvoices}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', borderRadius: '8px' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Modal Body: Invoices List */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem auto', color: '#0d9488' }} />
              <p>Loading unpaid invoices...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: '#0b1329', border: '1px dashed rgba(13, 148, 136, 0.2)', borderRadius: '16px' }}>
              <CheckCircle size={48} color="#0d9488" style={{ margin: '0 auto 1rem auto', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>No Unpaid Invoices Found</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '420px', margin: '0.5rem auto 0 auto' }}>
                All your ticket bookings are fully paid and confirmed! You can view your active passes in <strong>My Tickets</strong>.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredInvoices.map(inv => {
                const refKey = inv.bookingRef || inv.id;
                const remSecs = timers[refKey] ?? 3600;
                const isExpired = remSecs <= 0;
                const isProcessing = processingId === refKey;

                return (
                  <div
                    key={refKey}
                    style={{
                      backgroundColor: '#0b1329',
                      border: isExpired ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(13, 148, 136, 0.25)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      position: 'relative'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontWeight: 800, color: '#2dd4bf', fontSize: '0.9rem' }}>
                          Ref #{inv.bookingRef}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          (PayFast TX: {inv.transactionId || 'PF-PENDING'})
                        </span>
                      </div>

                      {/* Reservation Timer Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        backgroundColor: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(13, 148, 136, 0.15)',
                        border: isExpired ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(13, 148, 136, 0.3)',
                        borderRadius: '20px',
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.8rem',
                        color: isExpired ? '#fca5a5' : '#2dd4bf',
                        fontWeight: 700
                      }}>
                        <Clock size={14} />
                        <span>Seat Reservation Hold: <strong>{formatTimer(remSecs)}</strong></span>
                      </div>
                    </div>

                    {/* Middle Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                      {/* Left: Event & Customer Details */}
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                          {inv.eventTitle}
                        </h4>
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span>📍 {inv.venueName}</span>
                          <span>📅 {inv.date} • {inv.time}</span>
                          <span>👤 Customer: <strong>{inv.customerName}</strong> ({inv.customerEmail})</span>
                        </div>
                      </div>

                      {/* Right: Payment Amount Breakdown Box */}
                      <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.25rem' }}>
                          <span>Ticket Subtotal ({inv.quantity || 1} pass)</span>
                          <span>PKR {(inv.baseAmount || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', marginBottom: '0.35rem' }}>
                          <span>PayFast Gateway Fee</span>
                          <span>+ PKR {(inv.gatewayFee || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 800, fontSize: '0.95rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          <span>Grand Total Payable</span>
                          <span style={{ color: '#2dd4bf' }}>PKR {(inv.grossAmount || inv.baseAmount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <button
                        type="button"
                        onClick={() => handleCancelInvoice(refKey)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '8px',
                          color: '#f87171',
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <Trash2 size={14} /> Cancel Invoice
                      </button>

                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {inv.checkoutUrl && inv.checkoutUrl !== '#' && (
                          <a
                            href={inv.checkoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: '0.55rem 1rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                          >
                            Pay via PayFast Portal <ExternalLink size={14} />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleConfirmPayFastPayment(inv)}
                          disabled={isProcessing || isExpired}
                          className="btn btn-primary"
                          style={{
                            padding: '0.55rem 1.1rem',
                            fontSize: '0.82rem',
                            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontWeight: 800
                          }}
                        >
                          <CheckCircle size={15} /> {isProcessing ? 'Verifying PayFast...' : 'Simulate PayFast Payment Success'}
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
