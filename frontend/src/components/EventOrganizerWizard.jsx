import React, { useState, useEffect } from 'react';
import { Sparkles, Grid, Layers, MapPin, CheckCircle } from 'lucide-react';
import EventCard from './EventCard';
import { uploadApi, adminApi, auditoriumLayoutsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import SearchableSelect from './SearchableSelect';
import MultiSearchableSelect from './MultiSearchableSelect';
import { CITIES } from '../data/mockEvents';

export default function EventOrganizerWizard({ onPublishEvent, onCancel }) {
  const { showError, showSuccess } = useToast();
  const [tagsList, setTagsList] = useState([]);
  const [auditoriumsList, setAuditoriumsList] = useState([]);

  const [eventForm, setEventForm] = useState({
    title: '',
    tagIds: [],
    category: 'Concerts',
    city: 'Karachi',
    venue: '',
    address: '',
    date: '',
    time: '7:00 PM Onwards',
    priceRange: 'PKR 2,000 - PKR 5,000',
    startingPrice: 2000,
    ticketingType: 'categorized', // 'categorized' or 'mapped'
    auditoriumLayout: '',
    banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    description: '',
    scarcityText: 'Selling Fast',
    organizer: '',
    organizerContact: '',
    tier1Name: 'Standard Entry',
    tier1Price: 2000,
    tier2Name: 'VIP Pass',
    tier2Price: 4500
  });

  useEffect(() => {
    adminApi.tags.getAll()
      .then(tags => setTagsList(tags || []))
      .catch(() => setTagsList([
        { id: 1, name: 'Concerts' },
        { id: 2, name: 'Festivals' },
        { id: 3, name: 'Qawwali' },
        { id: 4, name: 'Theatre' },
        { id: 5, name: 'Comedy' },
        { id: 6, name: 'Food' },
        { id: 7, name: 'Workshops' },
        { id: 8, name: 'Corporate' }
      ]));

    auditoriumLayoutsApi.getAll()
      .then(auds => {
        const list = auds || [];
        setAuditoriumsList(list);
        if (list.length > 0) {
          setEventForm(prev => ({
            ...prev,
            auditoriumLayout: prev.auditoriumLayout || list[0].layoutCode || list[0].name
          }));
        }
      })
      .catch(() => setAuditoriumsList([]));
  }, []);

  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const selectedAuditorium = auditoriumsList.find(
    a => a.layoutCode === eventForm.auditoriumLayout || a.name === eventForm.auditoriumLayout
  ) || auditoriumsList[0];

  const previewEventObject = {
    id: 'user-created-' + Date.now(),
    title: eventForm.title || 'Your Event Title Here',
    category: eventForm.category,
    status: 1, // 0: Draft, 1: Live, 2: Completed, 3: Cancelled
    isFeatured: true,
    isPublished: true,
    city: eventForm.city,
    venue: eventForm.venue || 'Venue Address, City',
    address: eventForm.address || 'Street Address, City',
    date: eventForm.date || 'TBD 2026',
    startDateUtc: eventForm.date,
    endDateUtc: eventForm.date,
    time: eventForm.time,
    priceRange: eventForm.priceRange || `PKR ${Number(eventForm.startingPrice || 0).toLocaleString()} - 5,000`,
    startingPrice: Number(eventForm.startingPrice || 1000),
    ticketingType: eventForm.ticketingType,
    auditoriumLayout: eventForm.auditoriumLayout,
    banner: eventForm.banner,
    description: eventForm.description || 'Provide a compelling description of your concert or festival.',
    organizer: eventForm.organizer || 'Organizer Name',
    scarcityText: eventForm.scarcityText || 'New Listing - Selling Fast',
    ticketTiers: eventForm.ticketingType === 'categorized' ? [
      { id: 't1', name: eventForm.tier1Name, price: Number(eventForm.tier1Price || 2000), description: 'Standard admission pass' },
      { id: 't2', name: eventForm.tier2Name, price: Number(eventForm.tier2Price || 4500), description: 'Fast track VIP entry pass' }
    ] : [
      { id: 't1', name: 'General Entry', price: Number(eventForm.startingPrice || 2500), description: 'Standard seat booking' }
    ],
    seatingZones: eventForm.ticketingType === 'mapped' ? [
      {
        zone: selectedAuditorium?.name || 'Auditorium Main Hall',
        rows: 10,
        cols: 20,
        price: Number(eventForm.startingPrice || 2500),
        layoutJson: selectedAuditorium?.layoutJson || eventForm.auditoriumLayout || ''
      }
    ] : []
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.venue || !eventForm.date) {
      showError('Validation Error', 'Please fill out Title, Venue, and Date before submitting.');
      return;
    }

    setPublishedSuccess(true);
    setTimeout(() => {
      onPublishEvent(previewEventObject);
    }, 1200);
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <span className="badge badge-live" style={{ marginBottom: '0.5rem' }}>
          ORGANIZER SELF-SERVICE PORTAL
        </span>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          color: '#fff',
          marginBottom: '0.4rem'
        }}>
          List Your Event & Sell Tickets Across Pakistan
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
          Publish your event in minutes. Choose between Categorized Passes or Mapped Seat Picker layout.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '2rem',
        alignItems: 'start'
      }}>
        {/* Form Container */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <form onSubmit={handleFormSubmit}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>
              1. Event Overview
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Event Title *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Islamabad Sufi Night 2026"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Ticketing Type Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.5rem' }}>
                  2. Select Ticketing Type *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div
                    onClick={() => setEventForm({ ...eventForm, ticketingType: 'categorized' })}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      backgroundColor: eventForm.ticketingType === 'categorized' ? 'rgba(59, 130, 246, 0.2)' : '#1e293b',
                      border: eventForm.ticketingType === 'categorized' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <Layers color="#3b82f6" size={22} />
                    <div>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', display: 'block' }}>1) Categorized</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tiered Passes (VIP, Standard)</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setEventForm({ ...eventForm, ticketingType: 'mapped' })}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      backgroundColor: eventForm.ticketingType === 'mapped' ? 'rgba(59, 130, 246, 0.2)' : '#1e293b',
                      border: eventForm.ticketingType === 'mapped' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <Grid color="#3b82f6" size={22} />
                    <div>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', display: 'block' }}>2) Mapped</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Interactive Auditorium Seat Chart</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auditorium Layout Picker (when Mapped Ticketing) */}
              {eventForm.ticketingType === 'mapped' && (
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', padding: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Select Auditorium / Hall Blueprint *
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.75rem' }}>
                    Choose the auditorium layout for reserved seat bookings:
                  </span>
                  
                  {auditoriumsList.length === 0 ? (
                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem' }}>
                      No auditorium layouts found in database. Contact an admin to configure an auditorium blueprint.
                    </div>
                  ) : (
                    <>
                      <SearchableSelect
                        value={eventForm.auditoriumLayout || auditoriumsList[0]?.layoutCode || ''}
                        onChange={(e) => {
                          const code = e.target.value;
                          const chosen = auditoriumsList.find(a => a.layoutCode === code || a.name === code);
                          setEventForm(prev => ({
                            ...prev,
                            auditoriumLayout: code,
                            venue: chosen?.venue ? `${chosen.venue}, ${chosen.city}` : prev.venue,
                            city: chosen?.city || prev.city
                          }));
                        }}
                        options={auditoriumsList.map(a => ({
                          value: a.layoutCode || a.name,
                          label: `${a.name} (${a.city} • ${a.totalCapacity} Seats)`
                        }))}
                      />

                      {selectedAuditorium && (
                        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle size={15} color="#10b981" />
                          <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                            Selected: <strong style={{ color: '#fff' }}>{selectedAuditorium.name}</strong> ({selectedAuditorium.totalCapacity} seats layout)
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Select Event Tags (Multiple Allowed) *
                  </label>
                  <MultiSearchableSelect
                    value={eventForm.tagIds || []}
                    onChange={(e) => setEventForm({ ...eventForm, tagIds: e.target.value })}
                    options={tagsList.map(t => ({ value: t.id, label: t.name }))}
                    placeholder="Select one or multiple tags..."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Host City *
                  </label>
                  <SearchableSelect
                    value={eventForm.city}
                    onChange={(e) => setEventForm({ ...eventForm, city: e.target.value })}
                    options={CITIES.filter(c => c !== 'All Cities')}
                    placeholder="Select City..."
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Venue Full Address *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Lok Virsa Complex, Garden Avenue, Islamabad"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Event Date(s) *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. 15th Oct 2026"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Starting Ticket Price (PKR) *
                  </label>
                  <input
                    required
                    type="number"
                    value={eventForm.startingPrice}
                    onChange={(e) => setEventForm({ ...eventForm, startingPrice: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Event Banner Image <span style={{ color: '#38bdf8', fontWeight: 600 }}>(Recommended: 1200x500px)</span> *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/... or upload below"
                    value={eventForm.banner}
                    onChange={(e) => setEventForm({ ...eventForm, banner: e.target.value })}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                  <label style={{
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}>
                    Upload File
                    <input
                      type="file"
                      accept=".webp,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const res = await uploadApi.uploadFile(file, 'events', eventForm.title);
                          setEventForm(prev => ({ ...prev, banner: res.url }));
                          showSuccess('Banner Uploaded', `Saved banner as ${res.fileName || 'event banner'}`);
                        } catch (err) {
                          showError('Upload Failed', err.message || 'Image upload failed.');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Event Description & Highlights
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your event lineup, gates open time, food options..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary"
                style={{ width: '30%' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '70%', padding: '0.85rem' }}
              >
                {publishedSuccess ? 'Publishing Event...' : '🚀 Publish Event Live'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div style={{ position: 'sticky', top: '100px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            color: '#3b82f6',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}>
            <Sparkles size={18} /> LIVE CARD PREVIEW
          </div>

          <EventCard
            event={previewEventObject}
            onSelect={() => {}}
            isSaved={false}
            onToggleSave={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
