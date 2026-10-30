import React from 'react';
import { Calendar, MapPin, Heart, Info, Grid, Layers, Clock } from 'lucide-react';
import { formatEventDateRange, formatEventStartTime } from '../utils/dateUtils';
import { getEventImageUrl } from '../services/api';

/**
 * EventCard
 * Used across Explore Events, Catalog, and Live Preview Panels (Organizer Wizard & Admin).
 * Arranged in a 3-column responsive grid on desktop (2 on tablet, 1 on mobile).
 * Strictly designed for 1200x500px organizer event banners (2.4 : 1 aspect ratio).
 * Strict rule: ZERO text, overlays, badges, or buttons on top of the banner image.
 * All metadata, status badges, tags, and actions are neatly arranged below the banner.
 */
export default function EventCard({ event, onSelect, isSaved, onToggleSave }) {
  const formattedDate = formatEventDateRange(
    event.startDateUtc || event.startDate || event.date,
    event.endDateUtc || event.endDate
  );
  const formattedTime = formatEventStartTime(
    event.startDateUtc || event.startDate,
    event.time
  );

  const tagsList = event.tags && event.tags.length > 0
    ? event.tags.map(t => typeof t === 'string' ? t : (t.name || String(t)))
    : (event.tag ? [event.tag] : ['Event']);

  const venueName = (event?.venueName || event?.venue) 
    ? String(event.venueName || event.venue).split(',')[0].trim() 
    : 'Arts Council of Pakistan';

  const cityName = event?.cityName || event?.city || 'Karachi';

  const statusUpper = (event.status || 'Live').toUpperCase();
  const isClosed = statusUpper === 'CLOSED';
  const isSoldOut = statusUpper === 'SOLD OUT' || statusUpper === 'SOLDOUT';
  const isLive = statusUpper === 'LIVE';

  return (
    <article
      className="glass-card event-card"
      onClick={() => onSelect && onSelect(event)}
      style={{
        maxWidth: '100%',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: '16px',
        border: '1px solid rgba(13, 148, 136, 0.22)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(11, 17, 33, 0.95) 100%)',
        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.3s ease',
        willChange: 'transform'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.6)';
        e.currentTarget.style.boxShadow = '0 18px 40px -10px rgba(13, 148, 136, 0.25), 0 0 25px rgba(13, 148, 136, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(13, 148, 136, 0.22)';
        e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0, 0, 0, 0.5)';
      }}
    >
      {/* 
        Strict 1200x500px Event Banner (Aspect Ratio: 1200 / 500 = 2.4 : 1)
        Strict Requirement: ZERO text, overlays, badges, or buttons on top of the banner image.
        100% clean image container preserving organizer artwork in full fidelity.
      */}
      <div 
        className="event-card-banner event-card-image" 
        style={{ 
          position: 'relative', 
          width: '100%', 
          aspectRatio: '1200 / 500', 
          overflow: 'hidden',
          backgroundColor: '#070d18'
        }}
      >
        <img
          src={getEventImageUrl(event.banner)}
          alt={`${event.title || 'Event'} live event banner - ${cityName}`}
          loading="lazy"
          decoding="async"
          style={{
            width: '100%',
            height: '100%',
            aspectRatio: '1200 / 500',
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.025)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />
      </div>

      {/* Content Body: All badges, metadata, title, and actions adjusted cleanly below the banner */}
      <div 
        className="event-card-body" 
        style={{ 
          padding: 'clamp(1rem, 2vw, 1.35rem)', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.85rem',
          flex: 1
        }}
      >
        {/* Top Badges & Save Action Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          {/* Left Badges Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            {/* Status Badge */}
            <span 
              className={`badge ${isLive ? 'badge-live' : isClosed ? 'badge-closed' : isSoldOut ? 'badge-soldout' : 'badge-fast'}`} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.28rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.72rem',
                background: isClosed
                  ? 'rgba(239, 68, 68, 0.15)'
                  : isSoldOut
                  ? 'rgba(234, 179, 8, 0.15)'
                  : undefined,
                color: isClosed
                  ? '#f87171'
                  : isSoldOut
                  ? '#facc15'
                  : undefined,
                border: isClosed
                  ? '1px solid rgba(239, 68, 68, 0.35)'
                  : isSoldOut
                  ? '1px solid rgba(234, 179, 8, 0.35)'
                  : undefined
              }}
            >
              {!isClosed && !isSoldOut && <span className="pulse-dot"></span>} {event.status || 'Live'}
            </span>

            {/* Tags / Categories (show top 2) */}
            {tagsList.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                style={{
                  backgroundColor: 'rgba(13, 148, 136, 0.14)',
                  color: '#2dd4bf',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: '1px solid rgba(13, 148, 136, 0.35)',
                  letterSpacing: '0.02em'
                }}
              >
                {tag}
              </span>
            ))}

            {/* Ticketing Architecture Badge */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#94a3b8',
              padding: '0.25rem 0.55rem',
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              {event.ticketingType === 'mapped' ? <Grid size={12} color="#2dd4bf" /> : <Layers size={12} color="#2dd4bf" />}
              <span>{event.ticketingType === 'mapped' ? 'Mapped Seating' : 'Tiered Passes'}</span>
            </span>
          </div>

          {/* Right: Heart / Save Button */}
          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(event.id);
              }}
              title={isSaved ? "Remove from saved events" : "Save this event"}
              aria-label={isSaved ? "Remove from saved events" : "Save this event"}
              style={{
                background: isSaved ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                border: isSaved ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSaved ? '#ef4444' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Heart size={16} fill={isSaved ? '#ef4444' : 'none'} />
            </button>
          )}
        </div>

        {/* Location Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#94a3b8', fontSize: '0.84rem', fontWeight: 500, minWidth: 0 }}>
          <MapPin size={15} color="#0d9488" style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cityName} • {venueName}</span>
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.15rem, 1.25vw, 1.28rem)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          margin: '0',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '2.7em'
        }}>
          {event.title}
        </h3>

        {/* Date & Time Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.84rem', fontWeight: 500 }}>
            <Calendar size={15} color="#0d9488" style={{ flexShrink: 0 }} />
            <span>{formattedDate}</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: 'rgba(13, 148, 136, 0.15)',
            color: '#2dd4bf',
            padding: '0.22rem 0.55rem',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 600,
            border: '1px solid rgba(13, 148, 136, 0.3)'
          }}>
            <Clock size={12} color="#2dd4bf" style={{ flexShrink: 0 }} />
            <span>{formattedTime}</span>
          </div>
        </div>

        {/* Bottom Pricing & CTA Footer */}
        <div 
          className="event-card-footer" 
          style={{ 
            marginTop: 'auto',
            paddingTop: '0.85rem', 
            borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Starting From
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: '#2dd4bf' }}>
              PKR {(event.startingPrice || 0).toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onSelect) onSelect(event);
            }}
            className="btn btn-primary btn-mobile-block"
            style={{ 
              padding: '0.6rem 1.15rem', 
              fontSize: '0.88rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              borderRadius: '10px'
            }}
          >
            <Info size={15} /> View Details
          </button>
        </div>
      </div>
    </article>
  );
}
