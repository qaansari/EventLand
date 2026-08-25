import { useState, useEffect, useMemo } from 'react';
import { X, Ticket, Calendar, Layers, ZoomIn, ZoomOut, RotateCcw, Maximize2, ShieldAlert } from 'lucide-react';
import { seatHoldApi, eventsApi, auditoriumLayoutsApi } from '../services/api';
import { parseAuditoriumLayout } from '../data/auditoriumLayouts';

const createGuestEmail = () => `guest_${Math.floor(100000 + Math.random() * 900000)}@eventland.pk`;

export default function InteractiveSeatPicker({ event: initialEvent, onClose, onProceedToCheckout, isPreview = false }) {
  const isPreviewMode = isPreview || !onProceedToCheckout || String(initialEvent?.id || '').startsWith('preview-');
  const [eventData, setEventData] = useState(initialEvent);
  const [dbAuditoriums, setDbAuditoriums] = useState([]);

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

  const isOccupied = (seatId) => {
    if (!seatId) return false;
    return redisHeldSeats.includes(seatId);
  };

  const handleSeatClick = async (seatId, label, seatInfo) => {
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
          const currentUserEmail = localStorage.getItem('eventland_user_email');
          const jwtToken = localStorage.getItem('eventland_jwt_token');

          if (currentUserEmail) {
            userEmail = currentUserEmail;
          } else if (!jwtToken) {
            userEmail = createGuestEmail();
          }

          await seatHoldApi.holdSeats(event.id, [seatId], userEmail, selectedShowId);
        } catch (err) { console.warn('Seat hold error:', err); }
      }
    }
  };

  const totalPrice = selectedSeats.reduce((sum, s) => sum + (Number(s.price) || Number(activeShowPrice) || 1500), 0);

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
            const start = parts[0];
            const end = parts[1];
            if (rowUpper >= start && rowUpper <= end) return true;
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
                ? '#10b981' 
                : 'rgba(255, 255, 255, 0.1)',
          color: isDisabled 
            ? '#fca5a5' 
            : occupied 
              ? '#64748b' 
              : isSelected 
                ? '#ffffff' 
                : '#e2e8f0',
          boxShadow: isSelected ? '0 0 8px #10b981' : isDisabled ? '0 0 4px rgba(239, 68, 68, 0.4)' : 'none',
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
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.3)'
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
                <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 800 }}>
                  BLUEPRINT PREVIEW MODE
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {currentZone.zone || 'Auditorium Seating Chart'}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.15rem' }}>
              {event.title}
            </h2>
            {event.venue && (
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                📍 {event.venue}
              </span>
            )}
          </div>

          {/* Zoom & View Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(30, 41, 59, 0.8)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.15rem' }}>
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.1))}
                style={{ padding: '0.35rem 0.6rem', background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 700, padding: '0 0.4rem', minWidth: '42px', textAlign: 'center' }}>
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

        {/* Shows Selection Strip (Only in Buyer Mode) */}
        {!isPreviewMode && showsList.length > 1 && (
          <div style={{
            padding: '0.6rem 1.5rem',
            background: 'rgba(30, 41, 59, 0.5)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            overflowX: 'auto',
            flexShrink: 0
          }}>
            <Calendar size={16} color="#60a5fa" />
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
                    backgroundColor: active ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    border: active ? '1px solid #60a5fa' : '1px solid transparent',
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
        <div style={{ 
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
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.25rem', padding: '0.5rem 1rem', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'inline-flex' }}>
                {effectiveTiers.filter(t => t.rowRange).map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: idx === 0 ? '#f59e0b' : idx === 1 ? '#a855f7' : '#3b82f6' }} />
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{t.name} (Row {t.rowRange}):</span>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>PKR {Number(t.price).toLocaleString()}</span>
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
              boxShadow: '0 4px 25px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.15)'
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
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        color: '#93c5fd',
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
            <div style={{
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
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#10b981', boxShadow: '0 0 8px #10b981' }} /> Selected
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
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                  {currentZone.totalCapacity || event.totalCapacity || '1,085'} Seats
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Selected Seat Test</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: selectedSeats.length > 0 ? '#10b981' : '#64748b' }}>
                  {selectedSeats.length > 0 ? selectedSeats.map(s => s.label).join(', ') : 'Click any seat above to test selection'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
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
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
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
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
                {selectedSeats.length > 0 ? selectedSeats.map((s) => s.label || s.id).join(', ') : 'None'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Total Amount</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981' }}>
                  PKR {totalPrice.toLocaleString()}
                </span>
              </div>

              <button
                disabled={selectedSeats.length === 0}
                onClick={() => onProceedToCheckout && onProceedToCheckout(selectedSeats, selectedShowId)}
                style={{
                  padding: '0.75rem 1.6rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981, #047857)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: selectedSeats.length === 0 ? 0.5 : 1,
                  cursor: selectedSeats.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <Ticket size={18} /> Confirm & Pay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
