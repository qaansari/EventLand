import React from 'react';
import { X, RefreshCw } from 'lucide-react';
import SearchableSelect from '../../SearchableSelect';

export default function AdminTicketTierModal({
  isOpen,
  onClose,
  tierForm,
  setTierForm,
  handleSaveTicketTier,
  isSaving,
  eventsList = [],
  showsList = []
}) {
  if (!isOpen) return null;

  const selectedEv = eventsList.find(ev => String(ev.id) === String(tierForm.eventId));
  const showsForEv = (selectedEv?.shows && selectedEv.shows.length > 0)
    ? selectedEv.shows
    : showsList.filter(s => String(s.eventId) === String(tierForm.eventId));

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '2rem', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
          {tierForm.id ? 'Edit Ticket Tier' : 'Add Ticket Tier & Row Pricing'}
        </h3>
        <form onSubmit={handleSaveTicketTier} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Select Event *</label>
            <SearchableSelect
              required
              value={tierForm.eventId}
              onChange={e => setTierForm({ ...tierForm, eventId: e.target.value, eventShowId: '' })}
              options={eventsList.map(ev => ({ value: ev.id, label: ev.title }))}
              placeholder="Select Event..."
            />
          </div>

          {showsForEv.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Select Show Slot (Optional)</label>
              <SearchableSelect
                value={tierForm.eventShowId || ''}
                onChange={e => setTierForm({ ...tierForm, eventShowId: e.target.value })}
                options={showsForEv.map(s => ({ value: s.id, label: s.showTitle }))}
                placeholder="All Shows (General)"
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Tier / Row Category Name *</label>
            <input type="text" required placeholder="e.g. VIP Front Rows A-E" value={tierForm.name} onChange={e => setTierForm({ ...tierForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#2dd4bf', fontWeight: 700, marginBottom: '0.25rem' }}>Row Range (for Interactive Mapped Seating)</label>
            <input type="text" placeholder="e.g. G, A-F, H-K, or A, B, C" value={tierForm.rowRange || ''} onChange={e => setTierForm({ ...tierForm, rowRange: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '8px', color: '#2dd4bf', fontWeight: 700 }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Description / Perks</label>
            <input type="text" placeholder="e.g. Front row seating with fast-track entry" value={tierForm.description || ''} onChange={e => setTierForm({ ...tierForm, description: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Price per Ticket (PKR) *</label>
              <input type="number" required value={tierForm.price} onChange={e => setTierForm({ ...tierForm, price: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#2dd4bf', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Available Capacity</label>
              <input type="number" value={tierForm.availableQuantity || 100} onChange={e => setTierForm({ ...tierForm, availableQuantity: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {isSaving ? <><RefreshCw size={16} className="animate-spin" /> Saving Tier...</> : (tierForm.id ? 'Update Ticket Tier' : 'Save Tier & Price')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
