import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Ticket, Sparkles, Flame } from 'lucide-react';
import { getEventImageUrl } from '../services/api';

export default function HeroSlider({ featuredEvents = [], onSelectEvent }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!featuredEvents || featuredEvents.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredEvents.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredEvents, isPaused]);

  if (!featuredEvents || featuredEvents.length === 0) return null;

  const current = featuredEvents[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? featuredEvents.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredEvents.length);
  };

  return (
    <div 
      style={{ position: 'relative', width: '100%', marginBottom: '2.5rem' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div style={{
        position: 'relative',
        minHeight: '360px',
        maxHeight: '480px',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -15px rgba(0, 0, 0, 0.85), 0 0 30px rgba(59, 130, 246, 0.25)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        backgroundColor: '#060a14'
      }}>
        {/* Animated Ken Burns Background Image */}
        <img
          key={`bg-${currentIndex}`}
          src={getEventImageUrl(current.banner)}
          alt={current.title}
          className="hero-slide-bg"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '360px',
            objectFit: 'cover',
            position: 'absolute',
            inset: 0
          }}
        />

        {/* Dynamic Dark Gradient Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(90deg, rgba(6, 10, 20, 0.95) 0%, rgba(6, 10, 20, 0.7) 50%, rgba(6, 10, 20, 0.3) 100%),
            linear-gradient(0deg, rgba(6, 10, 20, 0.95) 0%, rgba(6, 10, 20, 0.2) 60%)
          `,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 'clamp(1.5rem, 4vw, 3rem)'
        }}>
          {/* Animated Slide Content Box */}
          <div key={`content-${currentIndex}`} className="hero-slide-content">
            {/* Top Badges Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
              <span className={`badge ${current.status === 'LIVE' ? 'badge-live' : 'badge-fast'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className="pulse-dot"></span> {current.status}
              </span>

              <span className="badge badge-city">
                <MapPin size={12} style={{ display: 'inline', marginRight: '3px' }} /> {current.city}
              </span>

              <span style={{
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                color: '#c084fc',
                border: '1px solid rgba(139, 92, 246, 0.45)',
                borderRadius: '8px',
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                boxShadow: '0 0 12px rgba(139, 92, 246, 0.3)'
              }}>
                <Sparkles size={13} color="#c084fc" /> FEATURED PASS
              </span>
            </div>

            {/* Main Slide Title */}
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.6rem, 4.5vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.18,
              marginBottom: '0.75rem',
              color: '#ffffff',
              maxWidth: '850px',
              textShadow: '0 4px 30px rgba(0,0,0,0.9)'
            }}>
              {current.title}
            </h1>

            {/* Details Strip */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '1.25rem',
              marginBottom: '1.4rem',
              color: '#cbd5e1',
              fontSize: 'clamp(0.82rem, 2vw, 0.95rem)',
              fontWeight: 500
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Calendar size={16} color="#60a5fa" />
                <span>{current.date} ({current.time})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <MapPin size={16} color="#60a5fa" />
                <span>{current.venue.split(',')[0]}</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => onSelectEvent(current)}
                className="btn btn-primary"
                style={{ padding: '0.78rem 1.6rem', fontSize: 'clamp(0.88rem, 2vw, 1.02rem)' }}
              >
                <Ticket size={18} /> Book Tickets from {current.priceRange}
              </button>

              <button
                onClick={() => onSelectEvent(current)}
                className="btn btn-secondary"
                style={{ padding: '0.78rem 1.35rem', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}
              >
                View Event Info
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Arrow Controls */}
        {featuredEvents.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              title="Previous Slide"
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(11, 19, 40, 0.75)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                color: '#ffffff',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.5)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.8)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)';
              }}
            >
              <ChevronLeft size={22} color="#ffffff" />
            </button>

            <button
              onClick={handleNext}
              title="Next Slide"
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(11, 19, 40, 0.75)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                color: '#ffffff',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.5)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.8)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)';
              }}
            >
              <ChevronRight size={22} color="#ffffff" />
            </button>

            {/* Bottom Glass Navigation Indicator Bar */}
            <div style={{
              position: 'absolute',
              bottom: '1rem',
              right: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              zIndex: 10
            }}>
              {featuredEvents.map((ev, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setCurrentIndex(idx)}
                    title={`Slide ${idx + 1}: ${ev.title}`}
                    style={{
                      height: '8px',
                      width: isActive ? '36px' : '10px',
                      borderRadius: '9999px',
                      backgroundColor: isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.25)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isActive ? '0 0 12px rgba(59, 130, 246, 0.7)' : 'none',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {isActive && !isPaused && (
                      <span
                        key={`bar-${currentIndex}`}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: '#60a5fa',
                          animation: 'heroProgressBar 6s linear infinite'
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
