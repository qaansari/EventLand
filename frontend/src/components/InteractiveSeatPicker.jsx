import React, { useState } from 'react';
import { X, Ticket } from 'lucide-react';

export default function InteractiveSeatPicker({ event, onClose, onProceedToCheckout }) {
  const defaultZone = event.seatingZones?.[0] || { zone: 'VIP Stage Front', rows: 4, cols: 8, price: event.startingPrice };
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(0);
  const [selectedSeats, setSelectedSeats] = useState([]);

  const currentZone = event.seatingZones?.[selectedZoneIndex] || defaultZone;

  // Mock occupied seats deterministically
  const isOccupied = (r, c) => {
    return (r * 3 + c * 7) % 5 === 0;
  };

  const handleSeatClick = (seatId, price) => {
    if (selectedSeats.some((s) => s.id === seatId)) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seatId));
    } else {
      setSelectedSeats([...selectedSeats, { id: seatId, zone: currentZone.zone, price }]);
    }
  };

  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase' }}>
              Interactive Seating Chart
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>{event.title}</h2>
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

        {/* Zone Tabs */}
        <div style={{
          padding: '1rem 1.5rem 0.5rem',
          display: 'flex',
          gap: '0.75rem',
          overflowX: 'auto'
        }}>
          {event.seatingZones?.map((z, idx) => (
            <button
              key={z.zone}
              onClick={() => setSelectedZoneIndex(idx)}
              style={{
                backgroundColor: selectedZoneIndex === idx ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedZoneIndex === idx ? '#60a5fa' : '#94a3b8',
                border: selectedZoneIndex === idx ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.6rem 1.1rem',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              {z.zone} (PKR {z.price.toLocaleString()})
            </button>
          ))}
        </div>

        {/* Stage Graphic */}
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.05) 100%)',
            border: '2px dashed #3b82f6',
            borderRadius: '12px',
            padding: '0.75rem',
            margin: '0 auto 2rem',
            maxWidth: '500px',
            color: '#60a5fa',
            fontWeight: 800,
            letterSpacing: '0.2em',
            fontSize: '0.85rem',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.25)'
          }}>
            STAGE AREA
          </div>

          {/* Seat Grid */}
          <div style={{ display: 'inline-block', maxWidth: '100%', overflowX: 'auto' }}>
            <div className="seat-grid">
              {Array.from({ length: currentZone.rows }).map((_, rIdx) => {
                const rowLetter = String.fromCharCode(65 + rIdx);
                return (
                  <div key={rowLetter} className="seat-row">
                    <span style={{ fontSize: '0.7rem', color: '#64748b', width: '20px', alignSelf: 'center' }}>
                      {rowLetter}
                    </span>
                    {Array.from({ length: currentZone.cols }).map((_, cIdx) => {
                      const seatNumber = cIdx + 1;
                      const seatId = `${currentZone.zone}-${rowLetter}${seatNumber}`;
                      const occupied = isOccupied(rIdx, cIdx);
                      const isSelected = selectedSeats.some((s) => s.id === seatId);

                      return (
                        <button
                          key={seatId}
                          disabled={occupied}
                          onClick={() => handleSeatClick(seatId, currentZone.price)}
                          className={`seat-btn ${occupied ? 'occupied' : isSelected ? 'selected' : ''}`}
                          title={occupied ? `Seat ${rowLetter}${seatNumber} (Occupied)` : `Seat ${rowLetter}${seatNumber} - PKR ${currentZone.price}`}
                        >
                          {seatNumber}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seat Legend */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1.5rem',
            marginTop: '1.5rem',
            fontSize: '0.8rem',
            color: '#94a3b8'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)' }} /> Available
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }} /> Selected
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#334155' }} /> Occupied
            </div>
          </div>
        </div>

        {/* Footer Summary & Checkout */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid rgba(59, 130, 246, 0.15)',
          backgroundColor: '#070c18',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>
              Selected ({selectedSeats.length} Seats):
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
              {selectedSeats.length > 0 ? selectedSeats.map((s) => s.id.split('-').pop()).join(', ') : 'None'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Total Amount</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3b82f6' }}>
                PKR {totalPrice.toLocaleString()}
              </span>
            </div>

            <button
              disabled={selectedSeats.length === 0}
              onClick={() => onProceedToCheckout(selectedSeats)}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.6rem',
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
