import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle, 
  Trash2, 
  Search, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  Building2, 
  ShieldCheck, 
  Copy, 
  Check, 
  MessageSquare,
  Send,
  UploadCloud
} from 'lucide-react';
import { bookingsApi, bankAccountsApi, uploadApi, getEventImageUrl, getPaymentSlipUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function UnpaidInvoicesModal({ currentUser, onClose, onPaymentSuccess, onInvoicePaid }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [timers, setTimers] = useState({});

  // Active Bank Account from DB
  const [bankAccount, setBankAccount] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [tidInputs, setTidInputs] = useState({});
  const [proofUrls, setProofUrls] = useState({});
  const [uploadingSlipKey, setUploadingSlipKey] = useState(null);

  useEffect(() => {
    async function loadBank() {
      try {
        const active = await bankAccountsApi.getActive();
        if (active && (active.accountNumber || active.iban || active.bankName)) {
          setBankAccount(active);
        } else {
          setBankAccount(null);
        }
      } catch (err) {
        console.warn('Bank fetch error:', err);
        setBankAccount(null);
      }
    }
    loadBank();
  }, []);

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showSuccess('Copied! 📋', `${fieldName}: ${text}`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Fetch unpaid / pending verification invoices from API and localStorage
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
            .filter(b => b.paymentStatus !== 'Paid' && b.status !== 'Confirmed')
            .map(b => {
              const baseAmt = b.totalAmount || b.unitPrice * b.quantity || 1500;
              return {
                id: b.id,
                bookingId: b.id,
                bookingRef: b.bookingRef || `EVL-${b.id}`,
                bankTransactionRef: b.bankTransactionRef || '',
                paymentProofUrl: b.paymentProofUrl || null,
                customerName: b.customerName,
                customerEmail: b.customerEmail,
                customerPhone: b.customerPhone,
                eventTitle: b.eventTitle || 'Live Event',
                venueName: b.venueName || 'Arts Council of Pakistan, Karachi',
                date: b.showDate || 'Upcoming Show',
                time: b.showTime || '08:00 PM PKT',
                totalAmount: baseAmt,
                quantity: b.quantity || 1,
                paymentStatus: b.paymentStatus || 'Pending',
                createdAt: b.createdAt || new Date().toISOString(),
                expiresAt: b.paymentExpiresAt || new Date(Date.now() + 1800000).toISOString()
              };
            });
        } catch (e) {
          console.warn('Could not fetch API bookings for unpaid invoices:', e);
        }
      }

      const mergedMap = new Map();
      [...localInvoices, ...apiInvoices].forEach(inv => {
        const key = inv.bookingRef || String(inv.bookingId || inv.id);
        if (!mergedMap.has(key)) {
          mergedMap.set(key, inv);
        }
      });

      const finalInvoices = Array.from(mergedMap.values());
      setInvoices(finalInvoices);

      // Initialize 30-minute hold countdown timers
      const initTimers = {};
      finalInvoices.forEach(inv => {
        const expMs = inv.expiresAt ? new Date(inv.expiresAt).getTime() : (Date.now() + 1800000);
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

  // Interval timer for 30-minute reservation countdowns
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

  const handleSlipFileUpload = async (refKey, file) => {
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

    setUploadingSlipKey(refKey);
    try {
      const res = await uploadApi.uploadFile(file, 'slips');
      setProofUrls(prev => ({ ...prev, [refKey]: res.url }));
      showSuccess('Receipt Uploaded 📎', 'Transaction slip image compressed & saved in organized slips directory.');
    } catch (err) {
      showError('Upload Failed', err.message || 'Could not upload payment slip.');
    } finally {
      setUploadingSlipKey(null);
    }
  };

  const handleSubmitProofForInvoice = async (invoice) => {
    const refKey = invoice.bookingRef || invoice.id;
    const enteredTid = tidInputs[refKey] || invoice.bankTransactionRef;
    const slipUrlToSubmit = proofUrls[refKey] || invoice.paymentProofUrl || null;

    if (!enteredTid?.trim() && !slipUrlToSubmit) {
      showError('Proof Required', 'Please enter your Bank Transaction ID or upload your transaction slip image.');
      return;
    }

    setProcessingId(refKey);
    try {
      if (invoice.bookingId) {
        await bookingsApi.submitPaymentProof(invoice.bookingId, {
          bankTransactionRef: (enteredTid || '').trim(),
          paymentProofUrl: slipUrlToSubmit
        });
      }

      showSuccess('Proof Submitted! 🏦', 'Payment details saved. Super Admin will verify and issue your official E-Ticket.');
      loadUnpaidInvoices();
    } catch (err) {
      showError('Submission Failed', err.message || 'Could not submit payment proof.');
    } finally {
      setProcessingId(null);
    }
  };

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
      inv.eventTitle?.toLowerCase().includes(q) ||
      inv.customerName?.toLowerCase().includes(q) ||
      inv.bankTransactionRef?.toLowerCase().includes(q)
    );
  });

  const totalOutstanding = filteredInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

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
      <div className="glass-panel animate-scale-up" style={{
        width: '100%',
        maxWidth: '780px',
        maxHeight: '90vh',
        borderRadius: '24px',
        border: '1px solid rgba(13, 148, 136, 0.35)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0b1329'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge" style={{ backgroundColor: 'rgba(13, 148, 136, 0.2)', color: '#2dd4bf', fontWeight: 800, fontSize: '0.75rem' }}>
                DIRECT BANK TRANSFER 🏦
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                30-Min Seat Reservation Holds
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0.2rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={22} color="#0d9488" /> Unpaid & Pending Invoices ({invoices.length})
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
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Bank Receiving Info Strip with 1-Click Copy */}
        {bankAccount && (bankAccount.accountNumber || bankAccount.iban || bankAccount.bankName) && (
          <div style={{ padding: '0.85rem 1.5rem', background: 'rgba(13, 148, 136, 0.1)', borderBottom: '1px solid rgba(13, 148, 136, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div>
              <strong style={{ color: '#fff' }}>{bankAccount.bankName}</strong>: Acc# <span style={{ color: '#2dd4bf', fontWeight: 700 }}>{bankAccount.accountNumber}</span> | Title: <strong>{bankAccount.accountTitle}</strong>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(bankAccount.accountNumber, 'Account Number')}
              style={{ background: copiedField === 'Account Number' ? '#059669' : 'rgba(13, 148, 136, 0.25)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
            >
              {copiedField === 'Account Number' ? <><Check size={12} color="#fff" /> Copied!</> : <><Copy size={12} /> Copy Acc#</>}
            </button>
          </div>
        )}

        {/* Search & Refresh Bar */}
        <div style={{ padding: '0.85rem 1.5rem', backgroundColor: '#070c18', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Ref # (e.g. EVL-10001), Event, or TID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.5rem',
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
              Total Payable: <strong style={{ color: '#2dd4bf', fontSize: '0.95rem' }}>PKR {totalOutstanding.toLocaleString()}</strong>
            </div>
            <button
              onClick={loadUnpaidInvoices}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', borderRadius: '8px' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Modal Body */}
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
                All your bookings are verified and confirmed! You can view your active passes in <strong>My Tickets</strong>.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredInvoices.map(inv => {
                const refKey = inv.bookingRef || inv.id;
                const remSecs = timers[refKey] ?? 1800;
                const isExpired = remSecs <= 0;
                const isProcessing = processingId === refKey;
                const currentTid = tidInputs[refKey] ?? inv.bankTransactionRef ?? '';

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
                      gap: '1rem'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontWeight: 800, color: '#2dd4bf', fontSize: '0.95rem' }}>
                          Ref #{inv.bookingRef}
                        </span>
                        <span className="badge" style={{ backgroundColor: inv.bankTransactionRef ? 'rgba(13, 148, 136, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: inv.bankTransactionRef ? '#2dd4bf' : '#fbbf24', fontSize: '0.72rem' }}>
                          {inv.bankTransactionRef ? 'Verification Pending ⏳' : 'Awaiting Payment Proof'}
                        </span>
                      </div>

                      {/* 30-Min Timer Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        backgroundColor: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(13, 148, 136, 0.15)',
                        border: isExpired ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(13, 148, 136, 0.3)',
                        borderRadius: '20px',
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.78rem',
                        color: isExpired ? '#fca5a5' : '#2dd4bf',
                        fontWeight: 700
                      }}>
                        <Clock size={14} />
                        <span>Seat Hold: <strong>{formatTimer(remSecs)}</strong></span>
                      </div>
                    </div>

                    {/* Middle Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                          {inv.eventTitle}
                        </h4>
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span>📍 {inv.venueName}</span>
                          <span>📅 {inv.date} • {inv.time}</span>
                          <span>👤 {inv.customerName} ({inv.customerPhone})</span>
                        </div>
                      </div>

                      {/* Amount Box */}
                      <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.35rem' }}>
                          <span>Amount Due ({inv.quantity || 1} Pass)</span>
                          <span style={{ color: '#fff', fontWeight: 700 }}>PKR {(inv.totalAmount || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: '0.73rem', color: '#2dd4bf' }}>
                          ✓ Direct Bank Transfer (0 Gateway Fee)
                        </div>
                      </div>
                    </div>

                    {/* Transaction Reference & Slip Upload */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem', fontWeight: 600 }}>
                            Bank Transaction Reference # / Raast TID
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. TXN-982314 or Raast TID"
                            value={currentTid}
                            onChange={e => setTidInputs({ ...tidInputs, [refKey]: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="file"
                            accept=".webp,.jpg,.jpeg,.png"
                            id={`slip-upload-${refKey}`}
                            style={{ display: 'none' }}
                            onChange={e => handleSlipFileUpload(refKey, e.target.files?.[0])}
                          />
                          <label
                            htmlFor={`slip-upload-${refKey}`}
                            style={{
                              padding: '0.5rem 0.85rem',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(13, 148, 136, 0.35)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <UploadCloud size={14} color="#0d9488" /> {uploadingSlipKey === refKey ? 'Compressing...' : ((proofUrls[refKey] || inv.paymentProofUrl) ? 'Change Slip' : 'Upload Slip')}
                          </label>

                          <button
                            type="button"
                            onClick={() => handleSubmitProofForInvoice(inv)}
                            disabled={isProcessing || isExpired}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Send size={13} /> {inv.bankTransactionRef ? 'Update Proof' : 'Submit Proof'}
                          </button>
                        </div>
                      </div>

                      {/* Attached Payment Slip Preview */}
                      {(proofUrls[refKey] || inv.paymentProofUrl) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'rgba(0, 0, 0, 0.3)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(45, 212, 191, 0.25)', width: 'fit-content' }}>
                          <img
                            src={getPaymentSlipUrl(proofUrls[refKey] || inv.paymentProofUrl)}
                            alt="Payment Slip"
                            style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                          />
                          <div style={{ fontSize: '0.75rem', color: '#2dd4bf', fontWeight: 600 }}>
                            Receipt Slip Attached ✓
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer / Cancel */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <button
                        type="button"
                        onClick={() => handleCancelInvoice(refKey)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Trash2 size={13} /> Cancel Invoice
                      </button>

                      <a
                        href={`https://api.whatsapp.com/send?phone=923079353185&text=${encodeURIComponent(`Hello EventLand Support, here is my payment TID for Booking Ref ${inv.bookingRef}: ${currentTid || 'Pending'}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#25d366', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                      >
                        <MessageSquare size={14} /> Send Receipt on WhatsApp ↗
                      </a>
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
