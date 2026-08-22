import React, { useState, useEffect } from 'react';
import { X, Ticket, Calendar } from 'lucide-react';
import { seatHoldApi } from '../services/api';

// AC II ACP KARACHI row specifications matching official venue blueprint
const ACP_KARACHI_ROWS = [
  { rowChar: 'A', left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], right: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] },
  { rowChar: 'B', left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], right: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] },
  { rowChar: 'C', left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], right: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25] },
  { rowChar: 'D', left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], right: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25] },
  { rowChar: 'E', left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], right: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26] },
  { rowChar: 'F', left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], right: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26] },
  { rowChar: 'G', left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], right: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27] },
  { rowChar: 'H', left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], right: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28] },
  { rowChar: 'I', left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], right: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28] },
  { rowChar: 'J', left: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], right: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26] },
  { rowChar: 'K', center: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] }
];

export default function InteractiveSeatPicker({ event, onClose, onProceedToCheckout }) {
  const showsList = event.shows && event.shows.length > 0 ? event.shows : [];
  const [selectedShowId, setSelectedShowId] = useState(showsList[0]?.id || null);

  const defaultZone = event.seatingZones?.[0] || { 
    zone: 'AC II ACP KARACHI Main Hall', 
    rows: 11, 
    cols: 28, 
    price: event.startingPrice || 2500,
    layoutJson: 'AC_II_ACP_KARACHI'
  };

  const [selectedZoneIndex, setSelectedZoneIndex] = useState(0);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [redisHeldSeats, setRedisHeldSeats] = useState([]);

  const currentZone = event.seatingZones?.[selectedZoneIndex] || defaultZone;
  const isAcpBlueprint = currentZone.layoutJson === 'AC_II_ACP_KARACHI' || currentZone.zone?.toLowerCase().includes('acp') || currentZone.zone?.toLowerCase().includes('ac ii');

  // Load active seat locks from Redis whenever event or selected show changes
  useEffect(() => {
    if (typeof event.id === 'number') {
      seatHoldApi.getHeldSeats(event.id, selectedShowId)
        .then(seatIds => setRedisHeldSeats(seatIds || []))
        .catch(err => console.warn('Could not load Redis seat locks:', err));
    }
  }, [event.id, selectedShowId]);

  const isOccupied = (seatId) => {
    if (!seatId) return false;
    return redisHeldSeats.includes(seatId);
  };

  const handleSeatClick = async (seatId, label, price) => {
    if (selectedSeats.some((s) => s.id === seatId)) {
      const remaining = selectedSeats.filter((s) => s.id !== seatId);
      setSelectedSeats(remaining);
      if (typeof event.id === 'number' && typeof seatId === 'number') {
        try {
          await seatHoldApi.releaseSeats(event.id, [seatId], selectedShowId);
        } catch (err) { console.warn('Seat release error:', err); }
      }
    } else {
      const newSeats = [...selectedSeats, { id: seatId, label, zone: currentZone.zone, price, showId: selectedShowId }];
      setSelectedSeats(newSeats);
      if (typeof event.id === 'number' && typeof seatId === 'number') {
        try {
          await seatHoldApi.holdSeats(event.id, [seatId], 'buyer@eventland.com', selectedShowId);
        } catch (err) { console.warn('Seat hold error:', err); }
      }
    }
  };

  const totalPrice = selectedSeats.reduce((sum, s) => sum + (s.price || currentZone.price || 1500), 0);

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '960px', width: '95vw', padding: 0, overflow: 'hidden' }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(15, 23, 42, 0.8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AC II ACP KARACHI - Interactive Mapped Seating
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Show Selector & Zone Tabs */}
        <div style={{
          padding: '1rem 1.5rem',
          background: 'rgba(15, 23, 42, 0.5)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Multi-Show Selector */}
          {showsList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} color="#60a5fa" />
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 600 }}>Select Show Timing:</span>
              <select
                value={selectedShowId || ''}
                onChange={(e) => {
                  setSelectedShowId(Number(e.target.value));
                  setSelectedSeats([]);
                }}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  color: '#38bdf8',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                {showsList.map((show) => (
                  <option key={show.id} value={show.id}>
                    {show.showTitle || 'Show Slot'} ({new Date(show.startTimeUtc).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' })} PKT)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Zone Selector */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
            {(event.seatingZones && event.seatingZones.length > 0 ? event.seatingZones : [defaultZone]).map((z, idx) => (
              <button
                key={z.id || z.zone}
                onClick={() => setSelectedZoneIndex(idx)}
                style={{
                  backgroundColor: selectedZoneIndex === idx ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  color: selectedZoneIndex === idx ? '#38bdf8' : '#94a3b8',
                  border: selectedZoneIndex === idx ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                {z.zone} (PKR {z.price?.toLocaleString() || '2,500'})
              </button>
            ))}
          </div>
        </div>

        {/* Blueprint Container */}
        <div style={{ padding: '1.5rem', textAlign: 'center', maxHeight: '60vh', overflowY: 'auto' }}>
          {/* STAGE graphic */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '2px solid #64748b',
            borderRadius: '8px',
            padding: '1rem 2rem',
            margin: '0 auto 2.5rem',
            maxWidth: '380px',
            color: '#f8fafc',
            fontWeight: 900,
            letterSpacing: '0.3em',
            fontSize: '1.2rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
          }}>
            STAGE
          </div>

          {/* Seat Layout: AC II ACP KARACHI versus Standard Grid */}
          <div style={{ display: 'inline-block', maxWidth: '100%', overflowX: 'auto', paddingBottom: '1rem' }}>
            {isAcpBlueprint ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                {ACP_KARACHI_ROWS.map((rSpec) => {
                  return (
                    <div key={rSpec.rowChar} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', width: '20px', textAlign: 'right' }}>
                        {rSpec.rowChar}
                      </span>

                      {rSpec.center ? (
                        // Row K Centered
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          {rSpec.center.map((num) => {
                            const seatObj = currentZone.seats?.find(s => s.label === `${rSpec.rowChar}${num}`);
                            const seatId = seatObj?.id || `${rSpec.rowChar}${num}`;
                            const occupied = isOccupied(seatId);
                            const isSelected = selectedSeats.some((s) => s.id === seatId);

                            return (
                              <button
                                key={num}
                                disabled={occupied}
                                onClick={() => handleSeatClick(seatId, `${rSpec.rowChar}${num}`, currentZone.price)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: occupied ? 'not-allowed' : 'pointer',
                                  background: occupied ? '#334155' : isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                                  color: occupied ? '#64748b' : isSelected ? '#ffffff' : '#e2e8f0',
                                  boxShadow: isSelected ? '0 0 8px #10b981' : 'none'
                                }}
                                title={`Row ${rSpec.rowChar} Seat ${num}`}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        // Left & Right blocks separated by Center Aisle
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
                          {/* Left Block */}
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {rSpec.left.map((num) => {
                              const seatObj = currentZone.seats?.find(s => s.label === `${rSpec.rowChar}${num}`);
                              const seatId = seatObj?.id || `${rSpec.rowChar}${num}`;
                              const occupied = isOccupied(seatId);
                              const isSelected = selectedSeats.some((s) => s.id === seatId);

                              return (
                                <button
                                  key={num}
                                  disabled={occupied}
                                  onClick={() => handleSeatClick(seatId, `${rSpec.rowChar}${num}`, currentZone.price)}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: occupied ? 'not-allowed' : 'pointer',
                                    background: occupied ? '#334155' : isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                                    color: occupied ? '#64748b' : isSelected ? '#ffffff' : '#e2e8f0',
                                    boxShadow: isSelected ? '0 0 8px #10b981' : 'none'
                                  }}
                                  title={`Row ${rSpec.rowChar} Seat ${num}`}
                                >
                                  {num}
                                </button>
                              );
                            })}
                          </div>

                          {/* Right Block */}
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {rSpec.right.map((num) => {
                              const seatObj = currentZone.seats?.find(s => s.label === `${rSpec.rowChar}${num}`);
                              const seatId = seatObj?.id || `${rSpec.rowChar}${num}`;
                              const occupied = isOccupied(seatId);
                              const isSelected = selectedSeats.some((s) => s.id === seatId);

                              return (
                                <button
                                  key={num}
                                  disabled={occupied}
                                  onClick={() => handleSeatClick(seatId, `${rSpec.rowChar}${num}`, currentZone.price)}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: occupied ? 'not-allowed' : 'pointer',
                                    background: occupied ? '#334155' : isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                                    color: occupied ? '#64748b' : isSelected ? '#ffffff' : '#e2e8f0',
                                    boxShadow: isSelected ? '0 0 8px #10b981' : 'none'
                                  }}
                                  title={`Row ${rSpec.rowChar} Seat ${num}`}
                                >
                                  {num}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', width: '20px', textAlign: 'left' }}>
                        {rSpec.rowChar}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Standard Grid Fallback
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {Array.from({ length: currentZone.rows || 5 }).map((_, rIdx) => {
                  const rowLetter = String.fromCharCode(65 + rIdx);
                  return (
                    <div key={rowLetter} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', width: '20px' }}>{rowLetter}</span>
                      {Array.from({ length: currentZone.cols || 10 }).map((_, cIdx) => {
                        const seatNumber = cIdx + 1;
                        const seatLabel = `${rowLetter}${seatNumber}`;
                        const seatObj = currentZone.seats?.find(s => s.label === seatLabel);
                        const seatId = seatObj?.id || `${currentZone.zone}-${seatLabel}`;
                        const occupied = isOccupied(seatId);
                        const isSelected = selectedSeats.some((s) => s.id === seatId);

                        return (
                          <button
                            key={seatLabel}
                            disabled={occupied}
                            onClick={() => handleSeatClick(seatId, seatLabel, currentZone.price)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              border: 'none',
                              cursor: occupied ? 'not-allowed' : 'pointer',
                              background: occupied ? '#334155' : isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                              color: occupied ? '#64748b' : isSelected ? '#ffffff' : '#e2e8f0'
                            }}
                          >
                            {seatNumber}
                          </button>
                        );
                      })}
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
            gap: '1.75rem',
            marginTop: '1.5rem',
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
          </div>
        </div>

        {/* Footer Summary & Checkout */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
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
              onClick={() => onProceedToCheckout(selectedSeats, selectedShowId)}
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
      </div>
    </div>
  );
}
