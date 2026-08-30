import React, { useState, useMemo } from 'react';
import { MapPin, Search, PlusCircle, User, Sparkles, Music, Calendar, Menu, X, ShieldCheck, Building2, LogIn, LogOut, FileText } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

export default function Navbar({ 
  selectedCity, 
  onSelectCity, 
  searchQuery, 
  onSearchChange,
  activeView,
  onNavigate,
  savedTicketsCount,
  currentRole = 'customer',
  onSelectRole,
  currentUser = null,
  onOpenAuthModal,
  onLogout,
  cities = []
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cityOptions = useMemo(
    () => ['All Cities', ...(cities || []).map(c => typeof c === 'string' ? c : c.name).filter(Boolean)],
    [cities]
  );

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
          onClick={() => {
            if (currentRole === 'organizer') handleNavClick('organizer');
            else if (currentRole === 'admin') handleNavClick('admin');
            else handleNavClick('explore');
          }}
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
              fontFamily: 'var(--font-display)',
              fontSize: '1.4rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#fff',
              lineHeight: 1.1,
              whiteSpace: 'nowrap'
            }}>
              EVENT <span style={{ color: '#3b82f6' }}>LAND</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.58rem',
              color: '#94a3b8',
              fontWeight: 700,
              letterSpacing: '0.12em',
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
          <div style={{ width: '150px', flexShrink: 0 }}>
            <SearchableSelect
              value={selectedCity}
              onChange={(e) => onSelectCity(e.target.value)}
              options={cityOptions}
              icon={MapPin}
              placeholder="City..."
            />
          </div>

          <div style={{ position: 'relative', width: '190px', flexShrink: 1 }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search events..."
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
              padding: '0.55rem 0.9rem'
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
              padding: '0.55rem 0.9rem'
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
              padding: '0.55rem 0.9rem'
            }}
          >
            <Sparkles size={15} color="#c084fc" /> AI Match
          </button>

          <button
            onClick={() => handleNavClick('my-tickets')}
            className="btn"
            style={{
              position: 'relative',
              background: activeView === 'my-tickets' ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
              color: activeView === 'my-tickets' ? '#60a5fa' : '#cbd5e1',
              fontSize: '0.88rem',
              padding: '0.55rem 0.9rem'
            }}
          >
            <User size={15} /> My Tickets
            {savedTicketsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                backgroundColor: '#2563eb',
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
            onClick={() => handleNavClick('unpaid-invoices')}
            className="btn"
            style={{
              position: 'relative',
              background: activeView === 'unpaid-invoices' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
              color: activeView === 'unpaid-invoices' ? '#fbbf24' : '#cbd5e1',
              fontSize: '0.88rem',
              padding: '0.55rem 0.9rem'
            }}
          >
            <FileText size={15} color="#fbbf24" /> Unpaid Invoices
          </button>

          {/* Special Console Button for Organizers */}
          {currentUser && currentUser.role === 'organizer' && (
            <button
              onClick={() => handleNavClick('organizer')}
              className="btn"
              style={{
                background: activeView === 'organizer' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                fontSize: '0.85rem',
                padding: '0.5rem 0.9rem',
                fontWeight: 700
              }}
            >
              <Building2 size={15} color="#60a5fa" /> Organizer Portal
            </button>
          )}

          {/* Special Console Button for Super Admin */}
          {currentUser && currentUser.role === 'admin' && (
            <button
              onClick={() => handleNavClick('admin')}
              className="btn"
              style={{
                background: activeView === 'admin' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.15)',
                color: '#c084fc',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                fontSize: '0.85rem',
                padding: '0.5rem 0.9rem',
                fontWeight: 700
              }}
            >
              <ShieldCheck size={15} color="#c084fc" /> Admin Console
            </button>
          )}

          <button
            onClick={() => handleNavClick('organizer-wizard')}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1.05rem' }}
          >
            <PlusCircle size={15} /> List Event
          </button>

          {/* User Auth Profile Badge / Sign In Button */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.3rem' }}>
              <span style={{
                backgroundColor: currentUser.role === 'admin' 
                  ? 'rgba(139, 92, 246, 0.15)' 
                  : currentUser.role === 'organizer' 
                  ? 'rgba(59, 130, 246, 0.15)' 
                  : 'rgba(59, 130, 246, 0.15)',
                border: currentUser.role === 'admin' 
                  ? '1px solid rgba(139, 92, 246, 0.35)' 
                  : currentUser.role === 'organizer' 
                  ? '1px solid rgba(59, 130, 246, 0.35)' 
                  : '1px solid rgba(59, 130, 246, 0.35)',
                color: '#fff',
                borderRadius: '9999px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                {currentUser.role === 'admin' ? (
                  <ShieldCheck size={13} color="#c084fc" />
                ) : currentUser.role === 'organizer' ? (
                  <Building2 size={13} color="#60a5fa" />
                ) : (
                  <User size={13} color="#60a5fa" />
                )}
                {(currentUser?.name || currentUser?.fullName || 'User').split(' ')[0]}
              </span>
              <button
                onClick={onLogout}
                title="Sign Out"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal()}
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem', marginLeft: '0.3rem' }}
            >
              <LogIn size={15} /> Sign In
            </button>
          )}
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

            <div>
              <SearchableSelect
                value={selectedCity}
                onChange={(e) => onSelectCity(e.target.value)}
                options={cityOptions}
                icon={MapPin}
                placeholder="Select City..."
              />
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

            {currentUser && (currentUser.role === 'organizer' || currentUser.role === 'admin') && (
              <button
                onClick={() => handleNavClick('organizer')}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
              >
                <Building2 size={18} color="#3b82f6" /> Organizer Portal
              </button>
            )}

            {currentUser && currentUser.role === 'admin' && (
              <button
                onClick={() => handleNavClick('admin')}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
              >
                <ShieldCheck size={18} color="#3b82f6" /> Admin Console
              </button>
            )}

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
