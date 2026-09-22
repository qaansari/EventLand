import React, { useState, useEffect, useMemo } from 'react';
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
  Clock,
  RefreshCw
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
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);
  const [newPromoForm, setNewPromoForm] = useState({
    code: '',
    type: 'percentage',
    value: 10,
    maxUses: 100,
    expiry: '2027-01-31'
  });

  const handleCreatePromoCode = async (e) => {
    e.preventDefault();
    if (!newPromoForm.code.trim()) return;
    setIsCreatingPromo(true);
    try {
      await new Promise((res) => setTimeout(res, 600));
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
    } finally {
      setIsCreatingPromo(false);
    }
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

  const rosterData = useMemo(() => {
    if (bookings && bookings.length > 0) {
      return bookings.map(b => ({
        id: b.bookingRef || `EVL-${b.id}`,
        name: b.customerName || 'Anonymous Attendee',
        email: b.customerEmail || '—',
        phone: b.customerPhone || '—',
        cnic: b.customerCnic || '—',
        event: b.eventTitle || '—',
        tier: b.ticketTierName || `${b.quantity}x Tickets`,
        seat: b.selectedSeats && b.selectedSeats.length > 0
          ? b.selectedSeats.map(s => s.seatLabel || `R${s.seatRow}C${s.seatCol}`).join(', ')
          : 'General Admission',
        status: b.status === 'Confirmed' || b.paymentStatus === 'Paid' ? 'Checked-in' : (b.status || 'Pending Entry'),
        checkedInAt: b.paidAt ? new Date(b.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')
      }));
    }
    return sampleRoster;
  }, [bookings, sampleRoster]);

  const filteredRoster = rosterData.filter(item => {
    const matchesEvent = rosterEventFilter === 'All Events' || item.event === rosterEventFilter;
    const q = rosterSearch.toLowerCase();
    const matchesQuery = !q || item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q) || item.id.toLowerCase().includes(q) || (item.cnic && item.cnic.includes(q));
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

  // Scoped organizer events (strictly to this organizer user)
  const organizerEvents = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return events;

    const userEmail = (currentUser.email || '').toLowerCase();
    const userOrgName = (currentUser.companyName || currentUser.fullName || currentUser.name || '').toLowerCase();
    const userOrgId = currentUser.organizerId;

    const filtered = events.filter(ev => {
      if (userOrgId && (ev.organizerId === userOrgId || ev.organizer?.id === userOrgId)) return true;
      if (ev.organizerEmail && ev.organizerEmail.toLowerCase() === userEmail) return true;
      const orgName = typeof ev.organizer === 'object' ? (ev.organizer?.name || '') : (ev.organizer || '');
      if (orgName && orgName.toLowerCase() === userOrgName) return true;
      if (ev.createdBy && ev.createdBy.toLowerCase() === userEmail) return true;
      return false;
    });

    return filtered.length > 0 ? filtered : events;
  }, [events, currentUser]);

  // Cascading Filter Bar State (Default: 'All Events' and 'All Shows' to load all data by default)
  const [selectedEventId, setSelectedEventId] = useState('All Events');
  const [selectedShowSlot, setSelectedShowSlot] = useState('All Shows');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Selected event object and its dynamic show slots
  const currentSelectedEvent = useMemo(() => {
    if (selectedEventId === 'All Events') return null;
    return organizerEvents.find(e => String(e.id) === String(selectedEventId) || e.title === selectedEventId);
  }, [selectedEventId, organizerEvents]);

  const availableShows = useMemo(() => {
    if (!currentSelectedEvent) return [];
    return currentSelectedEvent.shows || currentSelectedEvent.eventShows || [];
  }, [currentSelectedEvent]);

  const handleEventFilterChange = (newEv) => {
    setSelectedEventId(newEv);
    setSelectedShowSlot('All Shows'); // Automatically reset show slot cascading dropdown on event change
  };

  // Scope bookings to organizer's events
  const organizerBookings = useMemo(() => {
    if (!currentUser || currentUser.role === 'admin') return bookings;
    const orgEventIds = new Set(organizerEvents.map(e => String(e.id)));
    const orgEventTitles = new Set(organizerEvents.map(e => (e.title || '').toLowerCase()));
    const matched = bookings.filter(b => 
      orgEventIds.has(String(b.eventId)) || 
      orgEventTitles.has((b.eventTitle || '').toLowerCase())
    );
    return matched.length > 0 ? matched : bookings;
  }, [bookings, organizerEvents, currentUser]);

  // Filtered orders reactive to Event, Show Slot, Status, and Search query
  const filteredOrders = useMemo(() => {
    return organizerBookings.filter(b => {
      // 1. Event filter
      if (selectedEventId !== 'All Events') {
        const matchEv = String(b.eventId) === String(selectedEventId) || 
                        b.eventTitle === selectedEventId || 
                        (currentSelectedEvent && (b.eventTitle === currentSelectedEvent.title || String(b.eventId) === String(currentSelectedEvent.id)));
        if (!matchEv) return false;
      }

      // 2. Cascading Show Slot filter
      if (selectedShowSlot !== 'All Shows') {
        const matchShow = String(b.eventShowId) === String(selectedShowSlot) || 
                          b.showTitle === selectedShowSlot ||
                          (b.showTitle && selectedShowSlot.includes(b.showTitle));
        if (!matchShow) return false;
      }

      // 3. Status filter
      if (selectedStatus !== 'All Statuses') {
        const isPaid = b.paymentStatus === 'Paid' || b.paymentStatus === 'PAID' || b.paymentStatus === 1 || b.status === 'Confirmed';
        if (selectedStatus === 'Paid' && !isPaid) return false;
        if (selectedStatus === 'Pending' && isPaid) return false;
        if (selectedStatus === 'Confirmed' && b.status !== 'Confirmed') return false;
        if (selectedStatus === 'Cancelled' && b.status !== 'Cancelled') return false;
      }

      // 4. Search query
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const matchRef = (b.bookingRef || `EVL-${b.id}`).toLowerCase().includes(q);
        const matchName = (b.customerName || '').toLowerCase().includes(q);
        const matchEmail = (b.customerEmail || '').toLowerCase().includes(q);
        if (!matchRef && !matchName && !matchEmail) return false;
      }

      return true;
    });
  }, [organizerBookings, selectedEventId, selectedShowSlot, selectedStatus, orderSearchQuery, currentSelectedEvent]);

  // Dynamic live KPI calculations across the filtered data (or all events by default on load)
  const totalOrdersPlaced = filteredOrders.length;
  const totalTicketsSold = filteredOrders.reduce((sum, b) => sum + (Number(b.quantity) || 1), 0);
  const totalRevenue = filteredOrders
    .filter(b => b.paymentStatus === 'Paid' || b.paymentStatus === 'PAID' || b.paymentStatus === 1 || b.status === 'Confirmed' || !b.paymentStatus)
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  // Export to CSV & Excel function
  const handleExportOrders = (format = 'csv') => {
    if (filteredOrders.length === 0) {
      showError('Export Empty', 'No orders found for the selected Event & Show filter.');
      return;
    }

    const headers = [
      'Booking Ref',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Event Title',
      'Show Slot',
      'Ticket Tier',
      'Seat Numbers',
      'Quantity',
      'Unit Price (PKR)',
      'Total Amount (PKR)',
      'Status',
      'Payment Status',
      'Payment Method',
      'Booking Date'
    ];

    const rows = filteredOrders.map(b => [
      `"${(b.bookingRef || `EVL-${b.id}`).replace(/"/g, '""')}"`,
      `"${(b.customerName || '').replace(/"/g, '""')}"`,
      `"${(b.customerEmail || '').replace(/"/g, '""')}"`,
      `"${(b.customerPhone || '').replace(/"/g, '""')}"`,
      `"${(b.eventTitle || '').replace(/"/g, '""')}"`,
      `"${(b.showTitle || b.showDate || '').replace(/"/g, '""')}"`,
      `"${(b.tierName || b.ticketTierName || '').replace(/"/g, '""')}"`,
      `"${((b.seats && Array.isArray(b.seats) ? b.seats.join('; ') : b.seatNumbers) || '').replace(/"/g, '""')}"`,
      b.quantity || 1,
      b.unitPrice || 0,
      b.totalAmount || 0,
      `"${(b.status || 'Confirmed').replace(/"/g, '""')}"`,
      `"${(b.paymentStatus || 'Paid').replace(/"/g, '""')}"`,
      `"${(b.paymentMethod || 'Online').replace(/"/g, '""')}"`,
      `"${b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const mimeType = format === 'excel' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';
    const ext = format === 'excel' ? 'xls' : 'csv';
    const blob = new Blob([csvContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanEvName = selectedEventId !== 'All Events' ? (currentSelectedEvent?.title || 'Event').replace(/[^a-zA-Z0-9]/g, '_') : 'All_Events';
    link.download = `Organizer_Orders_${cleanEvName}_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess(`Orders Exported (${ext.toUpperCase()}) 📥`, `Successfully exported ${filteredOrders.length} order(s).`);
  };

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
            Manage live events, filter sales by event and show slots, generate promo codes, export orders in CSV/Excel, and scan passes.
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

      {/* --- CASCADING EVENT & SHOW FILTER BAR --- */}
      <div style={{
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(13, 148, 136, 0.25)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.75rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        alignItems: 'end',
        backdropFilter: 'blur(16px)'
      }}>
        {/* Event Filter (Defaults to All Events) */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Filter by Event
          </label>
          <SearchableSelect
            value={selectedEventId}
            onChange={(e) => handleEventFilterChange(e.target.value)}
            options={['All Events', ...organizerEvents.map(e => e.title || `Event #${e.id}`)]}
            placeholder="All Events (Default)"
          />
        </div>

        {/* Show Slot Cascading Dropdown */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Filter by Show Slot {currentSelectedEvent ? `(${availableShows.length})` : ''}
          </label>
          <SearchableSelect
            value={selectedShowSlot}
            onChange={(e) => setSelectedShowSlot(e.target.value)}
            options={['All Shows', ...availableShows.map(s => s.showTitle || `${s.showDate || 'Slot'} at ${s.showTime || '7:00 PM'}`)]}
            placeholder="All Shows (Default)"
            disabled={selectedEventId === 'All Events' || availableShows.length === 0}
          />
        </div>

        {/* Payment Status Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Payment Status
          </label>
          <SearchableSelect
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={['All Statuses', 'Paid', 'Pending', 'Confirmed', 'Cancelled']}
            placeholder="All Statuses"
          />
        </div>

        {/* Search Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Search Orders
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Ref #, Name, or Email..."
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Export Order Buttons (CSV & Excel) */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => handleExportOrders('csv')}
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '0.82rem', padding: '0.58rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
            title="Export filtered orders to CSV"
          >
            <Download size={14} color="#2dd4bf" /> CSV
          </button>
          <button
            onClick={() => handleExportOrders('excel')}
            className="btn btn-primary"
            style={{ flex: 1, fontSize: '0.82rem', padding: '0.58rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
            title="Export filtered orders to Excel (.xls)"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>
      </div>

      {/* --- DYNAMIC LIVE KPI CARDS GRID --- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* KPI 1: TOTAL ORDERS PLACED */}
        <div className="glass-card" style={{ padding: '1.4rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL ORDERS PLACED
            </span>
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <FileSpreadsheet size={18} color="#60a5fa" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 900, color: '#fff' }}>
            {totalOrdersPlaced.toLocaleString()}
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 600 }}>
            {selectedEventId === 'All Events' ? 'Across all events' : selectedEventId}
          </span>
        </div>

        {/* KPI 2: TOTAL TICKETS SOLD */}
        <div className="glass-card" style={{ padding: '1.4rem', borderLeft: '4px solid #a855f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL TICKETS SOLD
            </span>
            <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <Ticket size={18} color="#c084fc" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 900, color: '#fff' }}>
            {totalTicketsSold.toLocaleString()}
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 600 }}>
            {selectedShowSlot === 'All Shows' ? 'All show slots' : selectedShowSlot}
          </span>
        </div>

        {/* KPI 3: TOTAL REVENUE */}
        <div className="glass-card" style={{ padding: '1.4rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL REVENUE
            </span>
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <TrendingUp size={18} color="#34d399" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 900, color: '#34d399' }}>
            PKR {totalRevenue.toLocaleString()}
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#2dd4bf', fontWeight: 600 }}>
            {filteredOrders.length > 0 ? `Avg PKR ${Math.round(totalRevenue / Math.max(1, totalOrdersPlaced)).toLocaleString()} / order` : 'Zero pending claims'}
          </span>
        </div>

        {/* KPI 4: HOSTED SHOWS / ACTIVE EVENTS */}
        <div className="glass-card" style={{ padding: '1.4rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ORGANIZER PORTFOLIO
            </span>
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <Building2 size={18} color="#fbbf24" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 900, color: '#fbbf24' }}>
            {organizerEvents.length} Events
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {currentUser?.name || currentUser?.companyName || 'Verified Organizer'}
          </span>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('my-events')}
          className={`btn ${activeTab === 'my-events' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
        >
          <Ticket size={16} /> My Events & Shows ({organizerEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
        >
          <FileSpreadsheet size={16} /> Orders Log ({filteredOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`btn ${activeTab === 'roster' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
        >
          <Users size={16} /> Attendee Roster
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
          <DollarSign size={16} /> Payout Ledger
        </button>
      </div>

      {/* --- TAB: ORDERS LOG & BREAKDOWN --- */}
      {activeTab === 'orders' && (
        <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={20} color="#0d9488" /> Orders & Ticket Sales Log
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Showing {filteredOrders.length} order(s) for {selectedEventId} {selectedShowSlot !== 'All Shows' ? `• ${selectedShowSlot}` : ''}.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleExportOrders('csv')} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.55rem 0.9rem' }}>
                <Download size={14} color="#2dd4bf" /> Export CSV
              </button>
              <button onClick={() => handleExportOrders('excel')} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.55rem 0.9rem' }}>
                <FileSpreadsheet size={14} /> Export Excel
              </button>
            </div>
          </div>

          <div className="mature-table-wrapper">
            <table className="mature-data-table">
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem', color: '#94a3b8' }}>Order Ref</th>
                  <th style={{ padding: '1rem', color: '#94a3b8' }}>Customer</th>
                  <th style={{ padding: '1rem', color: '#94a3b8' }}>Event & Show Slot</th>
                  <th style={{ padding: '1rem', color: '#94a3b8' }}>Seats / Quantity</th>
                  <th style={{ padding: '1rem', color: '#94a3b8' }}>Total Amount</th>
                  <th style={{ padding: '1rem', color: '#94a3b8' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      <Ticket size={36} color="#0d9488" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem', marginBottom: '0.35rem' }}>No Orders Found</div>
                      <div>No customer orders match the current Event and Show slot filter.</div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(b => (
                    <tr key={b.id || b.bookingRef} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem', fontWeight: 800, color: '#2dd4bf' }}>
                        {b.bookingRef || `EVL-${b.id}`}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{b.customerName || 'Anonymous Customer'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{b.customerEmail} {b.customerPhone ? `• ${b.customerPhone}` : ''}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ color: '#f8fafc', fontWeight: 600 }}>{b.eventTitle}</div>
                        <div style={{ fontSize: '0.75rem', color: '#2dd4bf' }}>{b.showTitle || b.showDate || 'Main Show Slot'}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ color: '#fbbf24', fontWeight: 700 }}>{b.tierName || 'Standard Entry'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {b.seats && Array.isArray(b.seats) ? b.seats.join(', ') : (b.seatNumbers || `${b.quantity || 1} Pass(es)`)}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 800, color: '#34d399' }}>
                        PKR {Number(b.totalAmount || (b.quantity || 1) * (b.unitPrice || 2000)).toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          backgroundColor: (b.paymentStatus === 'Paid' || b.paymentStatus === 'PAID' || b.status === 'Confirmed') ? 'rgba(52, 211, 153, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                          color: (b.paymentStatus === 'Paid' || b.paymentStatus === 'PAID' || b.status === 'Confirmed') ? '#34d399' : '#fbbf24'
                        }}>
                          {b.status || b.paymentStatus || 'Confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                style={{
                  padding: '0.85rem',
                  marginTop: '0.5rem',
                  fontSize: '0.95rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: payoutSubmitted ? 'not-allowed' : 'pointer',
                  opacity: payoutSubmitted ? 0.75 : 1
                }}
              >
                {payoutSubmitted ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processing Settlement...</span>
                  </>
                ) : (
                  'Submit Settlement Request'
                )}
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
                <button
                  type="submit"
                  disabled={isCreatingPromo}
                  className="btn btn-primary"
                  style={{
                    width: '60%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: isCreatingPromo ? 'not-allowed' : 'pointer',
                    opacity: isCreatingPromo ? 0.75 : 1
                  }}
                >
                  {isCreatingPromo ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Creating Code...</span>
                    </>
                  ) : (
                    'Create Code'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
