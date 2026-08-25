import React from 'react';
import { SlidersHorizontal, Tag as TagIcon } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

const CITIES = ['All Cities', 'Karachi', 'Lahore', 'Islamabad'];

export default function EventFilterBar({
  tags = [],
  cities = [],
  selectedTag = 'All',
  onSelectTag,
  selectedCity = 'All Cities',
  onSelectCity,
  sortBy = 'featured',
  onSortChange
}) {
  const allTags = ['All', ...(tags || []).map(t => typeof t === 'string' ? t : t.name)];
  const cityList = cities && cities.length > 0
    ? ['All Cities', ...cities.map(c => typeof c === 'string' ? c : c.name)]
    : CITIES;

  return (
    <div style={{
      marginBottom: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {/* Dynamic Tag Pills Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem'
      }}>
        {allTags.map((tagName) => {
          const isActive = selectedTag === tagName;
          return (
            <button
              key={tagName}
              onClick={() => onSelectTag && onSelectTag(tagName)}
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
                boxShadow: isActive ? '0 4px 18px rgba(59, 130, 246, 0.45)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              {tagName !== 'All' && <TagIcon size={13} opacity={0.7} />}
              {tagName === 'All' ? 'All Events' : tagName}
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
            {cityList.map((city) => (
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
          <SearchableSelect
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            options={[
              { value: 'featured', label: 'Featured First' },
              { value: 'price-asc', label: 'Price: Low to High' },
              { value: 'price-desc', label: 'Price: High to Low' }
            ]}
            style={{ width: '180px' }}
          />
        </div>
      </div>
    </div>
  );
}
