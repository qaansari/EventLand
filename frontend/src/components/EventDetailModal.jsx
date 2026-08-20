import React, { useState } from 'react';
import { X, Calendar, MapPin, Sparkles, ShieldCheck, Ticket, Layers, Grid } from 'lucide-react';

export default function EventDetailModal({ event, onClose, onProceedToBooking }) {
  // State for categorized ticket tier selection
  const [selectedTiers, setSelectedTiers] = useState({});

  const handleQuantityChange = (tierId, delta) => {
    const current = selectedTiers[tierId] || 0;
    const next = Math.max(0, current + delta);
    setSelectedTiers({ ...selectedTiers, [tierId]: next });
  };

  const getCategorizedSeatsList = () => {
    const result = [];
    event.ticketTiers?.forEach((tier) => {
      const qty = selectedTiers[tier.id] || 0;
      for (let i = 0; i < qty; i++) {
        result.push({
          id: `${tier.name} #${i + 1}`,
          zone: tier.name,
          price: tier.price
        });
      }
    });
    return result;
  };

  const selectedCategorizedCount = Object.values(selectedTiers).reduce((a, b) => a + b, 0);
  const categorizedTotal = event.ticketTiers?.reduce((sum, tier) => {
    return sum + (selectedTiers[tier.id] || 0) * tier.price;
  }, 0) || 0;

  const handleCategorizedBookNow = () => {
    const seats = getCategorizedSeatsList();
    if (seats.length === 0) {
      alert('Please select at least 1 ticket quantity.');
      return;
    }
    onProceedToBooking(event, 'checkout', seats);
  };

  const handleMappedBookNow = () => {
    onProceedToBooking(event, 'seat-picker', []);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        {/* Banner Header */}
        <div style={{ position: 'relative', height: '280px', overflow: 'hidden' }}>
          <img
            src={event.banner}
            alt={event.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #0f172a 0%, rgba(15, 23, 42, 0.4) 60%, transparent 100%)'
          }} />

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(0, 0, 0, 0.6)',
              border: 'none',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(6px)'
            }}
          >
            <X size={20} />
          </button>

          {/* Badges */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            flexWrap: 'wrap'
          }}>
            <span className={`badge ${event.status === 'LIVE' ? 'badge-live' : 'badge-fast'}`}>
              {event.status}
            </span>
            <span className="badge badge-city">
              <MapPin size={12} style={{ display: 'inline', marginRight: '3px' }} /> {event.city}
            </span>
            <span style={{
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '8px',
              padding: '0.25rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              {event.ticketingType === 'mapped' ? <Grid size={13} /> : <Layers size={13} />}
              {event.ticketingType === 'mapped' ? 'Mapped Seating' : 'Categorized Passes'}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', lineHeight: 1.2 }}>
            {event.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={16} color="#3b82f6" />
              <span>{event.date} ({event.time})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={16} color="#3b82f6" />
              <span>{event.venue}</span>
            </div>
          </div>

          {/* Scarcity Alert */}
          {event.scarcityText && (
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <Sparkles size={16} /> {event.scarcityText}
            </div>
          )}

          {/* About Event */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              About This Event
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.6 }}>
              {event.description}
            </p>
            {event.organizer && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#94a3b8' }}>
                Organized by: <strong style={{ color: '#fff' }}>{event.organizer}</strong>
              </div>
            )}
          </div>

          {/* Ticketing Options Section */}
          <div style={{
            backgroundColor: '#070c18',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ticket size={18} color="#3b82f6" /> Select Ticket Options ({event.ticketingType === 'mapped' ? 'Mapped Seating' : 'Categorized Tiers'})
            </h3>

            {/* Option 1: Categorized Ticket Tiers */}
            {event.ticketingType === 'categorized' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {event.ticketTiers?.map((tier) => {
                  const qty = selectedTiers[tier.id] || 0;
                  return (
                    <div
                      key={tier.id}
                      style={{
                        backgroundColor: '#10192d',
                        border: qty > 0 ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', display: 'block' }}>
                          {tier.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {tier.description}
                        </span>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#3b82f6', display: 'block', marginTop: '0.35rem' }}>
                          PKR {tier.price.toLocaleString()}
                        </span>
                      </div>

                      {/* Quantity Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          onClick={() => handleQuantityChange(tier.id, -1)}
                          disabled={qty === 0}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: qty === 0 ? 'not-allowed' : 'pointer',
                            opacity: qty === 0 ? 0.4 : 1
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', minWidth: '20px', textAlign: 'center' }}>
                          {qty}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(tier.id, 1)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#3b82f6',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Bottom Total & Book Button for Categorized */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block' }}>Total ({selectedCategorizedCount} Tickets)</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3b82f6' }}>
                      PKR {categorizedTotal.toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={handleCategorizedBookNow}
                    disabled={selectedCategorizedCount === 0}
                    className="btn btn-primary"
                    style={{
                      padding: '0.8rem 1.8rem',
                      opacity: selectedCategorizedCount === 0 ? 0.5 : 1,
                      cursor: selectedCategorizedCount === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Ticket size={18} /> Book Tickets Now
                  </button>
                </div>
              </div>
            ) : (
              /* Option 2: Mapped Venue Seat Selection */
              <div>
                <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: '1.25rem' }}>
                  This event features an interactive visual stage & venue seat map. Click below to view available rows and pick your exact seats.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {event.seatingZones?.map((zone) => (
                    <div key={zone.zone} style={{ backgroundColor: '#10192d', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', display: 'block' }}>{zone.zone}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#3b82f6' }}>PKR {zone.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleMappedBookNow}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.9rem', fontSize: '1rem' }}
                >
                  <Grid size={18} /> Open Interactive Seat Picker & Book Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
