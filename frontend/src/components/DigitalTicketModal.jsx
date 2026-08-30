import React, { useState } from 'react';
import { X, Download, CheckCircle2, ShieldCheck, ScanLine } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { exportTicketPdf } from '../utils/ticketPdfExporter';

export default function DigitalTicketModal({ ticket, onClose }) {
  const { showSuccess } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('idle'); // idle, scanning, verified

  // Paid when the status says so; tickets loaded via booking lookup carry a paymentMethod
  // but no explicit paymentStatus, so treat those as paid too.
  const isPaid = ticket?.paymentStatus === 'Paid'
    || ticket?.paymentStatus === 'PAID'
    || (!ticket?.paymentStatus && !!ticket?.paymentMethod);

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
          borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 color={isPaid ? "#3b82f6" : "#f59e0b"} size={22} />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Official Digital E-Ticket</h2>
              <span style={{ fontSize: '0.75rem', color: isPaid ? '#60a5fa' : '#fbbf24', fontWeight: 600 }}>
                Status: {isPaid ? 'Active & Verified (Paid)' : 'Unpaid Invoice - E-Ticket Locked'}
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
            border: '2px dashed rgba(59, 130, 246, 0.45)',
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
                <span style={{ width: '28px', height: '28px', background: '#3b82f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem', color: '#fff' }}>E</span>
                <div>
                  <span style={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: '1rem', color: '#fff', display: 'block', lineHeight: 1 }}>EVENTLAND PAKISTAN</span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Official E-Ticket Pass</span>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', background: '#2563eb', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 800 }}>
                CONFIRMED
              </span>
            </div>

            {/* Event Show Banner Image */}
            {ticket.banner && (
              <div style={{ width: '100%', position: 'relative', background: '#070c18', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <img
                  src={ticket.banner}
                  alt={ticket.eventTitle}
                  style={{ width: '100%', height: 'auto', maxHeight: '280px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                />
              </div>
            )}

            {/* Main Pass Body */}
            <div style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', marginBottom: '0.35rem' }}>
                {ticket.eventTitle}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem', fontWeight: 600 }}>
                📍 {ticket.venue}
              </p>

              {/* Show Schedule Box */}
              <div style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#60a5fa', fontWeight: 800, textTransform: 'uppercase' }}>📅 SHOW DATE</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>{ticket.date || 'Jan 10, 2027'}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#60a5fa', fontWeight: 800, textTransform: 'uppercase' }}>⏰ SHOW TIME</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#60a5fa' }}>{ticket.time || ticket.showTitle || '8:00 PM PKT'}</span>
                </div>
              </div>

              {/* Grid Specifications */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: '12px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>PASS HOLDER</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>{ticket.attendeeName}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>RESERVED SEATS / TIERS</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#60a5fa' }}>
                    {(ticket.seats || []).map((s) => s.label || (typeof s.id === 'string' ? s.id.split('-').pop() : s.id)).join(', ') || 'General Admission'}
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

              {/* QR Code Display */}
              <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                <div style={{
                  display: 'inline-block',
                  backgroundColor: '#ffffff',
                  padding: '1rem',
                  borderRadius: '16px',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.35)'
                }}>
                  {/* High visual QR SVG */}
                  <svg width="140" height="140" viewBox="0 0 100 100" fill="#000">
                    <rect width="100" height="100" fill="#fff"/>
                    <rect x="10" y="10" width="30" height="30" fill="#000"/>
                    <rect x="15" y="15" width="20" height="20" fill="#fff"/>
                    <rect x="20" y="20" width="10" height="10" fill="#000"/>
                    
                    <rect x="60" y="10" width="30" height="30" fill="#000"/>
                    <rect x="65" y="15" width="20" height="20" fill="#fff"/>
                    <rect x="70" y="20" width="10" height="10" fill="#000"/>

                    <rect x="10" y="60" width="30" height="30" fill="#000"/>
                    <rect x="15" y="65" width="20" height="20" fill="#fff"/>
                    <rect x="20" y="70" width="10" height="10" fill="#000"/>

                    <rect x="50" y="50" width="10" height="10" fill="#000"/>
                    <rect x="70" y="60" width="15" height="15" fill="#000"/>
                    <rect x="60" y="80" width="10" height="10" fill="#000"/>
                    <rect x="80" y="80" width="10" height="10" fill="#000"/>
                  </svg>
                </div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                  Scan at venue entry gate • Encrypted Security Token
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                exportTicketPdf(ticket);
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
              <ScanLine size={18} color="#3b82f6" /> Gatekeeper Scanner Simulator
            </button>
          </div>

          {/* Gatekeeper Simulator Modal View */}
          {isScannerOpen && (
            <div style={{
              marginTop: '1.25rem',
              backgroundColor: '#070c18',
              border: '1px solid #3b82f6',
              borderRadius: '14px',
              padding: '1.25rem',
              textAlign: 'center',
              animation: 'fadeIn 0.3s ease'
            }}>
              <h4 style={{ fontSize: '0.95rem', color: '#60a5fa', fontWeight: 800, marginBottom: '0.5rem' }}>
                GATEKEEPER VALIDATION SIMULATOR
              </h4>
              {scannerStatus === 'scanning' ? (
                <div style={{ color: '#f59e0b', fontSize: '0.9rem' }}>
                  Scanning QR code token... verifying database...
                </div>
              ) : (
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '0.85rem', borderRadius: '10px', color: '#60a5fa', fontWeight: 700 }}>
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
