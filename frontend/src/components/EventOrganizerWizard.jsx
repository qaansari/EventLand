import React, { useState } from 'react';
import { Sparkles, Grid, Layers } from 'lucide-react';
import EventCard from './EventCard';
import { uploadApi, adminApi } from '../services/api';

export default function EventOrganizerWizard({ onPublishEvent, onCancel }) {
  const [tagsList, setTagsList] = useState([]);
  const [eventForm, setEventForm] = useState({
    title: '',
    selectedTagId: '',
    category: 'Concerts',
    city: 'Karachi',
    venue: '',
    date: '',
    time: '7:00 PM Onwards',
    startingPrice: 2000,
    ticketingType: 'categorized', // 'categorized' or 'mapped'
    banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    description: '',
    organizer: '',
    organizerContact: '',
    tier1Name: 'Standard Entry',
    tier1Price: 2000,
    tier2Name: 'VIP Pass',
    tier2Price: 4500,
    zone1Name: 'VIP Front Row',
    zone1Price: 5000,
    zone2Name: 'General Lawn',
    zone2Price: 2000
  });

  React.useEffect(() => {
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
  }, []);

  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const previewEventObject = {
    id: 'user-created-' + Date.now(),
    title: eventForm.title || 'Your Event Title Here',
    category: eventForm.category,
    status: 'LIVE',
    isFeatured: true,
    city: eventForm.city,
    venue: eventForm.venue || 'Venue Address, City',
    date: eventForm.date || 'TBD 2026',
    time: eventForm.time,
    priceRange: `PKR ${Number(eventForm.startingPrice || 0).toLocaleString()} - 5,000`,
    startingPrice: Number(eventForm.startingPrice || 1000),
    ticketingType: eventForm.ticketingType,
    banner: eventForm.banner,
    description: eventForm.description || 'Provide a compelling description of your concert or festival.',
    organizer: eventForm.organizer || 'Organizer Name',
    scarcityText: 'New Listing - Selling Fast',
    ticketTiers: eventForm.ticketingType === 'categorized' ? [
      { id: 't1', name: eventForm.tier1Name, price: Number(eventForm.tier1Price || 2000), description: 'Standard admission pass' },
      { id: 't2', name: eventForm.tier2Name, price: Number(eventForm.tier2Price || 4500), description: 'Fast track VIP entry pass' }
    ] : [
      { id: 't1', name: 'General Entry', price: Number(eventForm.zone2Price || 2000), description: 'Standard entry pass' }
    ],
    seatingZones: eventForm.ticketingType === 'mapped' ? [
      { zone: eventForm.zone1Name, rows: 4, cols: 8, price: Number(eventForm.zone1Price || 5000) },
      { zone: eventForm.zone2Name, rows: 8, cols: 12, price: Number(eventForm.zone2Price || 2000) }
    ] : []
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.venue || !eventForm.date) {
      alert('Please fill out Title, Venue, and Date.');
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
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Interactive Venue Seat Grid</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Select Event Tag *
                  </label>
                  <select
                    required
                    value={eventForm.selectedTagId}
                    onChange={(e) => {
                      const tagId = e.target.value;
                      const selectedTag = tagsList.find(t => String(t.id) === String(tagId));
                      setEventForm({
                        ...eventForm,
                        selectedTagId: tagId,
                        category: selectedTag ? selectedTag.name : 'Concerts'
                      });
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#fff',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select Tag...</option>
                    {tagsList.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Host City *
                  </label>
                  <select
                    value={eventForm.city}
                    onChange={(e) => setEventForm({ ...eventForm, city: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
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
                  Banner Image (File Upload or URL)
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
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const res = await uploadApi.uploadFile(file);
                          setEventForm(prev => ({ ...prev, banner: res.url }));
                        } catch (err) {
                          alert(err.message || 'Upload failed');
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
