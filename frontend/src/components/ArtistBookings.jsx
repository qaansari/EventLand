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
        <span className="badge badge-live" style={{ marginBottom: '0.5rem' }}>
          EXCLUSIVE ARTIST MANAGEMENT & BOOKINGS
        </span>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
          Book Top Pakistani Talent for Your Events
        </h1>
        <p style={{ color: '#9ca3af', maxWidth: '650px', margin: '0 auto', fontSize: '1.05rem' }}>
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
            <div style={{ position: 'relative', height: '260px' }}>
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
                color: '#f59e0b',
                padding: '0.25rem 0.6rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <Star size={14} fill="#f59e0b" /> {artist.rating} ({artist.showsDone}+ shows)
              </div>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                {artist.name}
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, marginBottom: '0.75rem' }}>
                {artist.genre}
              </span>
              <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '1rem', lineHeight: 1.4 }}>
                {artist.bio}
              </p>

              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '0.25rem' }}>TOP TRACKS</span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {artist.topTracks.map((t) => (
                    <span key={t} style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.08)', color: '#d1d5db', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      🎵 {t}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>Starting Rate</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
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
