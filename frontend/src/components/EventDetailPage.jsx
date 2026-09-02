import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar, MapPin, Sparkles, ShieldCheck, Ticket, Layers, Grid, 
  Globe, Clock, Eye, Copy, Check, Share2 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { formatEventDateRange, formatEventStartTime } from '../utils/dateUtils';
import { getEventImageUrl, getOrganizerImageUrl, eventsApi } from '../services/api';
import InteractiveSeatPicker from './InteractiveSeatPicker';

export default function EventDetailPage({ event: initialEvent, eventId, onBack, onProceedToBooking }) {
  const { showSuccess, showWarning, showError } = useToast();
  const [eventDetail, setEventDetail] = useState(initialEvent);
  const [loading, setLoading] = useState(!initialEvent && !!eventId);
  const [copied, setCopied] = useState(false);

  const [selectedShowId, setSelectedShowId] = useState(initialEvent?.shows?.[0]?.id || null);
  const [selectedTiers, setSelectedTiers] = useState({});
  const [showLayoutPreview, setShowLayoutPreview] = useState(false);

  // Fetch full details if eventId passed or to ensure fresh data
  useEffect(() => {
    const targetId = initialEvent?.id || eventId;
    if (targetId) {
      if (!initialEvent) setLoading(true);
      eventsApi.getEventById(targetId)
        .then(data => {
          if (data) {
            setEventDetail(data);
            if (data.shows && data.shows.length > 0) {
              setSelectedShowId(prev => prev || data.shows[0].id);
            }
          }
        })
        .catch(err => {
          console.error('Failed to load event details:', err);
          showError('Event Not Found', 'Could not load the requested event details.');
        })
        .finally(() => setLoading(false));
    }
  }, [initialEvent?.id, eventId]);

  const event = eventDetail || initialEvent;

  const handleCopyLink = () => {
    const shareableUrl = `${window.location.origin}/event/${event?.id || eventId}`;
    navigator.clipboard.writeText(shareableUrl)
      .then(() => {
        setCopied(true);
        showSuccess('Link Copied! 📋', 'Direct event link copied to clipboard. Share it with your organizer or friends.');
        setTimeout(() => setCopied(false), 3500);
      })
      .catch((err) => {
        console.error('Copy failed', err);
        showWarning('Copy Link', `Here is your link: ${shareableUrl}`);
      });
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '5rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 1.5rem' }}></div>
        <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>Loading Event Details...</h3>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container" style={{ padding: '5rem 1.5rem', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 2rem' }}>
          <Ticket size={48} color="#94a3b8" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.75rem' }}>Event Listing Not Found</h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
            The event you are looking for may have been removed or is no longer available.
          </p>
          <button onClick={onBack} className="btn btn-primary">
            <ArrowLeft size={16} /> Back to Events
          </button>
        </div>
      </div>
    );
  }

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
    <div className="event-detail-page animate-fade-in" style={{ padding: '2rem 1rem 4rem' }}>
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Top Control Bar: Back & Copy Link */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <button
            onClick={onBack}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.1rem',
              fontSize: '0.9rem',
              fontWeight: 700
            }}
          >
            <ArrowLeft size={18} /> Back to Events
          </button>

          {/* Copy Event Link Button */}
          <button
            onClick={handleCopyLink}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(13, 148, 136, 0.2)',
              border: copied ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(13, 148, 136, 0.4)',
              color: copied ? '#34d399' : '#2dd4bf',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? <Check size={18} color="#34d399" /> : <Copy size={18} color="#2dd4bf" />}
            <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Shareable Event Link'}</span>
          </button>
        </div>

        {/* Main Event Details Container Card */}
        <div className="glass-card" style={{ overflow: 'hidden', padding: 0, borderRadius: '20px', border: '1px solid rgba(13, 148, 136, 0.3)' }}>
          
          {/* Hero Banner Header */}
          <div style={{ position: 'relative', height: '360px', width: '100%', overflow: 'hidden' }}>
            <img
              src={getEventImageUrl(event.banner)}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, #0b1328 0%, rgba(11, 19, 40, 0.5) 60%, transparent 100%)'
            }} />

            {/* Badges Overlay */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '24px',
              right: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <span className={`badge ${event.status === 'LIVE' ? 'badge-live' : 'badge-fast'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem' }}>
                <span className="pulse-dot"></span> {event.status}
              </span>
              <span className="badge badge-city" style={{ padding: '0.35rem 0.85rem' }}>
                <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} /> {event.city}
              </span>
              <span style={{
                backgroundColor: 'rgba(13, 148, 136, 0.25)',
                color: '#2dd4bf',
                border: '1px solid rgba(13, 148, 136, 0.5)',
                borderRadius: '8px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backdropFilter: 'blur(6px)'
              }}>
                {event.ticketingType === 'mapped' ? <Grid size={14} /> : <Layers size={14} />}
                {event.ticketingType === 'mapped' ? 'Mapped Seating Layout' : 'Categorized Passes'}
              </span>
            </div>
          </div>

          {/* Main Body */}
          <div style={{ padding: '2rem 2.25rem' }}>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem', lineHeight: 1.25 }}>
              {event.title}
            </h1>

            {/* Date, Time & Location Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', color: '#cbd5e1', fontSize: '0.98rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc', fontWeight: 600 }}>
                <Calendar size={20} color="#0d9488" />
                <span>{formatEventDateRange(event.startDateUtc || event.startDate || event.date, event.endDateUtc || event.endDate)}</span>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(13, 148, 136, 0.15)',
                color: '#99f6e4',
                padding: '0.3rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                border: '1px solid rgba(13, 148, 136, 0.3)'
              }}>
                <Clock size={16} color="#2dd4bf" />
                <span>{formatEventStartTime(event.startDateUtc || event.startDate, event.time)}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                <MapPin size={20} color="#0d9488" />
                <span>{event.city ? `${event.city} • ${event.venue}` : event.venue}</span>
              </div>
            </div>

            {/* Scarcity Alert */}
            {event.scarcityText && (
              <div style={{
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
                padding: '0.75rem 1.2rem',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '1.75rem'
              }}>
                <Sparkles size={18} /> {event.scarcityText}
              </div>
            )}

            {/* Multi-Show Quick Badges Banner */}
            {effectiveShows && effectiveShows.length > 0 && (
              <div style={{
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                padding: '1rem 1.25rem',
                borderRadius: '14px',
                marginBottom: '1.75rem'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2dd4bf', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Clock size={16} color="#2dd4bf" /> Available Event Shows ({effectiveShows.length} Slot{effectiveShows.length > 1 ? 's' : ''} - PKT):
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {effectiveShows.map(s => (
                    <span key={s.id} style={{
                      fontSize: '0.82rem',
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#e2e8f0',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      <strong style={{ color: '#2dd4bf' }}>{s.showTitle}</strong>
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
            <div style={{ marginBottom: '2.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.65rem' }}>
                About This Event
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                {event.description}
              </p>
              
              {organizerDisplayName && (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '1rem 1.25rem',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(13, 148, 136, 0.25)',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.85rem'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {organizerLogoUrl && (
                      <img 
                        src={organizerLogoUrl} 
                        alt={organizerDisplayName} 
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(45, 212, 191, 0.4)' }} 
                      />
                    )}
                    <span>Organized by:</span>
                    <strong style={{ color: '#f8fafc', fontSize: '0.98rem' }}>
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
                        gap: '0.45rem',
                        color: '#2dd4bf',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        padding: '0.45rem 0.95rem',
                        background: 'rgba(13, 148, 136, 0.15)',
                        borderRadius: '8px',
                        border: '1px solid rgba(13, 148, 136, 0.35)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Globe size={15} /> Visit Official Website ↗
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Ticketing Options Section */}
            <div style={{
              backgroundColor: '#070c18',
              border: '1px solid rgba(13, 148, 136, 0.3)',
              borderRadius: '18px',
              padding: '1.75rem'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Ticket size={20} color="#0d9488" /> Select Ticket Options ({event.ticketingType === 'mapped' ? 'Mapped Seating' : 'Categorized Tiers'})
              </h3>

              {/* Show Slot Selector */}
              {effectiveShows && effectiveShows.length > 0 && (
                <div style={{ marginBottom: '1.5rem', padding: '1.1rem', background: 'rgba(16, 25, 45, 0.85)', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '14px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.75rem' }}>
                    Select Show Timing / Slot:
                  </label>
                  <div className="detail-show-selector" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {effectiveShows.map((show) => {
                      const isSelected = (selectedShowId === show.id || (!selectedShowId && show.id === effectiveShows[0]?.id));
                      return (
                        <button
                          key={show.id}
                          onClick={() => { setSelectedShowId(show.id); setSelectedTiers({}); }}
                          style={{
                            padding: '0.65rem 1.15rem',
                            borderRadius: '10px',
                            border: isSelected ? '1px solid #0d9488' : '1px solid rgba(255, 255, 255, 0.1)',
                            background: isSelected ? 'rgba(13, 148, 136, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                            color: isSelected ? '#fff' : '#cbd5e1',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            boxShadow: isSelected ? '0 0 14px rgba(13, 148, 136, 0.35)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Clock size={15} color={isSelected ? '#2dd4bf' : '#94a3b8'} />
                          <span>{show.showTitle || `Show #${show.id}`}</span>
                          {show.startTimeUtc && (
                            <span style={{ fontSize: '0.78rem', color: isSelected ? '#2dd4bf' : '#94a3b8', marginLeft: '0.25rem' }}>
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
                <div className="detail-modal-tiers" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {displayTiers.map((tier) => {
                    const qty = selectedTiers[tier.id] || 0;
                    return (
                      <div
                        key={tier.id}
                        style={{
                          backgroundColor: '#10192d',
                          border: qty > 0 ? '1px solid #0d9488' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '14px',
                          padding: '1.15rem 1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.85rem'
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'block' }}>
                            {tier.name}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                            {tier.description}
                          </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d9488', display: 'block', marginTop: '0.4rem' }}>
                            PKR {tier.price.toLocaleString()}
                          </span>
                        </div>

                        {/* Quantity Stepper */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <button
                            onClick={() => handleQuantityChange(tier.id, -1)}
                            disabled={qty === 0}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '1.1rem',
                              cursor: qty === 0 ? 'not-allowed' : 'pointer',
                              opacity: qty === 0 ? 0.4 : 1
                            }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', minWidth: '24px', textAlign: 'center' }}>
                            {qty}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(tier.id, 1)}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              backgroundColor: '#0d9488',
                              border: 'none',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '1.1rem',
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
                  <div className="detail-actions-row" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1.25rem',
                    paddingTop: '1.25rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block' }}>Total ({selectedCategorizedCount} Tickets)</span>
                      <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0d9488' }}>
                        PKR {categorizedTotal.toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={handleCategorizedBookNow}
                      disabled={selectedCategorizedCount === 0}
                      className="btn btn-primary"
                      style={{
                        padding: '0.85rem 2rem',
                        fontSize: '0.95rem',
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.92rem', color: '#cbd5e1', margin: 0 }}>
                      Selected Show Slot: <strong style={{ color: '#2dd4bf' }}>{activeShow?.showTitle || 'Standard Performance'}</strong>
                    </p>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2dd4bf', background: 'rgba(13, 148, 136, 0.15)', padding: '0.3rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(13, 148, 136, 0.3)' }}>
                      Starting from PKR {(activeShow?.startingPrice || activeShow?.ticketTiers?.[0]?.price || event.startingPrice || 2500).toLocaleString()}
                    </span>
                  </div>

                  <div className="detail-modal-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1.75rem' }}>
                    {(event.seatingZones && event.seatingZones.length > 0 ? event.seatingZones : [{ zone: event.venue || 'Auditorium Main Hall', price: activeShow?.startingPrice || event.startingPrice || 2500 }]).map((zone, zIdx) => (
                      <div key={zone.zone || zIdx} style={{ backgroundColor: '#10192d', padding: '1rem 1.15rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'block' }}>{zone.zone}</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0d9488' }}>PKR {(activeShow?.startingPrice || zone.price || event.startingPrice || 2500).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="detail-actions-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setShowLayoutPreview(true)}
                      style={{ flex: '1 1 240px', padding: '0.9rem', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '12px', color: '#2dd4bf', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem' }}
                    >
                      <Eye size={18} /> View Auditorium Layout Blueprint
                    </button>
                    <button
                      onClick={handleMappedBookNow}
                      className="btn btn-primary"
                      style={{ flex: '1.5 1 280px', padding: '0.9rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem' }}
                    >
                      <Grid size={18} /> Open Seat Picker & Book Now
                    </button>
                  </div>
                </div>
              )}
            </div>
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
