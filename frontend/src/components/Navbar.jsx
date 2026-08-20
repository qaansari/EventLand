import React, { useState } from 'react';
import { MapPin, Search, PlusCircle, User, Sparkles, Music, Calendar, Menu, X } from 'lucide-react';
import { CITIES } from '../data/mockEvents';

export default function Navbar({ 
  selectedCity, 
  onSelectCity, 
  searchQuery, 
  onSearchChange,
  activeView,
  onNavigate,
  savedTicketsCount
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (view) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'rgba(7, 12, 24, 0.94)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(59, 130, 246, 0.18)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '76px',
        gap: '1rem',
        whiteSpace: 'nowrap'
      }}>
        {/* Brand Logo & Tagline */}
        <div 
          onClick={() => handleNavClick('explore')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          <img
            src="/logo-icon.png"
            alt="EventLand Logo"
            style={{
              height: '42px',
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.4))',
              flexShrink: 0
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#fff',
              lineHeight: 1.1,
              whiteSpace: 'nowrap'
            }}>
              EVENT <span style={{ color: '#3b82f6' }}>LAND</span>
            </div>
            <div style={{
              fontSize: '0.58rem',
              color: '#94a3b8',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              marginTop: '2px'
            }}>
              DISCOVER | BOOK | EXPERIENCE
            </div>
          </div>
        </div>

        {/* Desktop City Selector & Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexShrink: 1,
          whiteSpace: 'nowrap'
        }} className="desktop-only">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <MapPin size={15} color="#3b82f6" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
            <select
              value={selectedCity}
              onChange={(e) => onSelectCity(e.target.value)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: '#f8fafc',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '9999px',
                padding: '0.5rem 1rem 0.5rem 2.2rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {CITIES.map((city) => (
                <option key={city} value={city} style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div style={{ position: 'relative', width: '210px', flexShrink: 1 }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search concerts, shows..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: '#f8fafc',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '9999px',
                padding: '0.5rem 1rem 0.5rem 2.2rem',
                fontSize: '0.85rem',
                outline: 'none',
                whiteSpace: 'nowrap'
              }}
            />
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          flexShrink: 0,
          whiteSpace: 'nowrap'
        }} className="desktop-only">
          <button
            onClick={() => handleNavClick('explore')}
            className={`btn ${activeView === 'explore' ? 'btn-secondary' : ''}`}
            style={{
              background: activeView === 'explore' ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
              color: activeView === 'explore' ? '#60a5fa' : '#cbd5e1',
              fontSize: '0.88rem',
              padding: '0.55rem 1rem'
            }}
          >
            <Calendar size={15} /> Explore
          </button>

          <button
            onClick={() => handleNavClick('artists')}
            className="btn"
            style={{
              background: activeView === 'artists' ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
              color: activeView === 'artists' ? '#60a5fa' : '#cbd5e1',
              fontSize: '0.88rem',
              padding: '0.55rem 1rem'
            }}
          >
            <Music size={15} /> Artists
          </button>

          <button
            onClick={() => handleNavClick('ai-assistant')}
            className="btn"
            style={{
              background: activeView === 'ai-assistant' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: activeView === 'ai-assistant' ? '#c084fc' : '#cbd5e1',
              fontSize: '0.88rem',
              border: activeView === 'ai-assistant' ? '1px solid rgba(139, 92, 246, 0.4)' : 'none',
              padding: '0.55rem 1rem'
            }}
          >
            <Sparkles size={15} color="#c084fc" /> EventVibe AI
          </button>

          <button
            onClick={() => handleNavClick('my-tickets')}
            className="btn"
            style={{
              position: 'relative',
              background: activeView === 'my-tickets' ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
              color: activeView === 'my-tickets' ? '#60a5fa' : '#cbd5e1',
              fontSize: '0.88rem',
              padding: '0.55rem 1rem'
            }}
          >
            <User size={15} /> My Tickets
            {savedTicketsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.7rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {savedTicketsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick('organizer-wizard')}
            className="btn btn-primary"
            style={{ fontSize: '0.88rem', padding: '0.55rem 1.15rem' }}
          >
            <PlusCircle size={16} /> List Your Event
          </button>
        </nav>

        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="mobile-only"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#fff',
            borderRadius: '10px',
            padding: '0.5rem',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isMobileMenuOpen ? <X size={24} color="#3b82f6" /> : <Menu size={24} color="#ffffff" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-only animate-slide-down" style={{
          flexDirection: 'column',
          backgroundColor: '#0b1328',
          borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
          padding: '1.25rem 1rem',
          gap: '1rem'
        }}>
          {/* Mobile Search & City */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search concerts, shows..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#16233f',
                  color: '#fff',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '10px',
                  padding: '0.65rem 1rem 0.65rem 2.3rem',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <MapPin size={16} color="#3b82f6" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <select
                value={selectedCity}
                onChange={(e) => onSelectCity(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#16233f',
                  color: '#fff',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '10px',
                  padding: '0.65rem 1rem 0.65rem 2.3rem',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              >
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Nav Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => handleNavClick('explore')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <Calendar size={18} color="#3b82f6" /> Explore Events
            </button>

            <button
              onClick={() => handleNavClick('artists')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <Music size={18} color="#3b82f6" /> Artists Bookings
            </button>

            <button
              onClick={() => handleNavClick('ai-assistant')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <Sparkles size={18} color="#c084fc" /> EventVibe AI Matchmaker
            </button>

            <button
              onClick={() => handleNavClick('my-tickets')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <User size={18} color="#3b82f6" /> My Digital Tickets ({savedTicketsCount})
            </button>

            <button
              onClick={() => handleNavClick('organizer-wizard')}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1rem', marginTop: '0.5rem' }}
            >
              <PlusCircle size={18} /> List Your Event Live
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
