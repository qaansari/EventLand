import React, { useState, useEffect } from 'react';
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
  FileSpreadsheet,
  Tag,
  Percent,
  Search,
  Filter,
  Check,
  X,
  Clock
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import SearchableSelect from './SearchableSelect';
import { adminApi } from '../services/api';

export default function OrganizerDashboard({ events, onNavigateToCreate, onSelectEvent, currentUser = null }) {
  const { showSuccess, showError, showInfo } = useToast();
  const [activeTab, setActiveTab] = useState('my-events'); // 'my-events', 'promos', 'roster', 'scanner', 'payouts'

  // Fetch real bookings for organizer/admin roles
  const [bookings, setBookings] = useState([]);
  useEffect(() => {
    if (currentUser && (currentUser.role === 'organizer' || currentUser.role === 'admin')) {
      adminApi.bookings.getAll(1, 50)
        .then(res => setBookings(res.items || res || []))
        .catch(err => {
          console.warn('Could not load organizer bookings from backend:', err);
          setBookings([]);
        });
    }
  }, [currentUser]);

  // --- PROMO CODE MANAGER STATE ---
  const [promoCodes, setPromoCodes] = useState([
    { id: 1, code: 'EARLYBIRD15', type: 'percentage', value: 15, maxUses: 200, currentUses: 142, expiry: '2026-12-31', active: true },
    { id: 2, code: 'STUDENT500', type: 'fixed', value: 500, maxUses: 100, currentUses: 88, expiry: '2026-11-15', active: true },
    { id: 3, code: 'VIPCONCERT', type: 'percentage', value: 20, maxUses: 50, currentUses: 50, expiry: '2026-09-30', active: false }
  ]);
  const [showCreatePromoModal, setShowCreatePromoModal] = useState(false);
  const [newPromoForm, setNewPromoForm] = useState({
    code: '',
    type: 'percentage',
    value: 10,
    maxUses: 100,
    expiry: '2027-01-31'
  });

  const handleCreatePromoCode = (e) => {
    e.preventDefault();
    if (!newPromoForm.code.trim()) return;
    const newPromo = {
      id: Date.now(),
      code: newPromoForm.code.toUpperCase().trim(),
      type: newPromoForm.type,
      value: Number(newPromoForm.value),
      maxUses: Number(newPromoForm.maxUses),
      currentUses: 0,
      expiry: newPromoForm.expiry,
      active: true
    };
    setPromoCodes([newPromo, ...promoCodes]);
    setShowCreatePromoModal(false);
    setNewPromoForm({ code: '', type: 'percentage', value: 10, maxUses: 100, expiry: '2027-01-31' });
    showSuccess('Promo Code Created 🎟️', `Discount code "${newPromo.code}" is now active!`);
  };

  const handleTogglePromoStatus = (id) => {
    setPromoCodes(promoCodes.map(p => p.id === id ? { ...p, active: !p.active } : p));
    showInfo('Status Updated', 'Promo code status toggled.');
  };

  // --- ATTENDEE ROSTER STATE ---
  const [rosterEventFilter, setRosterEventFilter] = useState('All Events');
  const [rosterSearch, setRosterSearch] = useState('');
  const [sampleRoster] = useState([
    { id: 'EVL-100001', name: 'Qamar Ansari', email: 'qamar@example.com', phone: '0300 1234567', cnic: '42101-1234567-1', event: 'Garbar Family Comedy', tier: 'VIP Pass', seat: 'Zone A - Row 1 - Seat 14', status: 'Checked-in', checkedInAt: '07:45 PM' },
    { id: 'EVL-100002', name: 'Sarah Khan', email: 'sarah.k@example.com', phone: '0312 9876543', cnic: '42201-9876543-2', event: 'Rangrez Bazaar 2026', tier: 'General Admission', seat: 'Zone B - Seat 42', status: 'Pending Entry', checkedInAt: '-' },
    { id: 'EVL-100003', name: 'Tariq Mehmood', email: 'tariq@example.com', phone: '0333 4567890', cnic: '42301-4567890-3', event: 'First Light - Axwell', tier: 'VVIP Table Pass', seat: 'Table #4', status: 'Checked-in', checkedInAt: '08:12 PM' },
    { id: 'EVL-100004', name: 'Ayesha Malik', email: 'ayesha.m@example.com', phone: '0345 1122334', cnic: '42101-1122334-4', event: 'Garbar Family Comedy', tier: 'Standard Pass', seat: 'Zone C - Seat 105', status: 'Pending Entry', checkedInAt: '-' },
    { id: 'EVL-100005', name: 'Bilal Ahmed', email: 'bilal@example.com', phone: '0301 5566778', cnic: '42201-5566778-5', event: 'First Light - Axwell', tier: 'VIP Pass', seat: 'Zone A - Seat 22', status: 'Checked-in', checkedInAt: '08:30 PM' }
  ]);

  const filteredRoster = sampleRoster.filter(item => {
    const matchesEvent = rosterEventFilter === 'All Events' || item.event === rosterEventFilter;
    const q = rosterSearch.toLowerCase();
    const matchesQuery = !q || item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q) || item.id.toLowerCase().includes(q) || item.cnic.includes(q);
    return matchesEvent && matchesQuery;
  });

  const handleExportCSV = (eventName = 'All_Events') => {
    const headers = 'Ticket ID,Attendee Name,Email,Phone,CNIC,Event,Tier,Seat,CheckIn Status,Time\n';
    const rows = filteredRoster.map(r => `"${r.id}","${r.name}","${r.email}","${r.phone}","${r.cnic}","${r.event}","${r.tier}","${r.seat}","${r.status}","${r.checkedInAt}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendee_Roster_${eventName}.csv`;
    a.click();
    showSuccess('CSV Roster Downloaded 📥', `Exported ${filteredRoster.length} attendee entries.`);
  };

  // --- SCANNER SIMULATOR STATE ---
  const [scanTicketInput, setScanTicketInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [recentScans, setRecentScans] = useState([
    { ticketId: 'EVL-100001', name: 'Qamar Ansari', status: 'APPROVED', time: 'Just now' },
    { ticketId: 'EVL-100003', name: 'Tariq Mehmood', status: 'APPROVED', time: '5m ago' }
  ]);

  const handleScanTicket = (e) => {
    e.preventDefault();
    if (!scanTicketInput.trim()) return;

    if (scanTicketInput.toUpperCase().includes('FAIL') || scanTicketInput.length < 4) {
      setScanResult({ valid: false, message: '❌ INVALID / EXPIRED PASS - Pass reference not found!' });
      showError('Invalid Ticket ❌', 'Ticket pass reference invalid or expired.');
    } else {
      const ticketRef = scanTicketInput.toUpperCase();
      const match = sampleRoster.find(r => r.id === ticketRef) || {
        id: ticketRef,
        name: 'Validated Attendee',
        event: 'Rangrez Bazaar 2026',
        tier: 'VIP Pass',
        seat: 'Zone A - Reserved'
      };
      setScanResult({
        valid: true,
        ticketId: match.id,
        attendee: match.name,
        eventTitle: match.event,
        tier: match.tier,
        seats: match.seat,
        status: 'ENTRY VERIFIED & CHECKED-IN'
      });
      setRecentScans([{ ticketId: match.id, name: match.name, status: 'APPROVED', time: 'Just now' }, ...recentScans]);
      showSuccess('Pass Verified ✅', `Ticket #${ticketRef} verified for ${match.name}.`);
    }
  };

  // --- PAYOUT LEDGER STATE ---
  const [payoutForm, setPayoutForm] = useState({
    amount: '450000',
    method: 'Bank Transfer',
    accountDetails: 'Meezan Bank - IBAN PK36MEZN00010299887711'
  });
  const [payoutSubmitted, setPayoutSubmitted] = useState(false);
  const [payoutLedger] = useState([
    { id: 'PAY-8801', date: '2026-08-15', amount: 850000, method: 'Direct Bank Transfer (HBL)', status: 'Completed', reference: 'TRX-99887766' },
    { id: 'PAY-8802', date: '2026-07-28', amount: 620000, method: 'JazzCash Corporate', status: 'Completed', reference: 'TRX-44332211' }
  ]);

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

  // Organizer Overview Metrics
  const organizerEvents = events.slice(0, 4);
  const totalRevenue = 4850000;
  const totalTickets = 3120;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', minHeight: '80vh' }}>
      {/* Top Header */}
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
            backgroundColor: 'rgba(13, 148, 136, 0.15)',
            color: '#2dd4bf',
            border: '1px solid rgba(13, 148, 136, 0.35)',
            padding: '0.3rem 0.8rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 800,
            marginBottom: '0.5rem'
          }}>
            <Building2 size={14} /> OFFICIAL ORGANIZER PORTAL & COMMAND CENTER
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.02em'
          }}>
            Organizer Dashboard
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
            Manage live events, generate promo discount codes, export attendee rosters, scan gate QR passes, and settle earnings.
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

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        <div className="glass-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>GROSS REVENUE</span>
            <div style={{ backgroundColor: 'rgba(13, 148, 136, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <TrendingUp size={18} color="#2dd4bf" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: '#fff' }}>
            PKR {(totalRevenue / 1000000).toFixed(2)}M
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#2dd4bf', fontWeight: 600 }}>↑ +24% vs previous show</span>
        </div>

        <div className="glass-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>TICKETS SOLD</span>
            <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <Ticket size={18} color="#c084fc" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: '#fff' }}>
            {totalTickets.toLocaleString()} Passes
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 600 }}>89% Arena Capacity</span>
        </div>

        <div className="glass-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>GATE CHECK-IN RATE</span>
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <QrCode size={18} color="#fbbf24" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: '#fff' }}>
            2,450 Attended
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600 }}>78.5% Checked-In</span>
        </div>

        <div className="glass-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>AVAILABLE PAYOUT</span>
            <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <DollarSign size={18} color="#34d399" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: '#34d399' }}>
            PKR 850,000
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Ready for Bank Settlement</span>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('my-events')}
          className={`btn ${activeTab === 'my-events' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
        >
          <Ticket size={16} /> My Events & Shows
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`btn ${activeTab === 'roster' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
        >
          <Users size={16} /> Attendee Roster & CNICs
        </button>
        <button
          onClick={() => setActiveTab('promos')}
          className={`btn ${activeTab === 'promos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
        >
          <Tag size={16} /> Promo Codes Manager
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          className={`btn ${activeTab === 'scanner' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
        >
          <ScanLine size={16} /> Gatekeeper QR Scanner
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`btn ${activeTab === 'payouts' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
        >
          <DollarSign size={16} /> Payout Ledger & Withdraw
        </button>
      </div>

      {/* --- TAB 1: MY EVENTS --- */}
      {activeTab === 'my-events' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {organizerEvents.map((ev) => (
            <div key={ev.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span className={`badge ${ev.status === 'LIVE' ? 'badge-live' : 'badge-fast'}`}>
                    {ev.status || 'ACTIVE'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{ev.city || 'Karachi'}</span>
                </div>

                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                  {ev.title}
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                  <Calendar size={14} color="#0d9488" style={{ display: 'inline', marginRight: '4px' }} />
                  {ev.date || 'Saturday, Jan 10 2027'}
                </div>

                {/* Progress bar */}
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    <span>Passes Sold:</span>
                    <strong style={{ color: '#2dd4bf' }}>1,120 / 1,250 Sold</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '89.6%', height: '100%', backgroundColor: '#0d9488', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => onSelectEvent(ev)} className="btn btn-secondary" style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem' }}>
                  Preview Event
                </button>
                <button onClick={() => handleExportCSV(ev.title)} className="btn btn-outline-primary" style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem' }}>
                  <Download size={14} /> Export Roster
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- TAB 2: ATTENDEE ROSTER & CNIC DIRECTORY --- */}
      {activeTab === 'roster' && (
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem' }}>
                Attendee Roster & Gate Check-in Directory
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Search attendee manifest, verify Govt CNIC numbers, check seating allocations, and export records.
              </p>
            </div>

            <button onClick={() => handleExportCSV('Selected')} className="btn btn-primary" style={{ fontSize: '0.88rem' }}>
              <FileSpreadsheet size={16} /> Export CSV Manifest
            </button>
          </div>

          {/* Roster Filters Bar */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search by Name, Email, CNIC, or Ticket ID..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.6rem 0.8rem 0.6rem 2.2rem', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>

            <select
              value={rosterEventFilter}
              onChange={(e) => setRosterEventFilter(e.target.value)}
              style={{ backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.88rem', outline: 'none' }}
            >
              <option value="All Events">All Events</option>
              <option value="Garbar Family Comedy">Garbar Family Comedy</option>
              <option value="Rangrez Bazaar 2026">Rangrez Bazaar 2026</option>
              <option value="First Light - Axwell">First Light - Axwell</option>
            </select>
          </div>

          {/* Roster Table */}
          <div className="mature-table-wrapper">
            <table className="mature-data-table">
              <thead>
                <tr>
                  <th>TICKET ID</th>
                  <th>ATTENDEE NAME</th>
                  <th>GOVT CNIC #</th>
                  <th>PASS TIER / SEAT</th>
                  <th>CHECK-IN STATUS</th>
                  <th>TIME</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 800, color: '#2dd4bf' }}>{row.id}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{row.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{row.email} • {row.phone}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{row.cnic}</td>
                    <td>
                      <div style={{ color: '#fbbf24', fontWeight: 700 }}>{row.tier}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{row.seat}</div>
                    </td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        backgroundColor: row.status === 'Checked-in' ? 'rgba(52, 211, 153, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                        color: row.status === 'Checked-in' ? '#34d399' : '#fbbf24'
                      }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8' }}>{row.checkedInAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: PROMO CODES MANAGER --- */}
      {activeTab === 'promos' && (
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem' }}>
                Discount Promo Codes & Coupon Manager
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Create custom promo codes for early bird buyers, sponsors, or social media campaigns.
              </p>
            </div>

            <button onClick={() => setShowCreatePromoModal(true)} className="btn btn-primary" style={{ fontSize: '0.88rem' }}>
              + Create Promo Code
            </button>
          </div>

          <div className="mature-table-wrapper">
            <table className="mature-data-table">
              <thead>
                <tr>
                  <th>PROMO CODE</th>
                  <th>DISCOUNT</th>
                  <th>USAGE STATS</th>
                  <th>EXPIRY DATE</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 900, color: '#fff', letterSpacing: '0.5px' }}>
                      <span style={{ backgroundColor: 'rgba(13, 148, 136, 0.15)', border: '1px border-dashed #0d9488', color: '#2dd4bf', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                        {p.code}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: '#34d399' }}>
                      {p.type === 'percentage' ? `${p.value}% OFF` : `PKR ${p.value} OFF`}
                    </td>
                    <td>
                      <strong>{p.currentUses}</strong> / {p.maxUses} used
                    </td>
                    <td style={{ color: '#94a3b8' }}>{p.expiry}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        backgroundColor: p.active ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: p.active ? '#34d399' : '#f87171'
                      }}>
                        {p.active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleTogglePromoStatus(p.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                      >
                        {p.active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: GATEKEEPER QR SCANNER --- */}
      {activeTab === 'scanner' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                <ScanLine size={28} color="#2dd4bf" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#fff', marginBottom: '0.35rem' }}>
                Gatekeeper QR Check-in Validator
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
                Scan attendee QR code or enter booking reference for instant entry approval.
              </p>
            </div>

            <form onSubmit={handleScanTicket} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Scan QR or type ref (e.g. EVL-100001)..."
                value={scanTicketInput}
                onChange={(e) => setScanTicketInput(e.target.value)}
                style={{ flexGrow: 1, backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.35)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.95rem', outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.4rem' }}>
                Verify Pass
              </button>
            </form>

            {scanResult && (
              <div style={{
                padding: '1.25rem',
                borderRadius: '14px',
                backgroundColor: scanResult.valid ? 'rgba(13, 148, 136, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: scanResult.valid ? '1px solid rgba(13, 148, 136, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                animation: 'fadeIn 0.3s ease'
              }}>
                {scanResult.valid ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2dd4bf', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                      <CheckCircle size={20} /> {scanResult.status}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                      <div>Attendee: <strong style={{ color: '#fff' }}>{scanResult.attendee}</strong></div>
                      <div>Event: <strong style={{ color: '#fff' }}>{scanResult.eventTitle}</strong></div>
                      <div>Pass Tier: <strong style={{ color: '#fbbf24' }}>{scanResult.tier}</strong></div>
                      <div>Seat: <strong style={{ color: '#2dd4bf' }}>{scanResult.seats}</strong></div>
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

          {/* Scan Activity Log */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 800, marginBottom: '1rem' }}>
              Live Gate Entry Activity Log
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentScans.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.88rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#2dd4bf' }}>{s.ticketId}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 800, backgroundColor: 'rgba(52, 211, 153, 0.15)', padding: '2px 8px', borderRadius: '9999px' }}>
                      {s.status}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{s.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: PAYOUT LEDGER --- */}
      {activeTab === 'payouts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* Form */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#fff', marginBottom: '0.5rem' }}>
              Request Revenue Settlement Payout
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Transfer ticket sales revenue directly to your organization's bank account or mobile wallet.
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
                  style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.7rem 1rem', fontSize: '0.95rem', outline: 'none' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#2dd4bf', marginTop: '4px', display: 'block' }}>
                  Available Balance: PKR 850,000
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Transfer Method *
                </label>
                <SearchableSelect
                  value={payoutForm.method}
                  onChange={(e) => setPayoutForm({ ...payoutForm, method: e.target.value })}
                  options={[
                    { value: 'Bank Transfer', label: 'Direct Bank Transfer (Meezan, HBL, Alfalah)' },
                    { value: 'JazzCash', label: 'JazzCash Corporate Account' },
                    { value: 'EasyPaisa', label: 'EasyPaisa Merchant Account' }
                  ]}
                  placeholder="Select Payout Method..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem' }}>
                  IBAN / Account Title *
                </label>
                <input
                  required
                  type="text"
                  value={payoutForm.accountDetails}
                  onChange={(e) => setPayoutForm({ ...payoutForm, accountDetails: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.7rem 1rem', fontSize: '0.95rem', outline: 'none' }}
                />
              </div>

              <button
                disabled={payoutSubmitted}
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
              >
                {payoutSubmitted ? 'Processing...' : 'Submit Settlement Request'}
              </button>
            </form>
          </div>

          {/* Past Payout History Ledger */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 800, marginBottom: '1.25rem' }}>
              Payout Settlement Ledger
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {payoutLedger.map((p) => (
                <div key={p.id} style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#2dd4bf', fontWeight: 800 }}>{p.id}</span>
                    <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 800, backgroundColor: 'rgba(52, 211, 153, 0.15)', padding: '2px 8px', borderRadius: '9999px' }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', marginBottom: '0.2rem' }}>
                    PKR {p.amount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {p.method} • {p.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE PROMO CODE --- */}
      {showCreatePromoModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag color="#0d9488" size={22} />
                <h3 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 800 }}>Create Discount Promo Code</h3>
              </div>
              <button onClick={() => setShowCreatePromoModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePromoCode} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.3rem' }}>Promo Code String *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EARLYBIRD20"
                  value={newPromoForm.code}
                  onChange={(e) => setNewPromoForm({ ...newPromoForm, code: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.65rem 0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.3rem' }}>Discount Type</label>
                  <select
                    value={newPromoForm.type}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, type: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.65rem 0.9rem', outline: 'none' }}
                  >
                    <option value="percentage">Percentage (%) Off</option>
                    <option value="fixed">Fixed Amount (PKR) Off</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.3rem' }}>Value *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newPromoForm.value}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, value: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.65rem 0.9rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.3rem' }}>Max Uses Limit</label>
                  <input
                    type="number"
                    required
                    value={newPromoForm.maxUses}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, maxUses: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.65rem 0.9rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.3rem' }}>Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newPromoForm.expiry}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, expiry: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.65rem 0.9rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCreatePromoModal(false)} className="btn btn-secondary" style={{ width: '40%' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: '60%' }}>
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
