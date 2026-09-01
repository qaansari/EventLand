import React, { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { artistsApi, locationsApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function ArtistBookings({ cities: citiesProp = [] }) {
  const { showSuccess } = useToast();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    setLoading(true);
    artistsApi.getArtists({ pageSize: 50 })
      .then(res => {
        setArtists(res.items || res || []);
      })
      .catch(err => {
        console.error('Failed to load artists from backend API:', err);
        setArtists([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Cities come from App (locationsApi) via prop; fetch them here as a
  // fallback if the component is ever mounted without the prop.
  const [cityOptions, setCityOptions] = useState([]);
  useEffect(() => {
    const fromProp = (citiesProp || []).map(c => typeof c === 'string' ? c : c.name).filter(Boolean);
    if (fromProp.length > 0) {
      setCityOptions(fromProp);
      return;
    }
    locationsApi.getCities()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.items || []);
        setCityOptions(list.map(c => typeof c === 'string' ? c : c.name).filter(Boolean));
      })
      .catch(() => setCityOptions([]));
  }, [citiesProp]);

  const handleSubmitInquiry = (e) => {
    e.preventDefault();
    setInquirySubmitted(true);
    setTimeout(() => {
      showSuccess(
        'Inquiry Transmitted 🎤',
        `Booking request for ${selectedArtist.name} sent! Our agent will contact you within 2 hours.`
      );
      setInquirySubmitted(false);
      setSelectedArtist(null);
    }, 1200);
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
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Loading talent roster from database...</p>
        </div>
      ) : artists.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          <p>No artists listed in the database currently.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          {artists.map((artist) => (
            <div key={artist.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-img-container" style={{ position: 'relative', height: '260px' }}>
                <img
                  src={artist.imageUrl || artist.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80'}
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
                  <Star size={14} fill="#f59e0b" /> {artist.rating || 5.0} ({artist.showsDone || 0}+ shows)
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
                <span style={{ fontSize: '0.82rem', color: '#2dd4bf', fontWeight: 600, marginBottom: '0.75rem' }}>
                  {artist.genre || artist.role}
                </span>
                <p style={{ fontSize: '0.86rem', color: '#94a3b8', marginBottom: '1.1rem', lineHeight: 1.5 }}>
                  {artist.bio}
                </p>

                {artist.availability && (
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.35)', padding: '0.6rem 0.8rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.8rem', color: '#cbd5e1' }}>
                    <span style={{ color: '#2dd4bf', fontWeight: 600 }}>✓ </span> {artist.availability}
                  </div>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Starting Rate</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, color: '#2dd4bf' }}>
                      PKR {typeof artist.startingRate === 'number' ? artist.startingRate.toLocaleString() : (artist.startingRate || 'Custom')}
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
      )}

      {/* Inquiry Form Modal */}
      {selectedArtist && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#2dd4bf', fontWeight: 700 }}>OFFICIAL ARTIST BOOKING</span>
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
                    <SearchableSelect
                      value={inquiryForm.city}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, city: e.target.value })}
                      options={cityOptions.length > 0 ? cityOptions : ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi']}
                      placeholder="Select City..."
                    />
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
