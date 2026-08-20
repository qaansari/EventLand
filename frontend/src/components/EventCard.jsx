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
          <span className={`badge ${event.status === 'LIVE' ? 'badge-live' : 'badge-fast'}`}>
            {event.status}
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
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
          <MapPin size={14} color="#3b82f6" />
          <span>{event.city} • {event.venue.split(',')[0]}</span>
        </div>

        <h3 style={{
          fontSize: '1.15rem',
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: '0.6rem',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {event.title}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '1rem' }}>
          <Calendar size={15} color="#3b82f6" />
          <span>{event.date}</span>
        </div>

        {/* Ticketing Type Indicator Pill */}
        <div style={{
          fontSize: '0.75rem',
          color: '#94a3b8',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
          {event.ticketingType === 'mapped' ? <Grid size={13} color="#3b82f6" /> : <Layers size={13} color="#3b82f6" />}
          <span>{event.ticketingType === 'mapped' ? 'Mapped Seat Map' : 'Categorized Passes'}</span>
        </div>

        {/* Bottom Pricing & View Details Action */}
        <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>From</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6' }}>
              PKR {event.startingPrice.toLocaleString()}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event);
            }}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.3)' }}
          >
            <Info size={15} /> View Details
          </button>
        </div>
      </div>
    </div>
  );
}
