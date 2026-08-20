import React, { useState } from 'react';
import { Music, Star, Calendar, MapPin, Send, CheckCircle, X } from 'lucide-react';
import { MOCK_ARTISTS } from '../data/mockArtists';

export default function ArtistBookings() {
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    organizerName: '',
    email: '',
    phone: '',
    eventDate: '',
    city: 'Karachi',
    eventType: 'Corporate Concert',
    notes: ''
  });

  const handleSubmitInquiry = (e) => {
    e.preventDefault();
    setInquirySubmitted(true);
    setTimeout(() => {
      setInquirySubmitted(false);
      setSelectedArtist(null);
      alert(`Booking request for ${selectedArtist.name} successfully transmitted! Our artist relations agent will contact you within 2 hours.`);
    }, 1500);
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Title Header */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <span className="badge badge-live" style={{ marginBottom: '0.6rem' }}>
          EXCLUSIVE ARTIST MANAGEMENT & BOOKINGS
        </span>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 4vw, 2.7rem)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#fff',
          marginBottom: '0.75rem'
        }}>
          Book Top Pakistani Talent for Your Events
        </h1>
        <p style={{ color: '#94a3b8', maxWidth: '650px', margin: '0 auto', fontSize: '1.05rem' }}>
          Direct official booking access to singers, bands, stand-up comedians, and DJs with guaranteed contract fulfillment.
        </p>
      </div>

      {/* Artist Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        {MOCK_ARTISTS.map((artist) => (
          <div key={artist.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-img-container" style={{ position: 'relative', height: '260px' }}>
              <img
                src={artist.image}
                alt={artist.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                backgroundColor: 'rgba(9, 13, 22, 0.85)',
                backdropFilter: 'blur(6px)',
                color: '#f59e0b',
                padding: '0.25rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                <Star size={14} fill="#f59e0b" /> {artist.rating} ({artist.showsDone}+ shows)
              </div>
            </div>

            <div style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.3rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#fff',
                marginBottom: '0.25rem'
              }}>
                {artist.name}
              </h3>
              <span style={{ fontSize: '0.82rem', color: '#60a5fa', fontWeight: 600, marginBottom: '0.75rem' }}>
                {artist.genre}
              </span>
              <p style={{ fontSize: '0.86rem', color: '#94a3b8', marginBottom: '1.1rem', lineHeight: 1.5 }}>
                {artist.bio}
              </p>

              <div style={{ backgroundColor: 'rgba(0,0,0,0.35)', padding: '0.8rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600, letterSpacing: '0.05em' }}>TOP TRACKS</span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {artist.topTracks.map((t) => (
                    <span key={t} style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.07)', color: '#e2e8f0', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                      🎵 {t}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Starting Rate</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, color: '#60a5fa' }}>
                    {artist.startingRate}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedArtist(artist)}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}
                >
                  Request Quote
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inquiry Form Modal */}
      {selectedArtist && (
        <div className="modal-overlay" onClick={() => setSelectedArtist(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>OFFICIAL ARTIST BOOKING</span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                  Request Booking for {selectedArtist.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedArtist(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitInquiry} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.35rem' }}>
                    Organizer / Company Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Acme Events Pvt Ltd"
                    value={inquiryForm.organizerName}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, organizerName: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#1f2937',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.35rem' }}>
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="info@company.com"
                      value={inquiryForm.email}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        backgroundColor: '#1f2937',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        color: '#fff',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.35rem' }}>
                      Phone / WhatsApp *
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="0300 9876543"
                      value={inquiryForm.phone}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                      style={{
                        width: '100%',
                        backgroundColor: '#1f2937',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        color: '#fff',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.35rem' }}>
                      Proposed Event Date *
                    </label>
                    <input
                      required
                      type="date"
                      value={inquiryForm.eventDate}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, eventDate: e.target.value })}
                      style={{
                        width: '100%',
                        backgroundColor: '#1f2937',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        color: '#fff',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.35rem' }}>
                      City Location *
                    </label>
                    <select
                      value={inquiryForm.city}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, city: e.target.value })}
                      style={{
                        width: '100%',
                        backgroundColor: '#1f2937',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        color: '#fff',
                        outline: 'none'
                      }}
                    >
                      <option value="Karachi">Karachi</option>
                      <option value="Lahore">Lahore</option>
                      <option value="Islamabad">Islamabad</option>
                      <option value="Rawalpindi">Rawalpindi</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={inquirySubmitted}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem' }}
              >
                {inquirySubmitted ? 'Sending Inquiry...' : 'Submit Booking Inquiry'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
