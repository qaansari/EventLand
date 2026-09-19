import React, { useState, useMemo } from 'react';
import {
  Ticket,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Download,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  Check,
  X,
  Lock,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import SearchableSelect from '../SearchableSelect';
import { getEventImageUrl, getPaymentSlipUrl } from '../../services/api';
import { exportTicketPdf } from '../../utils/ticketPdfExporter';

export default function AdminBookingsTab({
  eventsList = [],
  bookingsList = [],
  loading = false,
  fetchBackendData,
  handleConfirmBankPayment,
  handleRejectBankPayment,
  handleDeleteBooking,
  setAdminPreviewTicket
}) {
  const { showSuccess, showError } = useToast();

  // Filter States
  const [bookingEventFilter, setBookingEventFilter] = useState('All');
  const [bookingShowFilter, setBookingShowFilter] = useState('All');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('All');
  const [bookingSearch, setBookingSearch] = useState('');
  const [previewProofModal, setPreviewProofModal] = useState(null);

  // Memoized Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookingsList.filter(b => {
      const matchedEv = eventsList.find(e => String(e.id) === String(b.eventId) || e.title === b.eventTitle);

      if (bookingEventFilter !== 'All') {
        if (b.eventTitle !== bookingEventFilter && String(b.eventId) !== String(bookingEventFilter) && matchedEv?.title !== bookingEventFilter) {
          return false;
        }
      }

      if (bookingShowFilter !== 'All') {
        const showTitle = b.showTitle || b.showDate || '';
        if (!showTitle.toLowerCase().includes(bookingShowFilter.toLowerCase())) {
          return false;
        }
      }

      if (bookingStatusFilter !== 'All') {
        const isPaid = b.paymentStatus === 'Paid' || b.paymentStatus === 'PAID' || b.paymentStatus === 1 || b.status === 'Confirmed';
        if (bookingStatusFilter === 'Paid' && !isPaid) return false;
        if (bookingStatusFilter === 'Pending' && (isPaid || b.status === 'Cancelled')) return false;
        if (bookingStatusFilter === 'Cancelled' && b.status !== 'Cancelled') return false;
        if (bookingStatusFilter === 'Confirmed' && b.status !== 'Confirmed') return false;
      }

      if (bookingSearch.trim()) {
        const q = bookingSearch.toLowerCase();
        const ref = (b.bookingRef || `EVL-${b.id}`).toLowerCase();
        const name = (b.customerName || '').toLowerCase();
        const email = (b.customerEmail || '').toLowerCase();
        const eventT = (b.eventTitle || '').toLowerCase();
        if (!ref.includes(q) && !name.includes(q) && !email.includes(q) && !eventT.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [bookingsList, eventsList, bookingEventFilter, bookingShowFilter, bookingStatusFilter, bookingSearch]);

  // Live KPI Calculations
  const adminTotalOrdersPlaced = filteredBookings.length;
  const adminTotalTicketsSold = filteredBookings.reduce((sum, b) => sum + (Number(b.quantity) || 1), 0);
  const adminTotalRevenue = filteredBookings
    .filter(b => b.paymentStatus === 'Paid' || b.paymentStatus === 'PAID' || b.paymentStatus === 1 || b.status === 'Confirmed' || !b.paymentStatus)
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  // Export Bookings (CSV / Excel)
  const handleExportAdminOrders = (format = 'csv') => {
    if (filteredBookings.length === 0) {
      showError('Export Empty', 'No bookings found matching selected filters.');
      return;
    }

    const headers = [
      'Booking Ref',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Event Title',
      'Show Slot',
      'Quantity',
      'Total Amount (PKR)',
      'Status',
      'Payment Status',
      'Payment Method',
      'Transaction Ref',
      'Booking Date'
    ];

    const rows = filteredBookings.map(b => [
      `"${(b.bookingRef || `EVL-${b.id}`).replace(/"/g, '""')}"`,
      `"${(b.customerName || '').replace(/"/g, '""')}"`,
      `"${(b.customerEmail || '').replace(/"/g, '""')}"`,
      `"${(b.customerPhone || '').replace(/"/g, '""')}"`,
      `"${(b.eventTitle || '').replace(/"/g, '""')}"`,
      `"${(b.showTitle || b.showDate || '').replace(/"/g, '""')}"`,
      b.quantity || 1,
      b.totalAmount || 0,
      `"${(b.status || 'Confirmed').replace(/"/g, '""')}"`,
      `"${(b.paymentStatus || 'Paid').replace(/"/g, '""')}"`,
      `"${(b.paymentMethod || 'Online').replace(/"/g, '""')}"`,
      `"${(b.bankTransactionRef || '').replace(/"/g, '""')}"`,
      `"${b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const mimeType = format === 'excel' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';
    const ext = format === 'excel' ? 'xls' : 'csv';
    const blob = new Blob([csvContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanEvName = bookingEventFilter !== 'All' ? bookingEventFilter.replace(/[^a-zA-Z0-9]/g, '_') : 'All_Events';
    link.download = `Admin_Orders_${cleanEvName}_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess(`Orders Exported (${ext.toUpperCase()}) 📥`, `Successfully exported ${filteredBookings.length} order(s).`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Ticket size={22} color="#0d9488" /> Issued Bookings & E-Tickets Log
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Filter customer bookings by Event and Show Slot, preview QR passes, and export official PDF E-Tickets.
          </p>
        </div>

        <button
          onClick={fetchBackendData}
          disabled={loading}
          className="btn btn-secondary"
          style={{ fontSize: '0.82rem', padding: '0.55rem 0.9rem', borderRadius: '8px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Bookings
        </button>
      </div>

      {/* Filtering Bar */}
      <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(13, 148, 136, 0.2)', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
            Search Bookings
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Ref #, Name, or Email..."
              value={bookingSearch}
              onChange={e => setBookingSearch(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.2rem', backgroundColor: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>
        </div>

        {/* Event Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
            Filter by Event
          </label>
          <SearchableSelect
            value={bookingEventFilter}
            onChange={e => {
              setBookingEventFilter(e.target.value);
              setBookingShowFilter('All');
            }}
            options={['All', ...eventsList.map(ev => ev.title || `Event #${ev.id}`)]}
            placeholder="All Events"
          />
        </div>

        {/* Show Slot Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
            Filter by Show Slot
          </label>
          {(() => {
            const selectedEv = eventsList.find(ev => ev.title === bookingEventFilter || String(ev.id) === String(bookingEventFilter));
            const showOpts = selectedEv
              ? ['All', ...(selectedEv.shows || selectedEv.eventShows || []).map(s => s.showTitle || `Slot #${s.id}`)]
              : ['All'];
            return (
              <SearchableSelect
                value={bookingShowFilter}
                onChange={e => setBookingShowFilter(e.target.value)}
                options={showOpts}
                placeholder="All Show Slots"
              />
            );
          })()}
        </div>

        {/* Payment Status Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
            Filter by Status
          </label>
          <SearchableSelect
            value={bookingStatusFilter}
            onChange={e => setBookingStatusFilter(e.target.value)}
            options={['All', 'Paid', 'Pending', 'Confirmed', 'Cancelled']}
            placeholder="All Statuses"
          />
        </div>

        {/* Export Buttons */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
            Export Bookings
          </label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => handleExportAdminOrders('csv')}
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: '0.8rem', padding: '0.52rem 0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              title="Export filtered orders to CSV"
            >
              <Download size={14} color="#2dd4bf" /> CSV
            </button>
            <button
              type="button"
              onClick={() => handleExportAdminOrders('excel')}
              className="btn btn-primary"
              style={{ flex: 1, fontSize: '0.8rem', padding: '0.52rem 0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              title="Export filtered orders to Excel (.xls)"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Live KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* KPI 1: TOTAL ORDERS PLACED */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6', backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL ORDERS PLACED
            </span>
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <FileSpreadsheet size={18} color="#60a5fa" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 900, color: '#fff', margin: 0 }}>
            {adminTotalOrdersPlaced.toLocaleString()}
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 600, display: 'block', marginTop: '0.35rem' }}>
            {bookingEventFilter === 'All' ? 'Across all events' : bookingEventFilter}
          </span>
        </div>

        {/* KPI 2: TOTAL TICKETS SOLD */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #a855f7', backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL TICKETS SOLD
            </span>
            <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <Ticket size={18} color="#c084fc" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 900, color: '#fff', margin: 0 }}>
            {adminTotalTicketsSold.toLocaleString()}
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 600, display: 'block', marginTop: '0.35rem' }}>
            {bookingShowFilter === 'All' ? 'All show slots' : bookingShowFilter}
          </span>
        </div>

        {/* KPI 3: TOTAL REVENUE */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #0d9488', backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL REVENUE
            </span>
            <div style={{ backgroundColor: 'rgba(13, 148, 136, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
              <DollarSign size={18} color="#2dd4bf" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 900, color: '#2dd4bf', margin: 0 }}>
            PKR {adminTotalRevenue.toLocaleString()}
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#2dd4bf', fontWeight: 600, display: 'block', marginTop: '0.35rem' }}>
            Live aggregated revenue
          </span>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="mature-table-wrapper">
        <table className="mature-data-table">
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <th style={{ padding: '1rem', color: '#94a3b8' }}>Booking Ref</th>
              <th style={{ padding: '1rem', color: '#94a3b8' }}>Customer</th>
              <th style={{ padding: '1rem', color: '#94a3b8' }}>Event & Show Slot</th>
              <th style={{ padding: '1rem', color: '#94a3b8' }}>Amount</th>
              <th style={{ padding: '1rem', color: '#94a3b8' }}>Status</th>
              <th style={{ padding: '1rem', color: '#94a3b8', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  No bookings found matching selected filters.
                </td>
              </tr>
            ) : (
              filteredBookings.map(b => {
                const matchedEvent = eventsList.find(e => String(e.id) === String(b.eventId) || e.title === b.eventTitle) || {};
                const shows = matchedEvent.shows || matchedEvent.eventShows || [];
                const matchedShow = shows.find(s => String(s.id) === String(b.eventShowId) || s.showTitle === b.showTitle);

                let dateStr = b.showDate || matchedEvent.date;
                let timeStr = b.showTime || matchedShow?.showTitle;
                if (!dateStr && matchedEvent.startDateUtc) {
                  const dt = new Date(matchedEvent.startDateUtc);
                  if (!isNaN(dt.getTime())) {
                    dateStr = dt.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                    timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' PKT';
                  }
                }

                const ticketObj = {
                  ticketId: b.bookingRef || `EVL-${b.id}`,
                  eventTitle: b.eventTitle || matchedEvent.title || 'Live Concert Experience',
                  banner: getEventImageUrl(b.banner || matchedEvent.banner),
                  venue: b.venueName || matchedEvent.venue || matchedEvent.venueName || 'Arts Council of Pakistan, Karachi',
                  cityName: b.cityName || matchedEvent.city || matchedEvent.cityName || 'Karachi',
                  date: dateStr || 'Saturday, 10th January 2027',
                  time: timeStr || '08:00 PM PKT',
                  showTitle: matchedShow?.showTitle || b.showTitle || 'Main Show Slot',
                  showDateTime: (dateStr && timeStr) ? `${dateStr} at ${timeStr}` : (dateStr || timeStr || 'Saturday, 10th January 2027 at 08:00 PM PKT'),
                  attendeeName: b.customerName || 'Customer',
                  attendeeEmail: b.customerEmail || '',
                  phone: b.customerPhone || '',
                  seats: b.seats || (b.selectedSeatIds ? b.selectedSeatIds.map(id => ({ label: `Seat ${id}` })) : [{ label: `${b.quantity || 1} Ticket Pass` }]),
                  paymentMethod: b.paymentMethod || 'Direct Bank Transfer',
                  paymentStatus: (b.paymentStatus === 'Paid' || b.paymentStatus === 'PAID' || b.paymentStatus === 1 || b.status === 'Confirmed') ? 'Paid' : 'Pending',
                  totalPaid: b.totalAmount || 1500,
                  bookingTime: b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-US') : ''
                };

                const isPaid = ticketObj.paymentStatus === 'Paid';

                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', color: '#f8fafc', fontWeight: 600 }}>
                      <span style={{ color: '#2dd4bf' }}>#{ticketObj.ticketId}</span>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{ticketObj.bookingTime || 'Direct Booking'}</div>
                    </td>

                    <td style={{ padding: '1rem', color: '#f8fafc' }}>
                      <div style={{ fontWeight: 600 }}>{b.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.customerEmail}</div>
                      {b.customerPhone && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{b.customerPhone}</div>}
                    </td>

                    <td style={{ padding: '1rem', color: '#94a3b8' }}>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{ticketObj.eventTitle}</div>
                      <div style={{ fontSize: '0.75rem', color: '#2dd4bf' }}>
                        {ticketObj.showTitle ? `Slot: ${ticketObj.showTitle}` : ticketObj.date}
                      </div>
                    </td>

                    <td style={{ padding: '1rem', color: '#2dd4bf', fontWeight: 700 }}>
                      PKR {ticketObj.totalPaid.toLocaleString()}
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span className="badge" style={{ backgroundColor: isPaid ? 'rgba(13, 148, 136, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: isPaid ? '#2dd4bf' : '#fbbf24', fontWeight: 800, width: 'fit-content' }}>
                          {isPaid ? 'Paid & Confirmed ✓' : (b.bankTransactionRef ? 'Pending Verification ⏳' : 'Unpaid')}
                        </span>
                        {b.bankTransactionRef && (
                          <div style={{ fontSize: '0.72rem', color: '#2dd4bf', fontWeight: 600 }}>
                            TID: {b.bankTransactionRef}
                          </div>
                        )}
                        {b.paymentProofUrl ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.2rem' }}>
                            <div
                              onClick={() => setPreviewProofModal({
                                url: b.paymentProofUrl,
                                id: b.id,
                                bookingRef: ticketObj.ticketId,
                                customerName: b.customerName,
                                customerEmail: b.customerEmail,
                                customerPhone: b.customerPhone,
                                totalAmount: ticketObj.totalPaid,
                                bankTransactionRef: b.bankTransactionRef,
                                eventTitle: ticketObj.eventTitle,
                                seatsText: (b.seats || []).map(s => s.label || s.id).join(', ') || `${b.quantity || 1} Seats`
                              })}
                              style={{
                                cursor: 'pointer',
                                position: 'relative',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid rgba(45, 212, 191, 0.4)',
                                width: '100px',
                                height: '65px',
                                background: '#0f172a',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                              }}
                              title="Click to view full receipt screenshot"
                            >
                              <img
                                src={getPaymentSlipUrl(b.paymentProofUrl)}
                                alt="Receipt Slip"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setPreviewProofModal({
                                url: b.paymentProofUrl,
                                id: b.id,
                                bookingRef: ticketObj.ticketId,
                                customerName: b.customerName,
                                customerEmail: b.customerEmail,
                                customerPhone: b.customerPhone,
                                totalAmount: ticketObj.totalPaid,
                                bankTransactionRef: b.bankTransactionRef,
                                eventTitle: ticketObj.eventTitle,
                                seatsText: (b.seats || []).map(s => s.label || s.id).join(', ') || `${b.quantity || 1} Seats`
                              })}
                              style={{ background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', fontSize: '0.72rem', padding: '0.25rem 0.5rem', cursor: 'pointer', width: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
                            >
                              <Eye size={12} /> View Screenshot
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>No slip uploaded</span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                        {b.paymentProofUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewProofModal({
                              url: b.paymentProofUrl,
                              id: b.id,
                              bookingRef: ticketObj.ticketId,
                              customerName: b.customerName,
                              customerEmail: b.customerEmail,
                              customerPhone: b.customerPhone,
                              totalAmount: ticketObj.totalPaid,
                              bankTransactionRef: b.bankTransactionRef,
                              eventTitle: ticketObj.eventTitle,
                              seatsText: (b.seats || []).map(s => s.label || s.id).join(', ') || `${b.quantity || 1} Seats`
                            })}
                            style={{ padding: '0.4rem 0.75rem', background: 'rgba(56, 189, 248, 0.18)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '6px', color: '#38bdf8', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            title="View Customer Payment Proof Screenshot"
                          >
                            <Eye size={13} /> View Slip
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => alert(`No payment receipt image was uploaded for booking #${ticketObj.ticketId}.\nCustomer TID: ${b.bankTransactionRef || 'N/A'}`)}
                            style={{ padding: '0.4rem 0.6rem', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer', opacity: 0.7 }}
                            title="No Payment Proof Image Uploaded"
                          >
                            No Slip
                          </button>
                        )}

                        {!isPaid && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleConfirmBankPayment(b.id, ticketObj.ticketId)}
                              style={{ padding: '0.4rem 0.75rem', background: 'linear-gradient(135deg, #059669, #047857)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                              title="Verify Bank Transfer & Issue Ticket"
                            >
                              <Check size={13} /> Verify & Issue
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRejectBankPayment(b.id, ticketObj.ticketId)}
                              style={{ padding: '0.4rem 0.6rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#f87171', fontSize: '0.78rem', cursor: 'pointer' }}
                              title="Reject Payment & Release Seats"
                            >
                              <X size={13} /> Reject
                            </button>

                            {b.customerPhone && (
                              <a
                                href={`https://api.whatsapp.com/send?phone=${b.customerPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(`Hello ${b.customerName}, this is EventLand Support regarding your booking #${ticketObj.ticketId} for ${ticketObj.eventTitle}.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ padding: '0.4rem 0.6rem', background: 'rgba(37, 211, 102, 0.15)', border: '1px solid rgba(37, 211, 102, 0.4)', borderRadius: '6px', color: '#25d366', fontSize: '0.78rem', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                                title="Message Customer on WhatsApp"
                              >
                                <MessageSquare size={13} />
                              </a>
                            )}
                          </>
                        )}

                        {isPaid ? (
                          <button
                            type="button"
                            onClick={() => {
                              exportTicketPdf(ticketObj);
                              showSuccess('PDF Ticket Exported', `E-Ticket #${ticketObj.ticketId} downloaded successfully!`);
                            }}
                            style={{ padding: '0.4rem 0.75rem', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            title="Export Official PDF E-Ticket"
                          >
                            <Download size={13} /> PDF
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', background: 'rgba(255, 255, 255, 0.04)', padding: '0.35rem 0.6rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Lock size={12} /> Ticket Locked
                          </span>
                        )}

                        {isPaid && (
                          <button
                            type="button"
                            onClick={() => setAdminPreviewTicket(ticketObj)}
                            style={{ padding: '0.4rem 0.75rem', background: 'rgba(13, 148, 136, 0.15)', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '6px', color: '#2dd4bf', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            title="View Digital QR Pass Preview"
                          >
                            <Eye size={13} /> View Pass
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteBooking(b.id)}
                          style={{ padding: '0.4rem 0.6rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}
                          title="Delete Booking Record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: PAYMENT PROOF RECEIPT PREVIEW & VERIFICATION */}
      {previewProofModal && (
        <div className="modal-overlay" onClick={() => setPreviewProofModal(null)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', padding: '1.75rem', position: 'relative' }}>
            <button
              onClick={() => setPreviewProofModal(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <ShieldCheck size={26} color="#0d9488" />
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Bank Transfer Verification & Receipt Slip
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#2dd4bf', fontWeight: 600 }}>
                  Booking #{typeof previewProofModal === 'object' ? previewProofModal.bookingRef : 'Ref'} {typeof previewProofModal === 'object' && previewProofModal.eventTitle ? `• ${previewProofModal.eventTitle}` : ''}
                </span>
              </div>
            </div>

            {typeof previewProofModal === 'object' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>CUSTOMER NAME</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>{previewProofModal.customerName}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>BANK TRANSACTION ID (TID)</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2dd4bf' }}>{previewProofModal.bankTransactionRef || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>TOTAL AMOUNT</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#34d399' }}>PKR {(previewProofModal.totalAmount || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>RESERVED SEATS</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1' }}>{previewProofModal.seatsText}</span>
                </div>
                {(previewProofModal.senderAccountTitle || previewProofModal.senderBankName) && (
                  <div style={{ gridColumn: 'span 2', background: 'rgba(13, 148, 136, 0.12)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(45, 212, 191, 0.35)', marginTop: '0.25rem' }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: '#2dd4bf', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Alternative Sender Account Details
                    </span>
                    <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700, marginTop: '0.15rem' }}>
                      Title: {previewProofModal.senderAccountTitle || 'N/A'} • Bank: {previewProofModal.senderBankName || 'N/A'} {previewProofModal.senderAccountLast4 ? `(Last 4: ${previewProofModal.senderAccountLast4})` : ''}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ background: '#091121', padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(13, 148, 136, 0.3)', textAlign: 'center', marginBottom: '1.25rem' }}>
              <img
                src={typeof previewProofModal === 'object' ? previewProofModal.url : previewProofModal}
                alt="Payment Receipt Slip"
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {typeof previewProofModal === 'object' && previewProofModal.id && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const id = previewProofModal.id;
                      const ref = previewProofModal.bookingRef;
                      setPreviewProofModal(null);
                      handleConfirmBankPayment(id, ref);
                    }}
                    style={{ padding: '0.75rem 1.25rem', background: 'linear-gradient(135deg, #059669, #047857)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Check size={16} /> Verify & Issue E-Ticket
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const id = previewProofModal.id;
                      const ref = previewProofModal.bookingRef;
                      setPreviewProofModal(null);
                      handleRejectBankPayment(id, ref);
                    }}
                    style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#f87171', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <X size={16} /> Reject Payment
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setPreviewProofModal(null)}
                className="btn btn-secondary"
                style={{ padding: '0.75rem 1.25rem' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
