import React from 'react';
import { X, Clock, Calendar, RefreshCw } from 'lucide-react';
import SearchableSelect from '../../SearchableSelect';

export default function AdminShowSlotModal({
  isOpen,
  onClose,
  showForm,
  setShowForm,
  handleSaveShow,
  isSavingShow,
  eventsList = []
}) {
  if (!isOpen) return null;

  const selectedEv = eventsList.find(ev => String(ev.id) === String(showForm.eventId));

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '2rem', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={22} style={{ color: '#06b6d4' }} />
          {showForm.id ? 'Edit Show Slot' : 'Add Show Slot'}
        </h3>
        <form onSubmit={handleSaveShow} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Select Event *</label>
            <SearchableSelect
              required
              value={showForm.eventId}
              onChange={e => setShowForm({ ...showForm, eventId: e.target.value })}
              options={eventsList.map(ev => ({ value: ev.id, label: ev.title }))}
              placeholder="Select Event..."
            />
          </div>

          {selectedEv && (
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8125rem', color: '#67e8f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} style={{ flexShrink: 0 }} />
              <div>
                <strong>Allowed Event Date Range:</strong>
                <div style={{ marginTop: '0.125rem', opacity: 0.9 }}>
                  {selectedEv.startDateUtc ? new Date(selectedEv.startDateUtc).toLocaleString() : 'N/A'} &ndash; {selectedEv.endDateUtc ? new Date(selectedEv.endDateUtc).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Show Slot Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Afternoon Matinee / Day 1 Opening"
              value={showForm.showTitle}
              onChange={e => setShowForm({ ...showForm, showTitle: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Start Time *</label>
              <input
                type="datetime-local"
                required
                value={showForm.startTimeUtc}
                onChange={e => setShowForm({ ...showForm, startTimeUtc: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>End Time *</label>
              <input
                type="datetime-local"
                required
                value={showForm.endTimeUtc}
                onChange={e => setShowForm({ ...showForm, endTimeUtc: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingShow}
              style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #06b6d4, #0284c7)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSavingShow ? 'not-allowed' : 'pointer', opacity: isSavingShow ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {isSavingShow ? <><RefreshCw size={16} className="animate-spin" /> Saving Show...</> : (showForm.id ? 'Update Show Slot' : 'Save Show Slot')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
