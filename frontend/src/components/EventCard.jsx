import React from 'react';
import { Calendar, MapPin, Heart, Info, Grid, Layers, Clock } from 'lucide-react';
import { formatEventDateRange, formatEventStartTime } from '../utils/dateUtils';
import { getEventImageUrl } from '../services/api';

export default function EventCard({ event, onSelect, isSaved, onToggleSave }) {
  const formattedDate = formatEventDateRange(event.startDateUtc || event.startDate || event.date, event.endDateUtc || event.endDate);
  const formattedTime = formatEventStartTime(event.startDateUtc || event.startDate, event.time);

  return (
    <article
      className="glass-card event-card"
      onClick={() => onSelect(event)}
      style={{
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: '16px',
        border: '1px solid rgba(13, 148, 136, 0.2)',
        transition: 'transform 0.25s ease, border-color 0.25s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(13, 148, 136, 0.2)';
      }}
    >
      {/* Event Banner Container (Left / Top) */}
      <div className="event-card-image" style={{ position: 'relative', flex: '1 1 480px', minHeight: '260px', overflow: 'hidden' }}>
        <img
          src={getEventImageUrl(event.banner)}
          alt={`${event.title} live event banner - ${event.cityName || event.city || 'Pakistan'}`}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '260px',
            maxHeight: '340px',
            objectFit: 'cover',
            transition: 'transform 0.5s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />

        {/* Top Badges */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          right: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span className={`badge ${event.status === 'LIVE' || event.status === 'Live' ? 'badge-live' : 'badge-fast'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="pulse-dot"></span> {event.status}
          </span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(event.id);
              }}
              style={{
                background: 'rgba(0, 0, 0, 0.65)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSaved ? '#ef4444' : '#ffffff',
                cursor: 'pointer',
                backdropFilter: 'blur(6px)'
              }}
            >
              <Heart size={18} fill={isSaved ? '#ef4444' : 'none'} />
            </button>
          </div>
        </div>

        {/* Tag Pill */}
        <div style={{
          position: 'absolute',
          bottom: '14px',
          left: '14px',
          backgroundColor: 'rgba(7, 12, 24, 0.88)',
          backdropFilter: 'blur(8px)',
          color: '#2dd4bf',
          padding: '0.28rem 0.8rem',
          borderRadius: '8px',
          fontSize: '0.78rem',
          fontWeight: 700,
          border: '1px solid rgba(13, 148, 136, 0.4)'
        }}>
          {event.tags && event.tags.length > 0
            ? event.tags.map(t => typeof t === 'string' ? t : t.name).join(' • ')
            : (event.tag || 'Event')}
        </div>
      </div>

      {/* Content Body (Right / Bottom) */}
      <div className="event-card-body" style={{ padding: '1.75rem', flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.86rem', marginBottom: '0.5rem', fontWeight: 500 }}>
            <MapPin size={15} color="#0d9488" />
            <span>{(event?.cityName || event?.city || 'Karachi')} • {(event?.venueName || event?.venue) ? String(event.venueName || event.venue).split(',')[0] : 'Arts Council of Pakistan'}</span>
          </div>

          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.45rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            marginBottom: '0.75rem',
            lineHeight: 1.3
          }}>
            {event.title}
          </h3>

          {/* Date & Dedicated Start Time Badge Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#cbd5e1', fontSize: '0.88rem', fontWeight: 500 }}>
              <Calendar size={16} color="#0d9488" />
              <span>{formattedDate}</span>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(13, 148, 136, 0.15)',
              color: '#2dd4bf',
              padding: '0.25rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid rgba(13, 148, 136, 0.3)'
            }}>
              <Clock size={13} color="#2dd4bf" />
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Ticketing Type Indicator Pill */}
          <div style={{
            fontSize: '0.8rem',
            color: '#94a3b8',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontWeight: 500
          }}>
            {event.ticketingType === 'mapped' ? <Grid size={14} color="#2dd4bf" /> : <Layers size={14} color="#2dd4bf" />}
            <span>{event.ticketingType === 'mapped' ? 'Mapped Seat Selection' : 'Tiered Ticket Passes'}</span>
          </div>
        </div>

        {/* Bottom Pricing & View Details Action */}
        <div className="event-card-footer" style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Starting From</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: '#2dd4bf' }}>
              PKR {(event.startingPrice || 0).toLocaleString()}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event);
            }}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem' }}
          >
            <Info size={16} /> View Details
          </button>
        </div>
      </div>
    </article>
  );
}
