import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Ticket, 
  Users, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  X,
  Star, 
  Trash2, 
  Edit3,
  Search, 
  Download, 
  Settings, 
  Building2, 
  AlertCircle,
  Plus,
  RefreshCw,
  Tag,
  Layers,
  MapPin,
  Calendar,
  UploadCloud,
  Music,
  UserCheck,
  Sparkles,
  Grid,
  Eye,
  Check,
  Save,
  Clock,
  FileText,
  Upload
} from 'lucide-react';
import { adminApi, uploadApi, getEventImageUrl, getOrganizerImageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';
import SearchableSelect from './SearchableSelect';
import MultiSearchableSelect from './MultiSearchableSelect';
import EventCard from './EventCard';
import InteractiveSeatPicker from './InteractiveSeatPicker';
import { parseAuditoriumLayout, createBlankLayoutJson } from '../data/auditoriumLayouts';

// --- File Upload Component Helper ---
function FileUploadField({ label, value, onChange, placeholder = "Image URL or upload file...", type = "events", entityName = null, entityId = null }) {
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
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
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
          <span style={{ fontSize: '0.75rem', color: '#34d399' }}>✓ Image ready</span>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ onSelectEvent }) {
  const { showSuccess, showError } = useToast();
  const [activeAdminTab, setActiveAdminTab] = useState('events'); // 'events', 'organizers', 'artists', 'bookings', 'users', 'roles', 'ticket-tiers', 'tags'
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Loaded Data States
  const [eventsList, setEventsList] = useState([]);
  const [organizersList, setOrganizersList] = useState([]);
  const [artistsList, setArtistsList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [tagsList, setTagsList] = useState([]);
  const [auditoriumsList, setAuditoriumsList] = useState([]);

  // Form Modal States
  const [showEventModal, setShowEventModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showArtistModal, setShowArtistModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showAuditoriumModal, setShowAuditoriumModal] = useState(false);
  const [previewAuditorium, setPreviewAuditorium] = useState(null);

  // --- Initial Form States ---
  const defaultEventForm = {
    id: null,
    title: '',
    category: 'Concerts',
    tagIds: [],
    status: 'Live',
    isFeatured: false,
    isPublished: true,
    city: 'Karachi',
    venue: '',
    address: '',
    startDateUtc: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    endDateUtc: new Date(Date.now() + 172800000).toISOString().slice(0, 16),
    priceRange: 'PKR 1,500 - PKR 5,000',
    startingPrice: 1500,
    ticketingType: 'categorized',
    auditoriumLayout: '',
    banner: '',
    description: 'Join us for an extraordinary live event experience featuring Pakistan top performers.',
    scarcityText: 'Selling Fast',
    organizerId: '',
    shows: []
  };

  const defaultAuditoriumForm = {
    id: null,
    name: '',
    venue: '',
    city: 'Karachi',
    layoutCode: '',
    totalCapacity: 200,
    description: '',
    layoutJson: createBlankLayoutJson(10, 20),
    isActive: true
  };

  const defaultOrgForm = {
    id: null,
    name: '',
    email: '',
    phone: '+92 300 0000000',
    logoUrl: '',
    websiteUrl: '',
    isVerified: true
  };

  const defaultArtistForm = {
    id: null,
    name: '',
    genre: 'Pop / Sufi Rock',
    role: 'Lead Vocalist',
    city: 'Lahore',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
    bio: 'Renowned Pakistani performer delivering electrifying live concert experiences.',
    availability: 'Available for National Tours',
    startingRate: 450000,
    rating: 4.9,
    showsDone: 85,
    isFeatured: true
  };

  const defaultTierForm = {
    id: null,
    eventId: '',
    name: 'General Pass',
    description: 'Standard Entry Access',
    price: 1500,
    availableQuantity: 100,
    maxPerOrder: 5,
    sortOrder: 1
  };

  const defaultUserForm = {
    id: null,
    email: '',
    password: '',
    fullName: '',
    roleId: '',
    phoneNumber: '+92 300 0000000'
  };

  const defaultRoleForm = {
    id: null,
    name: '',
    description: ''
  };

  const defaultTagForm = {
    id: null,
    name: '',
    slug: ''
  };

  // Form Binding States
  const [eventForm, setEventForm] = useState(defaultEventForm);
  const [orgForm, setOrgForm] = useState(defaultOrgForm);
  const [artistForm, setArtistForm] = useState(defaultArtistForm);
  const [tierForm, setTierForm] = useState(defaultTierForm);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [roleForm, setRoleForm] = useState(defaultRoleForm);
  const [tagForm, setTagForm] = useState(defaultTagForm);
  const [auditoriumForm, setAuditoriumForm] = useState(defaultAuditoriumForm);

  // Load Data from Backend API
  const fetchBackendData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setErrorMsg('');
    try {
      const [orgs, evs, arts, bks, rls, usrs, tgs, auds] = await Promise.all([
        adminApi.organizers.getAll().catch(() => []),
        adminApi.events.getAll(1, 50).catch(() => ({ items: [] })),
        adminApi.artists.getAll(1, 50).catch(() => ({ items: [] })),
        adminApi.bookings.getAll(1, 50).catch(() => ({ items: [] })),
        adminApi.roles.getAll().catch(() => []),
        adminApi.users.getAll(1, 50).catch(() => ({ items: [] })),
        adminApi.tags.getAll().catch(() => []),
        adminApi.auditoriumLayouts.getAll().catch(() => [])
      ]);

      const rawOrgs = Array.isArray(orgs) ? orgs : (orgs?.items || []);
      const normalizedOrgs = rawOrgs.map(o => ({
        id: o.id ?? o.Id,
        name: o.name ?? o.Name ?? '',
        email: o.email ?? o.Email ?? '',
        phone: o.phone ?? o.Phone ?? '',
        logoUrl: o.logoUrl ?? o.LogoUrl ?? '',
        websiteUrl: o.websiteUrl ?? o.WebsiteUrl ?? o.website ?? o.Website ?? '',
        isVerified: o.isVerified ?? o.IsVerified ?? true
      }));

      setOrganizersList(normalizedOrgs);
      setEventsList(evs.items || evs || []);
      setArtistsList(arts.items || arts || []);
      setBookingsList(bks.items || bks || []);
      setRolesList(rls || []);
      setUsersList(usrs.items || usrs || []);
      setTagsList(tgs || []);
      setAuditoriumsList(Array.isArray(auds) ? auds : (auds?.items || []));
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setErrorMsg(err.message || 'Failed to load backend data.');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendData(true);
  }, []);

  // --- CRUD: EVENTS ---
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const title = eventForm.title ? eventForm.title.trim() : '';
    const venue = eventForm.venue ? eventForm.venue.trim() : '';
    const orgId = parseInt(eventForm.organizerId, 10) || (organizersList[0]?.id || 1);

    if (!title) {
      const msg = 'Please enter an event title.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      setIsSaving(false);
      return;
    }
    if (!venue) {
      const msg = 'Please enter a venue.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      setIsSaving(false);
      return;
    }

    // Duplicate check for Event
    const isDupEvent = eventsList.some(ev => 
      String(ev.id) !== String(eventForm.id) && 
      ev.title.trim().toLowerCase() === title.toLowerCase() && 
      ev.venue.trim().toLowerCase() === venue.toLowerCase()
    );
    if (isDupEvent) {
      const msg = `An event titled '${title}' at venue '${venue}' already exists.`;
      setErrorMsg(msg);
      showError('Duplicate Event', msg);
      setIsSaving(false);
      return;
    }

    try {
      const tagIds = Array.isArray(eventForm.tagIds) && eventForm.tagIds.length > 0 
        ? eventForm.tagIds.map(id => parseInt(id, 10)) 
        : [];

      const startInputStr = eventForm.startDateUtc && !eventForm.startDateUtc.includes('+') && !eventForm.startDateUtc.includes('Z')
        ? `${eventForm.startDateUtc}:00+05:00`
        : eventForm.startDateUtc;

      const endInputStr = eventForm.endDateUtc && !eventForm.endDateUtc.includes('+') && !eventForm.endDateUtc.includes('Z')
        ? `${eventForm.endDateUtc}:00+05:00`
        : eventForm.endDateUtc;

      const startDate = new Date(startInputStr);
      const endDate = new Date(endInputStr);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        setErrorMsg('Invalid start or end date format.');
        showError('Invalid Date', 'Please select valid start and end dates.');
        setIsSaving(false);
        return;
      }

      const statusStr = typeof eventForm.status === 'number'
        ? (eventForm.status === 1 ? 'Live' : (eventForm.status === 2 ? 'Completed' : (eventForm.status === 3 ? 'Cancelled' : 'Draft')))
        : (eventForm.status || 'Live');

      const formattedShows = (eventForm.shows || []).map(s => ({
        showTitle: s.showTitle || 'Show Slot',
        startTimeUtc: s.startTimeUtc && !s.startTimeUtc.includes('+') && !s.startTimeUtc.includes('Z')
          ? `${s.startTimeUtc}:00+05:00`
          : (s.startTimeUtc || new Date().toISOString()),
        endTimeUtc: s.endTimeUtc && !s.endTimeUtc.includes('+') && !s.endTimeUtc.includes('Z')
          ? `${s.endTimeUtc}:00+05:00`
          : (s.endTimeUtc || new Date().toISOString()),
        startingPrice: parseFloat(s.startingPrice) || parseFloat(eventForm.startingPrice) || 1500,
        ticketTiers: (s.ticketTiers || []).map(t => ({
          name: t.name || 'Standard Pass',
          price: parseFloat(t.price) || parseFloat(s.startingPrice) || 1500,
          availableQuantity: parseInt(t.availableQuantity, 10) || 100,
          description: t.description || `${t.name || 'Standard'} pass for ${s.showTitle || 'Show'}`,
          rowRange: t.rowRange || null
        }))
      }));

      const payload = {
        title: title,
        category: eventForm.category || 'Concerts',
        status: statusStr,
        isFeatured: Boolean(eventForm.isFeatured),
        isPublished: eventForm.isPublished !== false,
        city: eventForm.city || 'Karachi',
        venue: venue,
        address: eventForm.address || venue,
        startDateUtc: startDate.toISOString(),
        endDateUtc: endDate.toISOString(),
        startingPrice: parseFloat(eventForm.startingPrice) || 0,
        ticketingType: eventForm.ticketingType || 'categorized',
        auditoriumLayout: eventForm.auditoriumLayout || '',
        banner: eventForm.banner || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=500&fit=crop',
        description: eventForm.description || title,
        scarcityText: eventForm.scarcityText || 'Selling Fast',
        organizerId: orgId,
        tagIds: tagIds,
        shows: formattedShows
      };

      if (eventForm.id) {
        await adminApi.events.update(eventForm.id, payload);
        const msg = 'Event updated successfully!';
        setSuccessMsg(msg);
        showSuccess('Event Saved', msg);
      } else {
        await adminApi.events.create(payload);
        const msg = 'Event created successfully!';
        setSuccessMsg(msg);
        showSuccess('Event Created', msg);
      }

      setShowEventModal(false);
      setEventForm(defaultEventForm);
      fetchBackendData();
    } catch (err) {
      console.error('Save Event Error:', err);
      const errMsg = err.message || 'Failed to save event.';
      setErrorMsg(errMsg);
      showError('Save Failed', errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditEvent = async (ev) => {
    let fullEv = ev;
    try {
      if (ev.id && adminApi?.events?.getById) {
        const fetched = await adminApi.events.getById(ev.id);
        if (fetched) fullEv = fetched;
      }
    } catch (err) {
      console.warn('Could not fetch full event detail for edit, using list item:', err);
    }

    const existingTagIds = fullEv.tags?.map(t => t.id) || fullEv.eventTags?.map(et => et.tagId) || [];
    setEventForm({
      id: fullEv.id,
      title: fullEv.title || '',
      category: fullEv.category || 'Concerts',
      tagIds: existingTagIds,
      status: fullEv.status || 'Live',
      isFeatured: Boolean(fullEv.isFeatured),
      isPublished: fullEv.isPublished !== false,
      city: fullEv.city || 'Karachi',
      venue: fullEv.venue || '',
      address: fullEv.address || fullEv.venue || '',
      startDateUtc: fullEv.startDateUtc ? fullEv.startDateUtc.slice(0, 16) : new Date().toISOString().slice(0, 16),
      endDateUtc: fullEv.endDateUtc ? fullEv.endDateUtc.slice(0, 16) : new Date().toISOString().slice(0, 16),
      priceRange: fullEv.priceRange || '',
      startingPrice: fullEv.startingPrice || 1500,
      ticketingType: (fullEv.ticketingType || 'categorized').toLowerCase(),
      auditoriumLayout: fullEv.seatingZones?.[0]?.layoutJson || fullEv.auditoriumLayout || '',
      banner: fullEv.banner || '',
      description: fullEv.description || '',
      scarcityText: fullEv.scarcityText || 'Selling Fast',
      organizerId: fullEv.organizerId || fullEv.organizer?.id || (organizersList[0]?.id || ''),
      shows: (fullEv.shows || []).map(s => ({
        id: s.id,
        showTitle: s.showTitle || '',
        startTimeUtc: s.startTimeUtc ? s.startTimeUtc.slice(0, 16) : '',
        endTimeUtc: s.endTimeUtc ? s.endTimeUtc.slice(0, 16) : '',
        startingPrice: s.startingPrice || (s.ticketTiers?.[0]?.price) || fullEv.startingPrice || 1500,
        ticketTiers: (s.ticketTiers || []).map(t => ({
          id: t.id,
          name: t.name || 'Standard Pass',
          price: t.price || 1500,
          availableQuantity: t.availableQuantity || 100,
          description: t.description || '',
          rowRange: t.rowRange || ''
        }))
      }))
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await adminApi.events.delete(id);
      const msg = 'Event deleted successfully.';
      setSuccessMsg(msg);
      showSuccess('Event Deleted 🗑️', msg);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Delete failed.';
      setErrorMsg(msg);
      showError('Delete Failed', msg);
    }
  };

  // --- CRUD: ORGANIZERS ---
  const handleSaveOrganizer = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    // Duplicate check for Organizer
    const isDupOrg = organizersList.some(o => 
      String(o.id) !== String(orgForm.id) && 
      (o.name.trim().toLowerCase() === (orgForm.name || '').trim().toLowerCase() ||
       (orgForm.email && o.email && o.email.trim().toLowerCase() === orgForm.email.trim().toLowerCase()))
    );
    if (isDupOrg) {
      const msg = `An organizer with the name '${orgForm.name}' or email '${orgForm.email}' already exists.`;
      setErrorMsg(msg);
      showError('Duplicate Organizer', msg);
      return;
    }

    try {
      const payload = {
        name: orgForm.name,
        email: orgForm.email,
        phone: orgForm.phone,
        logoUrl: orgForm.logoUrl,
        websiteUrl: orgForm.websiteUrl,
        isVerified: Boolean(orgForm.isVerified)
      };

      if (orgForm.id) {
        await adminApi.organizers.update(orgForm.id, payload);
        const msg = 'Organizer updated successfully!';
        setSuccessMsg(msg);
        showSuccess('Organizer Updated', msg);
      } else {
        await adminApi.organizers.create(payload);
        const msg = 'Organizer created successfully!';
        setSuccessMsg(msg);
        showSuccess('Organizer Created', msg);
      }
      setShowOrgModal(false);
      setOrgForm(defaultOrgForm);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Failed to save organizer.';
      setErrorMsg(msg);
      showError('Save Failed', msg);
    }
  };

  const handleEditOrganizer = (org) => {
    const webUrl = org.websiteUrl || org.WebsiteUrl || org.website || org.Website || '';
    setOrgForm({
      id: org.id ?? org.Id,
      name: org.name ?? org.Name ?? '',
      email: org.email ?? org.Email ?? '',
      phone: org.phone ?? org.Phone ?? '',
      logoUrl: org.logoUrl ?? org.LogoUrl ?? '',
      websiteUrl: webUrl,
      isVerified: org.isVerified ?? org.IsVerified ?? true
    });
    setShowOrgModal(true);
  };

  const handleDeleteOrganizer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this organizer?')) return;
    try {
      await adminApi.organizers.delete(id);
      const msg = 'Organizer deleted successfully.';
      setSuccessMsg(msg);
      showSuccess('Organizer Deleted 🗑️', msg);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Delete failed.';
      setErrorMsg(msg);
      showError('Delete Failed', msg);
    }
  };

  // --- CRUD: ARTISTS ---
  const handleSaveArtist = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    // Duplicate check for Artist
    const isDupArtist = artistsList.some(a => 
      String(a.id) !== String(artistForm.id) && 
      a.name.trim().toLowerCase() === (artistForm.name || '').trim().toLowerCase()
    );
    if (isDupArtist) {
      const msg = `An artist named '${artistForm.name}' already exists.`;
      setErrorMsg(msg);
      showError('Duplicate Artist', msg);
      return;
    }

    try {
      const payload = {
        name: artistForm.name,
        genre: artistForm.genre,
        role: artistForm.role,
        city: artistForm.city,
        imageUrl: artistForm.imageUrl,
        bio: artistForm.bio,
        availability: artistForm.availability,
        startingRate: parseFloat(artistForm.startingRate) || 0,
        rating: parseFloat(artistForm.rating) || 5.0,
        showsDone: parseInt(artistForm.showsDone, 10) || 0,
        isFeatured: Boolean(artistForm.isFeatured)
      };

      if (artistForm.id) {
        await adminApi.artists.update(artistForm.id, payload);
        const msg = 'Artist updated successfully!';
        setSuccessMsg(msg);
        showSuccess('Artist Updated', msg);
      } else {
        await adminApi.artists.create(payload);
        const msg = 'Artist created successfully!';
        setSuccessMsg(msg);
        showSuccess('Artist Created', msg);
      }
      setShowArtistModal(false);
      setArtistForm(defaultArtistForm);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Failed to save artist.';
      setErrorMsg(msg);
      showError('Save Failed', msg);
    }
  };

  const handleEditArtist = (art) => {
    setArtistForm({
      id: art.id,
      name: art.name || '',
      genre: art.genre || '',
      role: art.role || '',
      city: art.city || '',
      imageUrl: art.imageUrl || '',
      bio: art.bio || '',
      availability: art.availability || '',
      startingRate: art.startingRate || 0,
      rating: art.rating || 5.0,
      showsDone: art.showsDone || 0,
      isFeatured: art.isFeatured ?? true
    });
    setShowArtistModal(true);
  };

  const handleDeleteArtist = async (id) => {
    if (!window.confirm('Are you sure you want to delete this artist?')) return;
    try {
      await adminApi.artists.delete(id);
      const msg = 'Artist deleted successfully.';
      setSuccessMsg(msg);
      showSuccess('Artist Deleted 🗑️', msg);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Delete failed.';
      setErrorMsg(msg);
      showError('Delete Failed', msg);
    }
  };

  // --- CRUD: TICKET TIERS ---
  const handleSaveTicketTier = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!tierForm.eventId) {
      const msg = 'Please select an event.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    try {
      const payload = {
        eventId: parseInt(tierForm.eventId, 10),
        eventShowId: tierForm.eventShowId ? parseInt(tierForm.eventShowId, 10) : null,
        name: tierForm.name,
        description: tierForm.description || '',
        price: parseFloat(tierForm.price),
        availableQuantity: parseInt(tierForm.availableQuantity, 10) || 100,
        maxPerOrder: parseInt(tierForm.maxPerOrder, 10) || 5,
        sortOrder: parseInt(tierForm.sortOrder, 10) || 1
      };

      if (tierForm.id) {
        await adminApi.ticketTiers.update(tierForm.id, payload);
        const msg = 'Ticket tier updated successfully!';
        setSuccessMsg(msg);
        showSuccess('Ticket Tier Updated', msg);
      } else {
        await adminApi.ticketTiers.create(payload);
        const msg = 'Ticket tier created successfully!';
        setSuccessMsg(msg);
        showSuccess('Ticket Tier Created', msg);
      }
      setShowTierModal(false);
      setTierForm(defaultTierForm);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Failed to save ticket tier.';
      setErrorMsg(msg);
      showError('Save Failed', msg);
    }
  };

  // --- CRUD: USERS ---
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!userForm.roleId) {
      const msg = 'Please select a role.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    // Duplicate check for User
    if (!userForm.id) {
      const isDupUser = usersList.some(u => u.email.trim().toLowerCase() === (userForm.email || '').trim().toLowerCase());
      if (isDupUser) {
        const msg = `A user with the email '${userForm.email}' already exists.`;
        setErrorMsg(msg);
        showError('Duplicate User', msg);
        return;
      }
    }

    try {
      if (userForm.id) {
        const payload = {
          fullName: userForm.fullName,
          roleId: parseInt(userForm.roleId, 10),
          phoneNumber: userForm.phoneNumber,
          isActive: true
        };
        await adminApi.users.update(userForm.id, payload);
        const msg = 'User account updated successfully!';
        setSuccessMsg(msg);
        showSuccess('User Updated', msg);
      } else {
        const payload = {
          email: userForm.email,
          password: userForm.password,
          fullName: userForm.fullName,
          roleId: parseInt(userForm.roleId, 10),
          phoneNumber: userForm.phoneNumber
        };
        await adminApi.users.create(payload);
        const msg = 'User account created successfully!';
        setSuccessMsg(msg);
        showSuccess('User Created', msg);
      }
      setShowUserModal(false);
      setUserForm(defaultUserForm);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Failed to save user.';
      setErrorMsg(msg);
      showError('Save Failed', msg);
    }
  };

  const handleEditUser = (u) => {
    setUserForm({
      id: u.id,
      email: u.email || '',
      password: '',
      fullName: u.fullName || '',
      roleId: u.roleId || (rolesList[0]?.id || ''),
      phoneNumber: u.phoneNumber || ''
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminApi.users.delete(id);
      const msg = 'User account deleted.';
      setSuccessMsg(msg);
      showSuccess('User Deleted 🗑️', msg);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Delete failed.';
      setErrorMsg(msg);
      showError('Delete Failed', msg);
    }
  };

  // --- CRUD: ROLES ---
  const handleSaveRole = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    // Duplicate check for Role
    const isDupRole = rolesList.some(r => 
      String(r.id) !== String(roleForm.id) && 
      r.name.trim().toLowerCase() === (roleForm.name || '').trim().toLowerCase()
    );
    if (isDupRole) {
      const msg = `A role named '${roleForm.name}' already exists.`;
      setErrorMsg(msg);
      showError('Duplicate Role', msg);
      return;
    }

    try {
      if (roleForm.id) {
        await adminApi.roles.update(roleForm.id, { name: roleForm.name, description: roleForm.description });
        const msg = 'Role updated successfully!';
        setSuccessMsg(msg);
        showSuccess('Role Updated', msg);
      } else {
        await adminApi.roles.create({ name: roleForm.name, description: roleForm.description });
        const msg = 'Role created successfully!';
        setSuccessMsg(msg);
        showSuccess('Role Created', msg);
      }
      setShowRoleModal(false);
      setRoleForm(defaultRoleForm);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Failed to save role.';
      setErrorMsg(msg);
      showError('Save Failed', msg);
    }
  };

  const handleEditRole = (r) => {
    setRoleForm({ id: r.id, name: r.name, description: r.description || '' });
    setShowRoleModal(true);
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm('Delete role?')) return;
    try {
      await adminApi.roles.delete(id);
      const msg = 'Role deleted.';
      setSuccessMsg(msg);
      showSuccess('Role Deleted 🗑️', msg);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Delete failed.';
      setErrorMsg(msg);
      showError('Delete Failed', msg);
    }
  };

  // --- CRUD: TAGS ---
  const handleSaveTag = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const name = tagForm.name ? tagForm.name.trim() : '';
      const slug = (tagForm.slug ? tagForm.slug.trim() : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')).toLowerCase();
      
      if (!name) {
        const msg = 'Please enter a tag name.';
        setErrorMsg(msg);
        showError('Validation Error', msg);
        return;
      }

      // Duplicate check for Tag
      const isDupTag = tagsList.some(t => 
        String(t.id) !== String(tagForm.id) && 
        (t.name.trim().toLowerCase() === name.toLowerCase() || t.slug.trim().toLowerCase() === slug.toLowerCase())
      );
      if (isDupTag) {
        const msg = `A tag with the name '${name}' or slug '${slug}' already exists.`;
        setErrorMsg(msg);
        showError('Duplicate Tag', msg);
        return;
      }

      if (tagForm.id) {
        await adminApi.tags.update(tagForm.id, { name, slug });
        const msg = 'Tag updated successfully!';
        setSuccessMsg(msg);
        showSuccess('Tag Updated', msg);
      } else {
        await adminApi.tags.create({ name, slug });
        const msg = 'Tag created successfully!';
        setSuccessMsg(msg);
        showSuccess('Tag Created', msg);
      }
      setShowTagModal(false);
      setTagForm(defaultTagForm);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Failed to save tag.';
      setErrorMsg(msg);
      showError('Save Failed', msg);
    }
  };

  const handleEditTag = (t) => {
    setTagForm({
      id: t.id,
      name: t.name || '',
      slug: t.slug || ''
    });
    setShowTagModal(true);
  };

  const handleDeleteTag = async (id) => {
    if (!window.confirm('Delete tag?')) return;
    try {
      await adminApi.tags.delete(id);
      const msg = 'Tag deleted.';
      setSuccessMsg(msg);
      showSuccess('Tag Deleted 🗑️', msg);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Delete failed.';
      setErrorMsg(msg);
      showError('Delete Failed', msg);
    }
  };

  // --- CRUD: BOOKINGS ---
  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Delete booking?')) return;
    try {
      await adminApi.bookings.delete(id);
      const msg = 'Booking deleted successfully.';
      setSuccessMsg(msg);
      showSuccess('Booking Deleted 🗑️', msg);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Delete failed.';
      setErrorMsg(msg);
      showError('Delete Failed', msg);
    }
  };

  const handleUpdateBookingStatus = async (id, status, paymentStatus = null) => {
    try {
      const resolvedPaymentStatus = paymentStatus || (status === 'Cancelled' ? 'Refunded' : (status === 'Pending' ? 'Pending' : 'Paid'));
      await adminApi.bookings.updateStatus(id, status, resolvedPaymentStatus);
      const msg = `Booking status updated to ${status} (${resolvedPaymentStatus})`;
      setSuccessMsg(msg);
      showSuccess('Booking Updated', msg);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Update failed.';
      setErrorMsg(msg);
      showError('Update Failed', msg);
    }
  };

  // --- CRUD: AUDITORIUM LAYOUTS ---
  const handleSaveAuditorium = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!auditoriumForm.name || !auditoriumForm.venue) {
      const msg = 'Please enter an auditorium name and venue.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    const layoutCode = auditoriumForm.layoutCode || auditoriumForm.name.toUpperCase().replace(/\s+/g, '_');
    const isDupAuditorium = auditoriumsList.some(a => 
      String(a.id) !== String(auditoriumForm.id) && 
      (a.name.trim().toLowerCase() === auditoriumForm.name.trim().toLowerCase() ||
       a.layoutCode.trim().toLowerCase() === layoutCode.trim().toLowerCase())
    );
    if (isDupAuditorium) {
      const msg = `An auditorium layout with name '${auditoriumForm.name}' or code '${layoutCode}' already exists.`;
      setErrorMsg(msg);
      showError('Duplicate Layout', msg);
      return;
    }

    try {
      const payload = {
        name: auditoriumForm.name.trim(),
        venue: auditoriumForm.venue.trim(),
        city: auditoriumForm.city || 'Karachi',
        layoutCode: auditoriumForm.layoutCode || auditoriumForm.name.toUpperCase().replace(/\s+/g, '_'),
        totalCapacity: parseInt(auditoriumForm.totalCapacity, 10) || 200,
        description: auditoriumForm.description || '',
        layoutJson: typeof auditoriumForm.layoutJson === 'object' ? JSON.stringify(auditoriumForm.layoutJson) : (auditoriumForm.layoutJson || createBlankLayoutJson(10, 20)),
        isActive: auditoriumForm.isActive !== false
      };

      if (auditoriumForm.id) {
        await adminApi.auditoriumLayouts.update(auditoriumForm.id, payload);
        const msg = `Auditorium layout "${payload.name}" updated successfully!`;
        setSuccessMsg(msg);
        showSuccess('Layout Updated', msg);
      } else {
        await adminApi.auditoriumLayouts.create(payload);
        const msg = `Auditorium layout "${payload.name}" created successfully!`;
        setSuccessMsg(msg);
        showSuccess('Layout Created', msg);
      }

      setShowAuditoriumModal(false);
      setAuditoriumForm(defaultAuditoriumForm);
      fetchBackendData();
    } catch (err) {
      console.error('Save Auditorium Error:', err);
      setErrorMsg(err.message || 'Failed to save auditorium layout.');
      showError('Save Failed', err.message || 'Failed to save auditorium layout.');
    }
  };

  const handleEditAuditorium = (aud) => {
    setAuditoriumForm({
      id: aud.id,
      name: aud.name || '',
      venue: aud.venue || '',
      city: aud.city || 'Karachi',
      layoutCode: aud.layoutCode || '',
      totalCapacity: aud.totalCapacity || 200,
      description: aud.description || '',
      layoutJson: typeof aud.layoutJson === 'object' ? JSON.stringify(aud.layoutJson, null, 2) : (aud.layoutJson || ''),
      isActive: aud.isActive ?? true
    });
    setShowAuditoriumModal(true);
  };

  const handleDeleteAuditorium = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate / delete this auditorium layout?')) return;
    try {
      await adminApi.auditoriumLayouts.delete(id);
      setSuccessMsg('Auditorium layout deleted successfully.');
      showSuccess('Auditorium Deleted', 'Layout removed from roster.');
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Delete failed.');
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={32} color="#3b82f6" /> Super Admin Control Hub
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>
            Full CRUD Management for Events, Organizers, Artists, Bookings, Ticket Tiers, Users, Roles & Tags with Integrated Image Upload
          </p>
        </div>

        <button
          onClick={fetchBackendData}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            color: '#f8fafc',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Data
        </button>
      </div>



      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveAdminTab('events')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'events' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Ticket size={18} /> Events ({eventsList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('organizers')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'organizers' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Building2 size={18} /> Organizers ({organizersList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('artists')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'artists' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Music size={18} /> Artists ({artistsList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('bookings')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'bookings' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <DollarSign size={18} /> Bookings ({bookingsList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('users')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'users' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Users size={18} /> Users ({usersList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('roles')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'roles' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ShieldCheck size={18} /> Roles ({rolesList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('auditoriums')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'auditoriums' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Grid size={18} /> Auditorium Charts ({auditoriumsList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('tags')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'tags' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Tag size={18} /> Tags ({tagsList.length})
        </button>
      </div>

      {/* --- TAB 1: EVENTS MANAGEMENT --- */}
      {activeAdminTab === 'events' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Live Events Directory</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setTierForm(defaultTierForm); setShowTierModal(true); }}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={16} /> Add Ticket Tier
              </button>
              <button
                onClick={() => { setEventForm(defaultEventForm); setShowEventModal(true); }}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={16} /> Create Event
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem' }}>Title</th>
                  <th style={{ padding: '1rem' }}>Organizer</th>
                  <th style={{ padding: '1rem' }}>City</th>
                  <th style={{ padding: '1rem' }}>Starting Price</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {eventsList.map(ev => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {ev.banner && <img src={getEventImageUrl(ev.banner)} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />}
                        <div>
                          <div style={{ color: '#f8fafc', fontWeight: 600 }}>{ev.title}</div>
                          {ev.shows && ev.shows.length > 0 && (
                            <span style={{ fontSize: '0.7rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.1rem 0.4rem', borderRadius: '4px', marginTop: '0.2rem', display: 'inline-block', fontWeight: 600 }}>
                              {ev.shows.length} Show{ev.shows.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{ev.organizerName || ev.organizer}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{ev.city}</td>
                    <td style={{ padding: '1rem', color: '#4ade80', fontWeight: 600 }}>PKR {ev.startingPrice}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditEvent(ev)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '6px', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 2: ORGANIZERS MANAGEMENT --- */}
      {activeAdminTab === 'organizers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Organizers Directory</h3>
            <button
              onClick={() => { setOrgForm(defaultOrgForm); setShowOrgModal(true); }}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Add Organizer
            </button>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Email</th>
                  <th style={{ padding: '1rem' }}>Phone</th>
                  <th style={{ padding: '1rem' }}>Website</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizersList.map(org => (
                  <tr key={org.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {org.logoUrl && (
                          <img 
                            src={getOrganizerImageUrl(org.logoUrl)} 
                            alt="" 
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                          />
                        )}
                        <div>{org.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{org.email}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{org.phone}</td>
                    <td style={{ padding: '1rem', color: '#60a5fa' }}>
                      {(org.websiteUrl || org.WebsiteUrl) ? (
                        <a 
                          href={(org.websiteUrl || org.WebsiteUrl).startsWith('http') ? (org.websiteUrl || org.WebsiteUrl) : `https://${org.websiteUrl || org.WebsiteUrl}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: 500 }}
                        >
                          {(org.websiteUrl || org.WebsiteUrl).replace(/^https?:\/\//, '')} ↗
                        </a>
                      ) : (
                        <span style={{ color: '#64748b' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditOrganizer(org)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '6px', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOrganizer(org.id)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: ARTISTS MANAGEMENT --- */}
      {activeAdminTab === 'artists' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Artists Roster</h3>
            <button
              onClick={() => { setArtistForm(defaultArtistForm); setShowArtistModal(true); }}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #a855f7, #6b21a8)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Add Artist
            </button>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem' }}>Artist Name</th>
                  <th style={{ padding: '1rem' }}>Genre / Role</th>
                  <th style={{ padding: '1rem' }}>City</th>
                  <th style={{ padding: '1rem' }}>Starting Rate</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {artistsList.map(art => (
                  <tr key={art.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {art.imageUrl && <img src={art.imageUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />}
                        <div>{art.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#c084fc' }}>{art.genre} ({art.role})</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{art.city}</td>
                    <td style={{ padding: '1rem', color: '#4ade80', fontWeight: 600 }}>PKR {art.startingRate?.toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditArtist(art)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '6px', color: '#c084fc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteArtist(art.id)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: BOOKINGS MANAGEMENT --- */}
      {activeAdminTab === 'bookings' && (
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.5rem' }}>Customer Bookings Log</h3>
          <div className="glass-card" style={{ overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem' }}>Customer</th>
                  <th style={{ padding: '1rem' }}>Event</th>
                  <th style={{ padding: '1rem' }}>Amount</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookingsList.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', color: '#f8fafc' }}>
                      <div style={{ fontWeight: 600 }}>{b.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.customerEmail}</div>
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{b.eventTitle}</td>
                    <td style={{ padding: '1rem', color: '#4ade80', fontWeight: 600 }}>PKR {b.totalAmount}</td>
                    <td style={{ padding: '1rem' }}>
                      <SearchableSelect
                        value={b.status || 'Confirmed'}
                        onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                        options={['Confirmed', 'Completed', 'Cancelled', 'Pending']}
                        style={{ width: '130px' }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => handleDeleteBooking(b.id)}
                        style={{ padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 5: USERS MANAGEMENT --- */}
      {activeAdminTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>User Accounts</h3>
            <button
              onClick={() => { setUserForm(defaultUserForm); setShowUserModal(true); }}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Create User Account
            </button>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem' }}>Full Name</th>
                  <th style={{ padding: '1rem' }}>Email</th>
                  <th style={{ padding: '1rem' }}>Role</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#f8fafc' }}>{u.fullName}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{u.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', fontWeight: 600 }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditUser(u)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.4)', borderRadius: '6px', color: '#f472b6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 6: ROLES TABLE --- */}
      {activeAdminTab === 'roles' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Database System Roles</h3>
            <button
              onClick={() => { setRoleForm(defaultRoleForm); setShowRoleModal(true); }}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Create Role
            </button>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem' }}>Role Name</th>
                  <th style={{ padding: '1rem' }}>Description</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rolesList.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#f8fafc' }}>{r.name}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{r.description}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditRole(r)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '6px', color: '#60a5fa', cursor: 'pointer' }}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRole(r.id)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 7: TAGS TABLE --- */}
      {activeAdminTab === 'tags' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Event Categories & Tags</h3>
            <button
              onClick={() => { setTagForm(defaultTagForm); setShowTagModal(true); }}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #047857)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Create Tag
            </button>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem' }}>Tag Name</th>
                  <th style={{ padding: '1rem' }}>Slug</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tagsList.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#34d399' }}>{t.name}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{t.slug}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditTag(t)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '6px', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTag(t.id)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 8: AUDITORIUM CHARTS MANAGEMENT --- */}
      {activeAdminTab === 'auditoriums' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Auditorium Layouts & Seating Charts</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Create and manage custom auditorium seating charts.</p>
            </div>
            <button
              onClick={() => { setAuditoriumForm(defaultAuditoriumForm); setShowAuditoriumModal(true); }}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Add Auditorium Layout
            </button>
          </div>

          {auditoriumsList.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderRadius: '16px' }}>
              <Grid size={48} color="#3b82f6" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
              <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>No Auditorium Layouts In Database</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                You have not added any auditorium layouts yet. Click below to create your custom auditorium blueprint.
              </p>
              <button
                onClick={() => { setAuditoriumForm(defaultAuditoriumForm); setShowAuditoriumModal(true); }}
                style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                + Create Your First Auditorium
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {auditoriumsList.map(aud => (
                <div key={aud.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: '0.35rem' }}>
                        {aud.city} • {aud.totalCapacity} Seats
                      </span>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
                        {aud.name}
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        <MapPin size={13} style={{ display: 'inline', marginRight: '3px' }} /> {aud.venue}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.83rem', color: '#cbd5e1', lineHeight: 1.4, flexGrow: 1 }}>
                    {aud.description || 'Custom interactive venue blueprint.'}
                  </p>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <button
                      onClick={() => setPreviewAuditorium(aud)}
                      style={{ padding: '0.5rem 0.85rem', background: 'rgba(16, 185, 129, 0.18)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '6px', color: '#34d399', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                      <Eye size={14} /> Preview Chart
                    </button>
                    <button
                      onClick={() => handleEditAuditorium(aud)}
                      style={{ flex: 1, padding: '0.5rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '6px', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAuditorium(aud.id)}
                      style={{ padding: '0.5rem 0.8rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.82rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- MODAL 1: CREATE / EDIT EVENT --- */}
      {showEventModal && (() => {
        const previewEvent = {
          id: eventForm.id || 'preview',
          title: eventForm.title || 'Your Event Title Preview',
          category: eventForm.category || 'Concerts',
          city: eventForm.city || 'Karachi',
          venue: eventForm.venue || 'Venue Location Name',
          banner: eventForm.banner || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=500&fit=crop',
          startingPrice: parseFloat(eventForm.startingPrice) || 1500,
          ticketingType: eventForm.ticketingType || 'categorized',
          status: (eventForm.status || 'Live').toUpperCase(),
          startDateUtc: eventForm.startDateUtc,
          endDateUtc: eventForm.endDateUtc
        };

        return (
          <div className="modal-overlay" style={{ background: 'rgba(7, 11, 20, 0.82)', backdropFilter: 'blur(10px)', zIndex: 1000 }}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95%', padding: '2.25rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.25)', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(59, 130, 246, 0.15)', background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(7, 11, 20, 0.98))' }}>
              
              {/* Close Button */}
              <button
                onClick={() => setShowEventModal(false)}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#94a3b8', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.15s ease' }}
                title="Close Modal"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div style={{ marginBottom: '1.75rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(37,99,235,0.45))', border: '1px solid rgba(59,130,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
                  <Calendar size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.025em', marginBottom: '0.2rem' }}>
                    {eventForm.id ? 'Edit Event Configuration' : 'Create & Publish New Event'}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                    Configure basic information, location details, show slots, and row-wise or categorized ticket pricing.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '2rem', alignItems: 'start' }}>
                {/* Left Column: Event Form */}
                <div style={{ width: '100%' }}>
                  <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    {/* SECTION 1: Basic Event Information */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Tag size={15} /> 1. Basic Event Details
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Event Title *</label>
                        <input type="text" required placeholder="Enter event title..." value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Category *</label>
                          <SearchableSelect
                            required
                            value={eventForm.category}
                            onChange={e => setEventForm({ ...eventForm, category: e.target.value })}
                            options={["Concerts", "Festivals", "Qawwali", "Theatre", "Comedy", "Food", "Workshops", "Corporate"]}
                            placeholder="Select Category..."
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Organizer *</label>
                          <SearchableSelect
                            required
                            value={eventForm.organizerId || (organizersList[0]?.id || '')}
                            onChange={e => setEventForm({ ...eventForm, organizerId: e.target.value })}
                            options={organizersList.map(o => ({ value: o.id, label: o.name }))}
                            placeholder="Select Organizer..."
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Event Tags (Multiple)</label>
                          <MultiSearchableSelect
                            value={eventForm.tagIds || []}
                            onChange={e => setEventForm({ ...eventForm, tagIds: e.target.value })}
                            options={tagsList.map(t => ({ value: t.id, label: t.name }))}
                            placeholder="Select tags..."
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Event Status *</label>
                          <SearchableSelect
                            value={eventForm.status || 'Live'}
                            onChange={e => setEventForm({ ...eventForm, status: e.target.value })}
                            options={['Live', 'Draft', 'Completed', 'Cancelled']}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: Location & Venue Details */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MapPin size={15} /> 2. Location & Venue Info
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>City *</label>
                          <input type="text" required placeholder="e.g. Karachi, Lahore, Islamabad" value={eventForm.city} onChange={e => setEventForm({ ...eventForm, city: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Venue Name *</label>
                          <input type="text" required placeholder="e.g. Arts Council Open Air Theatre" value={eventForm.venue} onChange={e => setEventForm({ ...eventForm, venue: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }} />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Full Street Address</label>
                        <input type="text" placeholder="e.g. M.R. Kiyani Road, Saddar, Karachi" value={eventForm.address || ''} onChange={e => setEventForm({ ...eventForm, address: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }} />
                      </div>
                    </div>

                    {/* SECTION 3: Timings, Pricing & Layout */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={15} /> 3. Dates, Pricing & Ticketing Mode
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Start Date & Time (PKT)</label>
                          <input type="datetime-local" value={eventForm.startDateUtc} onChange={e => setEventForm({ ...eventForm, startDateUtc: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>End Date & Time (PKT)</label>
                          <input type="datetime-local" value={eventForm.endDateUtc} onChange={e => setEventForm({ ...eventForm, endDateUtc: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Starting Price (PKR)</label>
                          <input type="number" value={eventForm.startingPrice} onChange={e => setEventForm({ ...eventForm, startingPrice: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#38bdf8', fontWeight: 700, fontSize: '0.9rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Price Range Summary</label>
                          <input type="text" placeholder="e.g. PKR 1,500 - PKR 5,000" value={eventForm.priceRange || ''} onChange={e => setEventForm({ ...eventForm, priceRange: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Ticketing Mode</label>
                          <SearchableSelect
                            value={eventForm.ticketingType}
                            onChange={e => setEventForm({ ...eventForm, ticketingType: e.target.value })}
                            options={[
                              { value: 'categorized', label: 'Categorized Passes (Pass Tiers)' },
                              { value: 'mapped', label: 'Mapped Seat Picker (Row-Wise)' }
                            ]}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Badge / Scarcity Text</label>
                          <input type="text" placeholder="e.g. Selling Fast - 85% Sold" value={eventForm.scarcityText || ''} onChange={e => setEventForm({ ...eventForm, scarcityText: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }} />
                        </div>
                      </div>

                      {/* Auditorium Seating Chart Selector (if Mapped Ticketing) */}
                      {eventForm.ticketingType === 'mapped' && (
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '1rem', marginTop: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Grid size={16} /> Select Auditorium Seating Layout *
                            </label>
                            <button
                              type="button"
                              onClick={() => { setShowEventModal(false); setActiveAdminTab('auditoriums'); }}
                              style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Manage Auditoriums ↗
                            </button>
                          </div>
                          {auditoriumsList.length === 0 ? (
                            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem' }}>
                              No auditorium layouts exist in database yet. Please go to <strong>Auditorium Charts</strong> tab to create one first.
                            </div>
                          ) : (
                            <SearchableSelect
                              value={eventForm.auditoriumLayout || auditoriumsList[0]?.layoutCode || ''}
                              onChange={e => {
                                const code = e.target.value;
                                const foundAud = auditoriumsList.find(a => a.layoutCode === code || a.name === code);
                                setEventForm(prev => ({
                                  ...prev,
                                  auditoriumLayout: code,
                                  venue: prev.venue || foundAud?.venue || prev.venue,
                                  city: prev.city || foundAud?.city || prev.city
                                }));
                              }}
                              options={auditoriumsList.map(a => ({ value: a.layoutCode || a.name, label: `${a.name} (${a.city} • ${a.totalCapacity} Seats)` }))}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* SECTION 4: Media Banner Upload */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem' }}>
                      <FileUploadField
                        label="Event Banner Image (Recommended: 1200x500px)"
                        value={eventForm.banner}
                        onChange={(url) => setEventForm({ ...eventForm, banner: url })}
                        placeholder="Upload 1200x500px banner image or enter URL..."
                        type="events"
                        entityName={eventForm.title}
                        entityId={eventForm.id}
                      />
                    </div>

                    {/* SECTION 5: Show Slots & Ticket Pricing */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Ticket size={16} color="#60a5fa" /> Event Shows & Ticket Tier Pricing
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {eventForm.ticketingType === 'mapped' ? 'Set row-wise ticket prices (e.g. Row A, Rows B-E)' : 'Set category pass prices and stock limits'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newShows = [...(eventForm.shows || []), {
                              showTitle: `Show ${(eventForm.shows?.length || 0) + 1}`,
                              startTimeUtc: eventForm.startDateUtc || new Date().toISOString().slice(0, 16),
                              endTimeUtc: eventForm.endDateUtc || new Date().toISOString().slice(0, 16),
                              startingPrice: parseFloat(eventForm.startingPrice) || 1500,
                              ticketTiers: eventForm.ticketingType === 'mapped' ? [
                                { name: 'Platinum - 1st Row', rowRange: 'A', price: (parseFloat(eventForm.startingPrice) || 1500) * 2.5, availableQuantity: 25 },
                                { name: 'Diamond - Rows B-E', rowRange: 'B-E', price: (parseFloat(eventForm.startingPrice) || 1500) * 1.8, availableQuantity: 80 },
                                { name: 'Gold - Rows F-O', rowRange: 'F-O', price: parseFloat(eventForm.startingPrice) || 1500, availableQuantity: 150 }
                              ] : [
                                { name: 'Standard Pass', price: parseFloat(eventForm.startingPrice) || 1500, availableQuantity: 150 },
                                { name: 'VIP Pass', price: (parseFloat(eventForm.startingPrice) || 1500) * 2.25, availableQuantity: 50 }
                              ]
                            }];
                            setEventForm({ ...eventForm, shows: newShows });
                          }}
                          style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Plus size={14} /> Add Show Slot
                        </button>
                      </div>

                      {(eventForm.shows || []).length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', padding: '0.75rem 0' }}>
                          No show slots added yet. Click "+ Add Show Slot" above to define performance timings and ticket tier prices.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {eventForm.shows.map((s, sIdx) => (
                            <div key={sIdx} style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <div style={{ flex: 2 }}>
                                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Show Title</label>
                                  <input
                                    type="text"
                                    placeholder="Show Title (e.g. Matinee Show, Day 1)"
                                    value={s.showTitle}
                                    onChange={e => {
                                      const updated = [...eventForm.shows];
                                      updated[sIdx].showTitle = e.target.value;
                                      setEventForm({ ...eventForm, shows: updated });
                                    }}
                                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.8125rem' }}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Base Price (PKR)</label>
                                  <input
                                    type="number"
                                    placeholder="Base Price"
                                    value={s.startingPrice ?? eventForm.startingPrice ?? 1500}
                                    onChange={e => {
                                      const updated = [...eventForm.shows];
                                      updated[sIdx].startingPrice = parseFloat(e.target.value) || 0;
                                      setEventForm({ ...eventForm, shows: updated });
                                    }}
                                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', color: '#38bdf8', fontWeight: 700, fontSize: '0.8125rem' }}
                                  />
                                </div>
                                <button
                                  type="button"
                                  title="Delete Show Slot"
                                  onClick={() => {
                                    const updated = eventForm.shows.filter((_, idx) => idx !== sIdx);
                                    setEventForm({ ...eventForm, shows: updated });
                                  }}
                                  style={{ padding: '0.5rem', marginTop: '1rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Start Time (PKT)</label>
                                  <input
                                    type="datetime-local"
                                    value={s.startTimeUtc}
                                    onChange={e => {
                                      const updated = [...eventForm.shows];
                                      updated[sIdx].startTimeUtc = e.target.value;
                                      setEventForm({ ...eventForm, shows: updated });
                                    }}
                                    style={{ width: '100%', padding: '0.45rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.2rem' }}>End Time (PKT)</label>
                                  <input
                                    type="datetime-local"
                                    value={s.endTimeUtc}
                                    onChange={e => {
                                      const updated = [...eventForm.shows];
                                      updated[sIdx].endTimeUtc = e.target.value;
                                      setEventForm({ ...eventForm, shows: updated });
                                    }}
                                    style={{ width: '100%', padding: '0.45rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}
                                  />
                                </div>
                              </div>

                              {/* Ticket Tiers Builder */}
                              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc' }}>
                                    🎟️ {eventForm.ticketingType === 'mapped' ? 'Row-Wise Pricing Tiers' : 'Category Passes'} for {s.showTitle || `Show #${sIdx + 1}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...eventForm.shows];
                                      const currentTiers = updated[sIdx].ticketTiers || [];
                                      updated[sIdx].ticketTiers = [
                                        ...currentTiers,
                                        { name: 'Standard Pass', rowRange: eventForm.ticketingType === 'mapped' ? 'A' : '', price: s.startingPrice || 1500, availableQuantity: 100 }
                                      ];
                                      setEventForm({ ...eventForm, shows: updated });
                                    }}
                                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '4px', color: '#c7d2fe', cursor: 'pointer', fontWeight: 600 }}
                                  >
                                    + Add Tier
                                  </button>
                                </div>

                                {(!s.ticketTiers || s.ticketTiers.length === 0) ? (
                                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                                    Standard tier will be auto-assigned using Base Price (PKR {s.startingPrice || eventForm.startingPrice || 1500}).
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {s.ticketTiers.map((tier, tIdx) => (
                                      <div key={tIdx} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                        <input
                                          type="text"
                                          placeholder="Tier Name"
                                          value={tier.name}
                                          onChange={e => {
                                            const updated = [...eventForm.shows];
                                            updated[sIdx].ticketTiers[tIdx].name = e.target.value;
                                            setEventForm({ ...eventForm, shows: updated });
                                          }}
                                          style={{ flex: 2, padding: '0.35rem 0.5rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.75rem' }}
                                        />
                                        {eventForm.ticketingType === 'mapped' && (
                                          <input
                                            type="text"
                                            placeholder="Row (e.g. A, B-E)"
                                            value={tier.rowRange || ''}
                                            onChange={e => {
                                              const updated = [...eventForm.shows];
                                              updated[sIdx].ticketTiers[tIdx].rowRange = e.target.value;
                                              setEventForm({ ...eventForm, shows: updated });
                                            }}
                                            style={{ flex: 1.2, padding: '0.35rem 0.5rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '4px', color: '#60a5fa', fontWeight: 700, fontSize: '0.75rem' }}
                                            title="Row Range for mapped seating pricing (e.g. A, B-E, F-O)"
                                          />
                                        )}
                                        <input
                                          type="number"
                                          placeholder="Price (PKR)"
                                          value={tier.price}
                                          onChange={e => {
                                            const updated = [...eventForm.shows];
                                            updated[sIdx].ticketTiers[tIdx].price = parseFloat(e.target.value) || 0;
                                            setEventForm({ ...eventForm, shows: updated });
                                          }}
                                          style={{ flex: 1.2, padding: '0.35rem 0.5rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: '#38bdf8', fontWeight: 700, fontSize: '0.75rem' }}
                                        />
                                        <input
                                          type="number"
                                          placeholder="Qty"
                                          value={tier.availableQuantity}
                                          onChange={e => {
                                            const updated = [...eventForm.shows];
                                            updated[sIdx].ticketTiers[tIdx].availableQuantity = parseInt(e.target.value, 10) || 0;
                                            setEventForm({ ...eventForm, shows: updated });
                                          }}
                                          style={{ width: '60px', padding: '0.35rem 0.5rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: '#94a3b8', fontSize: '0.75rem' }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...eventForm.shows];
                                            updated[sIdx].ticketTiers = updated[sIdx].ticketTiers.filter((_, idx) => idx !== tIdx);
                                            setEventForm({ ...eventForm, shows: updated });
                                          }}
                                          style={{ padding: '0.3rem', background: 'rgba(239, 68, 68, 0.15)', border: 'none', borderRadius: '4px', color: '#f87171', cursor: 'pointer' }}
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 6: Description & Visibility */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FileText size={15} /> 6. Description & Visibility Settings
                      </div>

                      <div style={{ display: 'flex', gap: '2rem', margin: '0.25rem 0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}>
                          <input type="checkbox" checked={eventForm.isFeatured} onChange={e => setEventForm({ ...eventForm, isFeatured: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }} />
                          Featured Event
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}>
                          <input type="checkbox" checked={eventForm.isPublished} onChange={e => setEventForm({ ...eventForm, isPublished: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#10b981' }} />
                          Published / Active
                        </label>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>Event Description</label>
                        <textarea rows={4} placeholder="Write detailed description of the event..." value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} style={{ width: '100%', padding: '0.75rem 0.9rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }} />
                      </div>
                    </div>

                    {/* Footer Action Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <button
                        type="button"
                        onClick={() => setShowEventModal(false)}
                        style={{ flex: 1, padding: '0.85rem 1.25rem', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#cbd5e1', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        style={{ flex: 2, padding: '0.85rem 1.5rem', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: '1px solid rgba(59, 130, 246, 0.5)', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1, boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.95rem' }}
                      >
                        <Save size={18} /> {isSaving ? 'Saving Event...' : (eventForm.id ? 'Update & Save Event' : 'Create & Publish Event')}
                      </button>
                    </div>

                  </form>
                </div>

                {/* Right Column: Live Event Card Preview */}
                <div style={{ minWidth: '300px', alignSelf: 'flex-start', position: 'sticky', top: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#60a5fa', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.05em' }}>
                    <Sparkles size={16} /> LIVE CARD PREVIEW
                  </div>
                  <EventCard event={previewEvent} onSelect={() => {}} isSaved={false} onToggleSave={() => {}} />
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* --- MODAL 2: CREATE / EDIT ORGANIZER --- */}
      {showOrgModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowOrgModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
              {orgForm.id ? 'Edit Organizer' : 'Add New Organizer'}
            </h3>
            <form onSubmit={handleSaveOrganizer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Organizer Name *</label>
                <input type="text" required value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Email *</label>
                <input type="email" required value={orgForm.email} onChange={e => setOrgForm({ ...orgForm, email: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Phone *</label>
                <input type="text" required value={orgForm.phone} onChange={e => setOrgForm({ ...orgForm, phone: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Website URL</label>
                <input type="url" value={orgForm.websiteUrl} onChange={e => setOrgForm({ ...orgForm, websiteUrl: e.target.value })} placeholder="https://organizer.com" style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              
              <FileUploadField
                label="Organizer Logo Image (Recommended: 500x500px)"
                value={orgForm.logoUrl}
                onChange={(url) => setOrgForm({ ...orgForm, logoUrl: url })}
                placeholder="Upload 500x500px logo file or enter URL..."
                type="organizers"
                entityName={orgForm.name}
                entityId={orgForm.id}
              />

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowOrgModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1 }}>{isSaving ? 'Saving Organizer...' : 'Save Organizer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: CREATE / EDIT ARTIST --- */}
      {showArtistModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowArtistModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
              {artistForm.id ? 'Edit Artist' : 'Add New Artist'}
            </h3>
            <form onSubmit={handleSaveArtist} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Artist Name *</label>
                <input type="text" required value={artistForm.name} onChange={e => setArtistForm({ ...artistForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Genre</label>
                  <input type="text" value={artistForm.genre} onChange={e => setArtistForm({ ...artistForm, genre: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Role</label>
                  <input type="text" value={artistForm.role} onChange={e => setArtistForm({ ...artistForm, role: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>City</label>
                  <input type="text" value={artistForm.city} onChange={e => setArtistForm({ ...artistForm, city: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Starting Rate (PKR)</label>
                  <input type="number" value={artistForm.startingRate} onChange={e => setArtistForm({ ...artistForm, startingRate: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
              </div>

              <FileUploadField
                label="Artist Photo (File Upload or URL)"
                value={artistForm.imageUrl}
                onChange={(url) => setArtistForm({ ...artistForm, imageUrl: url })}
                placeholder="Upload photo file or enter URL..."
              />

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowArtistModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #a855f7, #6b21a8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1 }}>{isSaving ? 'Saving Artist...' : 'Save Artist'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: CREATE / EDIT TICKET TIER --- */}
      {showTierModal && (() => {
        const selectedEv = eventsList.find(ev => String(ev.id) === String(tierForm.eventId));
        const showsForEv = selectedEv?.shows || [];

        return (
          <div className="modal-overlay">
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '2rem', position: 'relative' }}>
              <button
                onClick={() => setShowTierModal(false)}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
                {tierForm.id ? 'Edit Ticket Tier' : 'Add Ticket Tier & Row Pricing'}
              </h3>
              <form onSubmit={handleSaveTicketTier} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Select Event *</label>
                  <SearchableSelect
                    required
                    value={tierForm.eventId}
                    onChange={e => setTierForm({ ...tierForm, eventId: e.target.value, eventShowId: '' })}
                    options={eventsList.map(ev => ({ value: ev.id, label: ev.title }))}
                    placeholder="Select Event..."
                  />
                </div>

                {showsForEv.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Select Show Slot (Optional)</label>
                    <SearchableSelect
                      value={tierForm.eventShowId || ''}
                      onChange={e => setTierForm({ ...tierForm, eventShowId: e.target.value })}
                      options={showsForEv.map(s => ({ value: s.id, label: s.showTitle }))}
                      placeholder="All Shows (General)"
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Tier / Row Category Name *</label>
                  <input type="text" required placeholder="e.g. VIP Front Rows A-E" value={tierForm.name} onChange={e => setTierForm({ ...tierForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Row Range / Zone Description</label>
                  <input type="text" placeholder="e.g. Rows A to E, Premium Orchestra Seating" value={tierForm.description || ''} onChange={e => setTierForm({ ...tierForm, description: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Price per Ticket (PKR) *</label>
                    <input type="number" required value={tierForm.price} onChange={e => setTierForm({ ...tierForm, price: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#38bdf8', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Available Capacity</label>
                    <input type="number" value={tierForm.availableQuantity || 100} onChange={e => setTierForm({ ...tierForm, availableQuantity: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowTierModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1 }}>{isSaving ? 'Saving Tier...' : 'Save Tier & Price'}</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* --- MODAL 5: CREATE / EDIT USER ACCOUNT --- */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowUserModal(false)}
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
              {!userForm.id && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Password *</label>
                  <input type="password" required value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Assign Role *</label>
                <SearchableSelect
                  required
                  value={userForm.roleId}
                  onChange={e => setUserForm({ ...userForm, roleId: e.target.value })}
                  options={rolesList.map(r => ({ value: r.id, label: r.name }))}
                  placeholder="Select Role..."
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowUserModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1 }}>{isSaving ? 'Saving User...' : 'Save User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 6: CREATE / EDIT ROLE --- */}
      {showRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowRoleModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
              {roleForm.id ? 'Edit Role' : 'Create New Role'}
            </h3>
            <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Role Name *</label>
                <input type="text" required value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Description</label>
                <input type="text" value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowRoleModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1 }}>{isSaving ? 'Saving Role...' : 'Save Role'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 7: CREATE / EDIT TAG --- */}
      {showTagModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowTagModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
              {tagForm.id ? 'Edit Tag' : 'Create Tag'}
            </h3>
            <form onSubmit={handleSaveTag} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Tag Name *</label>
                <input 
                  type="text" 
                  required 
                  value={tagForm.name} 
                  onChange={e => {
                    const nameVal = e.target.value;
                    const autoSlug = nameVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    setTagForm(prev => ({
                      ...prev,
                      name: nameVal,
                      slug: !prev.slug || prev.slug === (prev.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                        ? autoSlug
                        : prev.slug
                    }));
                  }} 
                  placeholder="e.g. Qawwali Concerts"
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Tag Slug / URL Identifier *</label>
                <input 
                  type="text" 
                  required 
                  value={tagForm.slug} 
                  onChange={e => setTagForm({ ...tagForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} 
                  placeholder="e.g. qawwali-concerts"
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#34d399', fontFamily: 'monospace' }} 
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  URL-friendly slug (e.g. concerts, sufi-rock, tech-workshops)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowTagModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #10b981, #047857)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1 }}>{isSaving ? 'Saving Tag...' : 'Save Tag'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 8: CREATE / EDIT AUDITORIUM LAYOUT --- */}
      {showAuditoriumModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', width: '95vw', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>VENUE BLUEPRINT DESIGNER</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
                  {auditoriumForm.id ? 'Edit Auditorium Layout' : 'Create New Auditorium Layout'}
                </h3>
              </div>
              <button
                onClick={() => setShowAuditoriumModal(false)}
                style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Blueprint Generator Quick Tool */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                BLUEPRINT UTILITIES:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewAuditorium({
                      id: 'draft-preview',
                      name: auditoriumForm.name || 'Draft Blueprint Preview',
                      venue: auditoriumForm.venue || 'Venue Preview',
                      city: auditoriumForm.city || 'Karachi',
                      layoutJson: auditoriumForm.layoutJson,
                      totalCapacity: parseInt(auditoriumForm.totalCapacity, 10) || 200
                    });
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.18)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Eye size={13} /> Live Chart Preview
                </button>
                <button
                  type="button"
                  onClick={() => setAuditoriumForm(prev => ({ ...prev, layoutJson: createBlankLayoutJson(10, 20) }))}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    color: '#93c5fd',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Reset to 10x20
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveAuditorium} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Auditorium Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arts Council Karachi (AC II)"
                    value={auditoriumForm.name}
                    onChange={e => setAuditoriumForm({ ...auditoriumForm, name: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Venue Complex *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arts Council of Pakistan"
                    value={auditoriumForm.venue}
                    onChange={e => setAuditoriumForm({ ...auditoriumForm, venue: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>City *</label>
                  <SearchableSelect
                    value={auditoriumForm.city}
                    onChange={e => setAuditoriumForm({ ...auditoriumForm, city: e.target.value })}
                    options={['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Quetta']}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Total Capacity (Seats) *</label>
                  <input
                    type="number"
                    required
                    value={auditoriumForm.totalCapacity}
                    onChange={e => setAuditoriumForm({ ...auditoriumForm, totalCapacity: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Layout Code / Slug</label>
                  <input
                    type="text"
                    placeholder="e.g. ACP_AC_II"
                    value={auditoriumForm.layoutCode}
                    onChange={e => setAuditoriumForm({ ...auditoriumForm, layoutCode: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#38bdf8', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Description & Features</label>
                <input
                  type="text"
                  placeholder="e.g. Acoustic soundproofing, dual central aisles, tiered ground orchestra."
                  value={auditoriumForm.description}
                  onChange={e => setAuditoriumForm({ ...auditoriumForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              {/* JSON Blueprint Schema Editor */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 600 }}>
                    Layout JSON Configuration (Rows, Sections & Aisles)
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#10b981' }}>
                    ✓ JSON Schema Valid
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={auditoriumForm.layoutJson}
                  onChange={e => setAuditoriumForm({ ...auditoriumForm, layoutJson: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(2, 6, 23, 0.85)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    color: '#34d399',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    lineHeight: 1.4
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAuditoriumModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1 }}>{isSaving ? 'Saving Layout...' : 'Save Auditorium Layout'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- BLUEPRINT PREVIEW MODAL --- */}
      {previewAuditorium && (
        <InteractiveSeatPicker
          isPreview={true}
          event={{
            id: 'preview-' + previewAuditorium.id,
            title: `${previewAuditorium.name} (Blueprint Preview)`,
            venue: `${previewAuditorium.venue}, ${previewAuditorium.city}`,
            totalCapacity: previewAuditorium.totalCapacity,
            seatingZones: [
              {
                id: 1,
                zone: previewAuditorium.name,
                rows: 14,
                cols: 98,
                price: 2500,
                layoutJson: previewAuditorium.layoutJson,
                totalCapacity: previewAuditorium.totalCapacity
              }
            ]
          }}
          onClose={() => setPreviewAuditorium(null)}
        />
      )}
    </div>
  );
}
