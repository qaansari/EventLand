import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Ticket, Sparkles } from 'lucide-react';

export default function HeroSlider({ featuredEvents, onSelectEvent }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (featuredEvents.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredEvents.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredEvents.length]);

  if (!featuredEvents || featuredEvents.length === 0) return null;

  const current = featuredEvents[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? featuredEvents.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredEvents.length);
  };

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: '2rem' }}>
      <div style={{
        position: 'relative',
        minHeight: '340px',
        maxHeight: '460px',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8)',
        border: '1px solid rgba(59, 130, 246, 0.25)'
      }}>
        {/* Background Image */}
        <img
          src={current.banner}
          alt={current.title}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '340px',
            objectFit: 'cover',
            filter: 'brightness(0.5) contrast(1.1)',
            transition: 'all 0.6s ease'
          }}
        />

        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(7, 12, 24, 0.95) 0%, rgba(7, 12, 24, 0.4) 60%, rgba(0, 0, 0, 0.2) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 'clamp(1rem, 4vw, 2.5rem)'
        }}>
          {/* Top Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span className="badge badge-live" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="pulse-dot"></span> {current.status}
            </span>
            <span className="badge badge-city">
              <MapPin size={12} style={{ display: 'inline', marginRight: '3px' }} /> {current.city}
            </span>
            <span style={{
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              color: '#c084fc',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '8px',
              padding: '0.2rem 0.6rem',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              FEATURED
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 'clamp(1.4rem, 4vw, 2.4rem)',
            fontWeight: 800,
            lineHeight: 1.25,
            marginBottom: '0.6rem',
            color: '#ffffff',
            textShadow: '0 4px 20px rgba(0,0,0,0.6)'
          }}>
            {current.title}
          </h1>

          {/* Details Row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.25rem',
            color: '#cbd5e1',
            fontSize: 'clamp(0.8rem, 2vw, 0.95rem)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={16} color="#3b82f6" />
              <span>{current.date} ({current.time})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={16} color="#3b82f6" />
              <span>{current.venue.split(',')[0]}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => onSelectEvent(current)}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.4rem', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}
            >
              <Ticket size={18} /> Book Tickets from {current.priceRange}
            </button>
            <button
              onClick={() => onSelectEvent(current)}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.2rem', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}
            >
              View Details
            </button>
          </div>
        </div>

        {/* Carousel Slider Arrows */}
        {featuredEvents.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)'
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)'
              }}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
