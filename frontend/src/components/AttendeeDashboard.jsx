import React, { useState } from 'react';
import {
  Ticket,
  Search,
  Calendar,
  User,
  Heart,
  RefreshCw,
  Download,
  Trash2,
  AlertCircle,
  MapPin,
  Clock,
  ShieldCheck,
  X
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { exportTicketPdf } from '../utils/ticketPdfExporter';

export default function AttendeeDashboard({
  currentUser,
  purchasedTickets = [],
  savedEvents = [],
  onViewTicket,
  onRemoveTicket,
  onLookupTickets,
  onBrowseEvents,
  onSelectEvent
}) {
  const { showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState('passes');
  const [ticketFilter, setTicketFilter] = useState('all');

  // Lookup state
  const [lookupQuery, setLookupQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Refund Modal state
  const [refundModalTicket, setRefundModalTicket] = useState(null);
  const [refundForm, setRefundForm] = useState({ reason: 'Schedule Conflict', details: '' });
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // User Profile State
  const [profileForm, setProfileForm] = useState({
    fullName: currentUser?.name || 'Muhammad Ali',
    email: currentUser?.email || 'ali@example.com',
    phone: '0300 1234567',
    cnic: '42101-1234567-1',
    preferredCity: 'Karachi',
    notifications: true
  });
  const [profileSaved, setProfileSaved] = useState(false);

  // Filtered tickets logic
  const filteredTickets = purchasedTickets.filter((t) => {
    if (ticketFilter === 'upcoming') {
      return !t.date || t.date.includes('2027') || t.date.includes('2026') || t.date.toLowerCase().includes('upcoming');
    }
    if (ticketFilter === 'past') {
      return t.date && (t.date.includes('2025') || t.date.includes('2024'));
    }
    return true;
  });

  // Calendar .ics Export Helper
  const handleDownloadCalendar = (ticket) => {
    const title = encodeURIComponent(ticket.eventTitle || 'EventLand Ticket Pass');
    const venue = encodeURIComponent(ticket.venue || 'Karachi, Pakistan');
    const details = encodeURIComponent(`Official E-Ticket Pass: ${ticket.ticketId}. Pass Holder: ${ticket.attendeeName}`);
    
    // Create standard .ics text file content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventLand Pakistan//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${ticket.eventTitle}`,
      `DESCRIPTION:${details}`,
      `LOCATION:${ticket.venue}`,
      `DTSTART:${new Date().toISOString().replace(/-|:|\.\d\d\d/g, '')}`,
      `DTEND:${new Date(Date.now() + 10800000).toISOString().replace(/-|:|\.\d\d\d/g, '')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${ticket.ticketId}-EventLand.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Calendar Event Exported 📅', `.ics calendar file generated for "${ticket.eventTitle}".`);
  };

  // Google Calendar URL Generator
  const handleOpenGoogleCalendar = (ticket) => {
    const title = encodeURIComponent(ticket.eventTitle || 'EventLand Event');
    const details = encodeURIComponent(`E-Ticket Pass: ${ticket.ticketId}. Pass Holder: ${ticket.attendeeName}`);
    const location = encodeURIComponent(ticket.venue || 'Pakistan');
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
    window.open(gCalUrl, '_blank');
  };



  // Handle Refund Submit
  const handleRefundSubmit = (e) => {
    e.preventDefault();
    setIsSubmittingRefund(true);
    setTimeout(() => {
      setIsSubmittingRefund(false);
      showSuccess(
        'Refund Request Logged 💸',
        `Refund request for ticket #${refundModalTicket.ticketId} submitted. Case reference #${Math.floor(100000 + Math.random() * 900000)}. Processing within 48h.`
      );
      setRefundModalTicket(null);
    }, 1200);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
    showSuccess('Profile Updated 👤', 'Your Govt CNIC and attendee contact preferences have been updated.');
  };

  const handleSearchClick = async (e) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;
    setIsSearching(true);
    await onLookupTickets(lookupQuery);
    setIsSearching(false);
  };

  const totalSpent = purchasedTickets.reduce((acc, t) => acc + (t.totalPaid || 0), 0);

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', minHeight: '80vh' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        border: '1px solid rgba(13, 148, 136, 0.3)',
        borderRadius: '20px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(13, 148, 136, 0.15)', color: '#2dd4bf', border: '1px solid rgba(13, 148, 136, 0.3)', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            <ShieldCheck size={14} /> VERIFIED ATTENDEE PORTAL
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, color: '#fff', marginBottom: '0.4rem' }}>
            Welcome, {profileForm.fullName}! 👋
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', maxWidth: '600px' }}>
            Access your active digital E-tickets, export passes to calendar, manage security credentials, or recover past bookings.
          </p>
        </div>

        {/* Stats Badges */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '0.85rem 1.25rem', textAlign: 'center', minWidth: '120px' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>ACTIVE PASSES</span>
            <strong style={{ fontSize: '1.4rem', color: '#2dd4bf', fontWeight: 900 }}>{purchasedTickets.length}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '0.85rem 1.25rem', textAlign: 'center', minWidth: '120px' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>SAVED EVENTS</span>
            <strong style={{ fontSize: '1.4rem', color: '#f472b6', fontWeight: 900 }}>{savedEvents.length}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '0.85rem 1.25rem', textAlign: 'center', minWidth: '130px' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>TOTAL SPENT</span>
            <strong style={{ fontSize: '1.25rem', color: '#34d399', fontWeight: 900 }}>PKR {totalSpent.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('passes')}
          className={`btn ${activeTab === 'passes' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
        >
          <Ticket size={16} /> My E-Tickets & Passes ({purchasedTickets.length})
        </button>
        <button
          onClick={() => setActiveTab('lookup')}
          className={`btn ${activeTab === 'lookup' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
        >
          <Search size={16} /> Lookup & Recover Booking
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`btn ${activeTab === 'wishlist' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
        >
          <Heart size={16} color={activeTab === 'wishlist' ? '#fff' : '#f472b6'} /> Wishlist ({savedEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
        >
          <User size={16} /> Profile & CNIC Verification
        </button>
      </div>

      {/* --- TAB 1: MY E-TICKETS & PASSES --- */}
      {activeTab === 'passes' && (
        <div>
          {/* Sub-filter pill */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => setTicketFilter('all')}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: ticketFilter === 'all' ? '#0d9488' : 'transparent',
                  color: ticketFilter === 'all' ? '#fff' : '#94a3b8'
                }}
              >
                All Passes ({purchasedTickets.length})
              </button>
              <button
                onClick={() => setTicketFilter('upcoming')}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: ticketFilter === 'upcoming' ? '#0d9488' : 'transparent',
                  color: ticketFilter === 'upcoming' ? '#fff' : '#94a3b8'
                }}
              >
                Upcoming Shows
              </button>
              <button
                onClick={() => setTicketFilter('past')}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: ticketFilter === 'past' ? '#0d9488' : 'transparent',
                  color: ticketFilter === 'past' ? '#fff' : '#94a3b8'
                }}
              >
                Past Events
              </button>
            </div>

            <button onClick={onBrowseEvents} className="btn btn-outline-primary" style={{ fontSize: '0.85rem' }}>
              + Book New Tickets
            </button>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <Ticket size={52} color="#0d9488" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.3rem', color: '#fff', fontWeight: 800, marginBottom: '0.5rem' }}>
                No active tickets found
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Explore live concerts, comedy shows, food festivals, and theater plays across Pakistan.
              </p>
              <button onClick={onBrowseEvents} className="btn btn-primary">
                Browse Live Events
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {filteredTickets.map((t) => (
                <div
                  key={t.ticketId}
                  className="glass-card"
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(13, 148, 136, 0.25)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Top Header */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className="badge badge-live" style={{ fontSize: '0.7rem' }}>
                        OFFICIAL E-TICKET
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>{t.ticketId}</span>
                        <button
                          onClick={() => onRemoveTicket(t.ticketId)}
                          title="Remove ticket pass"
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: 'none',
                            color: '#f87171',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.72rem'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, color: '#fff', marginBottom: '0.35rem' }}>
                      {t.eventTitle}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.75rem', fontWeight: 600 }}>
                      <MapPin size={14} color="#0d9488" style={{ display: 'inline', marginRight: '4px' }} />
                      {t.venue}
                    </div>

                    {/* Show DateTime Highlight Box */}
                    <div style={{ backgroundColor: 'rgba(13, 148, 136, 0.12)', border: '1px solid rgba(13, 148, 136, 0.3)', padding: '0.65rem 0.85rem', borderRadius: '10px', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.68rem', color: '#2dd4bf', fontWeight: 800, textTransform: 'uppercase' }}>
                        📅 SHOW DATE & TIME
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                        {t.showDateTime || (t.date ? `${t.date}${t.time ? ` @ ${t.time}` : ''}` : 'Saturday, 10th Jan 2027 @ 8:00 PM PKT')}
                      </div>
                    </div>

                    {/* Specs Grid */}
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.82rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Pass Holder:</span>
                        <strong style={{ color: '#fff' }}>{t.attendeeName}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Seats / Tiers:</span>
                        <strong style={{ color: '#2dd4bf' }}>
                          {(t.seats || []).map((s) => s.label || (typeof s.id === 'string' ? s.id.split('-').pop() : s.id)).join(', ') || 'General Admission'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Amount Paid:</span>
                        <strong style={{ color: '#34d399' }}>PKR {(t.totalPaid || 0).toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      onClick={() => onViewTicket(t)}
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '0.88rem', padding: '0.6rem' }}
                    >
                      <Ticket size={16} /> View E-Ticket Pass & QR
                    </button>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => exportTicketPdf(t)}
                        className="btn btn-secondary"
                        style={{ flex: 1, fontSize: '0.78rem', padding: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Download size={13} /> PDF Ticket
                      </button>

                      <button
                        onClick={() => handleDownloadCalendar(t)}
                        className="btn btn-secondary"
                        style={{ flex: 1, fontSize: '0.78rem', padding: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Calendar size={13} color="#2dd4bf" /> Add to Cal
                      </button>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.2rem', fontWeight: 600 }}>
                      🔒 NON-TRANSFERABLE PASS (GOVT CNIC LOCKED)
                    </div>

                    <button
                      onClick={() => setRefundModalTicket(t)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        marginTop: '0.2rem',
                        textDecoration: 'underline'
                      }}
                    >
                      Need Help / Request Ticket Refund
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: LOOKUP & RECOVER BOOKING --- */}
      {activeTab === 'lookup' && (
        <div className="glass-card" style={{ padding: '2.5rem', maxWidth: '650px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
              <Search size={28} color="#2dd4bf" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#fff', fontWeight: 800, marginBottom: '0.35rem' }}>
              Recover Lost Booking & E-Tickets
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
              Enter your email address or booking reference number (e.g. <strong>EVL-100001</strong>) to retrieve your confirmed digital passes.
            </p>
          </div>

          <form onSubmit={handleSearchClick} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              required
              placeholder="Enter Email or Booking Ref (e.g. EVL-100001)"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              style={{
                flexGrow: 1,
                backgroundColor: '#16233f',
                color: '#fff',
                border: '1px solid rgba(13, 148, 136, 0.35)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
            <button type="submit" disabled={isSearching} className="btn btn-primary" style={{ padding: '0.75rem 1.4rem' }}>
              {isSearching ? <RefreshCw size={16} className="spinning" /> : 'Find Booking'}
            </button>
          </form>

          <div style={{ backgroundColor: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.2)', padding: '1rem', borderRadius: '12px', fontSize: '0.82rem', color: '#cbd5e1' }}>
            <div style={{ fontWeight: 800, color: '#2dd4bf', marginBottom: '0.3rem' }}>💡 Quick Tip:</div>
            Bookings purchased via JazzCash, EasyPaisa, or PayFast credit card are linked directly to your customer email. Recovered passes will automatically save to your active E-Ticket wallet.
          </div>
        </div>
      )}

      {/* --- TAB 3: WISHLIST --- */}
      {activeTab === 'wishlist' && (
        <div>
          {savedEvents.length === 0 ? (
            <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <Heart size={52} color="#f472b6" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.3rem', color: '#fff', fontWeight: 800, marginBottom: '0.5rem' }}>
                Your Wishlist is Empty
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Save upcoming concerts, comedy shows, and theater plays to your personal wishlist for quick access.
              </p>
              <button onClick={onBrowseEvents} className="btn btn-primary">
                Explore Events to Wishlist
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {savedEvents.map((ev) => (
                <div key={ev.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 800, marginBottom: '0.35rem' }}>{ev.title}</h3>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.75rem' }}>📍 {ev.venueName || ev.venue || 'Karachi, PK'}</div>
                  </div>
                  <button onClick={() => onSelectEvent(ev)} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', fontSize: '0.85rem' }}>
                    View & Book Seats
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: PROFILE & CNIC VERIFICATION --- */}
      {activeTab === 'profile' && (
        <div className="glass-card" style={{ padding: '2.5rem', maxWidth: '680px', margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: '#fff', fontWeight: 800, marginBottom: '0.5rem' }}>
            Attendee Profile & Security Verification
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '1.75rem' }}>
            Pakistani high-security venues require verified Govt CNIC numbers for VIP seat entry and venue security checks.
          </p>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.35rem' }}>Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.7rem 0.9rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.35rem' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.7rem 0.9rem', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.35rem' }}>Mobile Phone # *</label>
                <input
                  type="text"
                  required
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.7rem 0.9rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.35rem' }}>Govt CNIC / Passport # (For Security Check)</label>
                <input
                  type="text"
                  placeholder="e.g. 42101-1234567-1"
                  value={profileForm.cnic}
                  onChange={(e) => setProfileForm({ ...profileForm, cnic: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.7rem 0.9rem', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.35rem' }}>Preferred Home City</label>
              <select
                value={profileForm.preferredCity}
                onChange={(e) => setProfileForm({ ...profileForm, preferredCity: e.target.value })}
                style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.7rem 0.9rem', outline: 'none' }}
              >
                <option value="Karachi">Karachi</option>
                <option value="Lahore">Lahore</option>
                <option value="Islamabad">Islamabad</option>
                <option value="Rawalpindi">Rawalpindi</option>
                <option value="Multan">Multan</option>
                <option value="Faisalabad">Faisalabad</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem', marginTop: '0.5rem' }}>
              Save Profile Preferences
            </button>
          </form>
        </div>
      )}

      {/* --- MODAL: REFUND REQUEST --- */}
      {refundModalTicket && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle color="#f59e0b" size={22} />
                <h3 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 800 }}>Request Ticket Refund</h3>
              </div>
              <button onClick={() => setRefundModalTicket(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Submit cancellation for ticket <strong>#{refundModalTicket.ticketId}</strong> (PKR {refundModalTicket.totalPaid.toLocaleString()}). Subject to event refund policy.
            </p>

            <form onSubmit={handleRefundSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.3rem' }}>Reason for Refund *</label>
                <select
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.65rem 0.9rem', outline: 'none' }}
                >
                  <option value="Schedule Conflict">Personal Schedule Conflict</option>
                  <option value="Event Rescheduled">Event Date/Time Changed by Organizer</option>
                  <option value="Accidental Duplicate">Accidental Duplicate Booking</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.3rem' }}>Additional Comments</label>
                <textarea
                  rows="3"
                  placeholder="Provide any details to speed up refund approval..."
                  value={refundForm.details}
                  onChange={(e) => setRefundForm({ ...refundForm, details: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#16233f', color: '#fff', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '8px', padding: '0.65rem 0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setRefundModalTicket(null)} className="btn btn-secondary" style={{ width: '40%' }}>Cancel</button>
                <button type="submit" disabled={isSubmittingRefund} className="btn btn-primary" style={{ width: '60%' }}>
                  {isSubmittingRefund ? 'Submitting...' : 'Submit Refund Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
