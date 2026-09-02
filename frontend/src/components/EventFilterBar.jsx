import React, { useMemo } from 'react';
import { SlidersHorizontal, Tag as TagIcon, Music, Mic, Theater, Sparkles, Trophy, Users, Film, Compass, Calendar } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

const CITIES = ['All Cities', 'Karachi', 'Lahore', 'Islamabad'];

// Helper to get matching category icon for quick visual discovery
function getCategoryIcon(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('music') || n.includes('concert') || n.includes('qawwali') || n.includes('band')) return <Music size={14} />;
  if (n.includes('comedy') || n.includes('standup') || n.includes('open mic')) return <Mic size={14} />;
  if (n.includes('theatre') || n.includes('drama') || n.includes('play')) return <Theater size={14} />;
  if (n.includes('fest') || n.includes('party') || n.includes('night')) return <Sparkles size={14} />;
  if (n.includes('sport') || n.includes('cricket') || n.includes('match')) return <Trophy size={14} />;
  if (n.includes('family') || n.includes('kids') || n.includes('expo')) return <Users size={14} />;
  if (n.includes('film') || n.includes('movie') || n.includes('cinema')) return <Film size={14} />;
  if (n === 'all') return <Compass size={14} />;
  return <TagIcon size={14} />;
}

export default function EventFilterBar({
  tags = [],
  events = [],
  cities = [],
  selectedTag = 'All',
  onSelectTag,
  selectedCity = 'All Cities',
  onSelectCity,
  sortBy = 'featured',
  onSortChange
}) {
  const allTags = useMemo(() => {
    const set = new Set();

    // 1. Tags passed from API
    (tags || []).forEach(t => {
      const name = typeof t === 'string' ? t : (t?.name || t?.tagName);
      if (name) set.add(name);
    });

    // 2. Extract tags from events
    (events || []).forEach(ev => {
      if (ev.tag) set.add(typeof ev.tag === 'string' ? ev.tag : ev.tag.name);
      if (ev.category) set.add(typeof ev.category === 'string' ? ev.category : ev.category.name);
      if (Array.isArray(ev.tags)) {
        ev.tags.forEach(t => set.add(typeof t === 'string' ? t : (t?.name || t?.tag?.name)));
      }
      if (Array.isArray(ev.eventTags)) {
        ev.eventTags.forEach(t => set.add(typeof t === 'string' ? t : (t?.name || t?.tagName || t?.tag?.name)));
      }
    });

    // 3. Popular defaults if set is small
    if (set.size === 0) {
      ['Concert', 'Music', 'Comedy', 'Theatre', 'Festival', 'Workshop', 'Family'].forEach(t => set.add(t));
    }

    return ['All', ...Array.from(set).filter(Boolean)];
  }, [tags, events]);

  const cityList = cities && cities.length > 0
    ? ['All Cities', ...cities.map(c => typeof c === 'string' ? c : c.name)]
    : CITIES;

  return (
    <div style={{
      marginBottom: '2.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {/* Dynamic Tag Pills Row with Smooth Scroll */}
      <div className="filter-tags-row hide-scrollbar" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        overflowX: 'auto',
        paddingBottom: '0.6rem',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
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
                  ? 'linear-gradient(135deg, #0d9488 0%, #059669 100%)' 
                  : 'rgba(255, 255, 255, 0.06)',
                color: isActive ? '#ffffff' : '#cbd5e1',
                border: isActive ? '1px solid rgba(45, 212, 191, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
                padding: '0.55rem 1.25rem',
                borderRadius: '9999px',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.88rem',
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                transform: isActive ? 'scale(1.02)' : 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(45, 212, 191, 0.4)';
                  e.currentTarget.style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.color = '#cbd5e1';
                }
              }}
            >
              {getCategoryIcon(tagName)}
              <span>{tagName === 'All' ? 'All Events' : tagName}</span>
            </button>
          );
        })}
      </div>

      {/* City & Sorting Strip */}
      <div className="filter-strip" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        backgroundColor: 'rgba(13, 30, 43, 0.65)',
        backdropFilter: 'blur(16px)',
        padding: '0.85rem 1.35rem',
        borderRadius: '16px',
        border: '1px solid rgba(13, 148, 136, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Quick City:</span>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {cityList.map((city) => {
              const isSelected = selectedCity === city;
              return (
                <button
                  key={city}
                  onClick={() => onSelectCity(city)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#2dd4bf' : '#94a3b8',
                    border: isSelected ? '1px solid rgba(45, 212, 191, 0.55)' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.09)';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.color = '#94a3b8';
                    }
                  }}
                >
                  {city}
                </button>
              );
            })}
          </div>
        </div>

        <div className="filter-sort-group" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <SlidersHorizontal size={16} color="#94a3b8" />
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Sort:</span>
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
