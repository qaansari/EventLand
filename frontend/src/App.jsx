import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroSlider from './components/HeroSlider';
import EventCard from './components/EventCard';
import EventFilterBar from './components/EventFilterBar';
import EventDetailModal from './components/EventDetailModal';
import InteractiveSeatPicker from './components/InteractiveSeatPicker';
import CheckoutModal from './components/CheckoutModal';
import DigitalTicketModal from './components/DigitalTicketModal';
import ArtistBookings from './components/ArtistBookings';
import EventOrganizerWizard from './components/EventOrganizerWizard';
import AiEventAssistant from './components/AiEventAssistant';
import AdminDashboard from './components/AdminDashboard';
import OrganizerDashboard from './components/OrganizerDashboard';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import { Ticket, MapPin, Trash2, Search, RefreshCw } from 'lucide-react';
import { eventsApi, bookingsApi, tagsApi, locationsApi } from './services/api';
import { useToast } from './context/ToastContext';
import './App.css';

export default function App() {
  const { showSuccess, showInfo, showError, showWarning } = useToast();
  const [events, setEvents] = useState([]);

  const [tags, setTags] = useState([]);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Fetch live events, tags, countries, and cities from .NET Backend API on mount
  useEffect(() => {
    setLoadingEvents(true);
    Promise.all([
      eventsApi.getEvents({ pageSize: 100 }).catch(() => ({ items: [] })),
      tagsApi.getAll().catch(() => []),
      locationsApi.getCountries().catch(() => []),
      locationsApi.getCities().catch(() => [])
    ])
      .then(([resEvents, resTags, resCountries, resCities]) => {
        setEvents(resEvents.items || []);
        setTags(Array.isArray(resTags) ? resTags : (resTags?.items || []));
        setCountries(Array.isArray(resCountries) ? resCountries : (resCountries?.items || []));
        setCities(Array.isArray(resCities) ? resCities : (resCities?.items || []));
      })
      .catch(err => {
        console.error('Could not connect to backend API:', err);
        setEvents([]);
      })
      .finally(() => setLoadingEvents(false));
  }, []);

  const [activeView, setActiveView] = useState('explore'); // explore, artists, ai-assistant, organizer-wizard, my-tickets, organizer, admin
  const [userRole, setUserRole] = useState('customer'); // customer, organizer, admin
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedTag, setSelectedTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  // User Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('eventland_logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState('customer');
  const [pendingBookingData, setPendingBookingData] = useState(null); // { event, targetFlow, seats }

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('eventland_logged_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('eventland_logged_user');
    }
  }, [currentUser]);

  const handleOpenAuthModal = (roleToOpen = 'customer') => {
    setAuthModalRole(roleToOpen);
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    setUserRole(userData.role);
    setIsAuthModalOpen(false);

    showSuccess(
      'Welcome Back! 🎉',
      `Logged in as ${userData.name || userData.email} (${userData.role.toUpperCase()})`
    );

    // Redirect to dashboard if logging into admin or organizer role
    if (userData.role === 'admin') {
      setActiveView('admin');
    } else if (userData.role === 'organizer') {
      setActiveView('organizer');
    }

    // Resume pending booking if user was booking a ticket
    if (pendingBookingData) {
      const { event, targetFlow, seats } = pendingBookingData;
      setPendingBookingData(null);
      if (targetFlow === 'seat-picker') {
        setActiveSeatPickerEvent(event);
      } else if (targetFlow === 'checkout') {
        setCheckoutData({ event, seats });
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole('customer');
    setActiveView('explore');
    localStorage.removeItem('eventland_logged_user');
    showInfo('Logged Out', 'You have been logged out successfully.');
  };

  const handleRoleChange = (newRole) => {
    // Require proper login authentication for Admin and Organizer roles
    if (newRole === 'admin') {
      if (!currentUser || currentUser.role !== 'admin') {
        setAuthModalRole('admin');
        setIsAuthModalOpen(true);
        return;
      }
      setUserRole('admin');
      setActiveView('admin');
    } else if (newRole === 'organizer') {
      if (!currentUser || (currentUser.role !== 'organizer' && currentUser.role !== 'admin')) {
        setAuthModalRole('organizer');
        setIsAuthModalOpen(true);
        return;
      }
      setUserRole('organizer');
      setActiveView('organizer');
    } else {
      setUserRole('customer');
      setActiveView('explore');
    }
  };

  // Saved / Favorite Events
  const [savedEventIds, setSavedEventIds] = useState(() => {
    const saved = localStorage.getItem('eventland_saved_events');
    return saved ? JSON.parse(saved) : [];
  });

  // User Purchased Tickets
  const [purchasedTickets, setPurchasedTickets] = useState(() => {
    const tickets = localStorage.getItem('eventland_purchased_tickets');
    return tickets ? JSON.parse(tickets) : [];
  });

  const handleRemoveTicket = (ticketId) => {
    const updated = purchasedTickets.filter((t) => t.ticketId !== ticketId);
    setPurchasedTickets(updated);
    localStorage.setItem('eventland_purchased_tickets', JSON.stringify(updated));
    showInfo('Pass Removed 🎫', `Digital pass #${ticketId} removed from saved tickets.`);
  };

  const handleClearAllTickets = () => {
    setPurchasedTickets([]);
    localStorage.removeItem('eventland_purchased_tickets');
    showInfo('Passes Cleared 🎫', 'All saved digital ticket passes have been cleared.');
  };

  // Ticket Lookup State
  const [ticketLookupQuery, setTicketLookupQuery] = useState('');
  const [isLookingUpTicket, setIsLookingUpTicket] = useState(false);

  const handleLookupTickets = async (e) => {
    e?.preventDefault();
    const query = ticketLookupQuery.trim();
    if (!query) {
      showWarning('Lookup Query Required', 'Please enter your email or booking reference (e.g. EVL-123456)');
      return;
    }

    setIsLookingUpTicket(true);
    try {
      if (query.toUpperCase().startsWith('EVL-')) {
        const booking = await bookingsApi.getBookingByRef(query.toUpperCase());
        if (booking) {
          const tObj = {
            ticketId: booking.bookingRef,
            eventTitle: booking.eventTitle,
            venue: 'Confirmed Venue',
            attendeeName: booking.customerName,
            attendeeEmail: booking.customerEmail,
            phone: booking.customerPhone,
            seats: (booking.selectedSeats || []).map(s => ({ id: s.label || s.id, zone: s.label })),
            paymentMethod: booking.paymentMethod || 'PAID',
            totalPaid: booking.totalAmount,
            bookingTime: new Date(booking.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
          };

          const exists = purchasedTickets.some(t => t.ticketId === tObj.ticketId);
          if (!exists) {
            const updated = [tObj, ...purchasedTickets];
            setPurchasedTickets(updated);
            localStorage.setItem('eventland_purchased_tickets', JSON.stringify(updated));
          }
          showSuccess('Booking Retrieved', `Found booking ${booking.bookingRef} for ${booking.customerName}`);
          setActiveTicketView(tObj);
        }
      } else {
        const res = await bookingsApi.getBookingsByEmail(query, 1, 20);
        const list = res.items || [];
        if (list.length === 0) {
          showInfo('No Bookings Found', `No bookings found for email: ${query}`);
        } else {
          const newTickets = list.map(b => ({
            ticketId: b.bookingRef,
            eventTitle: b.eventTitle,
            venue: 'Confirmed Venue',
            attendeeName: b.customerName,
            attendeeEmail: b.customerEmail,
            phone: b.customerPhone,
            seats: (b.selectedSeats || []).map(s => ({ id: s.label || s.id, zone: s.label })),
            paymentMethod: b.paymentMethod || 'PAID',
            totalPaid: b.totalAmount,
            bookingTime: new Date(b.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
          }));

          const merged = [...newTickets, ...purchasedTickets.filter(t => !newTickets.some(nt => nt.ticketId === t.ticketId))];
          setPurchasedTickets(merged);
          localStorage.setItem('eventland_purchased_tickets', JSON.stringify(merged));
          showSuccess('Bookings Retrieved', `Found ${list.length} booking(s) for ${query}`);
        }
      }
    } catch (err) {
      showError('Lookup Failed', err.message || 'Could not find booking.');
    } finally {
      setIsLookingUpTicket(false);
    }
  };

  // Active Modals
  const [activeDetailEvent, setActiveDetailEvent] = useState(null);
  const [activeSeatPickerEvent, setActiveSeatPickerEvent] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null); // { event, seats }
  const [activeTicketView, setActiveTicketView] = useState(null);

  useEffect(() => {
    localStorage.setItem('eventland_saved_events', JSON.stringify(savedEventIds));
  }, [savedEventIds]);

  useEffect(() => {
    localStorage.setItem('eventland_purchased_tickets', JSON.stringify(purchasedTickets));
  }, [purchasedTickets]);

  // Dynamic Document Title based on Active View, Search Filters, & Active Modals
  useEffect(() => {
    if (activeTicketView) {
      document.title = `E-Ticket Pass (${activeTicketView.ticketId}) | Event Land`;
    } else if (checkoutData) {
      document.title = `Checkout: ${checkoutData.event?.title || 'Tickets'} | Event Land`;
    } else if (activeSeatPickerEvent) {
      document.title = `Select Seats: ${activeSeatPickerEvent.title} | Event Land`;
    } else if (activeDetailEvent) {
      document.title = `${activeDetailEvent.title} (${activeDetailEvent.city}) | Event Land`;
    } else if (activeView === 'artists') {
      document.title = `Artist Bookings & Live Talent | Event Land`;
    } else if (activeView === 'ai-assistant') {
      document.title = `EventVibe AI Matchmaker & Concierge | Event Land`;
    } else if (activeView === 'organizer-wizard') {
      document.title = `List & Host Your Event | Event Land`;
    } else if (activeView === 'my-tickets') {
      document.title = `My Digital Tickets & Passes | Event Land`;
    } else if (activeView === 'admin') {
      document.title = `Admin Console & Operations | Event Land`;
    } else if (activeView === 'organizer') {
      document.title = `Organizer Command Center | Event Land`;
    } else {
      // Explore View
      if (searchQuery.trim()) {
        document.title = `Search: "${searchQuery}" | Event Land`;
      } else if (selectedTag !== 'All' && selectedCity !== 'All Cities') {
        document.title = `${selectedTag} Events in ${selectedCity} | Event Land`;
      } else if (selectedTag !== 'All') {
        document.title = `${selectedTag} Events | Event Land`;
      } else if (selectedCity !== 'All Cities') {
        document.title = `Events in ${selectedCity} | Event Land`;
      } else {
        document.title = `Event Land - Discover Concerts, Festivals & Live Events`;
      }
    }
  }, [
    activeView,
    selectedCity,
    selectedTag,
    searchQuery,
    activeDetailEvent,
    activeSeatPickerEvent,
    checkoutData,
    activeTicketView
  ]);

  const handleToggleSave = (eventId) => {
    if (savedEventIds.includes(eventId)) {
      setSavedEventIds(savedEventIds.filter((id) => id !== eventId));
      showInfo('Saved Events', 'Event removed from your favorites.');
    } else {
      setSavedEventIds([...savedEventIds, eventId]);
      showSuccess('Saved Events ❤️', 'Event added to your favorites!');
    }
  };

  // Open Detail Modal when event card is clicked
  const handleSelectEventForDetail = (event) => {
    setActiveDetailEvent(event);
  };

  // Handle Action from EventDetailModal
  const handleProceedFromDetail = (event, targetFlow, seats) => {
    setActiveDetailEvent(null);

    if (targetFlow === 'seat-picker') {
      setActiveSeatPickerEvent(event);
      return;
    }

    if (!currentUser) {
      setPendingBookingData({ event, targetFlow, seats });
      setAuthModalRole('customer');
      setIsAuthModalOpen(true);
      showWarning('Authentication Required', 'Please sign in or create an account to proceed with booking.');
      return;
    }

    if (targetFlow === 'checkout') {
      setCheckoutData({ event, seats });
    }
  };

  const handleProceedFromSeatPicker = (selectedSeats) => {
    const event = activeSeatPickerEvent;
    setActiveSeatPickerEvent(null);

    if (!currentUser) {
      setPendingBookingData({ event, targetFlow: 'checkout', seats: selectedSeats });
      setAuthModalRole('customer');
      setIsAuthModalOpen(true);
      showWarning('Authentication Required', 'Please sign in or create an account to finalize your seats.');
      return;
    }

    setCheckoutData({ event, seats: selectedSeats });
  };

  const handleBookingSuccess = (newTicket) => {
    setCheckoutData(null);
    setPurchasedTickets([newTicket, ...purchasedTickets]);
    setActiveTicketView(newTicket);
    showSuccess('Booking Confirmed! 🎟️', `Pass #${newTicket.ticketId} issued successfully for ${newTicket.eventTitle}.`);
  };

  const handlePublishNewEvent = (newEvent) => {
    const existingCustom = localStorage.getItem('eventland_custom_events');
    let customList = [];
    if (existingCustom) {
      try {
        customList = JSON.parse(existingCustom);
      } catch {
        customList = [];
      }
    }
    customList = [newEvent, ...customList];
    localStorage.setItem('eventland_custom_events', JSON.stringify(customList));

    setEvents([newEvent, ...events]);
    setActiveView('explore');
    showSuccess('Event Live! 🎉', `"${newEvent.title}" published successfully and is now live on EventLand.`);
  };

  const handleToggleFeature = (eventId) => {
    setEvents(events.map(ev => {
      if (ev.id === eventId) {
        const nextState = !ev.isFeatured;
        showInfo('Event Updated', `Featured status set to ${nextState ? 'Featured' : 'Standard'}.`);
        return { ...ev, isFeatured: nextState };
      }
      return ev;
    }));
  };

  const handleDeleteEvent = (eventId) => {
    const evToDelete = events.find(e => e.id === eventId);
    if (window.confirm("Are you sure you want to delete this event listing?")) {
      setEvents(events.filter(ev => ev.id !== eventId));
      showSuccess('Event Listing Deleted', `"${evToDelete?.title || 'Event'}" removed from EventLand.`);
    }
  };

  // Filter & Sort Events
  const filteredEvents = events.filter((ev) => {
    const matchCity = selectedCity === 'All Cities' || (ev.city && ev.city.toLowerCase() === selectedCity.toLowerCase());
    
    let matchTag = true;
    if (selectedTag !== 'All') {
      const selectedSlug = selectedTag.toLowerCase();
      const rawTags = ev.tags || ev.eventTags || [];
      matchTag = rawTags.some(t => {
        const tObj = (typeof t === 'object' && t.tag) ? t.tag : t;
        const tName = (typeof tObj === 'string' ? tObj : (tObj.name || tObj.slug || '')).toLowerCase();
        return tName === selectedSlug;
      });
    }

    const matchSearch =
      !searchQuery ||
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.venue && ev.venue.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.city && ev.city.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchCity && matchTag && matchSearch;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === 'price-asc') return a.startingPrice - b.startingPrice;
    if (sortBy === 'price-desc') return b.startingPrice - a.startingPrice;
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });

  const featuredEvents = events.filter((e) => e.isFeatured);

  return (
    <div className="app">
      {/* Top Navbar */}
      <Navbar
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeView={activeView}
        onNavigate={setActiveView}
        savedTicketsCount={purchasedTickets.length}
        currentRole={userRole}
        onSelectRole={handleRoleChange}
        currentUser={currentUser}
        onOpenAuthModal={handleOpenAuthModal}
        onLogout={handleLogout}
        cities={cities}
      />

      {/* Main View Router */}
      <main style={{ flexGrow: 1 }}>
        {activeView === 'explore' && (
          <div className="container" style={{ padding: '2rem 1.5rem' }}>
            {/* Hero Slider */}
            <HeroSlider
              featuredEvents={featuredEvents}
              onSelectEvent={handleSelectEventForDetail}
            />

            {/* Filter Bar */}
            <EventFilterBar
              tags={tags}
              cities={cities}
              selectedTag={selectedTag}
              onSelectTag={setSelectedTag}
              selectedCity={selectedCity}
              onSelectCity={setSelectedCity}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />

            {/* Events Grid Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                  {selectedTag === 'All' ? 'Upcoming Events' : `${selectedTag} Events`}
                  {selectedCity !== 'All Cities' && ` in ${selectedCity}`}
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Showing {sortedEvents.length} events found
                </span>
              </div>
            </div>

            {/* Event Cards Grid */}
            {sortedEvents.length === 0 ? (
              <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Ticket size={48} color="#94a3b8" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '0.5rem' }}>No events found</h3>
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
                  Try adjusting your city filter or search query.
                </p>
                <button
                  onClick={() => {
                    setSelectedCity('All Cities');
                    setSelectedTag('All');
                    setSearchQuery('');
                  }}
                  className="btn btn-primary"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                maxWidth: '1200px',
                width: '100%',
                margin: '0 auto'
              }}>
                {sortedEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onSelect={handleSelectEventForDetail}
                    isSaved={savedEventIds.includes(ev.id)}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* View: Artist Bookings */}
        {activeView === 'artists' && <ArtistBookings />}

        {/* View: AI Event Matchmaker Assistant */}
        {activeView === 'ai-assistant' && (
          <AiEventAssistant events={events} onSelectEvent={handleSelectEventForDetail} />
        )}

        {/* View: List Your Event Wizard */}
        {activeView === 'organizer-wizard' && (
          <EventOrganizerWizard
            onPublishEvent={handlePublishNewEvent}
            onCancel={() => setActiveView('explore')}
          />
        )}

        {/* View: My Tickets Dashboard */}
        {activeView === 'my-tickets' && (
          <div className="container" style={{ padding: '2rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <span className="badge badge-live" style={{ marginBottom: '0.5rem' }}>MY PURCHASES & SAVED PASSES</span>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>My Digital Tickets</h1>
                <p style={{ color: '#94a3b8' }}>
                  Access all your purchased E-Tickets, QR pass codes, and gatekeeper verification receipts.
                </p>
              </div>

              {purchasedTickets.length > 0 && (
                <button
                  onClick={handleClearAllTickets}
                  className="btn"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.88rem'
                  }}
                >
                  <Trash2 size={16} /> Remove All Tickets ({purchasedTickets.length})
                </button>
              )}
            </div>

            {/* Ticket Lookup Bar */}
            <form onSubmit={handleLookupTickets} style={{ marginBottom: '2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Look up passes by Email Address or Booking Reference (e.g. EVL-123456)..."
                  value={ticketLookupQuery}
                  onChange={(e) => setTicketLookupQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem 0.85rem 2.8rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isLookingUpTicket}
                className="btn btn-primary"
                style={{ padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
              >
                <RefreshCw size={16} className={isLookingUpTicket ? 'animate-spin' : ''} />
                {isLookingUpTicket ? 'Searching...' : 'Find Passes'}
              </button>
            </form>

            {purchasedTickets.length === 0 ? (
              <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Ticket size={48} color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '0.5rem' }}>No active tickets purchased yet</h3>
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
                  Explore Pakistan's top concerts, comedy nights, and festivals to get your passes!
                </p>
                <button onClick={() => setActiveView('explore')} className="btn btn-primary">
                  Browse Upcoming Events
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {purchasedTickets.map((t) => (
                  <div key={t.ticketId} className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <span className="badge badge-live">CONFIRMED PASS</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.ticketId}</span>
                        <button
                          onClick={() => handleRemoveTicket(t.ticketId)}
                          title="Delete ticket pass"
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: 'none',
                            color: '#f87171',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem'
                          }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.35rem' }}>
                      {t.eventTitle}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                      <MapPin size={14} color="#3b82f6" style={{ display: 'inline', marginRight: '4px' }} />
                      {t.venue}
                    </div>

                    <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', marginBottom: '0.25rem' }}>
                        <span>Pass Holder:</span>
                        <strong style={{ color: '#fff' }}>{t.attendeeName}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', marginBottom: '0.25rem' }}>
                        <span>Seats/Tiers:</span>
                        <strong style={{ color: '#60a5fa' }}>{t.seats.map((s) => s.id.split('-').pop()).join(', ')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Amount Paid:</span>
                        <strong style={{ color: '#fff' }}>PKR {t.totalPaid.toLocaleString()}</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTicketView(t)}
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '0.88rem' }}
                    >
                      <Ticket size={16} /> View E-Ticket & QR Pass
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* View: Admin Console Dashboard */}
        {activeView === 'admin' && (
          <AdminDashboard
            events={events}
            onToggleFeature={handleToggleFeature}
            onDeleteEvent={handleDeleteEvent}
            onSelectEvent={handleSelectEventForDetail}
          />
        )}

        {/* View: Organizer Command Center */}
        {activeView === 'organizer' && (
          <OrganizerDashboard
            events={events}
            onNavigateToCreate={() => setActiveView('organizer-wizard')}
            onSelectEvent={handleSelectEventForDetail}
          />
        )}
      </main>

      {/* Active Modals */}
      {activeDetailEvent && (
        <EventDetailModal
          event={activeDetailEvent}
          onClose={() => setActiveDetailEvent(null)}
          onProceedToBooking={handleProceedFromDetail}
        />
      )}

      {activeSeatPickerEvent && (
        <InteractiveSeatPicker
          event={activeSeatPickerEvent}
          onClose={() => setActiveSeatPickerEvent(null)}
          onProceedToCheckout={handleProceedFromSeatPicker}
        />
      )}

      {checkoutData && (
        <CheckoutModal
          event={checkoutData.event}
          selectedSeats={checkoutData.seats}
          onClose={() => setCheckoutData(null)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {activeTicketView && (
        <DigitalTicketModal
          ticket={activeTicketView}
          onClose={() => setActiveTicketView(null)}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          initialRole={authModalRole}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Footer */}
      <Footer onSelectCity={(city) => {
        setSelectedCity(city);
        setActiveView('explore');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }} />
    </div>
  );
}
