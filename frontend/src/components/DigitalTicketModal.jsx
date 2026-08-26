import React, { useState } from 'react';
import { X, Download, CheckCircle2, ShieldCheck, ScanLine } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function DigitalTicketModal({ ticket, onClose }) {
  const { showSuccess } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('idle'); // idle, scanning, verified

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
            <CheckCircle2 color="#3b82f6" size={22} />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Official Digital E-Ticket</h2>
              <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>Status: Active & Verified</span>
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
            {/* Ticket Header Banner */}
            <div style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 800
            }}>
              <span>EVENTLAND PASS</span>
              <span style={{ fontSize: '0.8rem', background: '#ffffff', color: '#1d4ed8', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
                CONFIRMED
              </span>
            </div>

            {/* Main Pass Body */}
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                {ticket.eventTitle}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                {ticket.venue}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8' }}>PASS HOLDER</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{ticket.attendeeName}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8' }}>DATE & TIME</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{ticket.date}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8' }}>SEATS / ZONES</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#60a5fa' }}>
                    {ticket.seats.map((s) => s.id.split('-').pop()).join(', ')}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8' }}>TOTAL PAID</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                    PKR {ticket.totalPaid.toLocaleString()}
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
              onClick={() => showSuccess('Ticket Saved 📥', `Ticket #${ticket.ticketId} saved to downloads!`)}
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
                  ENTRY APPROVED - TICKET VALID FOR {ticket.attendeeName} ({ticket.seats.length} SEATS)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
