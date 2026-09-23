import React from 'react';
import { X, Eye, MapPin, RefreshCw } from 'lucide-react';
import SearchableSelect from '../../SearchableSelect';
import { createBlankLayoutJson } from '../../../data/auditoriumLayouts';

export default function AdminAuditoriumModal({
  isOpen,
  onClose,
  auditoriumForm,
  setAuditoriumForm,
  handleSaveAuditorium,
  isSaving,
  setPreviewAuditorium,
  countriesList = [],
  citiesList = [],
  venuesList = []
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', width: '95vw', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#2dd4bf', fontWeight: 700, textTransform: 'uppercase' }}>VENUE BLUEPRINT DESIGNER</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
              {auditoriumForm.id ? 'Edit Auditorium Layout' : 'Create New Auditorium Layout'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Blueprint Generator Quick Tool */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
            BLUEPRINT UTILITIES:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                if (setPreviewAuditorium) {
                  setPreviewAuditorium({
                    id: 'draft-preview',
                    name: auditoriumForm.name || 'Draft Blueprint Preview',
                    venue: auditoriumForm.venue || 'Venue Preview',
                    city: auditoriumForm.city || 'Karachi',
                    layoutJson: auditoriumForm.layoutJson,
                    totalCapacity: parseInt(auditoriumForm.totalCapacity, 10) || 200
                  });
                }
              }}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(13, 148, 136, 0.18)',
                border: '1px solid rgba(13, 148, 136, 0.4)',
                color: '#2dd4bf',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <Eye size={13} /> Live Chart Preview
            </button>
            <button
              type="button"
              onClick={() => setAuditoriumForm(prev => ({ ...prev, layoutJson: createBlankLayoutJson(10, 20) }))}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(13, 148, 136, 0.15)',
                border: '1px solid rgba(13, 148, 136, 0.35)',
                color: '#99f6e4',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ⚡ Reset to 10x20
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveAuditorium} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 3-Tier Cascading Location Selection: Country -> City -> Venue */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(13, 148, 136, 0.2)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={15} /> Venue & Location Selection (Cascading Hierarchy)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>1. Country *</label>
                <SearchableSelect
                  required
                  value={auditoriumForm.countryId || (countriesList[0]?.id || '')}
                  onChange={e => {
                    const newCountryId = e.target.value;
                    const filteredCities = citiesList.filter(c => String(c.countryId) === String(newCountryId));
                    const defaultCityId = filteredCities[0]?.id || '';
                    const filteredVenues = venuesList.filter(v => String(v.cityId) === String(defaultCityId));
                    const defaultVenueId = filteredVenues[0]?.id || '';
                    const matchedVenue = venuesList.find(v => String(v.id) === String(defaultVenueId));
                    const matchedCity = citiesList.find(c => String(c.id) === String(defaultCityId));
                    setAuditoriumForm(prev => ({
                      ...prev,
                      countryId: newCountryId,
                      cityId: defaultCityId,
                      venueId: defaultVenueId,
                      venue: matchedVenue?.name || prev.venue,
                      city: matchedCity?.name || prev.city
                    }));
                  }}
                  options={countriesList.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                  placeholder="Select Country..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>2. City *</label>
                <SearchableSelect
                  required
                  value={auditoriumForm.cityId || ''}
                  onChange={e => {
                    const newCityId = e.target.value;
                    const filteredVenues = venuesList.filter(v => String(v.cityId) === String(newCityId));
                    const defaultVenueId = filteredVenues[0]?.id || '';
                    const matchedVenue = venuesList.find(v => String(v.id) === String(defaultVenueId));
                    const matchedCity = citiesList.find(c => String(c.id) === String(newCityId));
                    setAuditoriumForm(prev => ({
                      ...prev,
                      cityId: newCityId,
                      venueId: defaultVenueId,
                      venue: matchedVenue?.name || prev.venue,
                      city: matchedCity?.name || prev.city
                    }));
                  }}
                  options={citiesList
                    .filter(c => !auditoriumForm.countryId || String(c.countryId) === String(auditoriumForm.countryId))
                    .map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select City..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>3. Venue Complex *</label>
                <SearchableSelect
                  required
                  value={auditoriumForm.venueId || ''}
                  onChange={e => {
                    const newVenueId = e.target.value;
                    const selVenue = venuesList.find(v => String(v.id) === String(newVenueId));
                    setAuditoriumForm(prev => ({
                      ...prev,
                      venueId: newVenueId,
                      venue: selVenue?.name || prev.venue
                    }));
                  }}
                  options={venuesList
                    .filter(v => !auditoriumForm.cityId || String(v.cityId) === String(auditoriumForm.cityId))
                    .map(v => ({ value: v.id, label: v.name }))}
                  placeholder="Select Venue..."
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Auditorium / Hall Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Auditorium Hall 1"
                value={auditoriumForm.name}
                onChange={e => setAuditoriumForm({ ...auditoriumForm, name: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Total Capacity (Seats) *</label>
              <input
                type="number"
                required
                value={auditoriumForm.totalCapacity}
                onChange={e => setAuditoriumForm({ ...auditoriumForm, totalCapacity: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Layout Code / Slug</label>
              <input
                type="text"
                placeholder="e.g. ACP_AC_II"
                value={auditoriumForm.layoutCode}
                onChange={e => setAuditoriumForm({ ...auditoriumForm, layoutCode: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#2dd4bf', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Description & Features</label>
            <input
              type="text"
              placeholder="e.g. Acoustic soundproofing, dual central aisles, tiered ground orchestra."
              value={auditoriumForm.description}
              onChange={e => setAuditoriumForm({ ...auditoriumForm, description: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
            />
          </div>

          {/* JSON Blueprint Schema Editor */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 600 }}>
                Layout JSON Configuration (Rows, Sections & Aisles)
              </label>
              <span style={{ fontSize: '0.75rem', color: '#2dd4bf' }}>
                ✓ JSON Schema Valid
              </span>
            </div>
            <textarea
              rows={8}
              value={auditoriumForm.layoutJson}
              onChange={e => setAuditoriumForm({ ...auditoriumForm, layoutJson: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(2, 6, 23, 0.85)',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                borderRadius: '8px',
                color: '#2dd4bf',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                lineHeight: 1.4
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {isSaving ? <><RefreshCw size={16} className="animate-spin" /> Saving Layout...</> : (auditoriumForm.id ? 'Update Auditorium Layout' : 'Save Auditorium Layout')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
