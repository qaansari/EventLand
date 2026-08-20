import React, { useState } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Ticket, 
  Users, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Star, 
  Trash2, 
  Search, 
  Download, 
  Settings, 
  PieChart, 
  BarChart3, 
  Building2, 
  AlertCircle,
  Eye
} from 'lucide-react';

export default function AdminDashboard({ events, onToggleFeature, onDeleteEvent, onApproveEvent, onSelectEvent }) {
  const [activeAdminTab, setActiveAdminTab] = useState('overview'); // 'overview', 'events', 'payouts', 'settings'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Platform Commission Setting State
  const [platformFee, setPlatformFee] = useState(5.0);
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Mock Payout Requests
  const [payoutRequests, setPayoutRequests] = useState([
    { id: 'PO-9941', organizer: 'Rangrez Events & PR', eventTitle: 'Rangrez Bazaar 2026', amount: 850000, account: 'Meezan Bank **** 4812', status: 'PENDING', date: '20th Aug 2026' },
    { id: 'PO-9942', organizer: 'Surrender Live Ent.', eventTitle: 'THE SURRENDER TOUR - Ali Noor Live', amount: 1420000, account: 'JazzCash 0321****667', status: 'PENDING', date: '19th Aug 2026' },
    { id: 'PO-9939', organizer: 'BlackBox Theatre Co.', eventTitle: 'The Great Pakistani Comedy Show', amount: 310000, account: 'EasyPaisa 0333****112', status: 'PAID', date: '15th Aug 2026' }
  ]);

  // Users & Organizers Allocation State
  const [usersList, setUsersList] = useState([
    { id: 'USR-01', name: 'Super Admin', email: 'admin@eventland.pk', role: 'admin', org: 'EventLand HQ', status: 'Active' },
    { id: 'USR-02', name: 'Rangrez Events & PR', email: 'organizer@eventland.pk', role: 'organizer', org: 'Rangrez Ent.', status: 'Active' },
    { id: 'USR-03', name: 'Surrender Live Ent.', email: 'surrender@eventland.pk', role: 'organizer', org: 'Surrender Inc.', status: 'Active' },
    { id: 'USR-04', name: 'Qamar Ansari', email: 'qamar@example.com', role: 'customer', org: 'General Attendee', status: 'Active' }
  ]);

  const [newOrgForm, setNewOrgForm] = useState({ name: '', email: '', org: '' });

  const handleCreateOrganizer = (e) => {
    e.preventDefault();
    if (!newOrgForm.email) return;
    const newAccount = {
      id: 'USR-' + Math.floor(10 + Math.random() * 90),
      name: newOrgForm.name || 'New Organizer',
      email: newOrgForm.email.toLowerCase(),
      role: 'organizer',
      org: newOrgForm.org || 'Independent Organizer',
      status: 'Active'
    };
    setUsersList([...usersList, newAccount]);
    setNewOrgForm({ name: '', email: '', org: '' });
    alert(`🎉 Organizer Account for "${newAccount.name}" (${newAccount.email}) provisioned! Role allocated: ORGANIZER.`);
  };

  const handlePromoteToOrganizer = (userId) => {
    setUsersList(usersList.map(u => u.id === userId ? { ...u, role: 'organizer', org: 'Promoted Partner' } : u));
    alert(`✅ Role updated! Account now has Organizer privileges.`);
  };

  // Stats Calculations
  const totalEvents = events.length;
  const featuredCount = events.filter(e => e.isFeatured).length;
  const totalRevenue = events.reduce((acc, ev) => acc + (ev.startingPrice * 180), 0);
  const platformCommission = totalRevenue * (platformFee / 100);

  const filteredEventsList = events.filter(ev => {
    const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase()) || ev.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || (filterStatus === 'Featured' && ev.isFeatured) || (filterStatus === 'LIVE' && ev.status === 'LIVE');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Admin Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            padding: '0.3rem 0.8rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            marginBottom: '0.5rem'
          }}>
            <ShieldCheck size={14} /> PLATFORM SUPER ADMIN COMMAND CENTER
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em'
          }}>
            Platform Overview & Operations
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Monitor nationwide ticket revenue, moderate event listings, manage organizer payouts, and configure platform settings.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          backgroundColor: 'rgba(15, 24, 44, 0.8)',
          padding: '0.35rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <button
            onClick={() => setActiveAdminTab('overview')}
            className={`btn ${activeAdminTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
          >
            <BarChart3 size={15} /> Overview & KPIs
          </button>
          <button
            onClick={() => setActiveAdminTab('events')}
            className={`btn ${activeAdminTab === 'events' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
          >
            <Ticket size={15} /> Events ({totalEvents})
          </button>
          <button
            onClick={() => setActiveAdminTab('users')}
            className={`btn ${activeAdminTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
          >
            <Users size={15} /> Organizers & Users
          </button>
          <button
            onClick={() => setActiveAdminTab('payouts')}
            className={`btn ${activeAdminTab === 'payouts' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
          >
            <DollarSign size={15} /> Payouts ({payoutRequests.filter(p => p.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveAdminTab('settings')}
            className={`btn ${activeAdminTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
          >
            <Settings size={15} /> System Config
          </button>
        </div>
      </div>

      {/* Overview & Analytics Tab */}
      {activeAdminTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Top KPI Metrics Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem'
          }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>GROSS TICKET SALES</span>
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
                  <TrendingUp size={18} color="#60a5fa" />
                </div>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem' }}>
                PKR {(totalRevenue / 1000000).toFixed(2)}M
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
                ↑ +18.4% vs last month
              </span>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>PLATFORM REVENUE ({platformFee}%)</span>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
                  <DollarSign size={18} color="#34d399" />
                </div>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginBottom: '0.2rem' }}>
                PKR {Math.round(platformCommission).toLocaleString()}
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Net platform fee collected
              </span>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>ACTIVE EVENT LISTINGS</span>
                <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
                  <Ticket size={18} color="#c084fc" />
                </div>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem' }}>
                {totalEvents} Events
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 600 }}>
                {featuredCount} Featured on Hero
              </span>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>REGISTERED ORGANIZERS</span>
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
                  <Building2 size={18} color="#fbbf24" />
                </div>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem' }}>
                142 Partners
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600 }}>
                100% KYC Verified
              </span>
            </div>
          </div>

          {/* Regional Sales Breakdown & Top Categories */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Sales by City */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PieChart size={18} color="#60a5fa" /> Ticket Sales Volume by City
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    <span>Karachi</span>
                    <strong style={{ color: '#fff' }}>14,250 Passes (41%)</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '41%', height: '100%', backgroundColor: '#3b82f6', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    <span>Lahore</span>
                    <strong style={{ color: '#fff' }}>11,800 Passes (34%)</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '34%', height: '100%', backgroundColor: '#6366f1', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    <span>Islamabad & Rawalpindi</span>
                    <strong style={{ color: '#fff' }}>6,700 Passes (19%)</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '19%', height: '100%', backgroundColor: '#8b5cf6', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    <span>Other Cities (Multan, Faisalabad, Hyd)</span>
                    <strong style={{ color: '#fff' }}>2,070 Passes (6%)</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '6%', height: '100%', backgroundColor: '#38bdf8', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Sales by Category */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={18} color="#c084fc" /> Revenue Distribution by Category
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    <span>Concerts & Live Music</span>
                    <strong style={{ color: '#60a5fa' }}>PKR 24,500,000</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '51%', height: '100%', backgroundColor: '#3b82f6', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    <span>Cultural & Fashion Bazaars</span>
                    <strong style={{ color: '#fbbf24' }}>PKR 14,200,000</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '29%', height: '100%', backgroundColor: '#fbbf24', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    <span>Theatre & Comedy Shows</span>
                    <strong style={{ color: '#34d399' }}>PKR 6,800,000</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '14%', height: '100%', backgroundColor: '#34d399', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    <span>Sports & Esports Arenas</span>
                    <strong style={{ color: '#c084fc' }}>PKR 3,000,000</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '6%', height: '100%', backgroundColor: '#c084fc', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Moderation & Management Tab */}
      {activeAdminTab === 'events' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search events by title or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#16233f',
                  color: '#fff',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem 0.5rem 2.2rem',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['All', 'LIVE', 'Featured'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    backgroundColor: filterStatus === st ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    color: filterStatus === st ? '#60a5fa' : '#94a3b8',
                    border: filterStatus === st ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Events Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Event Title & Organizer</th>
                  <th style={{ padding: '0.75rem 1rem' }}>City & Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Starting Price</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Featured</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEventsList.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{ev.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Organizer: {ev.organizer || 'Verified Partner'}</div>
                    </td>

                    <td style={{ padding: '1rem', color: '#cbd5e1' }}>
                      <div>{ev.city}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{ev.date}</div>
                    </td>

                    <td style={{ padding: '1rem', fontWeight: 700, color: '#60a5fa' }}>
                      PKR {ev.startingPrice.toLocaleString()}
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${ev.status === 'LIVE' ? 'badge-live' : 'badge-fast'}`}>
                        {ev.status}
                      </span>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => onToggleFeature(ev.id)}
                        style={{
                          backgroundColor: ev.isFeatured ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: ev.isFeatured ? '#c084fc' : '#94a3b8',
                          border: ev.isFeatured ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Star size={13} fill={ev.isFeatured ? '#c084fc' : 'none'} /> {ev.isFeatured ? 'Featured' : 'Make Featured'}
                      </button>
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => onSelectEvent(ev)}
                          title="Preview Event Details"
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '0.4rem 0.7rem',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => onDeleteEvent(ev.id)}
                          title="Delete Event"
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '0.4rem 0.7rem',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={15} />
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

      {/* Payouts Tab */}
      {activeAdminTab === 'payouts' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: '#fff', marginBottom: '1.25rem' }}>
            Organizer Settlement & Payout Approvals
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Payout ID & Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Organizer & Event</th>
                <th style={{ padding: '0.75rem 1rem' }}>Payout Amount</th>
                <th style={{ padding: '0.75rem 1rem' }}>Bank / Account</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {payoutRequests.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '1rem', color: '#fff', fontWeight: 600 }}>
                    <div>{p.id}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{p.date}</div>
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <div style={{ color: '#fff', fontWeight: 700 }}>{p.organizer}</div>
                    <div style={{ fontSize: '0.78rem', color: '#60a5fa' }}>{p.eventTitle}</div>
                  </td>

                  <td style={{ padding: '1rem', fontWeight: 800, color: '#34d399', fontSize: '1rem' }}>
                    PKR {p.amount.toLocaleString()}
                  </td>

                  <td style={{ padding: '1rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                    {p.account}
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      backgroundColor: p.status === 'PAID' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: p.status === 'PAID' ? '#34d399' : '#fbbf24',
                      border: p.status === 'PAID' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {p.status}
                    </span>
                  </td>

                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    {p.status === 'PENDING' ? (
                      <button
                        onClick={() => handleApprovePayout(p.id)}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                      >
                        <CheckCircle size={14} /> Release Payment
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Settled ✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users & Organizers Allocation Management Tab */}
      {activeAdminTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Create Organizer Form */}
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} color="#34d399" /> Provision New Event Organizer Account
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              As Super Admin, allocate Organizer privileges to a brand or individual. Self-registrations defaults to General Attendee.
            </p>

            <form onSubmit={handleCreateOrganizer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Full Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Salt Arts Ent."
                  value={newOrgForm.name}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#16233f',
                    color: '#fff',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Organizer Email *
                </label>
                <input
                  required
                  type="email"
                  placeholder="saltarts@eventland.pk"
                  value={newOrgForm.email}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#16233f',
                    color: '#fff',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Allocated Role
                </label>
                <div style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.85rem',
                  fontSize: '0.88rem',
                  fontWeight: 700
                }}>
                  ORGANIZER + ATTENDEE
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1rem' }}>
                <CheckCircle size={16} /> Allocate Organizer
              </button>
            </form>
          </div>

          {/* User Table */}
          <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: '#fff', marginBottom: '1rem' }}>
              System Registered Accounts & Roles
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.8rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>User ID / Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Email Address</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Allocated Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ color: '#fff', fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.id} • {u.org}</div>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: '#60a5fa', fontSize: '0.88rem' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span style={{
                        backgroundColor: u.role === 'admin' ? 'rgba(139, 92, 246, 0.2)' : u.role === 'organizer' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                        color: u.role === 'admin' ? '#c084fc' : u.role === 'organizer' ? '#34d399' : '#60a5fa',
                        border: u.role === 'admin' ? '1px solid rgba(139, 92, 246, 0.4)' : u.role === 'organizer' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {u.role === 'admin' ? '🛡️ SUPER ADMIN' : u.role === 'organizer' ? '🏢 ORGANIZER + ATTENDEE' : '👤 GENERAL ATTENDEE'}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: '#34d399', fontSize: '0.82rem', fontWeight: 600 }}>
                      ✓ {u.status}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                      {u.role === 'customer' && (
                        <button
                          onClick={() => handlePromoteToOrganizer(u.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                        >
                          Promote to Organizer
                        </button>
                      )}
                      {u.role === 'organizer' && (
                        <span style={{ fontSize: '0.78rem', color: '#34d399' }}>Organizing Granted ✓</span>
                      )}
                      {u.role === 'admin' && (
                        <span style={{ fontSize: '0.78rem', color: '#c084fc' }}>System Admin</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Settings Tab */}
      {activeAdminTab === 'settings' && (
        <div className="glass-card" style={{ padding: '2rem', maxWidth: '650px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff', marginBottom: '1.5rem' }}>
            Platform Global Configuration
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Platform Ticket Service Fee (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={platformFee}
                onChange={(e) => setPlatformFee(Number(e.target.value))}
                style={{
                  width: '100%',
                  backgroundColor: '#16233f',
                  color: '#fff',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '0.65rem 1rem',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                Applied automatically on all online ticket sales during checkout.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#fff' }}>Enable EventVibe AI Engine</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Allow AI event recommendations on home page</div>
              </div>
              <input
                type="checkbox"
                checked={isAiEnabled}
                onChange={(e) => setIsAiEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#fff' }}>Maintenance Mode</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Restrict new ticket checkouts temporarily</div>
              </div>
              <input
                type="checkbox"
                checked={isMaintenanceMode}
                onChange={(e) => setIsMaintenanceMode(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            <button
              onClick={() => alert("✅ Platform configuration updated successfully!")}
              className="btn btn-primary"
              style={{ marginTop: '1rem', width: '100%' }}
            >
              Save Configuration Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
