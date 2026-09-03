import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import HeroSlider from './components/HeroSlider';
import EventCard from './components/EventCard';
import EventFilterBar from './components/EventFilterBar';
import EventDetailPage from './components/EventDetailPage';
import InteractiveSeatPicker from './components/InteractiveSeatPicker';
import CheckoutModal from './components/CheckoutModal';
import DigitalTicketModal from './components/DigitalTicketModal';
import UnpaidInvoicesModal from './components/UnpaidInvoicesModal';
import AttendeeDashboard from './components/AttendeeDashboard';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import { Ticket, MapPin, Trash2, Search, RefreshCw } from 'lucide-react';
import { eventsApi, bookingsApi, tagsApi, locationsApi, adminApi, toEventSlug } from './services/api';
import { useToast } from './context/ToastContext';
import './App.css';

// Code-split heavy / role-gated views into separate chunks
const ArtistBookings = lazy(() => import('./components/ArtistBookings'));
const EventOrganizerWizard = lazy(() => import('./components/EventOrganizerWizard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const OrganizerDashboard = lazy(() => import('./components/OrganizerDashboard'));

const LazyFallback = (
  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
    <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
    <p>Loading view...</p>
  </div>
);

const PAGE_SIZE = 12;

const getEventIdFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  if (path.startsWith('/event/')) {
    const parts = path.split('/event/');
    if (parts[1]) return decodeURIComponent(parts[1].split('/')[0]);
  }
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('event')) {
    return searchParams.get('event');
  }
  return null;
};

export default function App() {
  const { showSuccess, showInfo, showError, showWarning } = useToast();
  const [events, setEvents] = useState([]);

  const [tags, setTags] = useState([]);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Pagination state for the explore events grid
  const [pageNumber, setPageNumber] = useState(1);
  const [totalEvents, setTotalEvents] = useState(null); // null = backend did not report totalCount
  const [lastPageCount, setLastPageCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedTag, setSelectedTag] = useState('All');

  // Fetch live tags, countries, and cities on mount
  useEffect(() => {
    Promise.all([
      tagsApi.getAll().catch(() => []),
      locationsApi.getCountries().catch(() => []),
      locationsApi.getCities().catch(() => [])
    ]).then(([resTags, resCountries, resCities]) => {
      setTags(Array.isArray(resTags) ? resTags : (resTags?.items || []));
      setCountries(Array.isArray(resCountries) ? resCountries : (resCountries?.items || []));
      setCities(Array.isArray(resCities) ? resCities : (resCities?.items || []));
    }).catch(console.error);
  }, []);

  // Fetch events from backend API whenever selectedTag or selectedCity changes
  useEffect(() => {
    setLoadingEvents(true);
    eventsApi.getEvents({
      category: selectedTag !== 'All' ? selectedTag : null,
      city: selectedCity !== 'All Cities' ? selectedCity : null,
      pageNumber: 1,
      pageSize: PAGE_SIZE
    })
      .then(resEvents => {
        const items = resEvents.items || [];
        setEvents(items);
        setPageNumber(1);
        setLastPageCount(items.length);
        setTotalEvents(typeof resEvents.totalCount === 'number' ? resEvents.totalCount : null);
      })
      .catch(err => {
        console.error('Could not load events from API:', err);
      })
      .finally(() => setLoadingEvents(false));
  }, [selectedTag, selectedCity]);

  const hasMoreEvents = totalEvents !== null
    ? events.length < totalEvents
    : lastPageCount >= PAGE_SIZE;

  const handleLoadMore = async () => {
    const nextPage = pageNumber + 1;
    setLoadingMore(true);
    try {
      const res = await eventsApi.getEvents({
        category: selectedTag !== 'All' ? selectedTag : null,
        city: selectedCity !== 'All Cities' ? selectedCity : null,
        pageNumber: nextPage,
        pageSize: PAGE_SIZE
      });
      const items = res.items || [];
      setEvents(prev => [...prev, ...items.filter(i => !prev.some(p => p.id === i.id))]);
      setLastPageCount(items.length);
      if (typeof res.totalCount === 'number') setTotalEvents(res.totalCount);
      setPageNumber(nextPage);
    } catch (err) {
      showError('Load Failed', err.message || 'Could not load more events.');
    } finally {
      setLoadingMore(false);
    }
  };

  const [urlEventId, setUrlEventId] = useState(getEventIdFromUrl);
  const [activeView, setActiveView] = useState(() => getEventIdFromUrl() ? 'event-detail' : 'explore'); // explore, event-detail, artists, organizer-wizard, my-tickets, organizer, admin
  const [userRole, setUserRole] = useState('customer'); // customer, organizer, admin
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
    localStorage.removeItem('eventland_jwt_token');
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

  const savedEvents = useMemo(() => {
    return events.filter((e) => savedEventIds.includes(e.id));
  }, [events, savedEventIds]);

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
            venue: booking.venueName || 'Arts Council of Pakistan, Karachi',
            date: booking.showDate || booking.eventDate || 'Saturday, 10th January 2027',
            time: booking.showTime || booking.showTitle || '08:00 PM PKT',
            showTitle: booking.showTitle || 'Main Show Slot',
            showDateTime: (booking.showDate && booking.showTime) ? `${booking.showDate} at ${booking.showTime}` : (booking.showDate || booking.showTime || 'Saturday, 10th January 2027 at 08:00 PM PKT'),
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
            venue: b.venueName || 'Arts Council of Pakistan, Karachi',
            date: b.showDate || b.eventDate || 'Saturday, 10th January 2027',
            time: b.showTime || b.showTitle || '08:00 PM PKT',
            showTitle: b.showTitle || 'Main Show Slot',
            showDateTime: (b.showDate && b.showTime) ? `${b.showDate} at ${b.showTime}` : (b.showDate || b.showTime || 'Saturday, 10th January 2027 at 08:00 PM PKT'),
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

  // Active Modals & Dedicated Detail View
  const [activeDetailEvent, setActiveDetailEvent] = useState(null);
  const [activeSeatPickerEvent, setActiveSeatPickerEvent] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null); // { event, seats }
  const [activeTicketView, setActiveTicketView] = useState(null);

  // Handle URL deep-linking and browser Back/Forward (popstate)
  useEffect(() => {
    const initialId = getEventIdFromUrl();
    if (initialId) {
      setUrlEventId(initialId);
      setActiveView('event-detail');
      eventsApi.getEventById(initialId)
        .then(ev => { if (ev) setActiveDetailEvent(ev); })
        .catch(err => console.error('Failed to load initial event from URL:', err));
    }

    const handlePopState = () => {
      const eid = getEventIdFromUrl();
      if (eid) {
        setUrlEventId(eid);
        setActiveView('event-detail');
        eventsApi.getEventById(eid)
          .then(ev => { if (ev) setActiveDetailEvent(ev); })
          .catch(err => console.error(err));
      } else {
        setUrlEventId(null);
        setActiveDetailEvent(null);
        setActiveView('explore');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    localStorage.setItem('eventland_saved_events', JSON.stringify(savedEventIds));
  }, [savedEventIds]);

  useEffect(() => {
    localStorage.setItem('eventland_purchased_tickets', JSON.stringify(purchasedTickets));
  }, [purchasedTickets]);

  // Dynamic Document Title & Meta Description based on Active View, Search Filters, & Active Modals
  useEffect(() => {
    let title = 'EventLand - Discover | Book | Experience Live Events in Pakistan';
    let description = 'Discover & book tickets for Pakistan\'s top concerts, comedy nights, festivals, and theatre shows across Karachi, Lahore, and Islamabad.';

    if (activeTicketView) {
      title = `E-Ticket Pass (${activeTicketView.ticketId}) | EventLand`;
      description = `Digital ticket pass for ${activeTicketView.eventTitle} on EventLand Pakistan.`;
    } else if (checkoutData) {
      title = `Checkout: ${checkoutData.event?.title || 'Tickets'} | EventLand`;
      description = `Complete your ticket booking for ${checkoutData.event?.title || 'live event'} on EventLand.`;
    } else if (activeSeatPickerEvent) {
      title = `Select Seats: ${activeSeatPickerEvent.title} | EventLand`;
      description = `Choose your reserved seats for ${activeSeatPickerEvent.title} on EventLand.`;
    } else if (activeDetailEvent) {
      title = `${activeDetailEvent.title} (${activeDetailEvent.city || 'Pakistan'}) | EventLand`;
      description = activeDetailEvent.description ? activeDetailEvent.description.slice(0, 160) : `Book tickets for ${activeDetailEvent.title} on EventLand.`;
    } else if (activeView === 'artists') {
      title = `Artist Bookings & Live Talent | EventLand Pakistan`;
      description = `Browse and book featured artists, musicians, and comedians across Pakistan on EventLand.`;
    } else if (activeView === 'organizer-wizard') {
      title = `List & Host Your Event | EventLand Pakistan`;
      description = `Organizers can list events, configure ticket tiers, and sell tickets to audiences across Pakistan.`;
    } else if (activeView === 'my-tickets') {
      title = `My Digital Tickets & Passes | EventLand`;
      description = `View and download your digital ticket passes and booking receipts on EventLand.`;
    } else if (activeView === 'admin') {
      title = `Admin Console & Operations | EventLand`;
    } else if (activeView === 'organizer') {
      title = `Organizer Command Center | EventLand`;
    } else {
      // Explore View
      if (searchQuery.trim()) {
        title = `Search: "${searchQuery}" | EventLand Pakistan`;
      } else if (selectedTag !== 'All' && selectedCity !== 'All Cities') {
        title = `${selectedTag} Events in ${selectedCity} | EventLand Pakistan`;
        description = `Find and book ${selectedTag} events in ${selectedCity}, Pakistan on EventLand.`;
      } else if (selectedTag !== 'All') {
        title = `${selectedTag} Events | EventLand Pakistan`;
        description = `Discover top ${selectedTag} events across Pakistan on EventLand.`;
      } else if (selectedCity !== 'All Cities') {
        title = `Events in ${selectedCity} | EventLand Pakistan`;
        description = `Discover live concerts, comedy shows, and theatre in ${selectedCity}, Pakistan.`;
      }
    }

    document.title = title;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
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

  const handleNavigateView = (view) => {
    if (window.location.pathname.startsWith('/event/') || window.location.search.includes('event=')) {
      window.history.pushState({}, '', '/');
    }
    setActiveDetailEvent(null);
    setUrlEventId(null);
    setActiveView(view);
  };

  // Open Detail Page when event card is clicked & update URL path to /event/:slug
  const handleSelectEventForDetail = (event) => {
    const slug = toEventSlug(event);
    if (typeof event === 'object' && event !== null) {
      setActiveDetailEvent(event);
    }
    if (slug) {
      setUrlEventId(slug);
      window.history.pushState({ eventSlug: slug, eventId: event?.id }, '', `/event/${slug}`);
    }
    setActiveView('event-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromEventDetail = () => {
    setActiveDetailEvent(null);
    setUrlEventId(null);
    setActiveView('explore');
    if (window.location.pathname.startsWith('/event/') || window.location.search.includes('event=')) {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Action from EventDetailPage
  const handleProceedFromDetail = (event, targetFlow, seats) => {
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

  const handleProceedFromSeatPicker = (selectedSeats, selectedShowId) => {
    const event = activeSeatPickerEvent;
    setActiveSeatPickerEvent(null);

    // Attach the chosen show so checkout books against the correct show slot.
    const eventWithShow = (selectedShowId && event?.shows?.length)
      ? { ...event, selectedShow: event.shows.find(s => s.id === selectedShowId) || event.selectedShow }
      : event;

    if (!currentUser) {
      setPendingBookingData({ event: eventWithShow, targetFlow: 'checkout', seats: selectedSeats });
      setAuthModalRole('customer');
      setIsAuthModalOpen(true);
      showWarning('Authentication Required', 'Please sign in or create an account to finalize your seats.');
      return;
    }

    setCheckoutData({ event: eventWithShow, seats: selectedSeats });
  };

  const handleBookingSuccess = (newTicket) => {
    setCheckoutData(null);
    setPurchasedTickets([newTicket, ...purchasedTickets]);
    setActiveTicketView(newTicket);
    showSuccess('Booking Confirmed! 🎟️', `Pass #${newTicket.ticketId} issued successfully for ${newTicket.eventTitle}.`);
  };

  const handlePublishNewEvent = async (newEvent) => {
    // Backend API is the source of truth for new events. Fall back to
    // optimistic local state only when the API is unreachable (offline).
    let created = null;
    try {
      created = await adminApi.events.create(newEvent);
    } catch (err) {
      console.warn('Backend event creation failed, falling back to local state:', err);
    }

    const eventToList = (created && typeof created === 'object' && !Array.isArray(created))
      ? { ...newEvent, ...created }
      : newEvent;

    setEvents([eventToList, ...events]);
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

  // Filter & Sort Events — memoized so typing in search does not re-scan the
  // list on every render, and debounced so each keystroke does not re-filter.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sortedEvents = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    const citySel = selectedCity.toLowerCase();
    const tagSel = selectedTag.toLowerCase().trim();

    const filtered = events.filter((ev) => {
      const matchCity = selectedCity === 'All Cities' || (ev.city && ev.city.toLowerCase() === citySel);

      let matchTag = true;
      if (selectedTag !== 'All') {
        const evTagNames = [];
        
        if (ev.tag) {
          if (typeof ev.tag === 'string') evTagNames.push(ev.tag);
          else if (typeof ev.tag === 'object' && ev.tag.name) evTagNames.push(ev.tag.name);
        }
        
        if (ev.category) {
          if (typeof ev.category === 'string') evTagNames.push(ev.category);
          else if (typeof ev.category === 'object' && ev.category.name) evTagNames.push(ev.category.name);
        }

        if (ev.categoryName) {
          evTagNames.push(String(ev.categoryName));
        }

        const rawTags = ev.tags || ev.eventTags || [];
        if (Array.isArray(rawTags)) {
          rawTags.forEach(t => {
            if (typeof t === 'string') evTagNames.push(t);
            else if (typeof t === 'object' && t !== null) {
              if (t.name) evTagNames.push(t.name);
              if (t.slug) evTagNames.push(t.slug);
              if (t.tagName) evTagNames.push(t.tagName);
              if (t.tag && typeof t.tag === 'string') evTagNames.push(t.tag);
              if (t.tag && typeof t.tag === 'object') {
                if (t.tag.name) evTagNames.push(t.tag.name);
                if (t.tag.slug) evTagNames.push(t.tag.slug);
              }
            }
          });
        }

        if (Array.isArray(ev.tagNames)) {
          ev.tagNames.forEach(t => typeof t === 'string' && evTagNames.push(t));
        }

        matchTag = evTagNames.some(name => {
          const n = String(name).toLowerCase().trim();
          return n === tagSel || n.includes(tagSel) || tagSel.includes(n);
        });
      }

      const matchSearch =
        !needle ||
        ev.title.toLowerCase().includes(needle) ||
        (ev.venue && ev.venue.toLowerCase().includes(needle)) ||
        (ev.city && ev.city.toLowerCase().includes(needle));

      return matchCity && matchTag && matchSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'price-asc') return a.startingPrice - b.startingPrice;
      if (sortBy === 'price-desc') return b.startingPrice - a.startingPrice;
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });
  }, [events, selectedCity, selectedTag, debouncedSearch, sortBy]);

  const featuredEvents = useMemo(() => events.filter((e) => e.isFeatured), [events]);

  return (
    <div className="app">
      {/* Top Navbar */}
      <Navbar
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeView={activeView}
        onNavigate={handleNavigateView}
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
              events={events}
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
            {loadingEvents ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                <p>Loading events...</p>
              </div>
            ) : sortedEvents.length === 0 ? (
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
              <>
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
                {hasMoreEvents && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="btn btn-secondary"
                      style={{ padding: '0.75rem 1.6rem', fontWeight: 700 }}
                    >
                      {loadingMore ? 'Loading...' : 'Load More Events'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* View: Artist Bookings */}
        {activeView === 'artists' && (
          <Suspense fallback={LazyFallback}>
            <ArtistBookings cities={cities} />
          </Suspense>
        )}

        {/* View: List Your Event Wizard */}
        {activeView === 'organizer-wizard' && (
          <Suspense fallback={LazyFallback}>
            <EventOrganizerWizard
              onPublishEvent={handlePublishNewEvent}
              onCancel={() => setActiveView('explore')}
              cities={cities}
            />
          </Suspense>
        )}

        {/* View: Attendee Dashboard & E-Tickets */}
        {activeView === 'my-tickets' && (
          <AttendeeDashboard
            currentUser={currentUser}
            purchasedTickets={purchasedTickets}
            savedEvents={savedEvents}
            onViewTicket={(ticket) => setActiveTicketView(ticket)}
            onRemoveTicket={handleRemoveTicket}
            onLookupTickets={handleLookupTickets}
            onBrowseEvents={() => setActiveView('explore')}
            onSelectEvent={handleSelectEventForDetail}
          />
        )}
        {/* View: Admin Console Dashboard */}
        {activeView === 'admin' && (
          <Suspense fallback={LazyFallback}>
            <AdminDashboard
              events={events}
              onToggleFeature={handleToggleFeature}
              onDeleteEvent={handleDeleteEvent}
              onSelectEvent={handleSelectEventForDetail}
            />
          </Suspense>
        )}

        {/* View: Organizer Command Center */}
        {activeView === 'organizer' && (
          <Suspense fallback={LazyFallback}>
            <OrganizerDashboard
              currentUser={currentUser}
              events={events}
              onNavigateToCreate={() => setActiveView('organizer-wizard')}
              onSelectEvent={handleSelectEventForDetail}
            />
          </Suspense>
        )}

        {/* View: Dedicated Event Details Page */}
        {activeView === 'event-detail' && (
          <EventDetailPage
            event={activeDetailEvent}
            eventId={urlEventId}
            onBack={handleBackFromEventDetail}
            onProceedToBooking={handleProceedFromDetail}
          />
        )}
      </main>

      {/* Active Modals */}

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

      {activeView === 'unpaid-invoices' && (
        <UnpaidInvoicesModal
          currentUser={currentUser}
          onClose={() => setActiveView('explore')}
          onPaymentSuccess={(ticket) => {
            setSavedTickets(prev => [ticket, ...prev]);
            setActiveTicketView(ticket);
          }}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          initialMode="login"
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
