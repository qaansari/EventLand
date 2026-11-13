import { useState, useEffect } from 'react';
import { Sparkles, Grid, Layers, MapPin, CheckCircle, Download, RefreshCw, ShieldCheck, Coffee, Cigarette, Users, X } from 'lucide-react';
import EventCard from './EventCard';
import { uploadApi, adminApi, auditoriumLayoutsApi, locationsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import SearchableSelect from './SearchableSelect';
import MultiSearchableSelect from './MultiSearchableSelect';
import { exportAuditoriumChartPdf } from '../utils/pdfChartExporter';
import { parseAuditoriumLayout } from '../data/auditoriumLayouts';

const makePreviewId = () => `user-created-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

export default function EventOrganizerWizard({ onPublishEvent, onCancel, cities = [], currentUser = null }) {
  const { showError, showSuccess } = useToast();
  const [tagsList, setTagsList] = useState([]);
  const [auditoriumsList, setAuditoriumsList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [venuesList, setVenuesList] = useState([]);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [customAudienceText, setCustomAudienceText] = useState('');
  const [customFoodText, setCustomFoodText] = useState('');
  const [customSmokingText, setCustomSmokingText] = useState('');

  const audienceOptions = [
    'Open For All',
    'No Stags Allowed',
    'Couples Only',
    'Females Only',
    '18+ Only',
    'Students Only',
    'Children Below 5 Are Free',
    'Children Below 3 Are Free',
    'All Ages Have To Purchase Tickets',
    'No Children Below A Certain Age'
  ];

  const foodOptions = [
    'Outside Food Allowed',
    'Outside Food Not Allowed',
    'Outside Drinks Allowed',
    'Outside Drinks Not Allowed',
    'Outside Water Bottles Allowed',
    'Outside Water Bottles Not Allowed'
  ];

  const smokingOptions = [
    'Cigarettes Allowed',
    'Cigarettes Not Allowed',
    'Vapes Allowed',
    'Vapes Not Allowed'
  ];

  const parseJsonArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [val];
    }
  };

  const toggleArrayItem = (key, item) => {
    const arr = parseJsonArray(eventForm[key]);
    const exists = arr.includes(item);
    const updated = exists ? arr.filter(x => x !== item) : [...arr, item];
    setEventForm(prev => ({ ...prev, [key]: JSON.stringify(updated) }));
  };

  const addCustomItem = (key, text, clearFn) => {
    const trimmed = text?.trim();
    if (!trimmed) return;
    const arr = parseJsonArray(eventForm[key]);
    if (!arr.includes(trimmed)) {
      setEventForm(prev => ({ ...prev, [key]: JSON.stringify([...arr, trimmed]) }));
    }
    clearFn('');
  };

  const removeArrayItem = (key, item) => {
    const arr = parseJsonArray(eventForm[key]);
    setEventForm(prev => ({ ...prev, [key]: JSON.stringify(arr.filter(x => x !== item)) }));
  };

  const [eventForm, setEventForm] = useState({
    title: '',
    tagIds: [],
    countryId: '',
    cityId: '',
    venueId: '',
    category: 'Concerts',
    city: 'Karachi',
    venue: '',
    date: '',
    time: '7:00 PM Onwards',
    priceRange: 'PKR 2,000 - PKR 5,000',
    startingPrice: 2000,
    ticketingType: 'categorized', // 'categorized' or 'mapped'
    auditoriumLayout: '',
    banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    seatChartUrl: '',
    description: '',
    scarcityText: 'Selling Fast',
    organizer: 'Event Land',
    organizerContact: 'support@eventland.pk',
    tier1Name: 'Standard Entry',
    tier1Price: 2000,
    tier2Name: 'VIP Pass',
    tier2Price: 4500,
    eventType: 'Event',
    attractionsOrActivities: 'X',
    venueEnvironment: 'Indoor',
    dressCode: '',
    foodDrinksAvailable: false,
    foodDrinksIncluded: false,
    petsAllowed: false,
    parkingAvailable: false,
    valetAvailable: false,
    seatingArrangement: 'Seating',
    wheelchairAccessible: false,
    audienceRestrictions: '[]',
    foodDrinksRestrictions: '[]',
    smokingRestrictions: '[]',
    ticketNameChangeAllowed: 'Yes',
    ticketNamePolicy: 'Only the person whose name is on the ticket can use the ticket',
    ticketDaysInterchangeable: 'No'
  });

  useEffect(() => {
    Promise.all([
      adminApi.tags.getAll().catch(() => []),
      auditoriumLayoutsApi.getAll().catch(() => []),
      locationsApi.getCountries().catch(() => []),
      locationsApi.getCities().catch(() => []),
      locationsApi.getVenues().catch(() => [])
    ]).then(([tags, auds, cnts, cts, vns]) => {
      setTagsList(tags || []);
      const audList = auds || [];
      setAuditoriumsList(audList);
      setCountriesList(cnts || []);
      const cityData = cts || [];
      setCitiesList(cityData);
      setVenuesList(vns || []);

      if (audList.length > 0) {
        setEventForm(prev => ({
          ...prev,
          auditoriumLayout: prev.auditoriumLayout || audList[0].layoutCode || audList[0].name
        }));
      }
    });
  }, []);

  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const selectedAuditorium = auditoriumsList.find(
    a => a.layoutCode === eventForm.auditoriumLayout || a.name === eventForm.auditoriumLayout
  ) || auditoriumsList[0];

  const previewEventObject = {
    id: makePreviewId(),
    title: eventForm.title || 'Your Event Title Here',
    category: eventForm.category,
    status: 'Live', // 'Draft', 'Live', 'Completed', 'Cancelled'
    isFeatured: true,
    isPublished: true,
    city: eventForm.city,
    venue: eventForm.venue || 'Venue Address, City',
    date: eventForm.date || 'TBD 2026',
    startDateUtc: eventForm.date,
    endDateUtc: eventForm.date,
    time: eventForm.time,
    priceRange: eventForm.priceRange || `PKR ${Number(eventForm.startingPrice || 0).toLocaleString()} - 5,000`,
    startingPrice: Number(eventForm.startingPrice || 1000),
    ticketingType: eventForm.ticketingType,
    auditoriumLayout: eventForm.auditoriumLayout,
    banner: eventForm.banner,
    description: eventForm.description || 'Provide a compelling description of your concert or festival.',
    organizer: eventForm.organizer || 'Organizer Name',
    scarcityText: eventForm.scarcityText || 'New Listing - Selling Fast',
    tagIds: (eventForm.tagIds || []).map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(Boolean),
    eventTags: (eventForm.tagIds || []).map(id => {
      const found = tagsList.find(t => t.id == id || t.name === id);
      return found ? { id: found.id, name: found.name, slug: found.slug } : null;
    }).filter(Boolean),
    tags: (eventForm.tagIds || []).map(id => {
      const found = tagsList.find(t => t.id == id || t.name === id);
      return found ? { id: found.id, name: found.name, slug: found.slug } : null;
    }).filter(Boolean),
    ticketTiers: eventForm.ticketingType === 'categorized' ? [
      { id: 't1', name: eventForm.tier1Name, price: Number(eventForm.tier1Price || 2000), description: 'Standard admission pass' },
      { id: 't2', name: eventForm.tier2Name, price: Number(eventForm.tier2Price || 4500), description: 'Fast track VIP entry pass' }
    ] : [
      { id: 't1', name: 'General Entry', price: Number(eventForm.startingPrice || 2500), description: 'Standard seat booking' }
    ],
    seatingZones: eventForm.ticketingType === 'mapped' ? [
      {
        zone: selectedAuditorium?.name || 'Auditorium Main Hall',
        rows: 10,
        cols: 20,
        price: Number(eventForm.startingPrice || 2500),
        layoutJson: selectedAuditorium?.layoutJson || eventForm.auditoriumLayout || ''
      }
    ] : [],
    seatChartUrl: eventForm.seatChartUrl || null,
    eventType: eventForm.eventType || 'Event',
    attractionsOrActivities: eventForm.attractionsOrActivities || 'X',
    venueEnvironment: eventForm.venueEnvironment || 'Indoor',
    dressCode: eventForm.dressCode || null,
    foodDrinksAvailable: Boolean(eventForm.foodDrinksAvailable),
    foodDrinksIncluded: Boolean(eventForm.foodDrinksIncluded),
    petsAllowed: Boolean(eventForm.petsAllowed),
    parkingAvailable: Boolean(eventForm.parkingAvailable),
    valetAvailable: Boolean(eventForm.valetAvailable),
    seatingArrangement: eventForm.seatingArrangement || 'Seating',
    wheelchairAccessible: Boolean(eventForm.wheelchairAccessible),
    audienceRestrictions: typeof eventForm.audienceRestrictions === 'string' ? eventForm.audienceRestrictions : JSON.stringify(eventForm.audienceRestrictions || []),
    foodDrinksRestrictions: typeof eventForm.foodDrinksRestrictions === 'string' ? eventForm.foodDrinksRestrictions : JSON.stringify(eventForm.foodDrinksRestrictions || []),
    smokingRestrictions: typeof eventForm.smokingRestrictions === 'string' ? eventForm.smokingRestrictions : JSON.stringify(eventForm.smokingRestrictions || []),
    ticketNameChangeAllowed: eventForm.ticketNameChangeAllowed || 'Yes',
    ticketNamePolicy: eventForm.ticketNamePolicy || 'Only the person whose name is on the ticket can use the ticket',
    ticketDaysInterchangeable: eventForm.ticketDaysInterchangeable || 'No'
  };

  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const selAudi = auditoriumsList.find(a => a.layoutCode === eventForm.auditoriumLayout || a.name === eventForm.auditoriumLayout);
    const resolvedVenue = eventForm.venue?.trim() || selAudi?.venue || selAudi?.name || 'Arts Council of Pakistan';

    if (!eventForm.title || !resolvedVenue || !eventForm.date) {
      showError('Validation Error', 'Please fill out Title, Venue, and Date before submitting.');
      return;
    }

    setPublishedSuccess(true);
    try {
      await onPublishEvent(previewEventObject);
    } catch (err) {
      setPublishedSuccess(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <span className="badge badge-live" style={{ marginBottom: '0.5rem' }}>
          ORGANIZER SELF-SERVICE PORTAL
        </span>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          color: '#fff',
          marginBottom: '0.4rem'
        }}>
          List Your Event & Sell Tickets Across Pakistan
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
          Publish your event in minutes. Choose between Categorized Passes or Mapped Seat Picker layout.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '2rem',
        alignItems: 'start'
      }}>
        {/* Form Container */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <form onSubmit={handleFormSubmit}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>
              1. Event Overview
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Event Title *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Islamabad Sufi Night 2026"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(13, 148, 136, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Ticketing Type Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#2dd4bf', fontWeight: 700, marginBottom: '0.5rem' }}>
                  2. Select Ticketing Type *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div
                    onClick={() => setEventForm({ ...eventForm, ticketingType: 'categorized' })}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      backgroundColor: eventForm.ticketingType === 'categorized' ? 'rgba(13, 148, 136, 0.2)' : '#1e293b',
                      border: eventForm.ticketingType === 'categorized' ? '2px solid #0d9488' : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <Layers color="#0d9488" size={22} />
                    <div>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', display: 'block' }}>1) Categorized</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tiered Passes (VIP, Standard)</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setEventForm({ ...eventForm, ticketingType: 'mapped' })}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      backgroundColor: eventForm.ticketingType === 'mapped' ? 'rgba(13, 148, 136, 0.2)' : '#1e293b',
                      border: eventForm.ticketingType === 'mapped' ? '2px solid #0d9488' : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <Grid color="#0d9488" size={22} />
                    <div>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', display: 'block' }}>2) Mapped</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Interactive Auditorium Seat Chart</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auditorium Layout Picker (when Mapped Ticketing) */}
              {eventForm.ticketingType === 'mapped' && (
                <div style={{ background: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.25)', borderRadius: '12px', padding: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#2dd4bf', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Select Auditorium / Hall Blueprint *
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.75rem' }}>
                    Choose the auditorium layout for reserved seat bookings:
                  </span>
                  
                  {auditoriumsList.length === 0 ? (
                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem' }}>
                      No auditorium layouts found in database. Contact an admin to configure an auditorium blueprint.
                    </div>
                  ) : (
                    <>
                      <SearchableSelect
                        value={eventForm.auditoriumLayout || auditoriumsList[0]?.layoutCode || ''}
                        onChange={(e) => {
                          const code = e.target.value;
                          const chosen = auditoriumsList.find(a => a.layoutCode === code || a.name === code);
                          setEventForm(prev => ({
                            ...prev,
                            auditoriumLayout: code,
                            venue: chosen?.venue ? `${chosen.venue}, ${chosen.city}` : prev.venue,
                            city: chosen?.city || prev.city
                          }));
                        }}
                        options={auditoriumsList.map(a => ({
                          value: a.layoutCode || a.name,
                          label: `${a.name} (${a.city} • ${a.totalCapacity} Seats)`
                        }))}
                      />

                      {selectedAuditorium && (
                        <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(13, 148, 136, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={15} color="#2dd4bf" />
                            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                              Selected: <strong style={{ color: '#fff' }}>{selectedAuditorium.name}</strong> ({selectedAuditorium.totalCapacity} seats layout)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedAuditorium || isExportingPdf) return;
                              setIsExportingPdf(true);
                              try {
                                const parsedBlueprint = parseAuditoriumLayout(selectedAuditorium.layoutJson);
                                const exported = await exportAuditoriumChartPdf({
                                  auditoriumName: selectedAuditorium.name || 'Main Auditorium',
                                  venueName: selectedAuditorium.venue || (eventForm.venue ? eventForm.venue.split(',')[0].trim() : '') || 'Alhamra Cultural Complex',
                                  cityName: selectedAuditorium.city || eventForm.city || 'Lahore',
                                  countryName: 'Pakistan',
                                  showName: '',
                                  showDate: eventForm.startDate ? new Date(eventForm.startDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '',
                                  resolvedBlueprint: parsedBlueprint,
                                  currentZone: { zone: selectedAuditorium.name, totalCapacity: selectedAuditorium.totalCapacity },
                                  eventTitle: ''
                                });
                                if (exported && showSuccess) {
                                  showSuccess('Chart Exported 📥', `${selectedAuditorium.name} seating chart downloaded as PDF.`);
                                }
                              } catch (err) {
                                console.error('Error exporting chart PDF:', err);
                                if (showError) showError('Export Failed', 'Failed to export auditorium chart to PDF.');
                              } finally {
                                setIsExportingPdf(false);
                              }
                            }}
                            disabled={isExportingPdf}
                            title="Download Seating Chart in PDF format with White Background"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              background: isExportingPdf ? 'rgba(5, 150, 105, 0.6)' : 'linear-gradient(135deg, #059669, #0f766e)',
                              border: '1px solid rgba(45, 212, 191, 0.4)',
                              color: '#fff',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: isExportingPdf ? 'wait' : 'pointer'
                            }}
                          >
                            {isExportingPdf ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" /> Exporting PDF...
                              </>
                            ) : (
                              <>
                                <Download size={14} /> Download Chart (PDF)
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Seat Chart Upload (Mapped Only) */}
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
                          Upload Seat Chart Reference Map (Optional for Mapped Events)
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Upload seating chart image or enter URL..."
                            value={eventForm.seatChartUrl}
                            onChange={(e) => setEventForm({ ...eventForm, seatChartUrl: e.target.value })}
                            style={{
                              flex: 1,
                              backgroundColor: '#1e293b',
                              border: '1px solid rgba(13, 148, 136, 0.25)',
                              borderRadius: '8px',
                              padding: '0.65rem 0.85rem',
                              color: '#fff',
                              fontSize: '0.85rem'
                            }}
                          />
                          <label style={{
                            padding: '0.65rem 0.95rem',
                            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}>
                            Upload File
                            <input
                              type="file"
                              accept=".webp,.jpg,.jpeg,.png"
                              style={{ display: 'none' }}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const res = await uploadApi.uploadFile(file, 'events', eventForm.title);
                                  setEventForm(prev => ({ ...prev, seatChartUrl: res.url }));
                                  showSuccess('Seat Chart Uploaded', `Saved seat chart image`);
                                } catch (err) {
                                  showError('Upload Failed', err.message || 'Image upload failed.');
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Select Event Tags (Multiple Allowed) *
                  </label>
                  <MultiSearchableSelect
                    value={eventForm.tagIds || []}
                    onChange={(e) => setEventForm({ ...eventForm, tagIds: e.target.value })}
                    options={tagsList.map(t => ({ value: t.id, label: t.name }))}
                    placeholder="Select one or multiple tags..."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Host City *
                  </label>
                  <SearchableSelect
                    value={eventForm.city}
                    onChange={(e) => setEventForm({ ...eventForm, city: e.target.value })}
                    options={
                      citiesList.length > 0
                        ? citiesList.map(c => (typeof c === 'string' ? c : c.name))
                        : (cities || []).map(c => (typeof c === 'string' ? c : c.name)).filter(Boolean)
                    }
                    placeholder="Select City..."
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Venue Full Address *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Lok Virsa Complex, Garden Avenue, Islamabad"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(13, 148, 136, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Event Date(s) *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. 15th Oct 2026"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(13, 148, 136, 0.25)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Starting Ticket Price (PKR) *
                  </label>
                  <input
                    required
                    type="number"
                    value={eventForm.startingPrice}
                    onChange={(e) => setEventForm({ ...eventForm, startingPrice: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(13, 148, 136, 0.25)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Event Banner Image <span style={{ color: '#2dd4bf', fontWeight: 700 }}>(Strict: 1200×500px)</span> *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/... or upload below"
                    value={eventForm.banner}
                    onChange={(e) => setEventForm({ ...eventForm, banner: e.target.value })}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(13, 148, 136, 0.25)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                  <label style={{
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}>
                    Upload File
                    <input
                      type="file"
                      accept=".webp,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const res = await uploadApi.uploadFile(file, 'events', eventForm.title);
                          setEventForm(prev => ({ ...prev, banner: res.url }));
                          showSuccess('Banner Uploaded', `Saved banner as ${res.fileName || 'event banner'}`);
                        } catch (err) {
                          showError('Upload Failed', err.message || 'Image upload failed.');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Event Description & Highlights
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your event lineup, gates open time, food options..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(13, 148, 136, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* SECTION: House Rules, Amenities & Flexibility Policies */}
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(13, 148, 136, 0.25)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={18} /> House Rules, Amenities & Ticket Policies
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Event Type *</label>
                    <select
                      value={eventForm.eventType}
                      onChange={e => setEventForm({ ...eventForm, eventType: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff' }}
                    >
                      <option value="Event">Event</option>
                      <option value="Workshop">Workshop</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Environment *</label>
                    <select
                      value={eventForm.venueEnvironment}
                      onChange={e => setEventForm({ ...eventForm, venueEnvironment: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff' }}
                    >
                      <option value="Indoor">Indoor</option>
                      <option value="Outdoor">Outdoor</option>
                      <option value="Both">Both (Indoor & Outdoor)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Seating *</label>
                    <input
                      type="text"
                      placeholder="Seating / Standing..."
                      value={eventForm.seatingArrangement}
                      onChange={e => setEventForm({ ...eventForm, seatingArrangement: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      Attractions / Activities * (Put 'X' if none)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Activities or X"
                      value={eventForm.attractionsOrActivities}
                      onChange={e => setEventForm({ ...eventForm, attractionsOrActivities: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      Dress Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Smart Casual"
                      value={eventForm.dressCode}
                      onChange={e => setEventForm({ ...eventForm, dressCode: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Amenities Switches */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Amenities & Access
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {[
                      { key: 'foodDrinksAvailable', label: 'Food/Drinks Available' },
                      { key: 'foodDrinksIncluded', label: 'Food/Drinks Included' },
                      { key: 'petsAllowed', label: 'Pets Allowed' },
                      { key: 'parkingAvailable', label: 'Parking Available' },
                      { key: 'valetAvailable', label: 'Valet Service' },
                      { key: 'wheelchairAccessible', label: 'Wheelchair Access' }
                    ].map(amenity => (
                      <label 
                        key={amenity.key} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.4rem', 
                          padding: '0.55rem 0.75rem', 
                          background: eventForm[amenity.key] ? 'rgba(13, 148, 136, 0.2)' : 'rgba(15, 23, 42, 0.6)', 
                          border: eventForm[amenity.key] ? '1px solid rgba(13, 148, 136, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)', 
                          borderRadius: '8px', 
                          cursor: 'pointer', 
                          color: eventForm[amenity.key] ? '#2dd4bf' : '#cbd5e1', 
                          fontSize: '0.78rem',
                          fontWeight: eventForm[amenity.key] ? 600 : 500
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(eventForm[amenity.key])}
                          onChange={e => setEventForm({ ...eventForm, [amenity.key]: e.target.checked })}
                          style={{ width: '15px', height: '15px', accentColor: '#0d9488' }}
                        />
                        {amenity.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Audience Restrictions */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <Users size={14} color="#38bdf8" />
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>Audience Restrictions *</label>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    {audienceOptions.map(opt => {
                      const selected = parseJsonArray(eventForm.audienceRestrictions).includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleArrayItem('audienceRestrictions', opt)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: selected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: selected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: selected ? '#38bdf8' : '#94a3b8'
                          }}
                        >
                          {selected ? '✓' : '+'} {opt}
                        </button>
                      );
                    })}
                    {parseJsonArray(eventForm.audienceRestrictions).filter(item => !audienceOptions.includes(item)).map(customItem => (
                      <span
                        key={customItem}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: 'rgba(56, 189, 248, 0.2)',
                          border: '1px solid #38bdf8',
                          color: '#38bdf8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        ✓ {customItem}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeArrayItem('audienceRestrictions', customItem)} />
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Custom restriction..."
                      value={customAudienceText}
                      onChange={e => setCustomAudienceText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem('audienceRestrictions', customAudienceText, setCustomAudienceText); }}}
                      style={{ flex: 1, padding: '0.5rem 0.75rem', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => addCustomItem('audienceRestrictions', customAudienceText, setCustomAudienceText)}
                      style={{ padding: '0.5rem 0.85rem', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '6px', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Food / Drinks Restrictions */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <Coffee size={14} color="#fbbf24" />
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>Food & Drink Policies *</label>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    {foodOptions.map(opt => {
                      const selected = parseJsonArray(eventForm.foodDrinksRestrictions).includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleArrayItem('foodDrinksRestrictions', opt)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: selected ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: selected ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: selected ? '#fbbf24' : '#94a3b8'
                          }}
                        >
                          {selected ? '✓' : '+'} {opt}
                        </button>
                      );
                    })}
                    {parseJsonArray(eventForm.foodDrinksRestrictions).filter(item => !foodOptions.includes(item)).map(customItem => (
                      <span
                        key={customItem}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: 'rgba(251, 191, 36, 0.2)',
                          border: '1px solid #fbbf24',
                          color: '#fbbf24',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        ✓ {customItem}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeArrayItem('foodDrinksRestrictions', customItem)} />
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Custom food/drink rule..."
                      value={customFoodText}
                      onChange={e => setCustomFoodText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem('foodDrinksRestrictions', customFoodText, setCustomFoodText); }}}
                      style={{ flex: 1, padding: '0.5rem 0.75rem', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => addCustomItem('foodDrinksRestrictions', customFoodText, setCustomFoodText)}
                      style={{ padding: '0.5rem 0.85rem', background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '6px', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Smoking Restrictions */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <Cigarette size={14} color="#f87171" />
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>Smoking & Vape Policies *</label>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    {smokingOptions.map(opt => {
                      const selected = parseJsonArray(eventForm.smokingRestrictions).includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleArrayItem('smokingRestrictions', opt)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: selected ? 'rgba(248, 113, 113, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: selected ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: selected ? '#f87171' : '#94a3b8'
                          }}
                        >
                          {selected ? '✓' : '+'} {opt}
                        </button>
                      );
                    })}
                    {parseJsonArray(eventForm.smokingRestrictions).filter(item => !smokingOptions.includes(item)).map(customItem => (
                      <span
                        key={customItem}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: 'rgba(248, 113, 113, 0.2)',
                          border: '1px solid #f87171',
                          color: '#f87171',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        ✓ {customItem}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeArrayItem('smokingRestrictions', customItem)} />
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Custom smoking rule..."
                      value={customSmokingText}
                      onChange={e => setCustomSmokingText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem('smokingRestrictions', customSmokingText, setCustomSmokingText); }}}
                      style={{ flex: 1, padding: '0.5rem 0.75rem', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => addCustomItem('smokingRestrictions', customSmokingText, setCustomSmokingText)}
                      style={{ padding: '0.5rem 0.85rem', background: 'rgba(248, 113, 113, 0.15)', border: '1px solid rgba(248, 113, 113, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Ticket Policies */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      Can Ticket Holder's Name Be Changed? *
                    </label>
                    <input
                      type="text"
                      placeholder="Yes / No"
                      value={eventForm.ticketNameChangeAllowed}
                      onChange={e => setEventForm({ ...eventForm, ticketNameChangeAllowed: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                      Are Ticket Days Interchangeable? *
                    </label>
                    <input
                      type="text"
                      placeholder="Yes / No / Not Applicable"
                      value={eventForm.ticketDaysInterchangeable}
                      onChange={e => setEventForm({ ...eventForm, ticketDaysInterchangeable: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Ticket Name Policy *
                  </label>
                  <select
                    value={eventForm.ticketNamePolicy}
                    onChange={e => setEventForm({ ...eventForm, ticketNamePolicy: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="Only the person whose name is on the ticket can use the ticket">
                      Only the person whose name is on the ticket can use the ticket
                    </option>
                    <option value="The ticket can be used by anyone (changing the name is not mandatory)">
                      The ticket can be used by anyone (changing the name is not mandatory)
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary"
                style={{ width: '30%' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={publishedSuccess}
                className="btn btn-primary"
                style={{
                  width: '70%',
                  padding: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: publishedSuccess ? 0.7 : 1,
                  cursor: publishedSuccess ? 'not-allowed' : 'pointer'
                }}
              >
                {publishedSuccess ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Publishing Event...</span>
                  </>
                ) : (
                  '🚀 Publish Event Live'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div style={{ position: 'sticky', top: '100px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            color: '#0d9488',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} /> LIVE CARD PREVIEW
            </span>
            <span style={{ fontSize: '0.75rem', color: '#2dd4bf', background: 'rgba(13, 148, 136, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(13, 148, 136, 0.3)' }}>
              1200×500px Banner
            </span>
          </div>

          <EventCard
            event={previewEventObject}
            onSelect={() => {}}
            isSaved={false}
            onToggleSave={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
