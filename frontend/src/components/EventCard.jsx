import React from 'react';
import { Calendar, MapPin, Heart, Info, Grid, Layers } from 'lucide-react';

export default function EventCard({ event, onSelect, isSaved, onToggleSave }) {
  return (
    <div
      className="glass-card"
      onClick={() => onSelect(event)}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', cursor: 'pointer' }}
    >
      {/* Event Banner Container */}
      <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
        <img
          src={event.banner}
          alt={event.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.5s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />

        {/* Top Badges */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span className={`badge ${event.status === 'LIVE' ? 'badge-live' : 'badge-fast'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="pulse-dot"></span> {event.status}
          </span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(event.id);
              }}
              style={{
                background: 'rgba(0, 0, 0, 0.6)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSaved ? '#ef4444' : '#ffffff',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)'
              }}
            >
              <Heart size={16} fill={isSaved ? '#ef4444' : 'none'} />
            </button>
          </div>
        </div>

        {/* Category Pill */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '12px',
          backgroundColor: 'rgba(7, 12, 24, 0.85)',
          backdropFilter: 'blur(6px)',
          color: '#60a5fa',
          padding: '0.2rem 0.68rem',
          borderRadius: '6px',
          fontSize: '0.72rem',
          fontWeight: 700,
          border: '1px solid rgba(59, 130, 246, 0.35)'
        }}>
          {event.category}
        </div>
      </div>

      {/* Content Body */}
      <div style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.4rem', fontWeight: 500 }}>
          <MapPin size={14} color="#3b82f6" />
          <span>{event.city} • {event.venue.split(',')[0]}</span>
        </div>

        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.2rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          marginBottom: '0.65rem',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {event.title}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#cbd5e1', fontSize: '0.86rem', marginBottom: '0.85rem' }}>
          <Calendar size={15} color="#3b82f6" />
          <span>{event.date}</span>
        </div>

        {/* Ticketing Type Indicator Pill */}
        <div style={{
          fontSize: '0.75rem',
          color: '#94a3b8',
          marginBottom: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontWeight: 500
        }}>
          {event.ticketingType === 'mapped' ? <Grid size={13} color="#60a5fa" /> : <Layers size={13} color="#60a5fa" />}
          <span>{event.ticketingType === 'mapped' ? 'Mapped Seat Selection' : 'Tiered Ticket Passes'}</span>
        </div>

        {/* Bottom Pricing & View Details Action */}
        <div style={{ marginTop: 'auto', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Starting From</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}>
              PKR {event.startingPrice.toLocaleString()}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event);
            }}
            className="btn btn-primary"
            style={{ padding: '0.52rem 1.15rem', fontSize: '0.85rem' }}
          >
            <Info size={15} /> View Pass
          </button>
        </div>
      </div>
    </div>
  );
}
