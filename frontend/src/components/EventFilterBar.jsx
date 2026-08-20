import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { CATEGORIES, CITIES } from '../data/mockEvents';

export default function EventFilterBar({
  selectedCategory,
  onSelectCategory,
  selectedCity,
  onSelectCity,
  sortBy,
  onSortChange
}) {
  return (
    <div style={{
      marginBottom: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {/* Category Pills Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem'
      }}>
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              style={{
                fontFamily: 'var(--font-display)',
                background: isActive 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' 
                  : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#ffffff' : '#cbd5e1',
                border: isActive ? '1px solid rgba(147, 197, 253, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.55rem 1.3rem',
                borderRadius: '9999px',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.88rem',
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isActive ? '0 4px 18px rgba(59, 130, 246, 0.45)' : 'none'
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* City & Sorting Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        backgroundColor: 'rgba(16, 25, 45, 0.6)',
        padding: '0.85rem 1.25rem',
        borderRadius: '16px',
        border: '1px solid rgba(59, 130, 246, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Filter by City:</span>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {CITIES.map((city) => (
              <button
                key={city}
                onClick={() => onSelectCity(city)}
                style={{
                  backgroundColor: selectedCity === city ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: selectedCity === city ? '#60a5fa' : '#94a3b8',
                  border: selectedCity === city ? '1px solid rgba(59, 130, 246, 0.45)' : '1px solid transparent',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SlidersHorizontal size={16} color="#94a3b8" />
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            style={{
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '8px',
              padding: '0.35rem 0.8rem',
              fontSize: '0.82rem',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="featured">Featured First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>
    </div>
  );
}
