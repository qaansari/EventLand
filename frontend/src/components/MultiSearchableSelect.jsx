import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Tag } from 'lucide-react';

export default function MultiSearchableSelect({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select tags...',
  searchPlaceholder = 'Search tags...',
  style = {},
  className = '',
  disabled = false,
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Format options array to array of { value, label }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: opt.value ?? opt.id ?? '', label: opt.label ?? opt.name ?? String(opt.value ?? opt.id ?? '') };
    }
    return { value: opt, label: String(opt) };
  });

  // Ensure value is array of numbers/strings
  const selectedValues = Array.isArray(value) ? value.map(v => String(v)) : [];

  // Filtered options based on search query
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

  const handleToggleOption = (val) => {
    if (disabled) return;
    const strVal = String(val);
    let updated;
    if (selectedValues.includes(strVal)) {
      updated = selectedValues.filter(v => v !== strVal);
    } else {
      updated = [...selectedValues, strVal];
    }
    
    // Maintain original ID types if numeric
    const parsedUpdated = updated.map(v => (isNaN(Number(v)) ? v : Number(v)));
    if (onChange) {
      onChange({ target: { value: parsedUpdated } });
    }
  };

  const handleRemoveChip = (e, val) => {
    e.stopPropagation();
    handleToggleOption(val);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange({ target: { value: [] } });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`multi-searchable-select-container ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      {/* Trigger Box with Selected Pill Chips */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          minHeight: '44px',
          padding: '0.45rem 0.75rem',
          backgroundColor: 'rgba(13, 30, 43, 0.75)',
          border: isOpen ? '1px solid #0d9488' : '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isOpen ? '0 0 12px rgba(13, 148, 136, 0.3)' : 'none',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', flex: 1 }}>
          {selectedValues.length > 0 ? (
            selectedValues.map((val) => {
              const opt = normalizedOptions.find(o => String(o.value) === String(val));
              const label = opt ? opt.label : val;
              return (
                <span
                  key={String(val)}
                  style={{
                    backgroundColor: 'rgba(13, 148, 136, 0.22)',
                    border: '1px solid rgba(13, 148, 136, 0.5)',
                    color: '#2dd4bf',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Tag size={12} color="#2dd4bf" />
                  {label}
                  <X
                    size={13}
                    color="#2dd4bf"
                    style={{ cursor: 'pointer', borderRadius: '50%' }}
                    onClick={(e) => handleRemoveChip(e, val)}
                  />
                </span>
              );
            })
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>
              {placeholder}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.75rem',
                cursor: 'pointer',
                padding: '0.1rem 0.3rem'
              }}
              title="Clear all selected"
            >
              Clear
            </button>
          )}
          <ChevronDown
            size={16}
            color="#94a3b8"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </div>

      {/* Hidden input for HTML required validation */}
      {required && (
        <input
          type="text"
          value={selectedValues.length > 0 ? selectedValues.join(',') : ''}
          required={required}
          readOnly
          style={{ opacity: 0, height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }}
        />
      )}

      {/* Glassmorphism Options Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(10, 16, 31, 0.95)',
            border: '1px solid rgba(13, 148, 136, 0.3)',
            borderRadius: '12px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(13, 148, 136, 0.15)',
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

          {/* Options Scroll List with Checkboxes */}
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '0.35rem'
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(String(opt.value));
                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => handleToggleOption(opt.value)}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#2dd4bf' : '#e2e8f0',
                      backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.2)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
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
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: isSelected ? '1px solid #0d9488' : '1px solid rgba(255, 255, 255, 0.25)',
                        backgroundColor: isSelected ? '#0d9488' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {isSelected && <Check size={13} color="#ffffff" />}
                    </div>
                    <span>{opt.label}</span>
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
