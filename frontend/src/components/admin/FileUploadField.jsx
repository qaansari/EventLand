import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { uploadApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function FileUploadField({ 
  label, 
  value, 
  onChange, 
  placeholder = "Image URL or upload file...", 
  type = "events", 
  entityName = null, 
  entityId = null 
}) {
  const { showSuccess, showError } = useToast();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await uploadApi.uploadFile(file, type, entityName, entityId);
      onChange(res.url);
      showSuccess('File Uploaded', `Saved image as ${res.fileName || 'asset image'}`);
    } catch (err) {
      const msg = err.message || 'Upload failed';
      setError(msg);
      showError('Upload Failed', msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
        />
        <label style={{
          padding: '0.75rem 1rem',
          background: 'linear-gradient(135deg, #0d9488, #0f766e)',
          borderRadius: '8px',
          color: '#fff',
          fontWeight: 600,
          fontSize: '0.85rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          whiteSpace: 'nowrap'
        }}>
          <UploadCloud size={16} /> {uploading ? 'Uploading...' : 'Upload File'}
          <input type="file" accept=".webp,.jpg,.jpeg,.png" onChange={handleFileChange} style={{ display: 'none' }} disabled={uploading} />
        </label>
      </div>
      {error && <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>{error}</span>}
      {value && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src={value} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }} onError={(e) => e.target.style.display = 'none'} />
          <span style={{ fontSize: '0.75rem', color: '#2dd4bf' }}>✓ Image ready</span>
        </div>
      )}
    </div>
  );
}
