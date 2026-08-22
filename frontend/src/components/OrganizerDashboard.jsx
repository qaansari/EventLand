import React, { useState } from 'react';
import { 
  Building2, 
  PlusCircle, 
  Ticket, 
  TrendingUp, 
  QrCode, 
  DollarSign, 
  CheckCircle, 
  Calendar, 
  MapPin, 
  Users, 
  Download, 
  ScanLine, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import SearchableSelect from './SearchableSelect';

export default function OrganizerDashboard({ events, onNavigateToCreate, onSelectEvent }) {
  const { showSuccess, showInfo } = useToast();
  const [activeTab, setActiveTab] = useState('my-events'); // 'my-events', 'scanner', 'payouts'
  
  // Gatekeeper Scanner Simulator State
  const [scanTicketInput, setScanTicketInput] = useState('');
  const [scanResult, setScanResult] = useState(null);

  // Mock Payout Request State
  const [payoutForm, setPayoutForm] = useState({
    amount: '450000',
    method: 'Bank Transfer',
    accountDetails: 'Meezan Bank - Account # 0102 9988 7711'
  });
  const [payoutSubmitted, setPayoutSubmitted] = useState(false);

  const handleScanTicket = (e) => {
    e.preventDefault();
    if (!scanTicketInput.trim()) return;

    // Simulate verification
    if (scanTicketInput.toUpperCase().includes('FAIL') || scanTicketInput.length < 5) {
      setScanResult({
        valid: false,
        message: '❌ INVALID / EXPIRED PASS - Ticket not found in roster!'
      });
    } else {
      setScanResult({
        valid: true,
        ticketId: scanTicketInput.toUpperCase(),
        attendee: 'Qamar Ansari',
        eventTitle: 'Rangrez Bazaar 2026',
        tier: 'VIP Pass (Qawwali Lounge Access)',
        seats: 'Zone A - Seat #14, Seat #15',
        status: 'ENTRY VERIFIED & CHECKED-IN'
      });
    }
  };

  const handleRequestPayoutSubmit = (e) => {
    e.preventDefault();
    setPayoutSubmitted(true);
    setTimeout(() => {
      setPayoutSubmitted(false);
      showSuccess(
        'Payout Request Submitted 💳',
        `Request for PKR ${Number(payoutForm.amount).toLocaleString()} via ${payoutForm.method} submitted. Processing within 24h.`
      );
    }, 1200);
  };

  // Mock Organizer Data
  const organizerEvents = events.slice(0, 3);
  const totalRevenue = 4850000;
  const totalTickets = 3120;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            padding: '0.3rem 0.8rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            marginBottom: '0.5rem'
          }}>
            <Building2 size={14} /> OFFICIAL ORGANIZER PORTAL & ROSTER
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em'
          }}>
            Organizer Command Center
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Manage your live event passes, scan gatekeeper QR tickets, download attendee rosters, and request earnings payouts.
          </p>
        </div>

        <button
          onClick={onNavigateToCreate}
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.4rem' }}
        >
          <PlusCircle size={18} /> Create & Host New Event
        </button>
      </div>

      {/* Organizer KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        <div className="glass-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>TOTAL REVENUE</span>
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <TrendingUp size={18} color="#60a5fa" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
            PKR {(totalRevenue / 1000000).toFixed(2)}M
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>↑ +24% vs last event</span>
        </div>

        <div className="glass-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>TICKETS SOLD</span>
            <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <Ticket size={18} color="#c084fc" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
            {totalTickets.toLocaleString()} Passes
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 600 }}>89% Arena Capacity Sold</span>
        </div>

        <div className="glass-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>AVAILABLE PAYOUT</span>
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <DollarSign size={18} color="#34d399" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>
            PKR 850,000
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Ready for Instant Withdrawal</span>
        </div>

        <div className="glass-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>GATE CHECK-IN RATE</span>
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <QrCode size={18} color="#fbbf24" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
            2,450 Attended
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600 }}>78.5% Checked-In</span>
        </div>
      </div>

      {/* Inner Tabs Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('my-events')}
          className={`btn ${activeTab === 'my-events' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.55rem 1.2rem', fontSize: '0.88rem' }}
        >
          <Ticket size={16} /> My Events & Roster
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          className={`btn ${activeTab === 'scanner' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.55rem 1.2rem', fontSize: '0.88rem' }}
        >
          <ScanLine size={16} /> QR Gate Check-in Simulator
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`btn ${activeTab === 'payouts' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.55rem 1.2rem', fontSize: '0.88rem' }}
        >
          <DollarSign size={16} /> Request Revenue Payout
        </button>
      </div>

      {/* Tab 1: My Events */}
      {activeTab === 'my-events' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {organizerEvents.map((ev) => (
            <div key={ev.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <span className={`badge ${ev.status === 'LIVE' ? 'badge-live' : 'badge-fast'}`}>
                  {ev.status}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{ev.city}</span>
              </div>

              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                {ev.title}
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                <Calendar size={14} color="#3b82f6" style={{ display: 'inline', marginRight: '4px' }} />
                {ev.date}
              </div>

              {/* Progress bar */}
              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  <span>Tickets Sold:</span>
                  <strong style={{ color: '#60a5fa' }}>1,120 / 1,250 Passes</strong>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '89.6%', height: '100%', backgroundColor: '#3b82f6', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => onSelectEvent(ev)}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem' }}
                >
                  Preview Page
                </button>

                <button
                  onClick={() => showInfo('CSV Exported 📥', `Attendee roster CSV for "${ev.title}" downloaded.`)}
                  className="btn btn-outline-primary"
                  style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem' }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Gatekeeper QR Scanner Simulator */}
      {activeTab === 'scanner' && (
        <div className="glass-card" style={{ padding: '2rem', maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem'
            }}>
              <ScanLine size={28} color="#60a5fa" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#fff', marginBottom: '0.35rem' }}>
              Gatekeeper Ticket QR Check-in Tool
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
              Simulate entry validation for attendees arriving at your venue.
            </p>
          </div>

          <form onSubmit={handleScanTicket} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Scan QR or enter ticket code..."
              value={scanTicketInput}
              onChange={(e) => setScanTicketInput(e.target.value)}
              style={{
                flexGrow: 1,
                backgroundColor: '#16233f',
                color: '#fff',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.4rem' }}>
              Verify Pass
            </button>
          </form>

          {scanResult && (
            <div style={{
              padding: '1.25rem',
              borderRadius: '14px',
              backgroundColor: scanResult.valid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: scanResult.valid ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
              animation: 'fadeIn 0.3s ease'
            }}>
              {scanResult.valid ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                    <CheckCircle size={20} /> {scanResult.status}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                    <div>Attendee: <strong style={{ color: '#fff' }}>{scanResult.attendee}</strong></div>
                    <div>Status: <strong style={{ color: '#34d399' }}>Verified</strong></div>
                    <div>Event: <strong style={{ color: '#fff' }}>{scanResult.eventTitle}</strong></div>
                    <div>Pass Tier: <strong style={{ color: '#fbbf24' }}>{scanResult.tier}</strong></div>
                    <div style={{ gridColumn: 'span 2' }}>Assigned Seats: <strong style={{ color: '#fff' }}>{scanResult.seats}</strong></div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#f87171', fontWeight: 700, fontSize: '0.95rem' }}>
                  {scanResult.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Request Payout */}
      {activeTab === 'payouts' && (
        <div className="glass-card" style={{ padding: '2rem', maxWidth: '620px', margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#fff', marginBottom: '0.5rem' }}>
            Request Revenue Settlement Payout
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            Transfer accumulated ticket revenue directly to your organization's bank account or mobile wallet.
          </p>

          <form onSubmit={handleRequestPayoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem' }}>
                Withdrawal Amount (PKR) *
              </label>
              <input
                required
                type="number"
                max="850000"
                value={payoutForm.amount}
                onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                style={{
                  width: '100%',
                  backgroundColor: '#16233f',
                  color: '#fff',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '0.7rem 1rem',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px', display: 'block' }}>
                Max Available Balance: PKR 850,000
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem' }}>
                Payout Transfer Method *
              </label>
              <SearchableSelect
                value={payoutForm.method}
                onChange={(e) => setPayoutForm({ ...payoutForm, method: e.target.value })}
                options={[
                  { value: 'Bank Transfer', label: 'Direct Bank Transfer (Meezan, HBL, UBL, Alfalah)' },
                  { value: 'JazzCash', label: 'JazzCash Corporate Wallet' },
                  { value: 'EasyPaisa', label: 'EasyPaisa Corporate Account' }
                ]}
                placeholder="Select Payout Method..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem' }}>
                Account Title & IBAN / Mobile # *
              </label>
              <input
                required
                type="text"
                value={payoutForm.accountDetails}
                onChange={(e) => setPayoutForm({ ...payoutForm, accountDetails: e.target.value })}
                style={{
                  width: '100%',
                  backgroundColor: '#16233f',
                  color: '#fff',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '0.7rem 1rem',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            <button
              disabled={payoutSubmitted}
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
            >
              {payoutSubmitted ? 'Processing Request...' : 'Submit Payout Request'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
