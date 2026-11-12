import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, MapPin, Sparkles, ShieldCheck, Ticket, Layers, Grid, Tag,
  Globe, Clock, Eye, Copy, Check, Share2, Info, AlertCircle, Compass, 
  ChevronRight, ExternalLink, ShieldAlert, Heart, Users, FileText, CheckCircle2,
  Navigation, Award, Coffee, Cigarette, Car, Shirt, Maximize2, X
} from 'lucide-react';

const InstagramIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
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

  const effectiveShows = (event?.shows && event.shows.length > 0)
    ? event.shows
    : (event ? [{
        id: event.id,
        showTitle: 'Standard Performance',
        startTimeUtc: event.startDateUtc || event.startDate,
        endTimeUtc: event.endDateUtc || event.endDate
      }] : []);

  const activeShow = effectiveShows.find(s => s.id === selectedShowId) || effectiveShows[0];
  const displayTiers = useMemo(() => {
    if (!event) return [];
    const raw = (activeShow?.ticketTiers && activeShow.ticketTiers.length > 0)
      ? activeShow.ticketTiers
      : (event.ticketTiers || []);
    return [...raw].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.price || 0) - (b.price || 0));
  }, [activeShow, event]);

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
    if ((event.status || '').toUpperCase() === 'CLOSED') {
      showError('Event Closed', 'This event is closed and no longer accepting bookings.');
      return;
    }
    if (activeShow?.isClosed) {
      showError('Show Closed', `The show "${activeShow.showTitle || 'This show'}" is closed.`);
      return;
    }
    const seats = getCategorizedSeatsList();
    if (seats.length === 0) {
      showWarning('Ticket Quantity Required', 'Please select at least 1 ticket quantity.');
      return;
    }
    const updatedEvent = activeShow ? { ...event, selectedShow: activeShow } : event;
    onProceedToBooking(updatedEvent, 'checkout', seats);
  };

  const handleMappedBookNow = () => {
    if ((event.status || '').toUpperCase() === 'CLOSED') {
      showError('Event Closed', 'This event is closed and no longer accepting bookings.');
      return;
    }
    if (activeShow?.isClosed) {
      showError('Show Closed', `The show "${activeShow.showTitle || 'This show'}" is closed.`);
      return;
    }
    const updatedEvent = activeShow ? { ...event, selectedShow: activeShow } : event;
    onProceedToBooking(updatedEvent, 'seat-picker', []);
  };

  const [showSeatChartModal, setShowSeatChartModal] = useState(false);

  const orgObj = typeof event.organizer === 'object' && event.organizer !== null ? event.organizer : {};
  const organizerDisplayName = orgObj.brandName || orgObj.name || (typeof event.organizer === 'string' ? event.organizer : '') || 'Event Land';
  const organizerLegalName = orgObj.name || organizerDisplayName;
  const organizerCompanyType = orgObj.companyType || 'Individual';
  const organizerAddress = orgObj.registeredAddress || '';
  const organizerNtn = orgObj.companyNtn || '';
  const organizerInstagram = orgObj.instagramUrl || '';
  const organizerFacebook = orgObj.facebookUrl || '';
  const organizerWebsiteUrl = orgObj.websiteUrl || event.websiteUrl || 'https://www.eventland.pk';
  const organizerBio = orgObj.description || '';

  const rawLogo = orgObj.logoUrl || null;
  const organizerLogoUrl = getOrganizerImageUrl(rawLogo) || '/assets/images/organizers/org_eventland_01.png';

  const parseList = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [raw];
    }
  };

  const audienceRestrictions = parseList(event.audienceRestrictions);
  const foodRestrictions = parseList(event.foodDrinksRestrictions);
  const smokingRestrictions = parseList(event.smokingRestrictions);

  const fullLocation = formatLocationString(event);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullLocation)}`;

  return (
    <div className="event-detail-page animate-fade-in" style={{ padding: `2rem 1rem ${selectedCategorizedCount > 0 ? '7.5rem' : '4rem'}` }}>
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

        {/* Event Banner (Strictly 1200x500px, 2.4 : 1 Aspect Ratio, Zero Text Overlay) */}
        <div className="event-hero-container" style={{ aspectRatio: '1200 / 500', width: '100%', marginBottom: '1.25rem', overflow: 'hidden', borderRadius: '20px', border: '1px solid rgba(13, 148, 136, 0.35)' }}>
          <img
            src={getEventImageUrl(event.banner)}
            alt={event.title}
            className="event-hero-img"
            style={{ width: '100%', height: '100%', aspectRatio: '1200 / 500', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* Hero Metadata Badges Bar (Adjusted Below the Banner) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '2rem',
          padding: '0.75rem 1.25rem',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          backdropFilter: 'blur(10px)'
        }}>
          <span className={`badge ${event.status === 'LIVE' ? 'badge-live' : 'badge-fast'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.95rem', borderRadius: '8px' }}>
            <span className="pulse-dot"></span> {event.status || 'LIVE'}
          </span>
          <span className="badge badge-city" style={{ padding: '0.4rem 0.95rem', borderRadius: '8px' }}>
            <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} /> {event.cityName || event.city || 'Karachi'}
          </span>
          <span style={{
            backgroundColor: 'rgba(13, 148, 136, 0.2)',
            color: '#99f6e4',
            border: '1px solid rgba(45, 212, 191, 0.4)',
            borderRadius: '8px',
            padding: '0.4rem 0.95rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            {event.ticketingType === 'mapped' ? <Grid size={14} /> : <Layers size={14} />}
            {event.ticketingType === 'mapped' ? 'Mapped Seating Layout' : 'Categorized Passes'}
          </span>

          {event.startingPrice && (
            <span style={{
              marginLeft: 'auto',
              backgroundColor: 'rgba(13, 148, 136, 0.15)',
              color: '#2dd4bf',
              border: '1px solid rgba(45, 212, 191, 0.35)',
              borderRadius: '8px',
              padding: '0.4rem 0.95rem',
              fontSize: '0.86rem',
              fontWeight: 800
            }}>
              From PKR {event.startingPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* Main Event Card */}
        <div className="glass-card" style={{ padding: 'clamp(1rem, 3vw, 2.25rem)', borderRadius: '24px', border: '1px solid rgba(13, 148, 136, 0.3)', marginBottom: '2.5rem' }}>
          
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
              {((event.status || '').toUpperCase() === 'CLOSED') && (
                <div style={{
                  padding: '1.25rem 1.5rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '16px',
                  color: '#f87171',
                  marginBottom: '1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  fontSize: '0.95rem',
                  fontWeight: 600
                }}>
                  <AlertCircle size={22} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '1.05rem', display: 'block' }}>Event Closed</strong>
                    <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '0.2rem' }}>
                      This event is currently closed and is not accepting bookings.
                    </div>
                  </div>
                </div>
              )}

              {/* Show Slot Selector */}
              {effectiveShows && effectiveShows.length > 0 && (
                <div style={{
                  marginBottom: '2rem',
                  padding: 'clamp(0.85rem, 2.5vw, 1.4rem)',
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0.85rem' }}>
                    {effectiveShows.map((show) => {
                      const isSelected = (selectedShowId === show.id || (!selectedShowId && show.id === effectiveShows[0]?.id));
                      const isShowClosed = !!show.isClosed;
                      return (
                        <div
                          key={show.id}
                          onClick={() => {
                            if (isShowClosed) {
                              showWarning('Show Slot Closed', `"${show.showTitle || 'This show'}" is closed and not accepting bookings.`);
                              return;
                            }
                            setSelectedShowId(show.id);
                            setSelectedTiers({});
                          }}
                          style={{
                            padding: '0.9rem 1.15rem',
                            borderRadius: '14px',
                            border: isSelected ? '1.5px solid #0d9488' : isShowClosed ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isSelected ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.28) 0%, rgba(11, 23, 37, 0.9) 100%)' : isShowClosed ? 'rgba(30, 15, 20, 0.6)' : 'rgba(15, 29, 46, 0.6)',
                            color: isSelected ? '#fff' : isShowClosed ? '#94a3b8' : '#cbd5e1',
                            cursor: isShowClosed ? 'not-allowed' : 'pointer',
                            opacity: isShowClosed ? 0.6 : 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                            boxShadow: isSelected ? '0 0 16px rgba(13, 148, 136, 0.3)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong style={{ color: isSelected ? '#2dd4bf' : isShowClosed ? '#f87171' : '#fff', fontSize: '0.92rem' }}>
                              {show.showTitle || `Performance Slot #${show.id}`}
                            </strong>
                            {isShowClosed ? (
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                CLOSED
                              </span>
                            ) : isSelected ? (
                              <CheckCircle2 size={16} color="#2dd4bf" />
                            ) : null}
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
                        const tierStatus = (tier.status || 'Available').toUpperCase();
                        const isTierClosed = tierStatus === 'CLOSED' || !!activeShow?.isClosed || (event.status || '').toUpperCase() === 'CLOSED';
                        const isSoldOut = !isTierClosed && (tierStatus === 'SOLDOUT' || tierStatus === 'SOLD OUT' || (tier.availableQuantity !== null && tier.availableQuantity !== undefined && tier.availableQuantity <= 0));

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
                              opacity: (isTierClosed || isSoldOut) ? 0.6 : 1
                            }}
                          >
                            <div style={{ flex: 1, minWidth: '240px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                                  {tier.name}
                                </h4>
                                {isTierClosed ? (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                                    CLOSED
                                  </span>
                                ) : isSoldOut ? (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.4)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
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
                            {!isTierClosed && !isSoldOut ? (
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
                            ) : isTierClosed ? (
                              <button disabled style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 700, cursor: 'not-allowed' }}>
                                Closed
                              </button>
                            ) : (
                              <button disabled style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.12)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', fontWeight: 700, cursor: 'not-allowed' }}>
                                Sold Out
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
              TAB 2: EVENT DETAILS & RULES (Dynamically Rendered)
             ======================================================== */}
          {activeTab === 'details' && (
            <div>
              {/* Event Description & Highlights */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={20} color="#0d9488" /> About The Event
                </h3>
                
                {/* Key Spec Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', background: 'rgba(13, 148, 136, 0.15)', border: '1px solid rgba(13, 148, 136, 0.35)', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, color: '#2dd4bf' }}>
                    <Tag size={13} /> {event.eventType || 'Event'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.35)', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa' }}>
                    <Compass size={13} /> {event.venueEnvironment || 'Indoor'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, color: '#c084fc' }}>
                    <Grid size={13} /> {event.seatingArrangement || 'Seating'}
                  </span>
                  {event.dressCode && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, color: '#fbbf24' }}>
                      <Shirt size={13} /> Dress Code: {event.dressCode}
                    </span>
                  )}
                </div>

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

              {/* Attractions & Special Activities (if specified) */}
              {event.attractionsOrActivities && event.attractionsOrActivities !== 'X' && event.attractionsOrActivities !== 'x' && (
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={20} color="#fbbf24" /> Attractions & Key Activities
                  </h3>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(13, 148, 136, 0.08))',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    padding: '1.25rem 1.5rem',
                    borderRadius: '16px',
                    color: '#f8fafc',
                    fontSize: '0.95rem',
                    lineHeight: 1.6
                  }}>
                    {event.attractionsOrActivities}
                  </div>
                </div>
              )}

              {/* Uploaded Seat Chart Reference Map (if available) */}
              {event.seatChartUrl && (
                <div style={{ marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Grid size={20} color="#2dd4bf" /> Seating Blueprint & Layout
                    </h3>
                    <button
                      onClick={() => setShowSeatChartModal(true)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Maximize2 size={13} /> View Full Map
                    </button>
                  </div>
                  <div 
                    onClick={() => setShowSeatChartModal(true)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid rgba(13, 148, 136, 0.3)',
                      background: 'rgba(11, 23, 37, 0.8)',
                      maxHeight: '380px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    <img
                      src={getEventImageUrl(event.seatChartUrl)}
                      alt="Event Seating Chart"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '380px' }}
                    />
                    <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', background: 'rgba(15, 23, 42, 0.85)', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', color: '#2dd4bf', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Maximize2 size={12} /> Click to enlarge
                    </div>
                  </div>
                </div>
              )}

              {/* Amenities & Facilities */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={20} color="#0d9488" /> Amenities & Venue Facilities
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1rem'
                }}>
                  <div className="rule-card">
                    <Compass size={22} color={event.wheelchairAccessible ? '#10b981' : '#64748b'} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.92rem', display: 'block', marginBottom: '0.2rem' }}>Wheelchair Accessibility</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.4, display: 'block' }}>
                        {event.wheelchairAccessible ? 'Venue is fully wheelchair accessible with designated ramps and access.' : 'Standard venue access; please contact organizers for special assistance.'}
                      </span>
                    </div>
                  </div>

                  <div className="rule-card">
                    <Car size={22} color={event.parkingAvailable ? '#10b981' : '#64748b'} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.92rem', display: 'block', marginBottom: '0.2rem' }}>Parking & Valet</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.4, display: 'block' }}>
                        {event.valetAvailable 
                          ? 'Dedicated on-site parking and valet service available.'
                          : (event.parkingAvailable ? 'On-site vehicle parking available on first-come basis.' : 'Limited street parking available nearby.')}
                      </span>
                    </div>
                  </div>

                  <div className="rule-card">
                    <Coffee size={22} color={event.foodDrinksAvailable ? '#10b981' : '#64748b'} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.92rem', display: 'block', marginBottom: '0.2rem' }}>Food & Beverages</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.4, display: 'block' }}>
                        {event.foodDrinksAvailable 
                          ? (event.foodDrinksIncluded ? 'Complimentary food & drinks included with your ticket!' : 'Food and beverage stalls available for purchase on-site.')
                          : 'No refreshments served on-site.'}
                      </span>
                    </div>
                  </div>

                  <div className="rule-card">
                    <Heart size={22} color={event.petsAllowed ? '#10b981' : '#64748b'} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.92rem', display: 'block', marginBottom: '0.2rem' }}>Pet Policy</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.4, display: 'block' }}>
                        {event.petsAllowed ? 'Pets are warmly welcomed at this event!' : 'Pets are strictly not allowed on venue premises.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* House Rules & Policies (Restrictions & Flexibility) */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={20} color="#0d9488" /> House Rules, Restrictions & Policies
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Audience Restrictions */}
                  {audienceRestrictions.length > 0 && (
                    <div style={{ background: 'rgba(11, 23, 37, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.9rem' }}>
                        <Users size={17} /> Audience Restrictions & Entry Criteria
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {audienceRestrictions.map((item, idx) => (
                          <span key={idx} style={{ padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}>
                            • {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Food & Beverage Policy */}
                  {foodRestrictions.length > 0 && (
                    <div style={{ background: 'rgba(11, 23, 37, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem' }}>
                        <Coffee size={17} /> Food & Drink Policies
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {foodRestrictions.map((item, idx) => (
                          <span key={idx} style={{ padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24' }}>
                            • {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Smoking & Vape Policy */}
                  {smokingRestrictions.length > 0 && (
                    <div style={{ background: 'rgba(11, 23, 37, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#f87171', fontWeight: 700, fontSize: '0.9rem' }}>
                        <Cigarette size={17} /> Smoking & Vape Regulations
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {smokingRestrictions.map((item, idx) => (
                          <span key={idx} style={{ padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(248, 113, 113, 0.15)', border: '1px solid rgba(248, 113, 113, 0.3)', color: '#f87171' }}>
                            • {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ticket Flexibility & Transfer Policy */}
                  <div style={{ background: 'rgba(11, 23, 37, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#a78bfa', fontWeight: 700, fontSize: '0.9rem' }}>
                      <Ticket size={17} /> Ticket Policies & Name Changes
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                      <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Ticket Holder Name Change</span>
                        <strong style={{ color: '#fff' }}>{event.ticketNameChangeAllowed || 'Yes'}</strong>
                      </div>
                      <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Interchangeable Dates/Days</span>
                        <strong style={{ color: '#fff' }}>{event.ticketDaysInterchangeable || 'No'}</strong>
                      </div>
                      <div style={{ gridColumn: '1 / -1', background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Ticket Name Usage Policy</span>
                        <strong style={{ color: '#fff' }}>{event.ticketNamePolicy || 'Only the person whose name is on the ticket can use the ticket'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Organizer Profile */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} color="#0d9488" /> Organizer Profile
                </h3>
                <div style={{
                  backgroundColor: 'rgba(11, 23, 37, 0.75)',
                  border: '1px solid rgba(13, 148, 136, 0.3)',
                  borderRadius: '18px',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img
                        src={organizerLogoUrl}
                        alt={organizerDisplayName}
                        style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0d9488' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h4 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{organizerDisplayName}</h4>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: 'rgba(13, 148, 136, 0.2)',
                            color: '#2dd4bf',
                            border: '1px solid rgba(13, 148, 136, 0.4)'
                          }}>
                            {organizerCompanyType}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                            <Award size={14} /> Verified
                          </span>
                        </div>
                        {organizerLegalName !== organizerDisplayName && (
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Legal: {organizerLegalName}</div>
                        )}
                        {organizerAddress && (
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                            <MapPin size={12} color="#0d9488" /> {organizerAddress}
                            {organizerNtn && <span style={{ color: '#64748b' }}>• NTN: {organizerNtn}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Social & Web Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {organizerInstagram && (
                        <a
                          href={organizerInstagram.startsWith('http') ? organizerInstagram : `https://${organizerInstagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#e879f9' }}
                        >
                          <InstagramIcon /> Instagram ↗
                        </a>
                      )}
                      {organizerFacebook && (
                        <a
                          href={organizerFacebook.startsWith('http') ? organizerFacebook : `https://${organizerFacebook}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#60a5fa' }}
                        >
                          <FacebookIcon /> Facebook ↗
                        </a>
                      )}
                      {organizerWebsiteUrl && (
                        <a
                          href={organizerWebsiteUrl.startsWith('http') ? organizerWebsiteUrl : `https://${organizerWebsiteUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Globe size={14} /> Website ↗
                        </a>
                      )}
                    </div>
                  </div>

                  {organizerBio && (
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.6 }}>
                      {organizerBio}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Seat Chart Lightbox Modal */}
          {showSeatChartModal && event.seatChartUrl && (
            <div className="modal-overlay" onClick={() => setShowSeatChartModal(false)} style={{ zIndex: 1100, background: 'rgba(3, 7, 18, 0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', padding: '1.5rem', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  onClick={() => setShowSeatChartModal(false)}
                  style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
                >
                  <X size={20} />
                </button>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', alignSelf: 'flex-start' }}>
                  {event.title} — Seating Blueprint
                </h4>
                <div style={{ overflow: 'auto', maxWidth: '100%', maxHeight: '75vh', display: 'flex', justifyContent: 'center' }}>
                  <img
                    src={getEventImageUrl(event.seatChartUrl)}
                    alt="Seating Blueprint Map"
                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '10px', objectFit: 'contain' }}
                  />
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
              className="btn btn-primary btn-mobile-block"
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
