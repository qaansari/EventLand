import React, { useState, useEffect } from 'react';
import { X, Download, CheckCircle2, ShieldCheck, ScanLine } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { exportTicketPdf } from '../utils/ticketPdfExporter';
import { generateTicketQrDataUrl } from '../utils/qrGenerator';

export default function DigitalTicketModal({ ticket, onClose }) {
  const { showSuccess } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('idle'); // idle, scanning, verified
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (ticket) {
      generateTicketQrDataUrl(ticket).then(url => {
        if (url) setQrDataUrl(url);
      });
    }
  }, [ticket]);

  // Paid & Verified check: Only confirmed/verified bookings unlock the official gate pass
  const statusStr = (ticket?.paymentStatus || ticket?.status || '').toString().toLowerCase();
  const isVerified = statusStr === 'verified' || statusStr === 'confirmed' || statusStr === 'paid';
  const bannerUrl = ticket?.eventBanner || ticket?.banner || ticket?.bannerUrl;
  const seatCount = ticket?.seatCount || (ticket?.seats || []).length || ticket?.quantity || 1;
  const categoryName = ticket?.ticketTierName || ticket?.tierName || ticket?.category || ticket?.ticketTier || 'Standard Pass';
  const rawSeats = (ticket.seats || []).map((s) => s.label || (typeof s.id === 'string' ? s.id.split('-').pop() : s.id)).join(', ');

  const handleSimulateScan = () => {
    setIsScannerOpen(true);
    setScannerStatus('scanning');
    setTimeout(() => {
      setScannerStatus('verified');
    }, 1500);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(13, 148, 136, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 color={isVerified ? "#0d9488" : "#f59e0b"} size={22} />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Official Digital E-Ticket</h2>
              <span style={{ fontSize: '0.75rem', color: isVerified ? '#2dd4bf' : '#fbbf24', fontWeight: 600 }}>
                Status: {isVerified ? 'Active & Verified (Confirmed)' : '⏳ Awaiting Admin Payment Verification'}
              </span>
            </div>
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

        {/* Ticket Graphic Body */}
        <div style={{ padding: '1.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #10192d 0%, #1a294a 100%)',
            border: '2px dashed rgba(13, 148, 136, 0.45)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 15px 30px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            {/* Ticket Brand Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <img src="/logo-icon.png" alt="EventLand Logo" style={{ width: '32px', height: '32px', objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(13, 148, 136, 0.5))' }} />
                <div>
                  <span style={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: '1rem', color: '#fff', display: 'block', lineHeight: 1 }}>EVENTLAND PAKISTAN</span>
                  <span style={{ fontSize: '0.65rem', color: '#2dd4bf' }}>Official E-Ticket Pass</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', background: 'rgba(13, 148, 136, 0.25)', border: '1px solid #0d9488', color: '#2dd4bf', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 800 }}>
                  🎫 TIER: {categoryName.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.72rem', background: isVerified ? '#0d9488' : '#d97706', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 800 }}>
                  {isVerified ? 'CONFIRMED PASS' : 'AWAITING VERIFICATION'}
                </span>
              </div>
            </div>

            {/* Event Show Banner Image */}
            {bannerUrl && (
              <div style={{ width: '100%', position: 'relative', background: '#070c18', borderBottom: '1px solid rgba(13, 148, 136, 0.2)' }}>
                <img
                  src={bannerUrl}
                  alt={ticket.eventTitle}
                  style={{ width: '100%', height: 'auto', maxHeight: '240px', objectFit: 'cover', display: 'block' }}
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}

            {/* Main Pass Body */}
            <div className="digital-ticket-layout" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', marginBottom: '0.35rem' }}>
                {ticket.eventTitle}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem', fontWeight: 600 }}>
                📍 {ticket.venue || ticket.eventVenue || 'Arts Council of Pakistan'}
              </p>

              {/* Show Schedule Box */}
              <div style={{ background: 'rgba(13, 148, 136, 0.12)', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#2dd4bf', fontWeight: 800, textTransform: 'uppercase' }}>📅 SHOW DATE & TIME</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
                    {ticket.showDateTime || (ticket.date ? `${ticket.date}${ticket.time ? ` @ ${ticket.time}` : ''}` : 'Jan 10, 2027 @ 8:00 PM PKT')}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#2dd4bf', fontWeight: 800, textTransform: 'uppercase' }}>⏰ SHOW SLOT / TIME</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2dd4bf' }}>{ticket.time || ticket.showTitle || '8:00 PM PKT'}</span>
                </div>
              </div>

              {/* Grid Specifications */}
              <div className="digital-ticket-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: '12px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>PASS HOLDER</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>{ticket.attendeeName}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>🎫 TICKET TIER / CATEGORY</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#38bdf8' }}>
                    {categoryName}
                  </span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>RESERVED SEATS & TIER SPECIFICATIONS</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2dd4bf' }}>
                    Tier: <strong>{categoryName}</strong> {rawSeats ? `• Seats: ${rawSeats}` : ''} ({seatCount} {seatCount === 1 ? 'Seat Reserved' : 'Seats Reserved'})
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>TOTAL PAID (PKR)</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#34d399' }}>
                    PKR {(ticket.totalPaid ?? 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>🕒 BOOKED AT</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                    {ticket.bookingTime || 'Aug 27, 2026'}
                  </span>
                </div>
              </div>

              {/* Real QR Code Display ONLY when Verified by Admin */}
              {isVerified ? (
                <div className="digital-ticket-qr" style={{ textAlign: 'center', margin: '1rem 0' }}>
                  <div style={{
                    display: 'inline-block',
                    backgroundColor: '#ffffff',
                    padding: '0.85rem',
                    borderRadius: '16px',
                    boxShadow: '0 0 20px rgba(13, 148, 136, 0.35)'
                  }}>
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`Real QR Code Pass for ${ticket.ticketId || 'E-Ticket'}`}
                        style={{ width: '145px', height: '145px', display: 'block', borderRadius: '4px' }}
                      />
                    ) : (
                      <div style={{ width: '145px', height: '145px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                        Generating Real QR...
                      </div>
                    )}
                  </div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#2dd4bf', marginTop: '0.5rem', fontWeight: 600 }}>
                    ✔ Verified Official Gate Pass • Scan at Entry
                  </span>
                </div>
              ) : (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px dashed #f59e0b', borderRadius: '16px', padding: '1.25rem', textAlign: 'center', margin: '1rem 0' }}>
                  <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.25rem' }}>⏳</span>
                  <h4 style={{ color: '#fbbf24', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                    Booking Pending Payment Verification
                  </h4>
                  <p style={{ color: '#cbd5e1', fontSize: '0.8rem', maxWidth: '460px', margin: '0 auto', lineHeight: 1.4 }}>
                    Your bank payment proof for Booking <strong>#{ticket.ticketId || ticket.id}</strong> is currently being verified by SuperAdmin/Admin. Your official scannable QR Gate Code and PDF download will be unlocked automatically once approved.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons: Only Enabled when Verified */}
          {isVerified ? (
            <div className="digital-ticket-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  exportTicketPdf({ ...ticket, banner: bannerUrl, seatCount });
                  showSuccess('E-Ticket Exported 📥', `E-Ticket #${ticket.ticketId || ticket.id || 'PASS'} generated successfully!`);
                }}
                className="btn btn-primary"
                style={{ flexGrow: 1 }}
              >
                <Download size={18} /> Download PDF Ticket
              </button>

              <button
                onClick={handleSimulateScan}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <ScanLine size={18} color="#0d9488" /> Gatekeeper Scanner Simulator
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <button disabled className="btn btn-secondary" style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}>
                🔒 Download Locked (Awaiting Admin Verification)
              </button>
            </div>
          )}

          {/* Gatekeeper Simulator Modal View */}
          {isScannerOpen && (
            <div style={{
              marginTop: '1.25rem',
              backgroundColor: '#070c18',
              border: '1px solid #0d9488',
              borderRadius: '14px',
              padding: '1.25rem',
              textAlign: 'center',
              animation: 'fadeIn 0.3s ease'
            }}>
              <h4 style={{ fontSize: '0.95rem', color: '#2dd4bf', fontWeight: 800, marginBottom: '0.5rem' }}>
                GATEKEEPER VALIDATION SIMULATOR
              </h4>
              {scannerStatus === 'scanning' ? (
                <div style={{ color: '#f59e0b', fontSize: '0.9rem' }}>
                  Scanning QR code token... verifying database...
                </div>
              ) : (
                <div style={{ backgroundColor: 'rgba(13, 148, 136, 0.15)', padding: '0.85rem', borderRadius: '10px', color: '#2dd4bf', fontWeight: 700 }}>
                  <ShieldCheck size={28} style={{ display: 'block', margin: '0 auto 0.4rem' }} />
                  ENTRY APPROVED - TICKET VALID FOR {ticket.attendeeName} ({(ticket.seats || []).length} SEATS)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
