import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Sparkles, ShieldCheck, Ticket, Layers, Grid, Globe, Clock, Eye } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { formatEventDateRange, formatEventStartTime } from '../utils/dateUtils';
import { getEventImageUrl, getOrganizerImageUrl, eventsApi } from '../services/api';
import InteractiveSeatPicker from './InteractiveSeatPicker';

export default function EventDetailModal({ event: initialEvent, onClose, onProceedToBooking }) {
  const { showWarning } = useToast();
  const [eventDetail, setEventDetail] = useState(initialEvent);
  const [selectedShowId, setSelectedShowId] = useState(initialEvent?.shows?.[0]?.id || null);
  const [selectedTiers, setSelectedTiers] = useState({});
  const [showLayoutPreview, setShowLayoutPreview] = useState(false);

  useEffect(() => {
    if (initialEvent?.id) {
      eventsApi.getEventById(initialEvent.id)
        .then(data => {
          if (data) {
            setEventDetail(data);
            if (data.shows && data.shows.length > 0) {
              setSelectedShowId(prev => prev || data.shows[0].id);
            }
          }
        })
        .catch(err => console.error('Failed to load fresh event details:', err));
    }
  }, [initialEvent?.id]);

  const event = eventDetail || initialEvent;
  const effectiveShows = (event.shows && event.shows.length > 0)
    ? event.shows
    : [{
        id: event.id,
        showTitle: 'Standard Performance',
        startTimeUtc: event.startDateUtc || event.startDate,
        endTimeUtc: event.endDateUtc || event.endDate
      }];

  const activeShow = effectiveShows.find(s => s.id === selectedShowId) || effectiveShows[0];
  const displayTiers = (activeShow?.ticketTiers && activeShow.ticketTiers.length > 0)
    ? activeShow.ticketTiers
    : (event.ticketTiers || []);

  const handleQuantityChange = (tierId, delta) => {
    const current = selectedTiers[tierId] || 0;
    const next = Math.max(0, current + delta);
    setSelectedTiers({ ...selectedTiers, [tierId]: next });
  };

  const getCategorizedSeatsList = () => {
    const result = [];
    displayTiers.forEach((tier) => {
      const qty = selectedTiers[tier.id] || 0;
      for (let i = 0; i < qty; i++) {
        result.push({
          id: `${tier.name} #${i + 1}`,
          tierId: tier.id,
          tierName: tier.name,
          zone: tier.name,
          price: tier.price,
          showTitle: activeShow?.showTitle || null
        });
      }
    });
    return result;
  };

  const selectedCategorizedCount = Object.values(selectedTiers).reduce((a, b) => a + b, 0);
  const categorizedTotal = displayTiers.reduce((sum, tier) => {
    return sum + (selectedTiers[tier.id] || 0) * tier.price;
  }, 0) || 0;

  const handleCategorizedBookNow = () => {
    const seats = getCategorizedSeatsList();
    if (seats.length === 0) {
      showWarning('Ticket Quantity Required', 'Please select at least 1 ticket quantity.');
      return;
    }
    const updatedEvent = activeShow ? { ...event, selectedShow: activeShow } : event;
    onProceedToBooking(updatedEvent, 'checkout', seats);
  };

  const handleMappedBookNow = () => {
    const updatedEvent = activeShow ? { ...event, selectedShow: activeShow } : event;
    onProceedToBooking(updatedEvent, 'seat-picker', []);
  };

  const organizerWebsiteUrl = (typeof event.organizer === 'object' 
    ? event.organizer?.websiteUrl 
    : (event.organizerWebsite || event.websiteUrl)) || 'https://www.eventland.pk';

  const organizerDisplayName = (typeof event.organizer === 'object'
    ? event.organizer?.name
    : event.organizer) || 'Event Land';

  const rawLogo = typeof event.organizer === 'object' ? event.organizer?.logoUrl : null;
  const organizerLogoUrl = getOrganizerImageUrl(rawLogo) || '/assets/images/organizers/org_eventland_01.png';

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        {/* Banner Header */}
        <div style={{ position: 'relative', height: '280px', overflow: 'hidden' }}>
          <img
            src={getEventImageUrl(event.banner)}
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
            <span className={`badge ${event.status === 'LIVE' ? 'badge-live' : 'badge-fast'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="pulse-dot"></span> {event.status}
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

          {/* Date, Time & Location Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', color: '#cbd5e1', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#f8fafc', fontWeight: 600 }}>
              <Calendar size={18} color="#3b82f6" />
              <span>{formatEventDateRange(event.startDateUtc || event.startDate || event.date, event.endDateUtc || event.endDate)}</span>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#93c5fd',
              padding: '0.25rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.825rem',
              fontWeight: 600,
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <Clock size={14} color="#60a5fa" />
              <span>{formatEventStartTime(event.startDateUtc || event.startDate, event.time)}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#94a3b8' }}>
              <MapPin size={18} color="#3b82f6" />
              <span>{event.city ? `${event.city} • ${event.venue}` : event.venue}</span>
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

          {/* Multi-Show Quick Badges Banner */}
          {effectiveShows && effectiveShows.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '0.85rem 1.1rem',
              borderRadius: '12px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={15} color="#60a5fa" /> Available Event Shows ({effectiveShows.length} Slot{effectiveShows.length > 1 ? 's' : ''} - PKT):
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {effectiveShows.map(s => (
                  <span key={s.id} style={{
                    fontSize: '0.78rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#e2e8f0',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <strong style={{ color: '#38bdf8' }}>{s.showTitle}</strong>
                    {s.startTimeUtc && (
                      <span style={{ color: '#94a3b8' }}>
                        ({new Date(s.startTimeUtc).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' })} PKT)
                      </span>
                    )}
                  </span>
                ))}
              </div>
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
            {organizerDisplayName && (
              <div style={{
                marginTop: '1rem',
                padding: '0.85rem 1.1rem',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {organizerLogoUrl && (
                    <img 
                      src={organizerLogoUrl} 
                      alt={organizerDisplayName} 
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} 
                    />
                  )}
                  <span>Organized by:</span>
                  <strong style={{ color: '#f8fafc', fontSize: '0.925rem' }}>
                    {organizerDisplayName}
                  </strong>
                </div>

                {organizerWebsiteUrl && (
                  <a
                    href={organizerWebsiteUrl.startsWith('http') ? organizerWebsiteUrl : `https://${organizerWebsiteUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: '#60a5fa',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      padding: '0.4rem 0.85rem',
                      background: 'rgba(59, 130, 246, 0.15)',
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Globe size={14} /> Visit Official Website ↗
                  </a>
                )}
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

            {/* Show Slot Selector */}
            {effectiveShows && effectiveShows.length > 0 && (
              <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(16, 25, 45, 0.8)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.6rem' }}>
                  Select Show Timing / Slot:
                </label>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {effectiveShows.map((show) => {
                    const isSelected = (selectedShowId === show.id || (!selectedShowId && show.id === effectiveShows[0]?.id));
                    return (
                      <button
                        key={show.id}
                        onClick={() => { setSelectedShowId(show.id); setSelectedTiers({}); }}
                        style={{
                          padding: '0.55rem 0.95rem',
                          borderRadius: '10px',
                          border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                          background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                          color: isSelected ? '#fff' : '#cbd5e1',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: isSelected ? '0 0 12px rgba(59, 130, 246, 0.3)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Clock size={14} color={isSelected ? '#60a5fa' : '#94a3b8'} />
                        <span>{show.showTitle || `Show #${show.id}`}</span>
                        {show.startTimeUtc && (
                          <span style={{ fontSize: '0.75rem', color: isSelected ? '#38bdf8' : '#94a3b8', marginLeft: '0.25rem' }}>
                            ({new Date(show.startTimeUtc).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' })} PKT)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Option 1: Categorized Ticket Tiers */}
            {event.ticketingType === 'categorized' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {displayTiers.map((tier) => {
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.88rem', color: '#cbd5e1', margin: 0 }}>
                    Selected Show Slot: <strong style={{ color: '#38bdf8' }}>{activeShow?.showTitle || 'Standard Performance'}</strong>
                  </p>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    Starting from PKR {(activeShow?.startingPrice || activeShow?.ticketTiers?.[0]?.price || event.startingPrice || 2500).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {(event.seatingZones && event.seatingZones.length > 0 ? event.seatingZones : [{ zone: event.venue || 'Auditorium Main Hall', price: activeShow?.startingPrice || event.startingPrice || 2500 }]).map((zone, zIdx) => (
                    <div key={zone.zone || zIdx} style={{ backgroundColor: '#10192d', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', display: 'block' }}>{zone.zone}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#3b82f6' }}>PKR {(activeShow?.startingPrice || zone.price || event.startingPrice || 2500).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => setShowLayoutPreview(true)}
                    style={{ flex: 1, padding: '0.85rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '10px', color: '#60a5fa', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Eye size={18} /> View Auditorium Layout Blueprint
                  </button>
                  <button
                    onClick={handleMappedBookNow}
                    className="btn btn-primary"
                    style={{ flex: 1.5, padding: '0.85rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Grid size={18} /> Open Seat Picker & Book Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auditorium Layout Blueprint Preview Overlay */}
      {showLayoutPreview && (
        <InteractiveSeatPicker
          isPreview={true}
          event={event}
          onClose={() => setShowLayoutPreview(false)}
        />
      )}
    </div>
  );
}
