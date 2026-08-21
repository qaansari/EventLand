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
  Calendar
} from 'lucide-react';
import { adminApi } from '../services/api';

export default function AdminDashboard({ onSelectEvent }) {
  const [activeAdminTab, setActiveAdminTab] = useState('events'); // 'events', 'organizers', 'bookings', 'users', 'roles', 'ticket-tiers'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Loaded Data States
  const [eventsList, setEventsList] = useState([]);
  const [organizersList, setOrganizersList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [rolesList, setRolesList] = useState([]);

  // Form Modal States
  const [showEventModal, setShowEventModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // New Event Form State
  const [eventForm, setEventForm] = useState({
    title: '',
    category: 'Concerts',
    city: 'Karachi',
    venue: '',
    startDateUtc: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    endDateUtc: new Date(Date.now() + 172800000).toISOString().slice(0, 16),
    startingPrice: 1500,
    ticketingType: 'categorized',
    banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    description: '',
    organizerId: ''
  });

  // New Organizer Form State
  const [orgForm, setOrgForm] = useState({
    name: '',
    email: '',
    phone: '+92 300 0000000',
    logoUrl: '',
    websiteUrl: ''
  });

  // New Ticket Tier Form State
  const [tierForm, setTierForm] = useState({
    eventId: '',
    name: 'General Pass',
    description: 'Standard Entry',
    price: 1500,
    availableQuantity: 100,
    maxPerOrder: 5,
    sortOrder: 1
  });

  // New User Form State
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    roleId: '',
    phoneNumber: ''
  });

  // Load Data from Backend API
  const fetchBackendData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch Organizers
      const orgs = await adminApi.organizers.getAll();
      setOrganizersList(orgs || []);

      // 2. Fetch Events
      const evs = await adminApi.events.getAll(1, 50);
      setEventsList(evs.items || []);

      // 3. Fetch Bookings
      const bks = await adminApi.bookings.getAll(1, 50);
      setBookingsList(bks.items || []);

      // 4. Fetch Roles
      const rls = await adminApi.roles.getAll();
      setRolesList(rls || []);

      // 5. Fetch Users
      const usrs = await adminApi.users.getAll(1, 50);
      setUsersList(usrs.items || []);

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

  // Handlers for Creating Entities
  const handleCreateOrganizer = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await adminApi.organizers.create(orgForm);
      setSuccessMsg('Organizer created successfully!');
      setShowOrgModal(false);
      setOrgForm({ name: '', email: '', phone: '+92 300 0000000', logoUrl: '', websiteUrl: '' });
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create organizer.');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!eventForm.organizerId) {
      setErrorMsg('Please select an organizer.');
      return;
    }

    try {
      const payload = {
        ...eventForm,
        organizerId: parseInt(eventForm.organizerId, 10),
        startingPrice: parseFloat(eventForm.startingPrice),
        startDateUtc: new Date(eventForm.startDateUtc).toISOString(),
        endDateUtc: new Date(eventForm.endDateUtc).toISOString()
      };

      await adminApi.events.create(payload);
      setSuccessMsg('Event created successfully with 4-digit ID!');
      setShowEventModal(false);
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create event.');
    }
  };

  const handleCreateTicketTier = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!tierForm.eventId) {
      setErrorMsg('Please select an event.');
      return;
    }

    try {
      const payload = {
        ...tierForm,
        eventId: parseInt(tierForm.eventId, 10),
        price: parseFloat(tierForm.price),
        availableQuantity: parseInt(tierForm.availableQuantity, 10),
        maxPerOrder: parseInt(tierForm.maxPerOrder, 10)
      };

      await adminApi.ticketTiers.create(payload);
      setSuccessMsg('Ticket tier created successfully!');
      setShowTierModal(false);
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create ticket tier.');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!userForm.roleId) {
      setErrorMsg('Please select a role.');
      return;
    }

    try {
      const payload = {
        ...userForm,
        roleId: parseInt(userForm.roleId, 10)
      };

      await adminApi.users.create(payload);
      setSuccessMsg('User account created successfully!');
      setShowUserModal(false);
      setUserForm({ email: '', password: '', fullName: '', roleId: '', phoneNumber: '' });
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create user.');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm(`Are you sure you want to delete Event #${id}?`)) return;
    try {
      await adminApi.events.delete(id);
      setSuccessMsg(`Event #${id} deleted.`);
      fetchBackendData();
    } catch (err) {
      setErrorMsg(err.message || 'Delete failed.');
    }
  };

  const handleDeleteOrganizer = async (id) => {
    if (!window.confirm(`Delete Organizer #${id}?`)) return;
    try {
      await adminApi.organizers.delete(id);
      setSuccessMsg(`Organizer #${id} deleted.`);
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
            Manage Events, Bookings, Organizers, Ticket Tiers, Users & Roles connected to live SQL Server & Redis
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
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
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
      </div>

      {/* --- TAB 1: EVENTS MANAGEMENT --- */}
      {activeAdminTab === 'events' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Live Events (SQL Server)</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowTierModal(true)}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={16} /> Add Ticket Tier
              </button>
              <button
                onClick={() => setShowEventModal(true)}
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
                  <th style={{ padding: '1rem' }}>4-Digit ID</th>
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
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#3b82f6' }}>#{ev.id}</td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#f8fafc' }}>{ev.title}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{ev.organizerName}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{ev.city}</td>
                    <td style={{ padding: '1rem', color: '#4ade80', fontWeight: 600 }}>PKR {ev.startingPrice}</td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
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

      {/* --- TAB 2: ORGANIZERS MANAGEMENT --- */}
      {activeAdminTab === 'organizers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Organizers Directory</h3>
            <button
              onClick={() => setShowOrgModal(true)}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Add Organizer
            </button>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem' }}>ID</th>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Email</th>
                  <th style={{ padding: '1rem' }}>Phone</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizersList.map(org => (
                  <tr key={org.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#c084fc' }}>#{org.id}</td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#f8fafc' }}>{org.name}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{org.email}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{org.phone}</td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => handleDeleteOrganizer(org.id)}
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

      {/* --- TAB 3: BOOKINGS MANAGEMENT --- */}
      {activeAdminTab === 'bookings' && (
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.5rem' }}>Customer Bookings</h3>
          <div className="glass-card" style={{ overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem' }}>Ref #</th>
                  <th style={{ padding: '1rem' }}>Customer</th>
                  <th style={{ padding: '1rem' }}>Event</th>
                  <th style={{ padding: '1rem' }}>Amount</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookingsList.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#f472b6' }}>{b.bookingRef}</td>
                    <td style={{ padding: '1rem', color: '#f8fafc' }}>
                      <div>{b.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.customerEmail}</div>
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{b.eventTitle}</td>
                    <td style={{ padding: '1rem', color: '#4ade80', fontWeight: 600 }}>PKR {b.totalAmount}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: USERS MANAGEMENT --- */}
      {activeAdminTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>User Accounts</h3>
            <button
              onClick={() => setShowUserModal(true)}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Create User Account
            </button>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem' }}>ID</th>
                  <th style={{ padding: '1rem' }}>Full Name</th>
                  <th style={{ padding: '1rem' }}>Email</th>
                  <th style={{ padding: '1rem' }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#ec4899' }}>#{u.id}</td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#f8fafc' }}>{u.fullName}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{u.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', fontWeight: 600 }}>
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 5: ROLES TABLE --- */}
      {activeAdminTab === 'roles' && (
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.5rem' }}>Database Roles Table</h3>
          <div className="glass-card" style={{ overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem' }}>Role ID</th>
                  <th style={{ padding: '1rem' }}>Role Name</th>
                  <th style={{ padding: '1rem' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {rolesList.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#ec4899' }}>#{r.id}</td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#f8fafc' }}>{r.name}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL 1: CREATE EVENT --- */}
      {showEventModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowEventModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>Create Event (4-Digit ID)</h3>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Event Title</label>
                <input type="text" required value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Organizer</label>
                  <select required value={eventForm.organizerId} onChange={e => setEventForm({ ...eventForm, organizerId: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}>
                    <option value="">Select Organizer...</option>
                    {organizersList.map(o => (
                      <option key={o.id} value={o.id}>#{o.id} - {o.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Category</label>
                  <input type="text" value={eventForm.category} onChange={e => setEventForm({ ...eventForm, category: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>City</label>
                  <input type="text" value={eventForm.city} onChange={e => setEventForm({ ...eventForm, city: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Venue</label>
                  <input type="text" required value={eventForm.venue} onChange={e => setEventForm({ ...eventForm, venue: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Starting Price (PKR)</label>
                <input type="number" value={eventForm.startingPrice} onChange={e => setEventForm({ ...eventForm, startingPrice: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEventModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CREATE ORGANIZER --- */}
      {showOrgModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowOrgModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>Add New Organizer</h3>
            <form onSubmit={handleCreateOrganizer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Company / Organizer Name</label>
                <input type="text" required value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Email</label>
                <input type="email" required value={orgForm.email} onChange={e => setOrgForm({ ...orgForm, email: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Phone</label>
                <input type="text" required value={orgForm.phone} onChange={e => setOrgForm({ ...orgForm, phone: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowOrgModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Create Organizer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: CREATE TICKET TIER --- */}
      {showTierModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowTierModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>Add Ticket Tier</h3>
            <form onSubmit={handleCreateTicketTier} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Select Event</label>
                <select required value={tierForm.eventId} onChange={e => setTierForm({ ...tierForm, eventId: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}>
                  <option value="">Select Event...</option>
                  {eventsList.map(ev => (
                    <option key={ev.id} value={ev.id}>#{ev.id} - {ev.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Tier Name</label>
                <input type="text" required value={tierForm.name} onChange={e => setTierForm({ ...tierForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Price (PKR)</label>
                <input type="number" required value={tierForm.price} onChange={e => setTierForm({ ...tierForm, price: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Available Quantity</label>
                <input type="number" required value={tierForm.availableQuantity} onChange={e => setTierForm({ ...tierForm, availableQuantity: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowTierModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Create Tier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: CREATE USER ACCOUNT --- */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowUserModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>Create User Account</h3>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Full Name</label>
                <input type="text" required value={userForm.fullName} onChange={e => setUserForm({ ...userForm, fullName: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Email</label>
                <input type="email" required value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Password</label>
                <input type="password" required value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Assign Role</label>
                <select required value={userForm.roleId} onChange={e => setUserForm({ ...userForm, roleId: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}>
                  <option value="">Select Role...</option>
                  {rolesList.map(r => (
                    <option key={r.id} value={r.id}>#{r.id} - {r.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowUserModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
