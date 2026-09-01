import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  style = {},
  className = '',
  disabled = false,
  required = false,
  icon: LeadingIcon
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Format options array if array of strings or objects
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: opt.value ?? opt.id ?? '', label: opt.label ?? opt.name ?? String(opt.value ?? opt.id ?? '') };
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  // Filter options based on search query
  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    if (disabled) return;
    if (onChange) {
      // Pass synthetic event for compatibility with onChange(e => setVal(e.target.value))
      onChange({ target: { value: val } });
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.7rem 0.9rem',
          backgroundColor: 'rgba(13, 30, 43, 0.75)',
          border: isOpen ? '1px solid #0d9488' : '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '10px',
          color: selectedOption ? '#f8fafc' : '#94a3b8',
          fontSize: '0.875rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isOpen ? '0 0 12px rgba(13, 148, 136, 0.3)' : 'none',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {LeadingIcon && <LeadingIcon size={16} color="#2dd4bf" />}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          size={16}
          color="#94a3b8"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0
          }}
        />
      </button>

      {/* Hidden input for HTML form required validation */}
      {required && (
        <input
          type="text"
          value={value || ''}
          required={required}
          readOnly
          style={{ opacity: 0, height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }}
        />
      )}

      {/* Glassmorphism Popup Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(9, 23, 33, 0.95)',
            border: '1px solid rgba(13, 148, 136, 0.35)',
            borderRadius: '12px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7), 0 0 15px rgba(13, 148, 136, 0.2)',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {/* Search Input Box */}
          <div
            style={{
              padding: '0.6rem 0.75rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(13, 30, 43, 0.6)'
            }}
          >
            <Search size={14} color="#0d9488" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.825rem',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options Scroll List */}
          <div
            style={{
              maxHeight: '210px',
              overflowY: 'auto',
              padding: '0.35rem'
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#2dd4bf' : '#e2e8f0',
                      backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.2)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={14} color="#2dd4bf" />}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '0.75rem', fontSize: '0.82rem', color: '#64748b', textAlign: 'center' }}>
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
