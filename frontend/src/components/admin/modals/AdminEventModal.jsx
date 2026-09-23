import React from 'react';
import { 
  X, 
  Calendar, 
  Tag, 
  MapPin, 
  Clock, 
  Grid, 
  FileText, 
  Sparkles, 
  Save, 
  RefreshCw 
} from 'lucide-react';
import SearchableSelect from '../../SearchableSelect';
import MultiSearchableSelect from '../../MultiSearchableSelect';
import EventCard from '../../EventCard';
import FileUploadField from '../FileUploadField';

export default function AdminEventModal({
  isOpen,
  onClose,
  eventForm,
  setEventForm,
  handleSaveEvent,
  isSaving,
  organizersList = [],
  tagsList = [],
  countriesList = [],
  citiesList = [],
  venuesList = [],
  auditoriumsList = [],
  onNavigateAuditoriums
}) {
  if (!isOpen) return null;

  const previewEvent = {
    id: eventForm.id || 'preview',
    title: eventForm.title || 'Your Event Title Preview',
    category: eventForm.category || 'Concerts',
    city: eventForm.city || 'Karachi',
    venue: eventForm.venue || 'Venue Location Name',
    banner: eventForm.banner || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=500&fit=crop',
    startingPrice: parseFloat(eventForm.startingPrice) || 1500,
    ticketingType: eventForm.ticketingType || 'categorized',
    status: (eventForm.status || 'Live').toUpperCase(),
    startDateUtc: eventForm.startDateUtc,
    endDateUtc: eventForm.endDateUtc
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(7, 11, 20, 0.82)', backdropFilter: 'blur(10px)', zIndex: 1000 }}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95%', padding: '2.25rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', border: '1px solid rgba(13, 148, 136, 0.25)', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(13, 148, 136, 0.15)', background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(7, 11, 20, 0.98))' }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#94a3b8', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.15s ease' }}
          title="Close Modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '1.75rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(37,99,235,0.45))', border: '1px solid rgba(59,130,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2dd4bf', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
            <Calendar size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.025em', marginBottom: '0.2rem' }}>
              {eventForm.id ? 'Edit Event Configuration' : 'Create & Publish New Event'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
              Configure basic information, location details, show slots, and row-wise or categorized ticket pricing.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '2rem', alignItems: 'start' }}>
          {/* Left Column: Event Form */}
          <div style={{ width: '100%' }}>
            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* SECTION 1: Basic Event Information */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Tag size={15} /> 1. Basic Event Details
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Event Title *</label>
                  <input type="text" required placeholder="Enter event title..." value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Organizer</label>
                    <SearchableSelect
                      value={eventForm.organizerId || ''}
                      placeholder="Select Organizer (Optional)..."
                      onChange={e => setEventForm({ ...eventForm, organizerId: e.target.value })}
                      options={organizersList.map(o => ({ value: o.id, label: o.name }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Publication Status</label>
                    <SearchableSelect
                      value={eventForm.status || 'Live'}
                      onChange={e => setEventForm({ ...eventForm, status: e.target.value })}
                      options={['Live', 'Draft', 'Completed', 'Cancelled']}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Event Category Tags</label>
                  <MultiSearchableSelect
                    value={eventForm.tagIds || []}
                    placeholder="Select relevant tags / music genres..."
                    onChange={e => setEventForm({ ...eventForm, tagIds: e.target.value })}
                    options={tagsList.map(t => ({ value: t.id, label: t.name }))}
                  />
                </div>
              </div>

              {/* SECTION 2: Location & Cascading Venue Details */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={15} /> 2. Location & Venue Selection (Cascading Hierarchy)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Country *</label>
                    <SearchableSelect
                      value={eventForm.countryId || (countriesList[0]?.id || '')}
                      onChange={e => {
                        const countryId = e.target.value;
                        const filteredCities = citiesList.filter(c => String(c.countryId) === String(countryId));
                        const defaultCity = filteredCities[0]?.id || '';
                        setEventForm(prev => ({ ...prev, countryId, cityId: defaultCity, venueId: '', auditoriumId: '' }));
                      }}
                      options={countriesList.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                      placeholder="Select Country..."
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>City *</label>
                    <SearchableSelect
                      value={eventForm.cityId || ''}
                      onChange={e => {
                        const cityId = e.target.value;
                        const filteredVenues = venuesList.filter(v => String(v.cityId) === String(cityId));
                        const defaultVenue = filteredVenues[0]?.id || '';
                        setEventForm(prev => ({ ...prev, cityId, venueId: defaultVenue, auditoriumId: '' }));
                      }}
                      options={citiesList
                        .filter(c => !eventForm.countryId || String(c.countryId) === String(eventForm.countryId))
                        .map(c => ({ value: c.id, label: c.name }))}
                      placeholder="Select City..."
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Venue *</label>
                    <SearchableSelect
                      value={eventForm.venueId || ''}
                      onChange={e => {
                        const venueId = e.target.value;
                        const filteredAuds = auditoriumsList.filter(a => String(a.venueId) === String(venueId));
                        setEventForm(prev => ({
                          ...prev,
                          venueId,
                          auditoriumId: filteredAuds[0]?.id || ''
                        }));
                      }}
                      options={venuesList
                        .filter(v => !eventForm.cityId || String(v.cityId) === String(eventForm.cityId))
                        .map(v => ({ value: v.id, label: v.name }))}
                      placeholder="Select Venue..."
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Auditorium / Stage Hall</label>
                    <SearchableSelect
                      value={eventForm.auditoriumId || ''}
                      onChange={e => {
                        const auditoriumId = e.target.value;
                        const selAud = auditoriumsList.find(a => String(a.id) === String(auditoriumId));
                        setEventForm(prev => ({
                          ...prev,
                          auditoriumId,
                          auditoriumLayout: selAud?.layoutCode || prev.auditoriumLayout
                        }));
                      }}
                      options={auditoriumsList
                        .filter(a => !eventForm.venueId || String(a.venueId) === String(eventForm.venueId))
                        .map(a => ({ value: a.id, label: `${a.name} (${a.totalCapacity} Seats)` }))}
                      placeholder="Select Auditorium Hall (Optional)..."
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Timings, Pricing & Layout */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={15} /> 3. Dates, Pricing & Ticketing Mode
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Primary Start Date & Time *</label>
                    <input type="datetime-local" value={eventForm.startDateUtc} onChange={e => setEventForm({ ...eventForm, startDateUtc: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Primary End Date & Time *</label>
                    <input type="datetime-local" value={eventForm.endDateUtc} onChange={e => setEventForm({ ...eventForm, endDateUtc: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Starting Price (PKR) *</label>
                    <input type="number" value={eventForm.startingPrice} onChange={e => setEventForm({ ...eventForm, startingPrice: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#2dd4bf', fontWeight: 700, fontSize: '0.9rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Price Range Display String</label>
                    <input type="text" placeholder="e.g. PKR 1,500 - PKR 5,000" value={eventForm.priceRange || ''} onChange={e => setEventForm({ ...eventForm, priceRange: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Ticketing Architecture Mode *</label>
                    <SearchableSelect
                      value={eventForm.ticketingType || 'categorized'}
                      onChange={e => setEventForm({ ...eventForm, ticketingType: e.target.value })}
                      options={[
                        { value: 'categorized', label: 'Tiered General Admission (Categorized without Seat Picker)' },
                        { value: 'mapped', label: 'Interactive Seating Chart (Auditorium Seat Picker)' }
                      ]}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Urgency / Scarcity Badge Text</label>
                    <input type="text" placeholder="e.g. Selling Fast - 85% Sold" value={eventForm.scarcityText || ''} onChange={e => setEventForm({ ...eventForm, scarcityText: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }} />
                  </div>
                </div>

                {eventForm.ticketingType === 'mapped' && (
                  <div style={{ background: 'rgba(13, 148, 136, 0.1)', border: '1px solid rgba(13, 148, 136, 0.3)', borderRadius: '12px', padding: '1rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2dd4bf', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Grid size={16} /> Select Auditorium Seating Layout *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onNavigateAuditoriums) onNavigateAuditoriums();
                        }}
                        style={{ background: 'none', border: 'none', color: '#2dd4bf', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Manage Auditoriums ↗
                      </button>
                    </div>
                    {auditoriumsList.length === 0 ? (
                      <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem' }}>
                        No auditorium layouts exist in database yet. Please go to <strong>Auditorium Charts</strong> tab to create one first.
                      </div>
                    ) : (
                      <SearchableSelect
                        value={eventForm.auditoriumLayout || auditoriumsList[0]?.layoutCode || ''}
                        onChange={e => {
                          const code = e.target.value;
                          const foundAud = auditoriumsList.find(a => a.layoutCode === code || a.name === code);
                          setEventForm(prev => ({
                            ...prev,
                            auditoriumLayout: code,
                            venue: prev.venue || foundAud?.venue || prev.venue,
                            city: prev.city || foundAud?.city || prev.city
                          }));
                        }}
                        options={auditoriumsList.map(a => {
                          const cName = venuesList.find(v => v.id === a.venueId)?.cityName || a.city;
                          return {
                            value: a.layoutCode || a.name,
                            label: `${a.name} (${cName ? `${cName} • ` : ''}${a.totalCapacity} Seats)`
                          };
                        })}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 4: Media Banner Upload */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem' }}>
                <FileUploadField
                  label="Event Banner Image (Recommended: 1200x500px)"
                  value={eventForm.banner}
                  onChange={(url) => setEventForm({ ...eventForm, banner: url })}
                  placeholder="Upload 1200x500px banner image or enter URL..."
                  type="events"
                  entityName={eventForm.title}
                  entityId={eventForm.id}
                />
              </div>

              {/* SECTION 5: Description & Visibility */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={15} /> 5. Description & Visibility Settings
                </div>

                <div style={{ display: 'flex', gap: '2rem', margin: '0.25rem 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input type="checkbox" checked={eventForm.isFeatured} onChange={e => setEventForm({ ...eventForm, isFeatured: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#0d9488' }} />
                    Featured Event
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input type="checkbox" checked={eventForm.isPublished} onChange={e => setEventForm({ ...eventForm, isPublished: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#0d9488' }} />
                    Published / Active
                  </label>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Event Description</label>
                  <textarea rows={4} placeholder="Write detailed description of the event..." value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }} />
                </div>
              </div>

              {/* Footer Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ flex: 1, padding: '0.85rem 1.25rem', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#cbd5e1', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{ flex: 2, padding: '0.85rem 1.5rem', background: 'linear-gradient(135deg, #059669 0%, #0f766e 100%)', border: '1px solid rgba(13, 148, 136, 0.5)', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, boxShadow: '0 4px 15px rgba(13, 148, 136, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.95rem' }}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" /> Saving Event...
                    </>
                  ) : (
                    <>
                      <Save size={18} /> {eventForm.id ? 'Update & Save Event' : 'Create & Publish Event'}
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Right Column: Live Event Card Preview */}
          <div style={{ minWidth: '300px', alignSelf: 'flex-start', position: 'sticky', top: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#2dd4bf', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.05em' }}>
              <Sparkles size={16} /> LIVE CARD PREVIEW
            </div>
            <EventCard event={previewEvent} onSelect={() => {}} isSaved={false} onToggleSave={() => {}} />
          </div>
        </div>

      </div>
    </div>
  );
}
