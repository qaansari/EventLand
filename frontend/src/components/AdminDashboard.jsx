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
  UserCheck
} from 'lucide-react';
import { adminApi, uploadApi } from '../services/api';

// --- File Upload Component Helper ---
function FileUploadField({ label, value, onChange, placeholder = "Image URL or upload file..." }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await uploadApi.uploadFile(file);
      onChange(res.url);
    } catch (err) {
      setError(err.message || 'Upload failed');
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
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} disabled={uploading} />
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
  const [activeAdminTab, setActiveAdminTab] = useState('events'); // 'events', 'organizers', 'artists', 'bookings', 'users', 'roles', 'ticket-tiers', 'tags'
  const [loading, setLoading] = useState(false);
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

  // Form Modal States
  const [showEventModal, setShowEventModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showArtistModal, setShowArtistModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  // --- Initial Form States ---
  const defaultEventForm = {
    id: null,
    title: '',
    selectedTagId: '',
    city: 'Karachi',
    venue: '',
    address: '',
    startDateUtc: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    endDateUtc: new Date(Date.now() + 172800000).toISOString().slice(0, 16),
    startingPrice: 1500,
    ticketingType: 'categorized',
    banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    thumbnailUrl: '',
    description: 'Join us for an extraordinary live event experience featuring Pakistan top performers.',
    scarcityText: 'Selling Fast',
    organizerId: '',
    isFeatured: false,
    status: 'Live'
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

  // Load Data from Backend API
  const fetchBackendData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [orgs, evs, arts, bks, rls, usrs, tgs] = await Promise.all([
        adminApi.organizers.getAll().catch(() => []),
        adminApi.events.getAll(1, 50).catch(() => ({ items: [] })),
        adminApi.artists.getAll(1, 50).catch(() => ({ items: [] })),
        adminApi.bookings.getAll(1, 50).catch(() => ({ items: [] })),
        adminApi.roles.getAll().catch(() => []),
        adminApi.users.getAll(1, 50).catch(() => ({ items: [] })),
        adminApi.tags.getAll().catch(() => [])
      ]);

      setOrganizersList(orgs || []);
      setEventsList(evs.items || evs || []);
      setArtistsList(arts.items || arts || []);
      setBookingsList(bks.items || bks || []);
      setRolesList(rls || []);
      setUsersList(usrs.items || usrs || []);
      setTagsList(tgs || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setErrorMsg(err.message || 'Failed to load backend data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendData();
  }, []);

  // --- CRUD: EVENTS ---
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!eventForm.organizerId) {
      setErrorMsg('Please select an organizer.');
      return;
    }
    if (!eventForm.title.trim()) {
      setErrorMsg('Please enter an event title.');
      return;
    }
    if (!eventForm.selectedTagId) {
      setErrorMsg('Please select an event tag from the dropdown.');
      return;
    }
    if (!eventForm.venue.trim()) {
      setErrorMsg('Please enter a venue.');
      return;
    }

    try {
      const startDate = eventForm.startDateUtc ? new Date(eventForm.startDateUtc) : new Date(Date.now() + 86400000);
      const endDate = eventForm.endDateUtc ? new Date(eventForm.endDateUtc) : new Date(Date.now() + 172800000);

      const selectedTag = tagsList.find(t => t.id === parseInt(eventForm.selectedTagId, 10));
      const tagIds = eventForm.selectedTagId ? [parseInt(eventForm.selectedTagId, 10)] : [];

      const payload = {
        title: eventForm.title.trim(),
        category: selectedTag ? selectedTag.name : 'General',
        status: eventForm.status || 'Live',
        isFeatured: Boolean(eventForm.isFeatured),
        isPublished: true,
        city: eventForm.city || 'Karachi',
        venue: eventForm.venue.trim(),
        address: eventForm.address || eventForm.venue,
        latitude: 24.8607,
        longitude: 67.0011,
        startDateUtc: startDate.toISOString(),
        endDateUtc: endDate.toISOString(),
        startingPrice: parseFloat(eventForm.startingPrice) || 0,
        ticketingType: eventForm.ticketingType || 'categorized',
        banner: eventForm.banner || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
        thumbnailUrl: eventForm.thumbnailUrl || eventForm.banner || '',
        description: eventForm.description || eventForm.title,
        scarcityText: eventForm.scarcityText || 'Selling Fast',
        organizerId: parseInt(eventForm.organizerId, 10),
        tagIds: tagIds
      };

      if (eventForm.id) {
        await adminApi.events.update(eventForm.id, payload);
        setSuccessMsg('Event updated successfully!');
      } else {
        await adminApi.events.create(payload);
        setSuccessMsg('Event created successfully!');
      }

      setShowEventModal(false);
      setEventForm(defaultEventForm);
      fetchBackendData();
    } catch (err) {
      console.error('Save Event Error:', err);
      setErrorMsg(err.message || 'Failed to save event. Check backend logs.');
    }
  };

  const handleEditEvent = (ev) => {
    const existingTagId = ev.tags?.[0]?.id || ev.eventTags?.[0]?.tagId || (tagsList[0]?.id || '');
    setEventForm({
      id: ev.id,
      title: ev.title || '',
      selectedTagId: existingTagId,
      city: ev.city || 'Karachi',
      venue: ev.venue || '',
      address: ev.address || '',
      startDateUtc: ev.startDateUtc ? ev.startDateUtc.slice(0, 16) : new Date().toISOString().slice(0, 16),
      endDateUtc: ev.endDateUtc ? ev.endDateUtc.slice(0, 16) : new Date().toISOString().slice(0, 16),
      startingPrice: ev.startingPrice || 1500,
      ticketingType: ev.ticketingType || 'categorized',
      banner: ev.banner || '',
      thumbnailUrl: ev.thumbnailUrl || '',
      description: ev.description || '',
      scarcityText: ev.scarcityText || 'Selling Fast',
      organizerId: ev.organizerId || (organizersList[0]?.id || ''),
      isFeatured: ev.isFeatured || false,
      status: ev.status || 'Live'
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await adminApi.events.delete(id);
      setSuccessMsg('Event deleted successfully.');
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Delete failed.');
    }
  };

  // --- CRUD: ORGANIZERS ---
  const handleSaveOrganizer = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
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
        setSuccessMsg('Organizer updated successfully!');
      } else {
        await adminApi.organizers.create(payload);
        setSuccessMsg('Organizer created successfully!');
      }
      setShowOrgModal(false);
      setOrgForm(defaultOrgForm);
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save organizer.');
    }
  };

  const handleEditOrganizer = (org) => {
    setOrgForm({
      id: org.id,
      name: org.name || '',
      email: org.email || '',
      phone: org.phone || '',
      logoUrl: org.logoUrl || '',
      websiteUrl: org.websiteUrl || '',
      isVerified: org.isVerified ?? true
    });
    setShowOrgModal(true);
  };

  const handleDeleteOrganizer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this organizer?')) return;
    try {
      await adminApi.organizers.delete(id);
      setSuccessMsg('Organizer deleted successfully.');
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Delete failed.');
    }
  };

  // --- CRUD: ARTISTS ---
  const handleSaveArtist = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
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
        setSuccessMsg('Artist updated successfully!');
      } else {
        await adminApi.artists.create(payload);
        setSuccessMsg('Artist created successfully!');
      }
      setShowArtistModal(false);
      setArtistForm(defaultArtistForm);
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save artist.');
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
      setSuccessMsg('Artist deleted successfully.');
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Delete failed.');
    }
  };

  // --- CRUD: TICKET TIERS ---
  const handleSaveTicketTier = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!tierForm.eventId) {
      setErrorMsg('Please select an event.');
      return;
    }

    try {
      const payload = {
        eventId: parseInt(tierForm.eventId, 10),
        name: tierForm.name,
        description: tierForm.description,
        price: parseFloat(tierForm.price),
        availableQuantity: parseInt(tierForm.availableQuantity, 10),
        maxPerOrder: parseInt(tierForm.maxPerOrder, 10),
        sortOrder: parseInt(tierForm.sortOrder, 10) || 1
      };

      if (tierForm.id) {
        await adminApi.ticketTiers.update(tierForm.id, payload);
        setSuccessMsg('Ticket tier updated successfully!');
      } else {
        await adminApi.ticketTiers.create(payload);
        setSuccessMsg('Ticket tier created successfully!');
      }
      setShowTierModal(false);
      setTierForm(defaultTierForm);
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save ticket tier.');
    }
  };

  // --- CRUD: USERS ---
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!userForm.roleId) {
      setErrorMsg('Please select a role.');
      return;
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
        setSuccessMsg('User account updated successfully!');
      } else {
        const payload = {
          email: userForm.email,
          password: userForm.password,
          fullName: userForm.fullName,
          roleId: parseInt(userForm.roleId, 10),
          phoneNumber: userForm.phoneNumber
        };
        await adminApi.users.create(payload);
        setSuccessMsg('User account created successfully!');
      }
      setShowUserModal(false);
      setUserForm(defaultUserForm);
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save user.');
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
      setSuccessMsg('User account deleted.');
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Delete failed.');
    }
  };

  // --- CRUD: ROLES ---
  const handleSaveRole = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (roleForm.id) {
        await adminApi.roles.update(roleForm.id, { name: roleForm.name, description: roleForm.description });
        setSuccessMsg('Role updated successfully!');
      } else {
        await adminApi.roles.create({ name: roleForm.name, description: roleForm.description });
        setSuccessMsg('Role created successfully!');
      }
      setShowRoleModal(false);
      setRoleForm(defaultRoleForm);
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save role.');
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
      setSuccessMsg('Role deleted.');
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Delete failed.');
    }
  };

  // --- CRUD: TAGS ---
  const handleSaveTag = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const slug = tagForm.name.toLowerCase().replace(/\s+/g, '-');
      if (tagForm.id) {
        await adminApi.tags.update(tagForm.id, { name: tagForm.name, slug });
        setSuccessMsg('Tag updated!');
      } else {
        await adminApi.tags.create({ name: tagForm.name, slug });
        setSuccessMsg('Tag created!');
      }
      setShowTagModal(false);
      setTagForm(defaultTagForm);
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save tag.');
    }
  };

  const handleDeleteTag = async (id) => {
    if (!window.confirm('Delete tag?')) return;
    try {
      await adminApi.tags.delete(id);
      setSuccessMsg('Tag deleted.');
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Delete failed.');
    }
  };

  // --- CRUD: BOOKINGS ---
  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Delete booking?')) return;
    try {
      await adminApi.bookings.delete(id);
      setSuccessMsg('Booking deleted.');
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Delete failed.');
    }
  };

  const handleUpdateBookingStatus = async (id, status, paymentStatus) => {
    try {
      await adminApi.bookings.updateStatus(id, status, paymentStatus);
      setSuccessMsg('Booking status updated.');
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Update failed.');
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

      {/* Notifications */}
      {errorMsg && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#f87171', marginBottom: '1.5rem' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', color: '#4ade80', marginBottom: '1.5rem' }}>
          {successMsg}
        </div>
      )}

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
                        {ev.banner && <img src={ev.banner} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />}
                        <div>{ev.title}</div>
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
                        {org.logoUrl && <img src={org.logoUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />}
                        <div>{org.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{org.email}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{org.phone}</td>
                    <td style={{ padding: '1rem', color: '#60a5fa' }}>
                      {org.websiteUrl ? (
                        <a href={org.websiteUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                          {org.websiteUrl.replace(/^https?:\/\//, '')}
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
                      <select
                        value={b.status || 'Confirmed'}
                        onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value, 'Paid')}
                        style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', background: '#1e293b', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)' }}
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Pending">Pending</option>
                      </select>
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
                      <button
                        onClick={() => handleDeleteTag(t.id)}
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

      {/* --- MODAL 1: CREATE / EDIT EVENT --- */}
      {showEventModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              onClick={() => setShowEventModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
              {eventForm.id ? 'Edit Event' : 'Create New Event'}
            </h3>
            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Event Title *</label>
                <input type="text" required value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Organizer *</label>
                  <select required value={eventForm.organizerId} onChange={e => setEventForm({ ...eventForm, organizerId: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}>
                    <option value="">Select Organizer...</option>
                    {organizersList.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Select Event Tag *</label>
                  <select required value={eventForm.selectedTagId} onChange={e => setEventForm({ ...eventForm, selectedTagId: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}>
                    <option value="">Select Tag...</option>
                    {tagsList.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>City</label>
                  <input type="text" value={eventForm.city} onChange={e => setEventForm({ ...eventForm, city: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Venue *</label>
                  <input type="text" required value={eventForm.venue} onChange={e => setEventForm({ ...eventForm, venue: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Start Date & Time</label>
                  <input type="datetime-local" value={eventForm.startDateUtc} onChange={e => setEventForm({ ...eventForm, startDateUtc: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>End Date & Time</label>
                  <input type="datetime-local" value={eventForm.endDateUtc} onChange={e => setEventForm({ ...eventForm, endDateUtc: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Starting Price (PKR)</label>
                  <input type="number" value={eventForm.startingPrice} onChange={e => setEventForm({ ...eventForm, startingPrice: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Ticketing Layout</label>
                  <select value={eventForm.ticketingType} onChange={e => setEventForm({ ...eventForm, ticketingType: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}>
                    <option value="categorized">Categorized Passes</option>
                    <option value="mapped">Mapped Seat Picker</option>
                  </select>
                </div>
              </div>

              {/* Integrated File Upload Field */}
              <FileUploadField
                label="Event Banner Image (File Upload or URL)"
                value={eventForm.banner}
                onChange={(url) => setEventForm({ ...eventForm, banner: url })}
                placeholder="Upload banner image file or enter URL..."
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Event Description</label>
                <textarea rows={3} value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEventModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                label="Organizer Logo (File Upload or URL)"
                value={orgForm.logoUrl}
                onChange={(url) => setOrgForm({ ...orgForm, logoUrl: url })}
                placeholder="Upload logo file or enter URL..."
              />

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowOrgModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Organizer</button>
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
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #a855f7, #6b21a8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Artist</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: CREATE TICKET TIER --- */}
      {showTierModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowTierModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>Add Ticket Tier</h3>
            <form onSubmit={handleSaveTicketTier} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Select Event *</label>
                <select required value={tierForm.eventId} onChange={e => setTierForm({ ...tierForm, eventId: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}>
                  <option value="">Select Event...</option>
                  {eventsList.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Tier Name *</label>
                <input type="text" required value={tierForm.name} onChange={e => setTierForm({ ...tierForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Price (PKR) *</label>
                <input type="number" required value={tierForm.price} onChange={e => setTierForm({ ...tierForm, price: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowTierModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Tier</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <select required value={userForm.roleId} onChange={e => setUserForm({ ...userForm, roleId: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}>
                  <option value="">Select Role...</option>
                  {rolesList.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowUserModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save User</button>
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
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Role</button>
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
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>Create Tag</h3>
            <form onSubmit={handleSaveTag} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Tag Name *</label>
                <input type="text" required value={tagForm.name} onChange={e => setTagForm({ ...tagForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowTagModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #10b981, #047857)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Tag</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
