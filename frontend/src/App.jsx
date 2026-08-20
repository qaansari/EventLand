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
import Footer from './components/Footer';
import { MOCK_EVENTS } from './data/mockEvents';
import { Ticket, MapPin, Trash2 } from 'lucide-react';
import './App.css';

export default function App() {
  const [events, setEvents] = useState(() => {
    const local = localStorage.getItem('eventland_custom_events');
    if (local) {
      try {
        return [...JSON.parse(local), ...MOCK_EVENTS];
      } catch (err) {
        return MOCK_EVENTS;
      }
    }
    return MOCK_EVENTS;
  });

  const [activeView, setActiveView] = useState('explore'); // explore, artists, ai-assistant, organizer-wizard, my-tickets
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');

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
  };

  const handleClearAllTickets = () => {
    setPurchasedTickets([]);
    localStorage.removeItem('eventland_purchased_tickets');
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
    } else {
      // Explore View
      if (searchQuery.trim()) {
        document.title = `Search: "${searchQuery}" | Event Land`;
      } else if (selectedCategory !== 'All' && selectedCity !== 'All Cities') {
        document.title = `${selectedCategory} Events in ${selectedCity} | Event Land`;
      } else if (selectedCategory !== 'All') {
        document.title = `${selectedCategory} Events | Event Land`;
      } else if (selectedCity !== 'All Cities') {
        document.title = `Events in ${selectedCity} | Event Land`;
      } else {
        document.title = `Event Land - Discover Concerts, Festivals & Live Events`;
      }
    }
  }, [
    activeView,
    selectedCity,
    selectedCategory,
    searchQuery,
    activeDetailEvent,
    activeSeatPickerEvent,
    checkoutData,
    activeTicketView
  ]);

  const handleToggleSave = (eventId) => {
    if (savedEventIds.includes(eventId)) {
      setSavedEventIds(savedEventIds.filter((id) => id !== eventId));
    } else {
      setSavedEventIds([...savedEventIds, eventId]);
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
    } else if (targetFlow === 'checkout') {
      setCheckoutData({ event, seats });
    }
  };

  const handleProceedFromSeatPicker = (selectedSeats) => {
    const event = activeSeatPickerEvent;
    setActiveSeatPickerEvent(null);
    setCheckoutData({ event, seats: selectedSeats });
  };

  const handleBookingSuccess = (newTicket) => {
    setCheckoutData(null);
    setPurchasedTickets([newTicket, ...purchasedTickets]);
    setActiveTicketView(newTicket);
  };

  const handlePublishNewEvent = (newEvent) => {
    const existingCustom = localStorage.getItem('eventland_custom_events');
    let customList = [];
    if (existingCustom) {
      try {
        customList = JSON.parse(existingCustom);
      } catch (e) {}
    }
    customList = [newEvent, ...customList];
    localStorage.setItem('eventland_custom_events', JSON.stringify(customList));

    setEvents([newEvent, ...events]);
    setActiveView('explore');
    alert(`🎉 Event "${newEvent.title}" published successfully! It is now live on EventLand.`);
  };

  // Filter & Sort Events
  const filteredEvents = events.filter((ev) => {
    const matchCity = selectedCity === 'All Cities' || ev.city.toLowerCase() === selectedCity.toLowerCase();
    const matchCategory = selectedCategory === 'All' || ev.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchSearch =
      !searchQuery ||
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.city.toLowerCase().includes(searchQuery.toLowerCase());

    return matchCity && matchCategory && matchSearch;
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
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedCity={selectedCity}
              onSelectCity={setSelectedCity}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />

            {/* Events Grid Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                  {selectedCategory === 'All' ? 'Upcoming Events' : `${selectedCategory} Events`}
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
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="btn btn-primary"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.75rem'
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
          <AiEventAssistant onSelectEvent={handleSelectEventForDetail} />
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

      {/* Footer */}
      <Footer onSelectCity={(city) => {
        setSelectedCity(city);
        setActiveView('explore');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }} />
    </div>
  );
}
