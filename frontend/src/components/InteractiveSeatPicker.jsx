import { useState, useEffect, useMemo } from 'react';
import { X, Ticket, Calendar, Layers, ZoomIn, ZoomOut, RotateCcw, Maximize2, ShieldAlert, Download } from 'lucide-react';
import { seatHoldApi, eventsApi, auditoriumLayoutsApi, bankAccountsApi, BACKEND_URL } from '../services/api';
import { parseAuditoriumLayout } from '../data/auditoriumLayouts';
import { exportAuditoriumChartPdf } from '../utils/pdfChartExporter';

// Stable per-session guest identity so all seat holds from this browser share one owner
// (a fresh random email per click fragmented the hold map and broke releases).
const getGuestEmail = () => {
  const KEY = 'eventland_guest_session';
  let guest = sessionStorage.getItem(KEY);
  if (!guest) {
    guest = `guest_${Math.floor(100000 + Math.random() * 900000)}@eventland.pk`;
    sessionStorage.setItem(KEY, guest);
  }
  return guest;
};

export default function InteractiveSeatPicker({ event: initialEvent, onClose, onProceedToCheckout, isPreview = false }) {
  const isPreviewMode = isPreview || !onProceedToCheckout || String(initialEvent?.id || '').startsWith('preview-');
  const [eventData, setEventData] = useState(initialEvent);
  const [dbAuditoriums, setDbAuditoriums] = useState([]);
  const [activeBank, setActiveBank] = useState(null);

  // Refresh full event details if seatingZones were not preloaded
  useEffect(() => {
    if (initialEvent?.id && typeof initialEvent.id === 'number' && (!initialEvent.seatingZones || initialEvent.seatingZones.length === 0)) {
      eventsApi.getEventById(initialEvent.id)
        .then(data => {
          if (data) setEventData(data);
        })
        .catch(err => console.warn('Could not load fresh event for seat picker:', err));
    } else {
      setEventData(initialEvent);
    }
  }, [initialEvent]);

  useEffect(() => {
    auditoriumLayoutsApi.getAll()
      .then(list => setDbAuditoriums(list || []))
      .catch(() => {});

    bankAccountsApi.getActive()
      .then(bank => { if (bank) setActiveBank(bank); })
      .catch(() => {});
  }, []);

  const event = eventData || initialEvent;
  const showsList = event.shows && event.shows.length > 0 ? event.shows : [];
  const [selectedShowId, setSelectedShowId] = useState(initialEvent.selectedShow?.id || showsList[0]?.id || null);
  const [zoomScale, setZoomScale] = useState(1);

  const defaultZone = event.seatingZones?.[0] || { 
    zone: 'Auditorium Main Hall', 
    rows: 10, 
    cols: 20, 
    price: event.startingPrice || 2500,
    layoutJson: ''
  };

  const [selectedZoneIndex, setSelectedZoneIndex] = useState(0);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [redisHeldSeats, setRedisHeldSeats] = useState([]);

  const currentZone = event.seatingZones?.[selectedZoneIndex] || defaultZone;

  const activeShow = showsList.find(s => s.id === selectedShowId) || initialEvent.selectedShow || showsList[0];

  const effectiveTiers = useMemo(() => {
    if (activeShow?.ticketTiers && activeShow.ticketTiers.length > 0) {
      return activeShow.ticketTiers;
    }
    return event.ticketTiers || [];
  }, [activeShow, event.ticketTiers]);

  const activeShowPrice = effectiveTiers[0]?.price || activeShow?.startingPrice || currentZone.price || event.startingPrice || 2500;

  // Resolve Layout Blueprint Schema dynamically from database JSON or auditorium layout
  const resolvedBlueprint = useMemo(() => {
    const raw = currentZone.layoutJson || '';
    const parsed = parseAuditoriumLayout(raw);
    if (parsed) return parsed;

    // Check if raw matches a layoutCode or name in dbAuditoriums
    if (raw && dbAuditoriums.length > 0) {
      const found = dbAuditoriums.find(a => a.layoutCode === raw || a.name === raw || raw.includes(a.layoutCode));
      if (found?.layoutJson) {
        return parseAuditoriumLayout(found.layoutJson);
      }
    }

    // Check if event venue or auditoriumLayout matches
    if (event.auditoriumLayout && dbAuditoriums.length > 0) {
      const found = dbAuditoriums.find(a => a.layoutCode === event.auditoriumLayout || a.name === event.auditoriumLayout);
      if (found?.layoutJson) {
        return parseAuditoriumLayout(found.layoutJson);
      }
    }

    return null;
  }, [currentZone.layoutJson, event.auditoriumLayout, dbAuditoriums]);

  // Load active seat locks from Redis whenever event or selected show changes
  useEffect(() => {
    if (!isPreviewMode && typeof event.id === 'number') {
      seatHoldApi.getHeldSeats(event.id, selectedShowId)
        .then(seatIds => setRedisHeldSeats(seatIds || []))
        .catch(err => console.warn('Could not load Redis seat locks:', err));
    }
  }, [event.id, selectedShowId, isPreviewMode]);

  // Real-time SignalR updates: SeatsHeld / SeatsReleased -> merge into redisHeldSeats.
  // Uses a dynamic import so the app still builds when @microsoft/signalr is not
  // installed yet; the warning above will prompt the install.
  useEffect(() => {
    if (isPreviewMode || typeof event.id !== 'number') return undefined;

    let cancelled = false;
    let conn = null;

    const start = async () => {
      try {
        const sig = await import('@microsoft/signalr');
        const token = localStorage.getItem('eventland_jwt_token') || '';
        const builder = new sig.HubConnectionBuilder()
          .withUrl(`${BACKEND_URL}/hubs/seating`, {
            accessTokenFactory: () => token,
            transport: sig.HttpTransportType.WebSockets | sig.HttpTransportType.LongPolling,
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging(sig.LogLevel.Warning)
          .build();

        const apply = (payload) => {
          let held = payload;
          try {
            if (typeof payload === 'string') held = JSON.parse(payload);
          } catch { /* already an array/object */ }
          const seats = Array.isArray(held) ? held : (held?.seatIds || held?.seats || []);
          if (!Array.isArray(seats) || seats.length === 0) return;
          const ids = seats.map(s => (typeof s === 'object' && s !== null ? (s.id ?? s.seatId ?? s.label) : s)).filter(Boolean);
          setRedisHeldSeats(prev => [...new Set([...prev, ...ids])]);
        };

        const applyReleased = (payload) => {
          let rel = payload;
          try {
            if (typeof payload === 'string') rel = JSON.parse(payload);
          } catch { /* */ }
          const seats = Array.isArray(rel) ? rel : (rel?.seatIds || rel?.seats || []);
          const ids = seats.map(s => (typeof s === 'object' && s !== null ? (s.id ?? s.seatId ?? s.label) : s)).filter(Boolean);
          if (ids.length === 0) return;
          const idsSet = new Set(ids.map(String));
          setRedisHeldSeats(prev => prev.filter(x => !idsSet.has(String(x))));
        };

        builder.on('SeatsHeld', apply);
        builder.on('seatsHeld', apply);
        builder.on('SeatsReleased', applyReleased);
        builder.on('seatsReleased', applyReleased);

        await builder.start();
        if (cancelled) { await builder.stop().catch(() => {}); return; }
        conn = builder;

        // Rejoin event group (hub method: JoinEventGroup(int eventId)).
        await conn.invoke('JoinEventGroup', event.id).catch(() => {});
      } catch (err) {
        // Expected when @microsoft/signalr is not installed; log once.
        console.warn('SignalR seating client not active:', err?.message || err);
      }
    };

    start();
    return () => {
      cancelled = true;
      if (conn) {
        conn.invoke('LeaveEventGroup', event.id).catch(() => {}).finally(() => conn.stop().catch(() => {}));
      }
    };
  }, [event.id, isPreviewMode]);

  const isOccupied = (seatId) => {
    if (!seatId) return false;
    return redisHeldSeats.includes(seatId);
  };

  const handleSeatClick = async (seatId, label, seatInfo) => {
    if (activeBank?.isUnderMaintenance && activeBank?.maintenanceNotice) {
      alert(`⚠️ Bank Maintenance Alert:\n\n${activeBank.maintenanceNotice}\n\nSeat selection is temporarily paused. Please try again after the maintenance window.`);
      return;
    }

    const seatPrice = seatInfo?.price ?? activeShowPrice ?? currentZone.price ?? 2500;
    const tierId = seatInfo?.tierId ?? null;
    const tierName = seatInfo?.tierName ?? null;

    if (selectedSeats.some((s) => s.id === seatId)) {
      const remaining = selectedSeats.filter((s) => s.id !== seatId);
      setSelectedSeats(remaining);
      if (!isPreviewMode && typeof event.id === 'number' && typeof seatId === 'number') {
        try {
          await seatHoldApi.releaseSeats(event.id, [seatId], selectedShowId);
        } catch (err) { console.warn('Seat release error:', err); }
      }
    } else {
      const newSeats = [
        ...selectedSeats, 
        { 
          id: seatId, 
          label, 
          zone: currentZone.zone, 
          price: seatPrice, 
          tierId: tierId,
          tierName: tierName,
          showId: selectedShowId, 
          showTitle: activeShow?.showTitle 
        }
      ];
      setSelectedSeats(newSeats);
      if (!isPreviewMode && typeof event.id === 'number' && typeof seatId === 'number') {
        try {
          let userEmail = 'authenticated_user@eventland.com';
          const savedUserRaw = localStorage.getItem('eventland_logged_user');
          let savedUser = null;
          if (savedUserRaw) {
            try { savedUser = JSON.parse(savedUserRaw); } catch { savedUser = null; }
          }

          if (savedUser?.email) {
            userEmail = savedUser.email;
          } else {
            userEmail = getGuestEmail();
          }

          await seatHoldApi.holdSeats(event.id, [seatId], userEmail, selectedShowId);
        } catch (err) { console.warn('Seat hold error:', err); }
      }
    }
  };

  const totalPrice = selectedSeats.reduce((sum, s) => sum + (Number(s.price) || Number(activeShowPrice) || 1500), 0);

  // Compare row letters as base-26 numbers so multi-character rows (AA, AB, ...) order correctly.
  const rowValue = (row) => String(row).trim().toUpperCase().split('')
    .reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0);

  // Helper to resolve row-wise price, tier ID and tier name
  const getRowSeatInfo = (rowChar, seatObj) => {
    if (seatObj?.price && Number(seatObj.price) > 0) {
      return { 
        price: Number(seatObj.price), 
        tierId: seatObj.tierId || null, 
        tierName: seatObj.tierName || null 
      };
    }

    const showTiers = effectiveTiers;
    const rowUpper = String(rowChar).trim().toUpperCase();

    const matchingTier = showTiers.find(t => {
      if (!t.rowRange) return false;
      const rawRanges = t.rowRange.split(',').map(s => s.trim().toUpperCase());
      for (const r of rawRanges) {
        if (!r) continue;
        const clean = r.replace(/ROWS?/g, '').trim();
        if (!clean) continue;
        if (clean === rowUpper) return true;

        if (clean.includes('-')) {
          const parts = clean.split('-').map(x => x.trim());
          if (parts.length === 2 && parts[0] && parts[1]) {
            const start = rowValue(parts[0]);
            const end = rowValue(parts[1]);
            const current = rowValue(rowUpper);
            if (current >= start && current <= end) return true;
          }
        }
      }
      return false;
    });

    const fallbackPrice = activeShowPrice || currentZone.price || event.startingPrice || 1500;
    return {
      price: matchingTier?.price ? Number(matchingTier.price) : Number(fallbackPrice),
      tierId: matchingTier?.id || null,
      tierName: matchingTier?.name || null
    };
  };

  // Helper to render a seat button
  const renderSeatBtn = (rowChar, seatNum, rSpec = null) => {
    const seatLabel = `${rowChar}${seatNum}`;
    const seatObj = currentZone.seats?.find(s => s.label === seatLabel);
    const seatId = seatObj?.id || seatLabel;
    const occupied = isOccupied(seatId) || seatObj?.status === 'Booked' || seatObj?.status === 'Reserved';
    const isDisabled = seatObj?.status === 'Blocked' || 
                       rSpec?.disabled?.includes(seatNum) || 
                       rSpec?.unavailable?.includes(seatNum) || 
                       resolvedBlueprint?.disabledSeats?.includes(seatLabel) ||
                       resolvedBlueprint?.unavailableSeats?.includes(seatLabel);
    const isSelected = selectedSeats.some((s) => s.id === seatId);
    const seatInfo = getRowSeatInfo(rowChar, seatObj);
    const seatPrice = seatInfo.price;

    return (
      <button
        key={seatLabel}
        disabled={occupied || isDisabled}
        onClick={() => !isDisabled && handleSeatClick(seatId, seatLabel, seatInfo)}
        style={{
          minWidth: '22px',
          height: '23px',
          padding: '0 2px',
          borderRadius: '4px',
          fontSize: '0.62rem',
          fontWeight: 700,
          border: isDisabled ? '1px solid rgba(239, 68, 68, 0.6)' : 'none',
          cursor: (occupied || isDisabled) ? 'not-allowed' : 'pointer',
          background: isDisabled 
            ? 'rgba(239, 68, 68, 0.35)' 
            : occupied 
              ? '#334155' 
              : isSelected 
                ? '#0d9488' 
                : 'rgba(255, 255, 255, 0.1)',
          color: isDisabled 
            ? '#fca5a5' 
            : occupied 
              ? '#64748b' 
              : isSelected 
                ? '#ffffff' 
                : '#e2e8f0',
          boxShadow: isSelected ? '0 0 8px #0d9488' : isDisabled ? '0 0 4px rgba(239, 68, 68, 0.4)' : 'none',
          transition: 'all 0.12s ease',
          textDecoration: isDisabled ? 'line-through' : 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none'
        }}
        title={isDisabled ? `Row ${rowChar} Seat ${seatNum} (Unavailable / Not in Hall)` : `Row ${rowChar} Seat ${seatNum} • PKR ${Number(seatPrice).toLocaleString()}${seatInfo.tierName ? ` (${seatInfo.tierName})` : ''}`}
      >
        {seatNum}
      </button>
    );
  };

  // Helper to render a single row of seats with sections/aisles
  const renderRow = (rSpec) => {
    const rowChar = rSpec.rowChar;

    return (
      <div key={rowChar} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', width: '24px', textAlign: 'right', userSelect: 'none' }}>
          {rowChar}
        </span>

        {/* Row Type: Multiple Blocks */}
        {rSpec.blocks && Array.isArray(rSpec.blocks) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {rSpec.blocks.map((blk, bIdx) => (
              <div key={bIdx} style={{ display: 'flex', gap: '0.2rem' }}>
                {blk.map((num) => renderSeatBtn(rowChar, num, rSpec))}
              </div>
            ))}
          </div>
        ) : rSpec.centerLeft && rSpec.centerRight ? (
          /* 4-block layout with 3 aisles */
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
            {rSpec.left && (
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                {rSpec.left.map((num) => renderSeatBtn(rowChar, num, rSpec))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {rSpec.centerLeft.map((num) => renderSeatBtn(rowChar, num, rSpec))}
            </div>
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {rSpec.centerRight.map((num) => renderSeatBtn(rowChar, num, rSpec))}
            </div>
            {rSpec.right && (
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                {rSpec.right.map((num) => renderSeatBtn(rowChar, num, rSpec))}
              </div>
            )}
          </div>
        ) : rSpec.center && !rSpec.left && !rSpec.right ? (
          <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center' }}>
            {rSpec.center.map((num) => renderSeatBtn(rowChar, num, rSpec))}
          </div>
        ) : rSpec.center && rSpec.left && rSpec.right ? (
          /* 3-block with 2 aisles (Left, Center, Right) */
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {rSpec.left.map((num) => renderSeatBtn(rowChar, num, rSpec))}
            </div>
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {rSpec.center.map((num) => renderSeatBtn(rowChar, num, rSpec))}
            </div>
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {rSpec.right.map((num) => renderSeatBtn(rowChar, num, rSpec))}
            </div>
          </div>
        ) : rSpec.left || rSpec.right ? (
          /* 2-block with center aisle */
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: (rSpec.right && !rSpec.left) ? 'flex-end' : (rSpec.left && !rSpec.right ? 'flex-start' : 'center') }}>
            {rSpec.left && (
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                {rSpec.left.map((num) => renderSeatBtn(rowChar, num, rSpec))}
              </div>
            )}
            {rSpec.right && (
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                {rSpec.right.map((num) => renderSeatBtn(rowChar, num, rSpec))}
              </div>
            )}
          </div>
        ) : rSpec.seats ? (
          /* Single continuous block */
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            {rSpec.seats.map((num) => renderSeatBtn(rowChar, num, rSpec))}
          </div>
        ) : null}

        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', width: '24px', textAlign: 'left', userSelect: 'none' }}>
          {rowChar}
        </span>
      </div>
    );
  };

  // Match current auditorium against dbAuditoriums list if available
  const zoneName = currentZone?.zone;
  const matchedDbAuditorium = useMemo(() => {
    if (!dbAuditoriums || dbAuditoriums.length === 0) return null;
    const searchTarget = (zoneName || event.auditoriumName || event.auditoriumLayout || event.title || '').toLowerCase();
    return dbAuditoriums.find(a =>
      (a.name && searchTarget.includes(a.name.toLowerCase())) ||
      (a.layoutCode && searchTarget.includes(a.layoutCode.toLowerCase()))
    );
  }, [dbAuditoriums, zoneName, event.auditoriumName, event.auditoriumLayout, event.title]);

  const rawAudi = currentZone?.zone || event.auditoriumName || event.auditorium || matchedDbAuditorium?.name || event.auditoriumLayout || 'Main Auditorium';
  const auditoriumName = (rawAudi && !rawAudi.toLowerCase().includes('undefined')) ? rawAudi : 'Main Auditorium';

  let rawVenue = event.venueName || (event.venue ? event.venue.split(',')[0].trim() : '') || matchedDbAuditorium?.venue || matchedDbAuditorium?.venueName || '';
  if (rawVenue.toLowerCase().includes('undefined')) rawVenue = '';

  let rawCity = event.cityName || event.city || (event.venue && event.venue.includes(',') ? event.venue.split(',')[1].trim() : '') || matchedDbAuditorium?.city || matchedDbAuditorium?.cityName || '';
  if (rawCity.toLowerCase().includes('undefined')) rawCity = '';

  // Smart Catalog Fallback when venue or city are unspecified in blueprint preview
  if (!rawVenue || !rawCity) {
    const nameLower = auditoriumName.toLowerCase();
    if (nameLower.includes('ac auditorium') || nameLower.includes('arts council')) {
      rawVenue = rawVenue || 'Arts Council of Pakistan';
      rawCity = rawCity || 'Karachi';
    } else if (nameLower.includes('alhamra')) {
      rawVenue = rawVenue || 'Alhamra Arts Council';
      rawCity = rawCity || 'Lahore';
    } else if (nameLower.includes('pnca')) {
      rawVenue = rawVenue || 'PNCA';
      rawCity = rawCity || 'Islamabad';
    } else if (nameLower.includes('open air')) {
      rawVenue = rawVenue || 'Bagh-e-Jinnah Open Air Theatre';
      rawCity = rawCity || 'Lahore';
    } else {
      rawVenue = rawVenue || 'Arts Council of Pakistan';
      rawCity = rawCity || 'Karachi';
    }
  }

  const venueName = rawVenue;
  const cityName = rawCity;
  const countryName = (event.countryName || event.country || matchedDbAuditorium?.country || 'Pakistan');

  const handleDownloadPdf = () => {
    exportAuditoriumChartPdf({
      auditoriumName,
      venueName,
      cityName,
      countryName,
      showName: isPreviewMode ? '' : (activeShow?.showTitle || ''),
      showDate: isPreviewMode ? '' : (activeShow?.startTimeUtc 
        ? new Date(activeShow.startTimeUtc).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
        : (event.startDateUtc ? new Date(event.startDateUtc).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '')),
      resolvedBlueprint,
      currentZone: {
        ...currentZone,
        rows: Math.max(currentZone?.rows || 11, 11)
      },
      eventTitle: isPreviewMode ? '' : (event.title || '')
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div 
        className="modal-content glass-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '96vw', 
          width: '1440px', 
          height: '92vh', 
          maxHeight: '94vh', 
          padding: 0, 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(13, 148, 136, 0.15)',
          border: '1px solid rgba(13, 148, 136, 0.3)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(15, 23, 42, 0.9)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isPreviewMode ? (
                <span className="badge" style={{ backgroundColor: 'rgba(13, 148, 136, 0.18)', color: '#2dd4bf', border: '1px solid rgba(13, 148, 136, 0.4)', padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 800 }}>
                  BLUEPRINT PREVIEW MODE
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#2dd4bf', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {auditoriumName}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.15rem' }}>
              {event.title}
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
              📍 <strong style={{ color: '#f8fafc' }}>{auditoriumName}</strong> • {venueName}, {cityName}, {countryName}
            </span>
          </div>

          {/* Zoom & View Controls + PDF Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #059669, #0f766e)',
                border: '1px solid rgba(45, 212, 191, 0.4)',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(13, 148, 136, 0.35)',
                whiteSpace: 'nowrap'
              }}
              title="Download Seating Chart in PDF format with White Background"
            >
              <Download size={15} /> Download Chart (PDF)
            </button>

            <div className="seat-picker-zoom-controls" style={{ display: 'flex', alignItems: 'center', background: 'rgba(30, 41, 59, 0.8)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.15rem' }}>
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.1))}
                style={{ padding: '0.35rem 0.6rem', background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: '0.75rem', color: '#99f6e4', fontWeight: 700, padding: '0 0.4rem', minWidth: '42px', textAlign: 'center' }}>
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.min(1.8, prev + 0.1))}
                style={{ padding: '0.35rem 0.6rem', background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                style={{ padding: '0.35rem 0.6rem', background: 'none', borderLeft: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', borderBottom: 'none', borderRight: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Reset Zoom (100%)"
              >
                <RotateCcw size={13} />
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Bank Channel Maintenance Notice Banner */}
        {activeBank?.isUnderMaintenance && activeBank?.maintenanceNotice && (
          <div style={{
            margin: '0.75rem 1.5rem 0.25rem 1.5rem',
            padding: '0.85rem 1.25rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#fca5a5',
            flexShrink: 0
          }}>
            <ShieldAlert size={24} color="#ef4444" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.82rem', lineHeight: '1.4' }}>
              <strong style={{ color: '#fff', display: 'block', fontSize: '0.88rem', marginBottom: '0.15rem' }}>
                ⚠️ Scheduled Bank Channel Maintenance (Seat Booking Paused)
              </strong>
              {activeBank.maintenanceNotice}
              {(activeBank.maintenanceStartUtc || activeBank.maintenanceEndUtc) && (
                <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
                  Maintenance Window: {activeBank.maintenanceStartUtc ? new Date(activeBank.maintenanceStartUtc).toLocaleString() : 'Now'} → {activeBank.maintenanceEndUtc ? new Date(activeBank.maintenanceEndUtc).toLocaleString() : 'Ongoing'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shows Selection Strip (Only in Buyer Mode) */}
        {!isPreviewMode && showsList.length > 1 && (
          <div className="seat-picker-show-tabs" style={{
            padding: '0.6rem 1.5rem',
            background: 'rgba(30, 41, 59, 0.5)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            overflowX: 'auto',
            flexShrink: 0
          }}>
            <Calendar size={16} color="#2dd4bf" />
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Select Show Time:</span>
            {showsList.map((show) => {
              const active = show.id === selectedShowId;
              return (
                <button
                  key={show.id}
                  onClick={() => {
                    setSelectedShowId(show.id);
                    setSelectedSeats([]);
                  }}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: active ? 700 : 500,
                    backgroundColor: active ? '#059669' : 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    border: active ? '1px solid #2dd4bf' : '1px solid transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {show.showTitle}
                </button>
              );
            })}
          </div>
        )}

        {/* Interactive Seating Area (Expansive Canvas) */}
        <div className="seat-picker-container" style={{ 
          flex: 1, 
          padding: '2rem 1.5rem', 
          textAlign: 'center', 
          backgroundColor: '#070b14', 
          overflow: 'auto',
          position: 'relative'
        }}>
          {/* Zoomable Container */}
          <div style={{
            display: 'inline-block',
            minWidth: '100%',
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease'
          }}>
            {/* Row Tier Price Legend */}
            {(effectiveTiers.filter(t => t.rowRange).length > 0) && (
              <div style={{ display: 'inline-flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.25rem', padding: '0.5rem 1rem', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                {effectiveTiers.filter(t => t.rowRange).map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: idx === 0 ? '#f59e0b' : idx === 1 ? '#a855f7' : '#0d9488' }} />
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{t.name} (Row {t.rowRange}):</span>
                    <span style={{ color: '#2dd4bf', fontWeight: 700 }}>PKR {Number(t.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Stage Element */}
            <div style={{
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '2px solid #64748b',
              borderRadius: '8px',
              padding: '0.85rem 3rem',
              margin: '0 auto 2.5rem',
              maxWidth: '520px',
              color: '#f8fafc',
              fontWeight: 900,
              letterSpacing: '0.35em',
              fontSize: '1.1rem',
              boxShadow: '0 4px 25px rgba(0, 0, 0, 0.6), 0 0 20px rgba(13, 148, 136, 0.15)'
            }}>
              STAGE / SCREEN
            </div>

            {/* Dynamic Auditorium Blueprint Renderer */}
            <div style={{ display: 'inline-block', paddingBottom: '2rem' }}>
              {resolvedBlueprint?.sections ? (
                /* Multi-Tier / Multi-Section Layout (e.g. Alhamra Hall 1 with Orchestra + Balcony) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {resolvedBlueprint.sections.map((section, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', alignItems: 'center' }}>
                      <div style={{
                        padding: '0.3rem 1.2rem',
                        background: 'rgba(13, 148, 136, 0.15)',
                        border: '1px solid rgba(13, 148, 136, 0.3)',
                        color: '#99f6e4',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                      }}>
                        {section.sectionName.toUpperCase()}
                      </div>
                      {section.rows.map(renderRow)}
                    </div>
                  ))}
                </div>
              ) : resolvedBlueprint?.rows ? (
                /* Standard Multi-Block Layout (e.g. Open Air Theatre, AC II, PNCA) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', alignItems: 'center' }}>
                  {resolvedBlueprint.rows.map(renderRow)}
                </div>
              ) : (
                /* Fallback Grid */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {Array.from({ length: currentZone.rows || 10 }).map((_, rIdx) => {
                    const rowLetter = String.fromCharCode(65 + rIdx);
                    return (
                      <div key={rowLetter} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', width: '20px' }}>{rowLetter}</span>
                        {Array.from({ length: currentZone.cols || 20 }).map((_, cIdx) => renderSeatBtn(rowLetter, cIdx + 1))}
                        <span style={{ fontSize: '0.75rem', color: '#64748b', width: '20px' }}>{rowLetter}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Seat Legend */}
            <div className="seat-picker-legend" style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '1.75rem',
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.8125rem',
              color: '#94a3b8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }} /> Available
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#0d9488', boxShadow: '0 0 8px #0d9488' }} /> Selected
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#334155' }} /> Booked / Locked
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.35)', border: '1px solid rgba(239, 68, 68, 0.6)' }} /> Unavailable / Blocked
              </div>
            </div>
          </div>
        </div>

        {/* --- CONDITIONAL FOOTER --- */}
        {isPreviewMode ? (
          /* Clean Informational Blueprint Footer (NO Payment Button) */
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Total Venue Blueprint Capacity</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2dd4bf' }}>
                  {currentZone.totalCapacity || event.totalCapacity || '1,085'} Seats
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Selected Seat Test</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: selectedSeats.length > 0 ? '#2dd4bf' : '#64748b' }}>
                  {selectedSeats.length > 0 ? selectedSeats.map(s => s.label).join(', ') : 'Click any seat above to test selection'}
                </span>
              </div>
            </div>

            <div className="seat-picker-actions" style={{ display: 'flex', gap: '0.75rem' }}>
              {selectedSeats.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSeats([])}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        ) : (
          /* Buyer Checkout Footer */
          <div style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            flexShrink: 0
          }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>
                Selected Seats ({selectedSeats.length}):
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2dd4bf' }}>
                {selectedSeats.length > 0 ? selectedSeats.map((s) => s.label || s.id).join(', ') : 'None'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Total Amount</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2dd4bf' }}>
                  PKR {totalPrice.toLocaleString()}
                </span>
              </div>

              <button
                disabled={selectedSeats.length === 0 || activeBank?.isUnderMaintenance}
                onClick={() => onProceedToCheckout && onProceedToCheckout(selectedSeats, selectedShowId)}
                style={{
                  padding: '0.75rem 1.6rem',
                  borderRadius: '8px',
                  background: activeBank?.isUnderMaintenance ? '#475569' : 'linear-gradient(135deg, #0d9488, #0f766e)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: (selectedSeats.length === 0 || activeBank?.isUnderMaintenance) ? 0.5 : 1,
                  cursor: (selectedSeats.length === 0 || activeBank?.isUnderMaintenance) ? 'not-allowed' : 'pointer'
                }}
              >
                {activeBank?.isUnderMaintenance ? (
                  <>⚠️ Booking Paused (Bank Maintenance)</>
                ) : (
                  <><Ticket size={18} /> Confirm & Pay</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
