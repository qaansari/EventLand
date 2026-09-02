import React, { useState, useMemo } from 'react';
import { MapPin, Search, PlusCircle, User, Sparkles, Music, Calendar, Menu, X, ShieldCheck, Building2, LogIn, LogOut, FileText } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { getUserImageUrl } from '../services/api';

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

  const getUserAvatarUrl = (user) => {
    if (!user) return '';
    if (user.imageUrl || user.avatar) {
      return getUserImageUrl(user.imageUrl || user.avatar);
    }
    const name = user.fullName || user.name || (user.role === 'admin' ? 'Super Admin' : 'User');
    const bgHex = user.role === 'admin' ? '8b5cf6' : user.role === 'organizer' ? '0d9488' : '059669';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgHex}&color=ffffff&bold=true&rounded=true`;
  };

  const cityOptions = useMemo(
    () => ['All Cities', ...(cities || []).map(c => typeof c === 'string' ? c : c.name).filter(Boolean)],
    [cities]
  );

  const handleNavClick = (view) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="navbar-header" style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'rgba(6, 16, 23, 0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(13, 148, 136, 0.35)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '74px',
        gap: '0.5rem',
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0 1rem'
      }}>
        {/* Brand Logo & Tagline */}
        <div 
          className="navbar-brand"
          onClick={() => {
            if (currentRole === 'organizer') handleNavClick('organizer');
            else if (currentRole === 'admin') handleNavClick('admin');
            else handleNavClick('explore');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'transform 0.25s ease'
          }}
        >
          <img
            src="/logo-icon.png"
            alt="EventLand Logo"
            style={{
              height: '38px',
              width: 'auto',
              objectFit: 'contain',
              flexShrink: 0
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#fff',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              textTransform: 'capitalize'
            }}>
              Event <span style={{ color: '#10b981' }}>Land</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.52rem',
              color: '#d9a05b',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              marginTop: '1px'
            }}>
              DISCOVER | BOOK | EXPERIENCE
            </div>
          </div>
        </div>

        {/* Desktop City Selector & Search Bar */}
        <div className="navbar-search-bar desktop-only" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          flexShrink: 1,
          minWidth: 0
        }}>
          <div style={{ width: '130px', flexShrink: 0 }}>
            <SearchableSelect
              value={selectedCity}
              onChange={(e) => onSelectCity(e.target.value)}
              options={cityOptions}
              icon={MapPin}
              placeholder="City..."
            />
          </div>

          <div style={{ position: 'relative', width: '150px', flexShrink: 1 }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                color: '#f8fafc',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                borderRadius: '9999px',
                padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                fontSize: '0.82rem',
                outline: 'none',
                transition: 'all 0.25s ease'
              }}
            />
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          flexShrink: 0
        }} className="desktop-only">
          <button
            onClick={() => handleNavClick('explore')}
            className={`btn ${activeView === 'explore' ? 'btn-secondary' : ''}`}
            style={{
              background: activeView === 'explore' ? 'rgba(13, 148, 136, 0.22)' : 'transparent',
              color: activeView === 'explore' ? '#2dd4bf' : '#cbd5e1',
              fontSize: '0.82rem',
              padding: '0.45rem 0.75rem',
              border: activeView === 'explore' ? '1px solid rgba(45, 212, 191, 0.35)' : '1px solid transparent'
            }}
          >
            <Calendar size={14} /> Explore
          </button>

          <button
            onClick={() => handleNavClick('artists')}
            className="btn"
            style={{
              background: activeView === 'artists' ? 'rgba(13, 148, 136, 0.22)' : 'transparent',
              color: activeView === 'artists' ? '#2dd4bf' : '#cbd5e1',
              fontSize: '0.82rem',
              padding: '0.45rem 0.75rem',
              border: activeView === 'artists' ? '1px solid rgba(45, 212, 191, 0.35)' : '1px solid transparent'
            }}
          >
            <Music size={14} /> Artists
          </button>

          <button
            onClick={() => handleNavClick('my-tickets')}
            className="btn"
            style={{
              position: 'relative',
              background: activeView === 'my-tickets' ? 'rgba(13, 148, 136, 0.18)' : 'transparent',
              color: activeView === 'my-tickets' ? '#2dd4bf' : '#cbd5e1',
              fontSize: '0.82rem',
              padding: '0.45rem 0.75rem'
            }}
          >
            <User size={14} /> My Tickets
            {savedTicketsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '0px',
                right: '0px',
                backgroundColor: '#059669',
                color: '#ffffff',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '0.65rem',
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
              fontSize: '0.82rem',
              padding: '0.45rem 0.75rem'
            }}
          >
            <FileText size={14} color="#fbbf24" /> Unpaid Invoices
          </button>

          {/* Special Console Button for Organizers */}
          {currentUser && currentUser.role === 'organizer' && (
            <button
              onClick={() => handleNavClick('organizer')}
              className="btn"
              style={{
                background: activeView === 'organizer' ? 'rgba(13, 148, 136, 0.25)' : 'rgba(13, 148, 136, 0.15)',
                color: '#2dd4bf',
                border: '1px solid rgba(13, 148, 136, 0.4)',
                fontSize: '0.82rem',
                padding: '0.45rem 0.75rem',
                fontWeight: 700
              }}
            >
              <Building2 size={14} color="#2dd4bf" /> Organizer Portal
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
                fontSize: '0.82rem',
                padding: '0.45rem 0.75rem',
                fontWeight: 700
              }}
            >
              <ShieldCheck size={14} color="#c084fc" /> Admin Console
            </button>
          )}

          <button
            onClick={() => handleNavClick('organizer-wizard')}
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
          >
            <PlusCircle size={14} /> List Event
          </button>

          {/* User Auth Profile Badge / Sign In Button */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.2rem' }}>
              <div style={{
                backgroundColor: currentUser.role === 'admin' 
                  ? 'rgba(139, 92, 246, 0.15)' 
                  : currentUser.role === 'organizer' 
                  ? 'rgba(13, 148, 136, 0.15)' 
                  : 'rgba(13, 148, 136, 0.15)',
                border: currentUser.role === 'admin' 
                  ? '1px solid rgba(139, 92, 246, 0.4)' 
                  : currentUser.role === 'organizer' 
                  ? '1px solid rgba(13, 148, 136, 0.4)' 
                  : '1px solid rgba(13, 148, 136, 0.4)',
                color: '#fff',
                borderRadius: '9999px',
                padding: '0.2rem 0.65rem 0.2rem 0.2rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <img
                  src={getUserAvatarUrl(currentUser)}
                  alt={currentUser.fullName || currentUser.name || 'User Avatar'}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: currentUser.role === 'admin' ? '1.5px solid #c084fc' : '1.5px solid #2dd4bf',
                    flexShrink: 0
                  }}
                />
                <span>{(currentUser?.name || currentUser?.fullName || 'User').split(' ')[0]}</span>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal()}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', marginLeft: '0.2rem' }}
            >
              <LogIn size={14} /> Sign In
            </button>
          )}
        </nav>

        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="mobile-only"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(13, 148, 136, 0.3)',
            color: '#fff',
            borderRadius: '10px',
            padding: '0.5rem',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isMobileMenuOpen ? <X size={24} color="#0d9488" /> : <Menu size={24} color="#ffffff" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-only animate-slide-down" style={{
          flexDirection: 'column',
          backgroundColor: '#0b1328',
          borderBottom: '1px solid rgba(13, 148, 136, 0.3)',
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
                  border: '1px solid rgba(13, 148, 136, 0.25)',
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
              <Calendar size={18} color="#0d9488" /> Explore Events
            </button>

            <button
              onClick={() => handleNavClick('artists')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <Music size={18} color="#0d9488" /> Artists Bookings
            </button>

            <button
              onClick={() => handleNavClick('my-tickets')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <User size={18} color="#2dd4bf" /> My Saved Tickets ({savedTicketsCount})
            </button>

            <button
              onClick={() => handleNavClick('unpaid-invoices')}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <FileText size={18} color="#fbbf24" /> Unpaid Invoices
            </button>

            {currentUser && (currentUser.role === 'organizer' || currentUser.role === 'admin') && (
              <button
                onClick={() => handleNavClick('organizer')}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
              >
                <Building2 size={18} color="#0d9488" /> Organizer Portal
              </button>
            )}

            {currentUser && currentUser.role === 'admin' && (
              <button
                onClick={() => handleNavClick('admin')}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
              >
                <ShieldCheck size={18} color="#0d9488" /> Admin Console
              </button>
            )}

            <button
              onClick={() => handleNavClick('organizer-wizard')}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1rem', marginTop: '0.25rem', justifyContent: 'center' }}
            >
              <PlusCircle size={18} /> List Your Event Live
            </button>

            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', marginTop: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>
                  <img
                    src={getUserAvatarUrl(currentUser)}
                    alt={currentUser.fullName || currentUser.name || 'User Avatar'}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: currentUser.role === 'admin' ? '2px solid #c084fc' : '2px solid #2dd4bf',
                      flexShrink: 0
                    }}
                  />
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700 }}>{currentUser?.name || currentUser?.fullName || 'User'}</div>
                    <div style={{ fontSize: '0.72rem', color: currentUser.role === 'admin' ? '#c084fc' : '#2dd4bf', textTransform: 'capitalize' }}>
                      {currentUser?.role === 'admin' ? 'Super Admin' : currentUser?.role}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => { onOpenAuthModal && onOpenAuthModal(); setIsMobileMenuOpen(false); }}
                className="btn btn-primary"
                style={{ padding: '0.85rem 1rem', marginTop: '0.5rem', justifyContent: 'center', background: 'linear-gradient(135deg, #0d9488, #059669)' }}
              >
                <LogIn size={18} /> Sign In to Account
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
