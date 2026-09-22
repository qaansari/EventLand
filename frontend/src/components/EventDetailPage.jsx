import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar, MapPin, Sparkles, ShieldCheck, Ticket, Layers, Grid, 
  Globe, Clock, Eye, Copy, Check, Share2, Info, AlertCircle, Compass, 
  ChevronRight, ExternalLink, ShieldAlert, Heart, Users, FileText, CheckCircle2,
  Navigation, Award
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { formatEventDateRange, formatEventStartTime } from '../utils/dateUtils';
import { getEventImageUrl, getOrganizerImageUrl, eventsApi } from '../services/api';
import InteractiveSeatPicker from './InteractiveSeatPicker';
import EventLandPreloader from './EventLandPreloader';

const formatLocationString = (ev) => {
  if (!ev) return '';
  const rawParts = [
    ev.auditoriumName || ev.auditorium || ev.audiName,
    ev.venueName || ev.venue,
    ev.cityName || ev.city,
    ev.countryName || ev.country
  ];

  const cleanParts = [];
  rawParts.forEach(p => {
    if (typeof p === 'string' && p.trim().length > 0) {
      const trimmed = p.trim();
      if (!cleanParts.some(cp => cp.toLowerCase() === trimmed.toLowerCase())) {
        cleanParts.push(trimmed);
      }
    }
  });

  return cleanParts.length > 0 ? cleanParts.join(', ') : (ev.address || 'Arts Council of Pakistan, Karachi');
};

export default function EventDetailPage({ event: initialEvent, eventId, onBack, onProceedToBooking }) {
  const { showSuccess, showWarning, showError } = useToast();
  const [eventDetail, setEventDetail] = useState(initialEvent);
  const [loading, setLoading] = useState(!initialEvent && !!eventId);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'details' | 'location'

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
  }, [initialEvent?.id, eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const event = eventDetail || initialEvent;

  // Dynamic SEO Meta Tags & Schema.org JSON-LD Script Injection
  useEffect(() => {
    if (!event) return;

    const pageTitle = `${event.title} - ${event.cityName || event.city || 'Pakistan'} | Event Land`;
    document.title = pageTitle;

    // Helper to update meta tag content
    const updateMetaTag = (propertyAttr, propertyVal, contentVal) => {
      let tag = document.querySelector(`meta[${propertyAttr}="${propertyVal}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(propertyAttr, propertyVal);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', contentVal || '');
    };

    const eventBannerUrl = getEventImageUrl(event.banner);
    const eventDescription = event.description ? event.description.slice(0, 160) : `Book tickets for ${event.title} on Event Land Pakistan.`;

    updateMetaTag('name', 'description', eventDescription);
    updateMetaTag('property', 'og:title', pageTitle);
    updateMetaTag('property', 'og:description', eventDescription);
    updateMetaTag('property', 'og:image', eventBannerUrl);
    updateMetaTag('name', 'twitter:title', pageTitle);
    updateMetaTag('name', 'twitter:description', eventDescription);
    updateMetaTag('name', 'twitter:image', eventBannerUrl);

    // Schema.org Event JSON-LD Structured Data
    const scriptId = 'schema-event-jsonld';
    let scriptTag = document.getElementById(scriptId);
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": event.title,
      "description": event.description || eventDescription,
      "startDate": event.startDateUtc,
      "endDate": event.endDateUtc,
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "location": {
        "@type": "Place",
        "name": event.venueName || event.address || "Event Venue",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": event.cityName || event.city || "Karachi",
          "addressCountry": "PK"
        }
      },
      "image": [eventBannerUrl],
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "PKR",
        "lowPrice": event.startingPrice || 0,
        "offerCount": event.ticketTiers?.length || 1,
        "availability": "https://schema.org/InStock"
      },
      "organizer": {
        "@type": "Organization",
        "name": event.organizerName || event.organizer?.name || "Event Organizer",
        "url": "https://eventland.pk"
      }
    };

    scriptTag.text = JSON.stringify(schemaData);

    return () => {
      const tag = document.getElementById(scriptId);
      if (tag) tag.remove();
    };
  }, [event]);

  const handleCopyLink = () => {
    const shareableUrl = `${window.location.origin}/event/${event?.id || eventId}`;
    navigator.clipboard.writeText(shareableUrl)
      .then(() => {
        setCopied(true);
        showSuccess('Link Copied! 📋', 'Direct event link copied to clipboard. Share it with your friends.');
        setTimeout(() => setCopied(false), 3500);
      })
      .catch((err) => {
        console.error('Copy failed', err);
        showWarning('Copy Link', `Here is your link: ${shareableUrl}`);
      });
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <EventLandPreloader text="Loading Event Details & Seating..." minHeight="60vh" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '3.5rem 2rem', borderRadius: '24px' }}>
          <Ticket size={54} color="#94a3b8" style={{ margin: '0 auto 1.25rem', opacity: 0.5 }} />
          <h2 style={{ color: '#fff', fontSize: '1.6rem', marginBottom: '0.75rem', fontWeight: 800 }}>Event Listing Not Found</h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6 }}>
            The event you are looking for may have concluded, been removed, or is currently unavailable.
          </p>
          <button onClick={onBack} className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', borderRadius: '12px' }}>
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

  const fullLocation = formatLocationString(event);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullLocation)}`;

  return (
    <div className="event-detail-page animate-fade-in" style={{ padding: '2rem 1rem 6rem' }}>
      <div className="container" style={{ maxWidth: '1080px', margin: '0 auto' }}>
        
        {/* Top Control Bar: Back & Share */}
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
              padding: '0.65rem 1.2rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: '12px'
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
              padding: '0.65rem 1.35rem',
              borderRadius: '12px',
              backgroundColor: copied ? 'rgba(16, 185, 129, 0.25)' : 'rgba(13, 148, 136, 0.2)',
              border: copied ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(13, 148, 136, 0.45)',
              color: copied ? '#34d399' : '#2dd4bf',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? <Check size={18} color="#34d399" /> : <Share2 size={18} color="#2dd4bf" />}
            <span>{copied ? 'Link Copied to Clipboard!' : 'Share Event'}</span>
          </button>
        </div>

        {/* Cinematic Hero Poster Banner */}
        <div className="event-hero-container" style={{ marginBottom: '2rem' }}>
          <img
            src={getEventImageUrl(event.banner)}
            alt={event.title}
            className="event-hero-img"
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(6, 16, 23, 0.95) 0%, rgba(6, 16, 23, 0.4) 50%, transparent 100%)',
            pointerEvents: 'none'
          }} />

          {/* Floating Badges Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '22px',
            left: '24px',
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <span className={`badge ${event.status === 'LIVE' ? 'badge-live' : 'badge-fast'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.95rem', borderRadius: '8px' }}>
              <span className="pulse-dot"></span> {event.status || 'LIVE'}
            </span>
            <span className="badge badge-city" style={{ padding: '0.4rem 0.95rem', borderRadius: '8px' }}>
              <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} /> {event.cityName || event.city || 'Karachi'}
            </span>
            <span style={{
              backgroundColor: 'rgba(13, 148, 136, 0.35)',
              color: '#99f6e4',
              border: '1px solid rgba(45, 212, 191, 0.5)',
              borderRadius: '8px',
              padding: '0.4rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backdropFilter: 'blur(8px)'
            }}>
              {event.ticketingType === 'mapped' ? <Grid size={14} /> : <Layers size={14} />}
              {event.ticketingType === 'mapped' ? 'Mapped Seating Layout' : 'Categorized Passes'}
            </span>

            {event.startingPrice && (
              <span style={{
                marginLeft: 'auto',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                color: '#2dd4bf',
                border: '1px solid rgba(45, 212, 191, 0.4)',
                borderRadius: '8px',
                padding: '0.4rem 0.95rem',
                fontSize: '0.86rem',
                fontWeight: 800,
                backdropFilter: 'blur(8px)'
              }}>
                From PKR {event.startingPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Main Event Card */}
        <div className="glass-card" style={{ padding: '2.25rem', borderRadius: '24px', border: '1px solid rgba(13, 148, 136, 0.3)', marginBottom: '2.5rem' }}>
          
          {/* Event Title Header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '2.35rem', fontWeight: 900, color: '#fff', marginBottom: '0.6rem', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              {event.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                Presented by <strong style={{ color: '#2dd4bf' }}>{organizerDisplayName}</strong>
              </span>
              {event.organizer?.isVerified !== false && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontSize: '0.8rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                  <Award size={13} /> Verified Organizer
                </span>
              )}
            </div>
          </div>

          {/* Ticketwala-Inspired Key Information Capsules */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {/* Date Capsule */}
            <div className="event-stat-pill">
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={22} color="#2dd4bf" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>Date</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                  {formatEventDateRange(event.startDateUtc || event.startDate || event.date, event.endDateUtc || event.endDate)}
                </span>
              </div>
            </div>

            {/* Time Capsule */}
            <div className="event-stat-pill">
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={22} color="#2dd4bf" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>Show Time</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                  {formatEventStartTime(event.startDateUtc || event.startDate, event.time)}
                </span>
              </div>
            </div>

            {/* Venue Location Capsule (Spanning 2 columns on wide screens) */}
            <div className="event-stat-pill" style={{ gridColumn: '1 / -1' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={22} color="#2dd4bf" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>Venue Location</span>
                <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', wordBreak: 'break-word' }}>
                  {fullLocation}
                </span>
              </div>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#2dd4bf',
                  background: 'rgba(13, 148, 136, 0.18)',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(13, 148, 136, 0.35)',
                  textDecoration: 'none',
                  flexShrink: 0
                }}
              >
                <Navigation size={14} /> View Map ↗
              </a>
            </div>
          </div>

          {/* Scarcity Alert Banner */}
          {event.scarcityText && (
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#f59e0b',
              padding: '0.85rem 1.25rem',
              borderRadius: '14px',
              fontSize: '0.92rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginBottom: '2rem'
            }}>
              <Sparkles size={20} /> {event.scarcityText}
            </div>
          )}

          {/* Interactive Navigation Tabs (Ticketwala Inspired) */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '2rem',
            background: 'rgba(9, 18, 29, 0.7)',
            padding: '0.45rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`event-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
            >
              <Ticket size={18} />
              <span>Tickets & Passes</span>
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`event-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            >
              <FileText size={18} />
              <span>Event Details & Rules</span>
            </button>
            <button
              onClick={() => setActiveTab('location')}
              className={`event-tab-btn ${activeTab === 'location' ? 'active' : ''}`}
            >
              <MapPin size={18} />
              <span>Venue & Location</span>
            </button>
          </div>

          {/* ========================================================
              TAB 1: TICKETS & PASSES
             ======================================================== */}
          {activeTab === 'tickets' && (
            <div>
              {/* Show Slot Selector */}
              {effectiveShows && effectiveShows.length > 0 && (
                <div style={{
                  marginBottom: '2rem',
                  padding: '1.25rem 1.4rem',
                  background: 'rgba(11, 23, 37, 0.85)',
                  border: '1px solid rgba(13, 148, 136, 0.3)',
                  borderRadius: '18px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#2dd4bf', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={18} color="#2dd4bf" /> Select Show Performance Slot ({effectiveShows.length} Available):
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>PKT (Pakistan Standard Time)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                    {effectiveShows.map((show) => {
                      const isSelected = (selectedShowId === show.id || (!selectedShowId && show.id === effectiveShows[0]?.id));
                      return (
                        <div
                          key={show.id}
                          onClick={() => { setSelectedShowId(show.id); setSelectedTiers({}); }}
                          style={{
                            padding: '0.9rem 1.15rem',
                            borderRadius: '14px',
                            border: isSelected ? '1.5px solid #0d9488' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isSelected ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.28) 0%, rgba(11, 23, 37, 0.9) 100%)' : 'rgba(15, 29, 46, 0.6)',
                            color: isSelected ? '#fff' : '#cbd5e1',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                            boxShadow: isSelected ? '0 0 16px rgba(13, 148, 136, 0.3)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong style={{ color: isSelected ? '#2dd4bf' : '#fff', fontSize: '0.92rem' }}>
                              {show.showTitle || `Performance Slot #${show.id}`}
                            </strong>
                            {isSelected && <CheckCircle2 size={16} color="#2dd4bf" />}
                          </div>
                          {show.startTimeUtc && (
                            <span style={{ fontSize: '0.82rem', color: isSelected ? '#99f6e4' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Clock size={13} />
                              {new Date(show.startTimeUtc).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Karachi' })} • {new Date(show.startTimeUtc).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' })} PKT
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Categorized Passes Mode */}
              {event.ticketingType === 'categorized' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Ticket size={22} color="#0d9488" /> Available Ticket Tiers
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Select quantity per tier</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    {displayTiers.length === 0 ? (
                      <div style={{ padding: '2.5rem', textAlign: 'center', background: 'rgba(11, 23, 37, 0.6)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.15)' }}>
                        <Ticket size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                        <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.4rem' }}>No Active Ticket Tiers</h4>
                        <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Ticket categories for this show slot will open soon. Please check back shortly.</p>
                      </div>
                    ) : (
                      displayTiers.map((tier) => {
                        const qty = selectedTiers[tier.id] || 0;
                        const isSoldOut = tier.availableQuantity !== null && tier.availableQuantity !== undefined && tier.availableQuantity <= 0;

                        return (
                          <div
                            key={tier.id}
                            className={`ticket-tier-card ${qty > 0 ? 'selected' : ''}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '1.25rem',
                              opacity: isSoldOut ? 0.6 : 1
                            }}
                          >
                            <div style={{ flex: 1, minWidth: '240px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                                  {tier.name}
                                </h4>
                                {isSoldOut ? (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                                    SOLD OUT
                                  </span>
                                ) : tier.availableQuantity && tier.availableQuantity < 20 ? (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                                    Only {tier.availableQuantity} Left!
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                                    Available
                                  </span>
                                )}
                              </div>

                              <p style={{ fontSize: '0.86rem', color: '#94a3b8', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                                {tier.description || 'Standard unreserved admission ticket for the performance.'}
                              </p>

                              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2dd4bf' }}>
                                PKR {tier.price.toLocaleString()}
                                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500, marginLeft: '0.35rem' }}>/ ticket</span>
                              </div>
                            </div>

                            {/* Quantity Stepper */}
                            {!isSoldOut ? (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: 'rgba(6, 14, 23, 0.8)',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '14px',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}>
                                <button
                                  onClick={() => handleQuantityChange(tier.id, -1)}
                                  disabled={qty === 0}
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    border: 'none',
                                    color: '#fff',
                                    fontWeight: 800,
                                    fontSize: '1.2rem',
                                    cursor: qty === 0 ? 'not-allowed' : 'pointer',
                                    opacity: qty === 0 ? 0.35 : 1,
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  -
                                </button>
                                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', minWidth: '30px', textAlign: 'center' }}>
                                  {qty}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(tier.id, 1)}
                                  disabled={tier.maxPerOrder && qty >= tier.maxPerOrder}
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    backgroundColor: '#0d9488',
                                    border: 'none',
                                    color: '#fff',
                                    fontWeight: 800,
                                    fontSize: '1.2rem',
                                    cursor: (tier.maxPerOrder && qty >= tier.maxPerOrder) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button disabled style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', color: '#64748b', border: 'none', fontWeight: 700, cursor: 'not-allowed' }}>
                                Unavailable
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Summary & Checkout Action Box */}
                  <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    borderRadius: '18px',
                    background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.18) 0%, rgba(6, 16, 23, 0.9) 100%)',
                    border: '1px solid rgba(13, 148, 136, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1.25rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                        Selected Tickets ({selectedCategorizedCount})
                      </span>
                      <span style={{ fontSize: '1.65rem', fontWeight: 900, color: '#2dd4bf' }}>
                        PKR {categorizedTotal.toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={handleCategorizedBookNow}
                      disabled={selectedCategorizedCount === 0}
                      className="btn btn-primary"
                      style={{
                        padding: '0.9rem 2.25rem',
                        fontSize: '1rem',
                        fontWeight: 800,
                        borderRadius: '14px',
                        opacity: selectedCategorizedCount === 0 ? 0.5 : 1,
                        cursor: selectedCategorizedCount === 0 ? 'not-allowed' : 'pointer',
                        boxShadow: selectedCategorizedCount > 0 ? '0 0 25px rgba(13, 148, 136, 0.45)' : 'none'
                      }}
                    >
                      <Ticket size={20} /> Book Tickets Now
                    </button>
                  </div>
                </div>
              ) : (
                /* Mapped Seating Mode */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Grid size={22} color="#0d9488" /> Interactive Auditorium Seating
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
                        Choose your exact seats from the real-time auditorium map
                      </p>
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2dd4bf', background: 'rgba(13, 148, 136, 0.2)', padding: '0.4rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(13, 148, 136, 0.4)' }}>
                      Starting from PKR {(activeShow?.startingPrice || activeShow?.ticketTiers?.[0]?.price || event.startingPrice || 2500).toLocaleString()}
                    </span>
                  </div>

                  {/* Seating Zones Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    {(event.seatingZones && event.seatingZones.length > 0 ? event.seatingZones : [{ zone: event.venue || 'Auditorium Main Hall', price: activeShow?.startingPrice || event.startingPrice || 2500 }]).map((zone, zIdx) => (
                      <div key={zone.zone || zIdx} style={{ backgroundColor: 'rgba(11, 23, 37, 0.85)', padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', display: 'block', marginBottom: '0.35rem' }}>{zone.zone}</span>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0d9488' }}>PKR {(activeShow?.startingPrice || zone.price || event.startingPrice || 2500).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setShowLayoutPreview(true)}
                      style={{ flex: '1 1 240px', padding: '0.95rem', background: 'rgba(13, 148, 136, 0.18)', border: '1px solid rgba(13, 148, 136, 0.45)', borderRadius: '14px', color: '#2dd4bf', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', transition: 'all 0.2s ease' }}
                    >
                      <Eye size={18} /> View Auditorium Blueprint
                    </button>
                    <button
                      onClick={handleMappedBookNow}
                      className="btn btn-primary"
                      style={{ flex: '1.5 1 280px', padding: '0.95rem', fontSize: '1rem', fontWeight: 800, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', boxShadow: '0 0 25px rgba(13, 148, 136, 0.4)' }}
                    >
                      <Grid size={18} /> Open Seat Picker & Book Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 2: EVENT DETAILS & RULES (Ticketwala Inspired)
             ======================================================== */}
          {activeTab === 'details' && (
            <div>
              {/* Event Description */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={20} color="#0d9488" /> About The Event
                </h3>
                <div style={{
                  color: '#cbd5e1',
                  fontSize: '0.98rem',
                  lineHeight: 1.7,
                  background: 'rgba(11, 23, 37, 0.65)',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  whiteSpace: 'pre-line'
                }}>
                  {event.description || `Join us for an extraordinary live performance of "${event.title}". Featuring top theater artists, unforgettable comedy sketches, and world-class production.`}
                </div>
              </div>

              {/* Event House Rules & Guidelines (Ticketwala Style) */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={20} color="#0d9488" /> House Rules & Important Guidelines
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem'
                }}>
                  <div className="rule-card">
                    <Ticket size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.92rem', display: 'block', marginBottom: '0.2rem' }}>Strictly Non-Refundable</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.4, display: 'block' }}>
                        Tickets are date and slot specific. No exchange or refunds permitted once issued.
                      </span>
                    </div>
                  </div>

                  <div className="rule-card">
                    <Clock size={22} color="#2dd4bf" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.92rem', display: 'block', marginBottom: '0.2rem' }}>Gate Closure Timings</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.4, display: 'block' }}>
                        Auditorium doors close 15 minutes before the performance begins. Latecomers will not be admitted.
                      </span>
                    </div>
                  </div>

                  <div className="rule-card">
                    <ShieldCheck size={22} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.92rem', display: 'block', marginBottom: '0.2rem' }}>Age Restrictions</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.4, display: 'block' }}>
                        Family-friendly theatrical play. Children under 12 must be accompanied by a ticket-holding guardian.
                      </span>
                    </div>
                  </div>

                  <div className="rule-card">
                    <AlertCircle size={22} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.92rem', display: 'block', marginBottom: '0.2rem' }}>No Flash Photography</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.4, display: 'block' }}>
                        Flash photography and unauthorized audio/video recording are strictly prohibited inside the auditorium.
                      </span>
                    </div>
                  </div>

                  <div className="rule-card">
                    <Sparkles size={22} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.92rem', display: 'block', marginBottom: '0.2rem' }}>Food & Beverage Policy</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.4, display: 'block' }}>
                        Outside food and beverages are not permitted inside the hall. Refreshments available in the lobby.
                      </span>
                    </div>
                  </div>

                  <div className="rule-card">
                    <Compass size={22} color="#0d9488" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.92rem', display: 'block', marginBottom: '0.2rem' }}>Accessibility</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.4, display: 'block' }}>
                        Auditorium is wheelchair accessible. Our ground staff is available to assist special guests.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organizer Spotlight */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} color="#0d9488" /> Organizer Profile
                </h3>
                <div style={{
                  backgroundColor: 'rgba(11, 23, 37, 0.75)',
                  border: '1px solid rgba(13, 148, 136, 0.3)',
                  borderRadius: '18px',
                  padding: '1.35rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img
                      src={organizerLogoUrl}
                      alt={organizerDisplayName}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0d9488' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>{organizerDisplayName}</h4>
                        <Award size={15} color="#10b981" />
                      </div>
                      <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Official Event Organizer on Event Land</span>
                    </div>
                  </div>

                  {organizerWebsiteUrl && (
                    <a
                      href={organizerWebsiteUrl.startsWith('http') ? organizerWebsiteUrl : `https://${organizerWebsiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                    >
                      <Globe size={15} /> Official Website ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: VENUE & LOCATION (Ticketwala Inspired)
             ======================================================== */}
          {activeTab === 'location' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={22} color="#0d9488" /> Venue & Getting There
                </h3>

                <div style={{
                  background: 'rgba(11, 23, 37, 0.75)',
                  border: '1px solid rgba(13, 148, 136, 0.3)',
                  borderRadius: '18px',
                  padding: '1.75rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, display: 'block', marginBottom: '0.3rem' }}>
                        Official Venue
                      </span>
                      <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem' }}>
                        {event.venueName || event.venue || 'Arts Council of Pakistan'}
                      </h4>
                      {event.auditoriumName && (
                        <div style={{ fontSize: '0.95rem', color: '#99f6e4', marginBottom: '0.35rem' }}>
                          📍 Hall: <strong>{event.auditoriumName}</strong>
                        </div>
                      )}
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                        {fullLocation}
                      </p>
                    </div>

                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Navigation size={16} /> Open in Google Maps ↗
                    </a>
                  </div>

                  {/* Venue Facilities */}
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#cbd5e1', fontSize: '0.88rem' }}>
                      <CheckCircle2 size={16} color="#2dd4bf" /> On-Site Secure Parking
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#cbd5e1', fontSize: '0.88rem' }}>
                      <CheckCircle2 size={16} color="#2dd4bf" /> Climate Controlled Central AC
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#cbd5e1', fontSize: '0.88rem' }}>
                      <CheckCircle2 size={16} color="#2dd4bf" /> Professional Acoustic Hall
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#cbd5e1', fontSize: '0.88rem' }}>
                      <CheckCircle2 size={16} color="#2dd4bf" /> Wheelchair Ramp & Elevators
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Floating Sticky Checkout Bar when tickets selected */}
      {selectedCategorizedCount > 0 && (
        <div className="sticky-checkout-bar">
          <div className="container" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block' }}>
                Selected ({selectedCategorizedCount} Passes) • {activeShow?.showTitle || 'Selected Slot'}
              </span>
              <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#2dd4bf' }}>
                PKR {categorizedTotal.toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleCategorizedBookNow}
              className="btn btn-primary"
              style={{
                padding: '0.85rem 2rem',
                fontSize: '0.98rem',
                fontWeight: 800,
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                boxShadow: '0 0 25px rgba(13, 148, 136, 0.5)'
              }}
            >
              <Ticket size={18} /> Proceed to Checkout
            </button>
          </div>
        </div>
      )}

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
