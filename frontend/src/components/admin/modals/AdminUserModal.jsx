import React from 'react';
import { X, RefreshCw } from 'lucide-react';
import SearchableSelect from '../../SearchableSelect';
import FileUploadField from '../FileUploadField';

export default function AdminUserModal({
  isOpen,
  onClose,
  userForm,
  setUserForm,
  handleSaveUser,
  isSaving,
  isSuperAdmin,
  countriesList = [],
  userRoleOptions = [],
  rolesList = [],
  organizersList = []
}) {
  if (!isOpen) return null;

  const selectedRole = rolesList.find(r => String(r.id) === String(userForm.roleId));
  const isOrgRole = selectedRole && selectedRole.name?.toLowerCase() === 'organizer';

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
          {userForm.id ? 'Edit User Account' : 'Create User Account'}
        </h3>
        <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Full Name *</label>
            <input type="text" required value={userForm.fullName} onChange={e => setUserForm({ ...userForm, fullName: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Email *</label>
            <input type="email" required disabled={Boolean(userForm.id)} value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Country</label>
            <SearchableSelect
              value={userForm.countryId}
              onChange={val => setUserForm({ ...userForm, countryId: parseInt(val, 10) })}
              options={countriesList.map(c => ({ id: c.id, label: `${c.name} (${c.dialingCode || c.code})` }))}
              placeholder="Select Country..."
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Mobile / Phone Number</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{
                padding: '0.75rem 0.85rem',
                background: 'rgba(13, 148, 136, 0.15)',
                border: '1px solid rgba(13, 148, 136, 0.35)',
                borderRadius: '8px',
                color: '#2dd4bf',
                fontWeight: 700,
                fontSize: '0.85rem',
                whiteSpace: 'nowrap'
              }}>
                {(countriesList.find(c => c.id === parseInt(userForm.countryId, 10))?.dialingCode) || '+92'}
              </div>
              <input
                type="tel"
                placeholder="331 2541767"
                value={userForm.phoneNumber || ''}
                onChange={e => setUserForm({ ...userForm, phoneNumber: e.target.value })}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
              If typed with leading '0', it will automatically be trimmed upon saving.
            </span>
          </div>
          {!userForm.id ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Password *</label>
              <input type="password" required value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                New Password <span style={{ color: '#ec4899', fontSize: '0.75rem' }}>(Super Admin Direct Update - Leave blank to keep current)</span>
              </label>
              <input type="password" placeholder="Enter new password to update directly..." value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: '8px', color: '#fff' }} />
            </div>
          )}
          <FileUploadField
            label="User Profile Image (Optional)"
            value={userForm.imageUrl}
            onChange={(url) => setUserForm({ ...userForm, imageUrl: url })}
            placeholder="Upload user image or enter URL..."
            type="users"
            entityName={userForm.fullName}
            entityId={userForm.id}
          />
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
              Assign Role * {!isSuperAdmin && <span style={{ color: '#2dd4bf', fontSize: '0.75rem' }}>(Organizer & Attendee only)</span>}
            </label>
            <SearchableSelect
              required
              value={userForm.roleId}
              onChange={val => setUserForm({ ...userForm, roleId: typeof val === 'object' && val !== null ? (val.value || val.target?.value) : val })}
              options={userRoleOptions}
              placeholder="Select Role..."
            />
          </div>
          {isOrgRole && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                Assign to Organizer Company * <span style={{ color: '#2dd4bf', fontSize: '0.75rem' }}>(Allows multi-user access to organizer events)</span>
              </label>
              <SearchableSelect
                value={userForm.organizerId || ''}
                onChange={val => setUserForm({ ...userForm, organizerId: typeof val === 'object' && val !== null ? (val.value || val.target?.value) : val })}
                options={organizersList.map(o => ({ value: o.id, label: o.name }))}
                placeholder="Select Organizer Company..."
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {isSaving ? <><RefreshCw size={16} className="animate-spin" /> Saving User...</> : (userForm.id ? 'Update User' : 'Save User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
