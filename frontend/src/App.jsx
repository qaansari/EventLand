import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import HeroSlider from './components/HeroSlider';
import EventCard from './components/EventCard';
import EventFilterBar from './components/EventFilterBar';
import EventDetailPage from './components/EventDetailPage';
import InteractiveSeatPicker from './components/InteractiveSeatPicker';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import { Ticket, MapPin, Trash2, Search, RefreshCw, ShieldCheck } from 'lucide-react';
import { eventsApi, bookingsApi, tagsApi, locationsApi, adminApi, authApi, toEventSlug } from './services/api';
import { getStoredUser, getStoredToken, setStoredSession, clearStoredSession, normalizeRole, isAdmin, isOrganizer } from './utils/auth';
import { useToast } from './context/ToastContext';
import './App.css';

// Code-split heavy / role-gated views and on-demand modals into separate chunks
const ArtistBookings = lazy(() => import('./components/ArtistBookings'));
const EventOrganizerWizard = lazy(() => import('./components/EventOrganizerWizard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const OrganizerDashboard = lazy(() => import('./components/OrganizerDashboard'));
const CheckoutModal = lazy(() => import('./components/CheckoutModal'));
const DigitalTicketModal = lazy(() => import('./components/DigitalTicketModal'));
const UnpaidInvoicesModal = lazy(() => import('./components/UnpaidInvoicesModal'));
const AttendeeDashboard = lazy(() => import('./components/AttendeeDashboard'));

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
  const [venues, setVenues] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Pagination state for the explore events grid
  const [pageNumber, setPageNumber] = useState(1);
  const [totalEvents, setTotalEvents] = useState(null); // null = backend did not report totalCount
  const [lastPageCount, setLastPageCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedVenue, setSelectedVenue] = useState('All Venues');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [customDate, setCustomDate] = useState(''); // 'YYYY-MM-DD'
  const [selectedPriceFilter, setSelectedPriceFilter] = useState('all');
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
        const items = Array.isArray(resEvents) ? resEvents : (resEvents?.items || []);
        setEvents(items);
        setPageNumber(1);
        setLastPageCount(items.length);
        setTotalEvents(typeof resEvents?.totalCount === 'number' ? resEvents.totalCount : items.length);
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
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState('customer');
  const [pendingBookingData, setPendingBookingData] = useState(null); // { event, targetFlow, seats }

  useEffect(() => {
    if (currentUser) {
      setStoredSession(currentUser.token, currentUser);
    } else {
      clearStoredSession();
    }
  }, [currentUser]);

  // Verify stored JWT session with backend on startup
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      if (currentUser) setCurrentUser(null);
      return;
    }

    authApi.getMe()
      .then(verifiedUser => {
        if (verifiedUser) {
          const userRole = normalizeRole(verifiedUser.role);
          setCurrentUser(prev => ({
            ...(prev || {}),
            id: verifiedUser.id,
            name: verifiedUser.fullName || verifiedUser.email,
            email: verifiedUser.email,
            phone: verifiedUser.phoneNumber || '',
            countryId: verifiedUser.countryId || 1,
            role: userRole,
            token: token
          }));
        }
      })
      .catch(() => {
        // Token was invalid, revoked, or expired
        clearStoredSession();
        setCurrentUser(null);
      });
  }, []);

  // Listen for automatic session expiry from api.js
  useEffect(() => {
    const handleAuthExpired = () => {
      setCurrentUser(null);
      showWarning('Session Expired', 'Your session has expired. Please sign in again.');
      if (activeView === 'admin' || activeView === 'organizer' || activeView === 'organizer-wizard') {
        setActiveView('explore');
      }
    };

    window.addEventListener('eventland:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('eventland:auth-expired', handleAuthExpired);
  }, [activeView, showWarning]);

  // Route Guards: restrict administrative and organizer views to authorized roles
  useEffect(() => {
    if (activeView === 'admin') {
      if (!isAdmin(currentUser)) {
        showError('Access Denied', 'You do not have administrative privileges to access this area.');
        setActiveView('explore');
      }
    } else if (activeView === 'organizer' || activeView === 'organizer-wizard') {
      if (!isOrganizer(currentUser)) {
        showWarning('Sign In Required', 'Please sign in with an organizer account to access the Organizer Portal.');
        setAuthModalRole('organizer');
        setIsAuthModalOpen(true);
        setActiveView('explore');
      }
    } else if (activeView === 'my-tickets' || activeView === 'unpaid-invoices') {
      if (!currentUser) {
        showWarning('Sign In Required', `Please sign in to view your ${activeView === 'my-tickets' ? 'tickets' : 'unpaid invoices'}.`);
        setAuthModalRole('customer');
        setIsAuthModalOpen(true);
        setActiveView('explore');
      }
    }
  }, [activeView, currentUser, showError, showWarning]);

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
    setPurchasedTickets([]);
    if (activeView === 'my-tickets' || activeView === 'unpaid-invoices' || activeView === 'admin' || activeView === 'organizer' || activeView === 'organizer-wizard') {
      setActiveView('explore');
    }
    clearStoredSession();
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

  // User Purchased Tickets (Scoped strictly to the authenticated user)
  const [purchasedTickets, setPurchasedTickets] = useState([]);

  useEffect(() => {
    if (!currentUser?.email) {
      setPurchasedTickets([]);
      return;
    }

    const userEmail = currentUser.email.toLowerCase();
    const storageKey = `eventland_purchased_tickets_${userEmail}`;

    // Read cached tickets for this user
    let userTickets = [];
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        userTickets = JSON.parse(cached).filter(t => (t.attendeeEmail || '').toLowerCase() === userEmail);
      } catch (e) {}
    }

    // Migrate any legacy tickets belonging to this user
    const legacy = localStorage.getItem('eventland_purchased_tickets');
    if (legacy) {
      try {
        const legacyList = JSON.parse(legacy);
        const matched = legacyList.filter(t => (t.attendeeEmail || '').toLowerCase() === userEmail);
        matched.forEach(t => {
          if (!userTickets.some(ut => ut.ticketId === t.ticketId)) {
            userTickets.push(t);
          }
        });
      } catch (e) {}
    }

    setPurchasedTickets(userTickets);

    // Fetch verified/confirmed bookings for this user from backend API
    bookingsApi.getBookingsByEmail(currentUser.email, 1, 50)
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.items || []);
        const confirmedBookings = list.filter(b => b.paymentStatus === 'Paid' || b.status === 'Confirmed');
        const apiTickets = confirmedBookings.map(b => ({
          ticketId: b.bookingRef || `EVL-${b.id}`,
          bookingId: b.id,
          eventTitle: b.eventTitle,
          venue: b.venueName || 'Arts Council of Pakistan, Karachi',
          date: b.showDate || b.eventDate || 'Upcoming Show',
          time: b.showTime || b.showTitle || '08:00 PM PKT',
          showTitle: b.showTitle || 'Main Show Slot',
          showDateTime: (b.showDate && b.showTime) ? `${b.showDate} at ${b.showTime}` : (b.showDate || b.showTime || 'Upcoming Show'),
          attendeeName: b.customerName,
          attendeeEmail: b.customerEmail || currentUser.email,
          phone: b.customerPhone,
          seats: (b.selectedSeats || []).map(s => ({ id: s.label || s.id, zone: s.label })),
          paymentMethod: b.paymentMethod || 'PAID',
          totalPaid: b.totalAmount,
          bookingTime: new Date(b.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        }));

        const mergedMap = new Map();
        [...apiTickets, ...userTickets].forEach(t => {
          if ((t.attendeeEmail || '').toLowerCase() === userEmail) {
            mergedMap.set(t.ticketId, t);
          }
        });
        const finalTickets = Array.from(mergedMap.values());
        setPurchasedTickets(finalTickets);
        localStorage.setItem(storageKey, JSON.stringify(finalTickets));
      })
      .catch(err => {
        console.warn('Could not load user bookings from backend:', err);
      });
  }, [currentUser]);

  const handleRemoveTicket = (ticketId) => {
    const updated = purchasedTickets.filter((t) => t.ticketId !== ticketId);
    setPurchasedTickets(updated);
    if (currentUser?.email) {
      localStorage.setItem(`eventland_purchased_tickets_${currentUser.email.toLowerCase()}`, JSON.stringify(updated));
    }
    showInfo('Pass Removed 🎫', `Digital pass #${ticketId} removed from saved tickets.`);
  };

  const handleClearAllTickets = () => {
    setPurchasedTickets([]);
    if (currentUser?.email) {
      localStorage.removeItem(`eventland_purchased_tickets_${currentUser.email.toLowerCase()}`);
    }
    showInfo('Passes Cleared 🎫', 'All saved digital ticket passes have been cleared.');
  };

  // Ticket Lookup State
  const [ticketLookupQuery, setTicketLookupQuery] = useState('');
  const [isLookingUpTicket, setIsLookingUpTicket] = useState(false);

  const handleLookupTickets = async (e) => {
    e?.preventDefault();
    if (!currentUser) {
      showWarning('Authentication Required', 'Please sign in to view or lookup bookings.');
      setAuthModalRole('customer');
      setIsAuthModalOpen(true);
      return;
    }

    const query = ticketLookupQuery.trim();
    if (!query) {
      showWarning('Lookup Query Required', 'Please enter your booking reference (e.g. EVL-123456) or email');
      return;
    }

    const userEmail = (currentUser.email || '').toLowerCase();
    setIsLookingUpTicket(true);
    try {
      if (query.toUpperCase().startsWith('EVL-')) {
        const booking = await bookingsApi.getBookingByRef(query.toUpperCase());
        if (booking) {
          const bookingEmail = (booking.customerEmail || '').toLowerCase();
          // Strict user scoping: regular users can only access bookings matching their email
          if (bookingEmail && bookingEmail !== userEmail && !isAdmin(currentUser)) {
            showError('Access Denied', 'This booking does not belong to your signed-in account.');
            return;
          }

          const tObj = {
            ticketId: booking.bookingRef,
            bookingId: booking.id,
            eventTitle: booking.eventTitle,
            venue: booking.venueName || 'Arts Council of Pakistan, Karachi',
            date: booking.showDate || booking.eventDate || 'Upcoming Show',
            time: booking.showTime || booking.showTitle || '08:00 PM PKT',
            showTitle: booking.showTitle || 'Main Show Slot',
            showDateTime: (booking.showDate && booking.showTime) ? `${booking.showDate} at ${booking.showTime}` : (booking.showDate || booking.showTime || 'Upcoming Show'),
            attendeeName: booking.customerName,
            attendeeEmail: booking.customerEmail || currentUser.email,
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
            localStorage.setItem(`eventland_purchased_tickets_${userEmail}`, JSON.stringify(updated));
          }
          showSuccess('Booking Retrieved', `Found booking ${booking.bookingRef} for ${booking.customerName}`);
          setActiveTicketView(tObj);
        } else {
          showInfo('Not Found', `Booking reference ${query.toUpperCase()} was not found.`);
        }
      } else {
        // Looking up by email: enforce user can only lookup their own email (unless admin)
        if (query.toLowerCase() !== userEmail && !isAdmin(currentUser)) {
          showWarning('Access Restricted', `You can only look up bookings for your signed-in account (${currentUser.email}).`);
          return;
        }

        const res = await bookingsApi.getBookingsByEmail(query, 1, 20);
        const list = Array.isArray(res) ? res : (res?.items || []);
        if (list.length === 0) {
          showInfo('No Bookings Found', `No bookings found for email: ${query}`);
        } else {
          const newTickets = list
            .filter(b => b.paymentStatus === 'Paid' || b.status === 'Confirmed')
            .map(b => ({
              ticketId: b.bookingRef || `EVL-${b.id}`,
              bookingId: b.id,
              eventTitle: b.eventTitle,
              venue: b.venueName || 'Arts Council of Pakistan, Karachi',
              date: b.showDate || b.eventDate || 'Upcoming Show',
              time: b.showTime || b.showTitle || '08:00 PM PKT',
              showTitle: b.showTitle || 'Main Show Slot',
              showDateTime: (b.showDate && b.showTime) ? `${b.showDate} at ${b.showTime}` : (b.showDate || b.showTime || 'Upcoming Show'),
              attendeeName: b.customerName,
              attendeeEmail: b.customerEmail || currentUser.email,
              phone: b.customerPhone,
              seats: (b.selectedSeats || []).map(s => ({ id: s.label || s.id, zone: s.label })),
              paymentMethod: b.paymentMethod || 'PAID',
              totalPaid: b.totalAmount,
              bookingTime: new Date(b.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
            }));

          const mergedMap = new Map();
          [...newTickets, ...purchasedTickets].forEach(t => {
            if ((t.attendeeEmail || '').toLowerCase() === userEmail) {
              mergedMap.set(t.ticketId, t);
            }
          });
          const merged = Array.from(mergedMap.values());
          setPurchasedTickets(merged);
          localStorage.setItem(`eventland_purchased_tickets_${userEmail}`, JSON.stringify(merged));
          showSuccess('Bookings Retrieved', `Found ${newTickets.length} confirmed booking(s) for ${query}`);
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
    let title = 'Event Land - Discover | Book | Experience Live Events in Pakistan';
    let description = 'Discover & book tickets for Pakistan\'s top concerts, comedy nights, festivals, and theatre shows across Karachi, Lahore, and Islamabad.';

    if (activeTicketView) {
      title = `E-Ticket Pass (${activeTicketView.ticketId}) | Event Land`;
      description = `Digital ticket pass for ${activeTicketView.eventTitle} on Event Land Pakistan.`;
    } else if (checkoutData) {
      title = `Checkout: ${checkoutData.event?.title || 'Tickets'} | Event Land`;
      description = `Complete your ticket booking for ${checkoutData.event?.title || 'live event'} on Event Land.`;
    } else if (activeSeatPickerEvent) {
      title = `Select Seats: ${activeSeatPickerEvent.title} | Event Land`;
      description = `Choose your reserved seats for ${activeSeatPickerEvent.title} on Event Land.`;
    } else if (activeDetailEvent) {
      title = `${activeDetailEvent.title} (${activeDetailEvent.city || 'Pakistan'}) | Event Land`;
      description = activeDetailEvent.description ? activeDetailEvent.description.slice(0, 160) : `Book tickets for ${activeDetailEvent.title} on Event Land.`;
    } else if (activeView === 'artists') {
      title = `Artist Bookings & Live Talent | Event Land Pakistan`;
      description = `Browse and book featured artists, musicians, and comedians across Pakistan on Event Land.`;
    } else if (activeView === 'organizer-wizard') {
      title = `List & Host Your Event | Event Land Pakistan`;
      description = `Organizers can list events, configure ticket tiers, and sell tickets to audiences across Pakistan.`;
    } else if (activeView === 'my-tickets') {
      title = `My Digital Tickets & Passes | Event Land`;
      description = `View and download your digital ticket passes and booking receipts on Event Land.`;
    } else if (activeView === 'admin') {
      title = `Admin Console & Operations | Event Land`;
    } else if (activeView === 'organizer') {
      title = `Organizer Command Center | Event Land`;
    } else {
      // Explore View
      if (searchQuery.trim()) {
        title = `Search: "${searchQuery}" | Event Land Pakistan`;
      } else if (selectedTag !== 'All' && selectedCity !== 'All Cities') {
        title = `${selectedTag} Events in ${selectedCity} | Event Land Pakistan`;
        description = `Find and book ${selectedTag} events in ${selectedCity}, Pakistan on Event Land.`;
      } else if (selectedTag !== 'All') {
        title = `${selectedTag} Events | Event Land Pakistan`;
        description = `Discover top ${selectedTag} events across Pakistan on Event Land.`;
      } else if (selectedCity !== 'All Cities') {
        title = `Events in ${selectedCity} | Event Land Pakistan`;
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
    if (view === 'my-tickets' || view === 'unpaid-invoices') {
      if (!currentUser) {
        setAuthModalRole('customer');
        setIsAuthModalOpen(true);
        showWarning('Sign In Required', `Please sign in to view your ${view === 'my-tickets' ? 'tickets' : 'unpaid invoices'}.`);
        return;
      }
    }
    if (view === 'organizer-wizard') {
      if (!currentUser) {
        setAuthModalRole('organizer');
        setIsAuthModalOpen(true);
        showWarning('Organizer Login Required', 'Please sign in or register as an Organizer to list an event.');
        return;
      }
      if (currentUser.role !== 'organizer' && currentUser.role !== 'admin') {
        showWarning('Access Restricted', 'Attendees cannot list events. Only verified Organizers can publish events on EventLand.');
        return;
      }
    }
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
    const updated = [newTicket, ...purchasedTickets];
    setPurchasedTickets(updated);
    if (currentUser?.email) {
      localStorage.setItem(`eventland_purchased_tickets_${currentUser.email.toLowerCase()}`, JSON.stringify(updated));
    }
    setActiveTicketView(newTicket);
    showSuccess('Booking Confirmed! 🎟️', `Pass #${newTicket.ticketId || newTicket.bookingRef} issued successfully for ${newTicket.eventTitle}.`);
  };

  const handleInvoiceCreated = (invoice) => {
    if (!currentUser?.email) return;
    const userEmail = currentUser.email.toLowerCase();
    const storageKey = `eventland_unpaid_invoices_${userEmail}`;
    try {
      const raw = localStorage.getItem(storageKey);
      const existing = raw ? JSON.parse(raw) : [];
      const updated = [invoice, ...existing.filter(i => (i.bookingRef || i.id) !== (invoice.bookingRef || invoice.id))];
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not cache created invoice:', e);
    }
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

  // Identify active city object and cityId
  const selectedCityObj = useMemo(() => {
    if (!selectedCity || selectedCity === 'All Cities') return null;
    return (cities || []).find(c => {
      const cName = typeof c === 'string' ? c : c.name;
      return cName && cName.toLowerCase() === selectedCity.toLowerCase();
    });
  }, [cities, selectedCity]);

  const selectedCityId = selectedCityObj?.id || null;

  // Cascading Venues: Loaded ONLY when a city is selected (via cityId)
  const [cityVenues, setCityVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(false);

  useEffect(() => {
    if (!selectedCityId) {
      setCityVenues([]);
      setSelectedVenue('All Venues');
      return;
    }

    setLoadingVenues(true);
    locationsApi.getVenues(selectedCityId)
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.items || []);
        const venueNames = list.map(v => typeof v === 'string' ? v : v.name).filter(Boolean);
        setCityVenues(venueNames);
        // If current selected venue is not in this city, reset to 'All Venues'
        setSelectedVenue(prev => (prev !== 'All Venues' && !venueNames.includes(prev)) ? 'All Venues' : prev);
      })
      .catch(err => {
        console.error('Failed to load venues for cityId:', selectedCityId, err);
        setCityVenues([]);
        setSelectedVenue('All Venues');
      })
      .finally(() => setLoadingVenues(false));
  }, [selectedCityId]);

  // Reset all search and filter criteria in 1 click
  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCity('All Cities');
    setSelectedVenue('All Venues');
    setSelectedTag('All');
    setSelectedDateFilter('all');
    setCustomDate('');
    setSelectedPriceFilter('all');
    setSortBy('featured');
    showInfo('Filters Cleared', 'All discovery filters have been reset.');
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
    const venueSel = selectedVenue.toLowerCase();
    const tagSel = selectedTag.toLowerCase().trim();

    const now = new Date();
    const todayStr = now.toDateString();

    // Weekend range: next Friday start of day to Sunday end of day
    const dayOfWeek = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const thisFriday = new Date(now);
    thisFriday.setDate(now.getDate() + (dayOfWeek === 0 ? -2 : (dayOfWeek === 6 ? -1 : daysUntilFriday)));
    thisFriday.setHours(0, 0, 0, 0);

    const thisSunday = new Date(thisFriday);
    thisSunday.setDate(thisFriday.getDate() + 2);
    thisSunday.setHours(23, 59, 59, 999);

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filtered = events.filter((ev) => {
      // 1. City Match
      const matchCity = selectedCity === 'All Cities' || (ev.city && ev.city.toLowerCase() === citySel);

      // 2. Venue Match
      const evVenue = (ev.venue || ev.venueName || '').toLowerCase();
      const matchVenue = selectedVenue === 'All Venues' || (evVenue && evVenue.includes(venueSel));

      // 3. Category / Tag Match
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
        if (ev.categoryName) evTagNames.push(String(ev.categoryName));

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

      // 4. Date Match
      let matchDate = true;
      if (selectedDateFilter !== 'all') {
        if (selectedDateFilter === 'custom' && customDate) {
          const targetDateStr = new Date(customDate + 'T00:00:00').toDateString();
          const targetIso = customDate; // 'YYYY-MM-DD'

          const checkDate = (dateVal) => {
            if (!dateVal) return false;
            if (typeof dateVal === 'string' && dateVal.startsWith(targetIso)) return true;
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return false;
            return d.toDateString() === targetDateStr || (!isNaN(d.getTime()) && d.toISOString().split('T')[0] === targetIso);
          };

          const primaryMatch = checkDate(ev.startDateUtc || ev.startDate || ev.date);
          const showsMatch = Array.isArray(ev.shows) && ev.shows.some(s => 
            checkDate(s.showDate || s.startTimeUtc || s.startDateUtc)
          );

          matchDate = primaryMatch || showsMatch;
        } else if (selectedDateFilter !== 'custom') {
          const dStr = ev.startDateUtc || ev.startDate || ev.date;
          if (!dStr) {
            matchDate = false;
          } else {
            const evDate = new Date(dStr);
            if (isNaN(evDate.getTime())) {
              matchDate = false;
            } else {
              if (selectedDateFilter === 'today') {
                matchDate = evDate.toDateString() === todayStr;
              } else if (selectedDateFilter === 'this-weekend') {
                matchDate = evDate >= thisFriday && evDate <= thisSunday;
              } else if (selectedDateFilter === 'this-month') {
                matchDate = evDate.getMonth() === currentMonth && evDate.getFullYear() === currentYear;
              }
            }
          }
        }
      }

      // 5. Price Match
      let matchPrice = true;
      if (selectedPriceFilter !== 'all') {
        const price = Number(ev.startingPrice ?? ev.price ?? 0);
        if (selectedPriceFilter === 'free') {
          matchPrice = price === 0 || ev.isFree === true;
        } else if (selectedPriceFilter === 'under-2000') {
          matchPrice = price > 0 && price <= 2000;
        } else if (selectedPriceFilter === '2000-5000') {
          matchPrice = price >= 2000 && price <= 5000;
        } else if (selectedPriceFilter === 'above-5000') {
          matchPrice = price > 5000;
        }
      }

      // 6. Search Query Match (Title, Venue, City, Description, Artists, Organizer)
      let matchSearch = true;
      if (needle) {
        const titleMatch = ev.title && ev.title.toLowerCase().includes(needle);
        const venueMatch = evVenue && evVenue.includes(needle);
        const cityMatch = ev.city && ev.city.toLowerCase().includes(needle);
        const descMatch = ev.description && ev.description.toLowerCase().includes(needle);
        const artistMatch = (ev.artist || ev.artistName || (Array.isArray(ev.artists) ? ev.artists.map(a => a.name || a).join(' ') : ''))
          .toLowerCase().includes(needle);
        const organizerMatch = (ev.organizer?.name || ev.organizerName || '').toLowerCase().includes(needle);
        matchSearch = titleMatch || venueMatch || cityMatch || descMatch || artistMatch || organizerMatch;
      }

      return matchCity && matchVenue && matchTag && matchDate && matchPrice && matchSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'soonest') {
        const dateA = new Date(a.startDateUtc || a.startDate || a.date || 0).getTime();
        const dateB = new Date(b.startDateUtc || b.startDate || b.date || 0).getTime();
        return dateA - dateB;
      }
      if (sortBy === 'price-asc') return (a.startingPrice || 0) - (b.startingPrice || 0);
      if (sortBy === 'price-desc') return (b.startingPrice || 0) - (a.startingPrice || 0);
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });
  }, [events, selectedCity, selectedVenue, selectedTag, selectedDateFilter, customDate, selectedPriceFilter, debouncedSearch, sortBy]);

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

            {/* Discovery & Search Hub */}
            <EventFilterBar
              tags={tags}
              events={events}
              cities={cities}
              venues={cityVenues}
              loadingVenues={loadingVenues}
              isCitySelected={Boolean(selectedCityId)}
              selectedTag={selectedTag}
              onSelectTag={setSelectedTag}
              selectedCity={selectedCity}
              onSelectCity={setSelectedCity}
              selectedVenue={selectedVenue}
              onSelectVenue={setSelectedVenue}
              selectedDateFilter={selectedDateFilter}
              onSelectDateFilter={setSelectedDateFilter}
              customDate={customDate}
              onCustomDateChange={setCustomDate}
              selectedPriceFilter={selectedPriceFilter}
              onSelectPriceFilter={setSelectedPriceFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalResults={sortedEvents.length}
              onClearAllFilters={handleClearAllFilters}
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
                  Try adjusting your city filter, venue, date, or search query.
                </p>
                <button
                  onClick={handleClearAllFilters}
                  className="btn btn-primary"
                >
                  Reset All Filters
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
          currentUser && (currentUser.role === 'organizer' || currentUser.role === 'admin') ? (
            <Suspense fallback={LazyFallback}>
              <EventOrganizerWizard
                currentUser={currentUser}
                onPublishEvent={handlePublishNewEvent}
                onCancel={() => setActiveView(currentUser?.role === 'organizer' ? 'organizer' : 'explore')}
                cities={cities}
              />
            </Suspense>
          ) : (
            <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center', maxWidth: '560px', margin: '0 auto' }}>
              <div className="glass-card" style={{ padding: '3rem 2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <ShieldCheck size={48} color="#f59e0b" style={{ opacity: 0.9 }} />
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Organizer Access Required
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Attendees cannot list events. To publish live events and configure seating blueprints on EventLand, please log in or register with an Organizer account.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    onClick={() => setActiveView('explore')}
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1.3rem' }}
                  >
                    Browse Events
                  </button>
                  <button
                    onClick={() => {
                      setAuthModalRole('organizer');
                      setIsAuthModalOpen(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '0.6rem 1.3rem' }}
                  >
                    Organizer Sign In
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* View: Attendee Dashboard & E-Tickets */}
        {activeView === 'my-tickets' && (
          <Suspense fallback={LazyFallback}>
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
          </Suspense>
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
        <Suspense fallback={LazyFallback}>
          <CheckoutModal
            event={checkoutData.event}
            selectedSeats={checkoutData.seats}
            onClose={() => setCheckoutData(null)}
            onBookingSuccess={handleBookingSuccess}
            onInvoiceCreated={handleInvoiceCreated}
          />
        </Suspense>
      )}

      {activeTicketView && (
        <Suspense fallback={LazyFallback}>
          <DigitalTicketModal
            ticket={activeTicketView}
            onClose={() => setActiveTicketView(null)}
          />
        </Suspense>
      )}

      {activeView === 'unpaid-invoices' && (
        <Suspense fallback={LazyFallback}>
          <UnpaidInvoicesModal
            currentUser={currentUser}
            onClose={() => setActiveView('explore')}
            onPaymentSuccess={(ticket) => {
              setPurchasedTickets(prev => [ticket, ...prev]);
              setActiveTicketView(ticket);
            }}
          />
        </Suspense>
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
