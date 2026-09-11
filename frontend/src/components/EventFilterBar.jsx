import React, { useMemo } from 'react';
import { 
  Search, 
  X, 
  MapPin, 
  Building2, 
  Calendar, 
  Coins, 
  SlidersHorizontal, 
  RotateCcw, 
  Sparkles, 
  Music, 
  Mic, 
  Theater, 
  Trophy, 
  Users, 
  Film, 
  Compass, 
  Tag as TagIcon,
  Filter
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';

const DEFAULT_CITIES = ['All Cities', 'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi'];

const DATE_OPTIONS = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'this-weekend', label: 'This Weekend' },
  { value: 'this-month', label: 'This Month' }
];

const PRICE_OPTIONS = [
  { value: 'all', label: 'Any Price' },
  { value: 'free', label: 'Free Admission' },
  { value: 'under-2000', label: 'Under Rs. 2,000' },
  { value: '2000-5000', label: 'Rs. 2,000 – 5,000' },
  { value: 'above-5000', label: 'Rs. 5,000+' }
];

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured First' },
  { value: 'soonest', label: 'Date: Soonest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' }
];

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
  venues = [],
  loadingVenues = false,
  isCitySelected = false,
  selectedTag = 'All',
  onSelectTag,
  selectedCity = 'All Cities',
  onSelectCity,
  selectedVenue = 'All Venues',
  onSelectVenue,
  selectedDateFilter = 'all',
  onSelectDateFilter,
  customDate = '',
  onCustomDateChange,
  selectedPriceFilter = 'all',
  onSelectPriceFilter,
  sortBy = 'featured',
  onSortChange,
  searchQuery = '',
  onSearchChange,
  totalResults = 0,
  onClearAllFilters
}) {
  // Extract all categories / tags from API and events
  const allTags = useMemo(() => {
    const set = new Set();

    (tags || []).forEach(t => {
      const name = typeof t === 'string' ? t : (t?.name || t?.tagName);
      if (name) set.add(name);
    });

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

    if (set.size === 0) {
      ['Concert', 'Music', 'Comedy', 'Theatre', 'Festival', 'Workshop', 'Family'].forEach(t => set.add(t));
    }

    return ['All', ...Array.from(set).filter(Boolean)];
  }, [tags, events]);

  const cityList = useMemo(() => {
    if (cities && cities.length > 0) {
      return ['All Cities', ...cities.map(c => typeof c === 'string' ? c : c.name).filter(Boolean)];
    }
    return DEFAULT_CITIES;
  }, [cities]);

  // Cascading venue state: disabled unless a city is explicitly chosen
  const isCityChosen = Boolean(isCitySelected || (selectedCity && selectedCity !== 'All Cities'));
  const isVenueDisabled = !isCityChosen;

  // Options for venue select: disabled until city is chosen, then populated with cityId venues
  const formattedVenueOptions = useMemo(() => {
    if (isVenueDisabled) {
      return [{ value: 'All Venues', label: 'Select a city first' }];
    }
    if (loadingVenues) {
      return [{ value: 'All Venues', label: `Loading venues in ${selectedCity}...` }];
    }
    const cleanVenues = (venues || []).map(v => {
      const val = typeof v === 'object' && v !== null ? (v.name || v.label || v.value) : v;
      return String(val);
    }).filter(Boolean);

    if (cleanVenues.length === 0) {
      return [{ value: 'All Venues', label: `No venues found in ${selectedCity}` }];
    }

    return [
      { value: 'All Venues', label: `All ${selectedCity} Venues` },
      ...cleanVenues.map(v => ({ value: v, label: v }))
    ];
  }, [isVenueDisabled, loadingVenues, venues, selectedCity]);

  const venuePlaceholder = useMemo(() => {
    if (isVenueDisabled) return 'Select a city first...';
    if (loadingVenues) return `Loading ${selectedCity} venues...`;
    if (!venues || venues.length === 0) return `No venues in ${selectedCity}`;
    return `Venues in ${selectedCity}...`;
  }, [isVenueDisabled, loadingVenues, venues, selectedCity]);

  // Date options with custom date dynamic display
  const dateOptions = useMemo(() => [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'this-weekend', label: 'This Weekend' },
    { value: 'this-month', label: 'This Month' },
    { 
      value: 'custom', 
      label: customDate 
        ? `📅 ${new Date(customDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` 
        : 'Pick Specific Date...' 
    }
  ], [customDate]);

  // Determine active filters
  const activeFilters = useMemo(() => {
    const list = [];
    if (searchQuery.trim()) {
      list.push({ type: 'search', label: `Search: "${searchQuery.trim()}"`, clear: () => onSearchChange && onSearchChange('') });
    }
    if (selectedCity && selectedCity !== 'All Cities') {
      list.push({ type: 'city', label: `City: ${selectedCity}`, clear: () => onSelectCity && onSelectCity('All Cities') });
    }
    if (isCityChosen && selectedVenue && selectedVenue !== 'All Venues') {
      list.push({ type: 'venue', label: `Venue: ${selectedVenue}`, clear: () => onSelectVenue && onSelectVenue('All Venues') });
    }
    if (selectedDateFilter && selectedDateFilter !== 'all') {
      if (selectedDateFilter === 'custom') {
        const formatted = customDate 
          ? new Date(customDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Specific Date';
        list.push({ 
          type: 'date', 
          label: `Date: ${formatted}`, 
          clear: () => {
            onSelectDateFilter && onSelectDateFilter('all');
            onCustomDateChange && onCustomDateChange('');
          } 
        });
      } else {
        const opt = dateOptions.find(o => o.value === selectedDateFilter);
        list.push({ type: 'date', label: `Date: ${opt?.label || selectedDateFilter}`, clear: () => onSelectDateFilter && onSelectDateFilter('all') });
      }
    }
    if (selectedPriceFilter && selectedPriceFilter !== 'all') {
      const opt = PRICE_OPTIONS.find(o => o.value === selectedPriceFilter);
      list.push({ type: 'price', label: `Price: ${opt?.label || selectedPriceFilter}`, clear: () => onSelectPriceFilter && onSelectPriceFilter('all') });
    }
    if (selectedTag && selectedTag !== 'All') {
      list.push({ type: 'tag', label: `Category: ${selectedTag}`, clear: () => onSelectTag && onSelectTag('All') });
    }
    return list;
  }, [searchQuery, selectedCity, selectedVenue, isCityChosen, selectedDateFilter, customDate, dateOptions, selectedPriceFilter, selectedTag, onSearchChange, onSelectCity, onSelectVenue, onSelectDateFilter, onCustomDateChange, onSelectPriceFilter, onSelectTag]);

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <section 
      id="discovery-search-hub"
      aria-label="Event Discovery and Filters"
      className="discovery-hub-card"
    >
      {/* ── 1. Prominent Centerpiece Search Bar ────────────────────────── */}
      <div className="discovery-search-wrapper">
        <div className="discovery-search-icon-badge">
          <Search size={22} className="discovery-search-icon" />
        </div>
        
        <input
          id="discovery-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          placeholder="Search live concerts, standup comedy, festivals, venues, artists..."
          className="discovery-search-input"
          autoComplete="off"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange && onSearchChange('')}
            className="discovery-search-clear-btn"
            title="Clear search query"
            aria-label="Clear search input"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── 2. Filter Controls Grid ───────────────────────────────────── */}
      <div className="discovery-filters-grid">
        {/* City Filter */}
        <div className="discovery-filter-item">
          <label className="discovery-filter-label">
            <MapPin size={13} className="discovery-label-icon" />
            <span>City</span>
          </label>
          <SearchableSelect
            value={selectedCity}
            onChange={(e) => onSelectCity && onSelectCity(e.target.value)}
            options={cityList}
            icon={MapPin}
            placeholder="Select City..."
            className="discovery-select"
          />
        </div>

        {/* Venue Filter (Disabled until City is chosen) */}
        <div className="discovery-filter-item">
          <label 
            className="discovery-filter-label"
            style={{ 
              opacity: isVenueDisabled ? 0.45 : 1,
              transition: 'opacity 0.2s ease'
            }}
          >
            <Building2 size={13} className="discovery-label-icon" style={{ color: isVenueDisabled ? '#64748b' : '#2dd4bf' }} />
            <span>Venue {isCityChosen ? `(${selectedCity})` : ''}</span>
          </label>
          <SearchableSelect
            value={isVenueDisabled ? 'All Venues' : selectedVenue}
            onChange={(e) => onSelectVenue && onSelectVenue(e.target.value)}
            options={formattedVenueOptions}
            icon={Building2}
            placeholder={venuePlaceholder}
            disabled={isVenueDisabled || loadingVenues}
            className="discovery-select"
          />
        </div>

        {/* Date Range & Custom Date Filter */}
        <div className="discovery-filter-item">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
            <label className="discovery-filter-label">
              <Calendar size={13} className="discovery-label-icon" />
              <span>When</span>
            </label>
            <button
              type="button"
              onClick={() => {
                if (selectedDateFilter === 'custom') {
                  onSelectDateFilter && onSelectDateFilter('all');
                  onCustomDateChange && onCustomDateChange('');
                } else {
                  onSelectDateFilter && onSelectDateFilter('custom');
                  if (!customDate) {
                    const todayIso = new Date().toISOString().split('T')[0];
                    onCustomDateChange && onCustomDateChange(todayIso);
                  }
                }
              }}
              style={{
                background: selectedDateFilter === 'custom' ? 'rgba(45, 212, 191, 0.22)' : 'rgba(255, 255, 255, 0.06)',
                border: '1px solid',
                borderColor: selectedDateFilter === 'custom' ? 'rgba(45, 212, 191, 0.6)' : 'rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                padding: '2px 7px',
                fontSize: '0.68rem',
                fontWeight: 600,
                color: selectedDateFilter === 'custom' ? '#2dd4bf' : '#94a3b8',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.2s ease',
                lineHeight: 1.2
              }}
              title={selectedDateFilter === 'custom' ? "Switch to date presets" : "Pick a specific calendar date"}
            >
              <Calendar size={10} />
              <span>{selectedDateFilter === 'custom' ? 'Presets' : 'Custom'}</span>
            </button>
          </div>

          <SearchableSelect
            value={selectedDateFilter}
            onChange={(e) => {
              const val = e.target.value;
              onSelectDateFilter && onSelectDateFilter(val);
              if (val === 'custom' && !customDate) {
                const todayIso = new Date().toISOString().split('T')[0];
                onCustomDateChange && onCustomDateChange(todayIso);
              }
            }}
            options={dateOptions}
            icon={Calendar}
            placeholder="Select Date..."
            className="discovery-select"
          />

          {selectedDateFilter === 'custom' && (
            <div style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.4rem', animation: 'fadeIn 0.2s ease-out' }}>
              <input
                type="date"
                value={customDate || ''}
                onChange={(e) => onCustomDateChange && onCustomDateChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.88)',
                  border: '1px solid rgba(45, 212, 191, 0.5)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  boxShadow: '0 0 10px rgba(13, 148, 136, 0.25)',
                  colorScheme: 'dark'
                }}
              />
              {customDate && (
                <button
                  type="button"
                  onClick={() => {
                    onCustomDateChange && onCustomDateChange('');
                    onSelectDateFilter && onSelectDateFilter('all');
                  }}
                  title="Clear custom date"
                  aria-label="Clear custom date"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: '#94a3b8',
                    borderRadius: '8px',
                    padding: '0.55rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Price Range Filter */}
        <div className="discovery-filter-item">
          <label className="discovery-filter-label">
            <Coins size={13} className="discovery-label-icon" />
            <span>Price</span>
          </label>
          <SearchableSelect
            value={selectedPriceFilter}
            onChange={(e) => onSelectPriceFilter && onSelectPriceFilter(e.target.value)}
            options={PRICE_OPTIONS}
            icon={Coins}
            placeholder="Any Price..."
            className="discovery-select"
          />
        </div>

        {/* Sort By Filter */}
        <div className="discovery-filter-item">
          <label className="discovery-filter-label">
            <SlidersHorizontal size={13} className="discovery-label-icon" />
            <span>Sort By</span>
          </label>
          <SearchableSelect
            value={sortBy}
            onChange={(e) => onSortChange && onSortChange(e.target.value)}
            options={SORT_OPTIONS}
            icon={SlidersHorizontal}
            placeholder="Sort by..."
            className="discovery-select"
          />
        </div>
      </div>

      {/* ── 3. Category Tag Pills Row ──────────────────────────────────── */}
      <div className="discovery-categories-wrapper">
        <div className="filter-tags-row hide-scrollbar discovery-tags-scroll">
          {allTags.map((tagName) => {
            const isActive = selectedTag === tagName;
            return (
              <button
                key={tagName}
                type="button"
                onClick={() => onSelectTag && onSelectTag(tagName)}
                className={`discovery-tag-pill ${isActive ? 'active' : ''}`}
              >
                {getCategoryIcon(tagName)}
                <span>{tagName === 'All' ? 'All Events' : tagName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Active Filter Chips & Reset Row ─────────────────────────── */}
      {hasActiveFilters && (
        <div className="discovery-active-filters-row">
          <div className="discovery-active-chips-list">
            <span className="discovery-active-label">
              <Filter size={13} /> Active Filters:
            </span>

            {activeFilters.map((af, idx) => (
              <span key={`${af.type}-${idx}`} className="discovery-active-chip">
                <span>{af.label}</span>
                <button
                  type="button"
                  onClick={af.clear}
                  className="discovery-chip-remove-btn"
                  title="Remove this filter"
                  aria-label={`Remove filter ${af.label}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={onClearAllFilters}
            className="discovery-reset-all-btn"
            title="Reset all search filters"
          >
            <RotateCcw size={13} />
            <span>Reset All</span>
          </button>
        </div>
      )}
    </section>
  );
}
