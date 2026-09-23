import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Ticket, 
  Users, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  X,
  Trash2, 
  Edit3,
  Search, 
  Download, 
  Building2, 
  Plus,
  RefreshCw,
  Tag,
  Layers,
  MapPin,
  Calendar,
  Music,
  Sparkles,
  Grid,
  Eye,
  Save,
  Clock,
  FileText,
  HelpCircle,
  GripVertical,
  ScanLine,
  AlertTriangle
} from 'lucide-react';
import { adminApi, eventsApi, locationsApi, faqsApi, footerApi, paymentsApi, bankAccountsApi, bookingsApi, gateApi, getEventImageUrl, getOrganizerImageUrl, getUserImageUrl, getPaymentSlipUrl, getQrCodeImageUrl, formatPhoneNumberOnSubmit, splitPhoneNumberForEdit } from '../services/api';
import { useToast } from '../context/ToastContext';
import SearchableSelect from './SearchableSelect';
import MultiSearchableSelect from './MultiSearchableSelect';
import EventCard from './EventCard';
import InteractiveSeatPicker from './InteractiveSeatPicker';
import DigitalTicketModal from './DigitalTicketModal';
import PayProAdminPanel from './PayProAdminPanel';
import AdminBookingsTab from './admin/AdminBookingsTab';
import FileUploadField from './admin/FileUploadField';
import AdminEventModal from './admin/modals/AdminEventModal';
import AdminShowSlotModal from './admin/modals/AdminShowSlotModal';
import AdminTicketTierModal from './admin/modals/AdminTicketTierModal';
import AdminUserModal from './admin/modals/AdminUserModal';
import AdminAuditoriumModal from './admin/modals/AdminAuditoriumModal';
import { parseAuditoriumLayout, createBlankLayoutJson } from '../data/auditoriumLayouts';
import { exportAuditoriumChartPdf } from '../utils/pdfChartExporter';

export default function AdminDashboard({ onSelectEvent, currentUser = null, onUpdateCurrentUser = null }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [activeAdminTab, setActiveAdminTab] = useState('events'); // 'events', 'organizers', 'artists', 'bookings', 'users', 'roles', 'ticket-tiers', 'tags'
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Loaded Data States
  const [eventsList, setEventsList] = useState([]);  
  const [showsList, setShowsList] = useState([]);
  const [showEventFilter, setShowEventFilter] = useState('All');
  const [showSearch, setShowSearch] = useState('');
  const [ticketTiersList, setTicketTiersList] = useState([]);
  const [tierEventFilter, setTierEventFilter] = useState('All');
  const [tierSearch, setTierSearch] = useState('');
  const [organizersList, setOrganizersList] = useState([]);
  const [artistsList, setArtistsList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [tagsList, setTagsList] = useState([]);
  const [auditoriumsList, setAuditoriumsList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [venuesList, setVenuesList] = useState([]);
  const [faqsList, setFaqsList] = useState([]);
  const [feeConfigsList, setFeeConfigsList] = useState([]);
  const [bankAccountsList, setBankAccountsList] = useState([]);

  const loggedUserRaw = localStorage.getItem('eventland_logged_user');
  const loggedUser = loggedUserRaw ? JSON.parse(loggedUserRaw) : null;
  const effectiveUser = currentUser || loggedUser;
  const rawRoleName = (effectiveUser?.rawRole || effectiveUser?.roleName || effectiveUser?.role || '').trim().toLowerCase();
  const isSuperAdmin = rawRoleName === 'superadmin' || effectiveUser?.roleId === 1;

  // Auto-redirect if non-superadmin attempts to stay on roles tab
  useEffect(() => {
    if (!isSuperAdmin && activeAdminTab === 'roles') {
      setActiveAdminTab('events');
    }
  }, [isSuperAdmin, activeAdminTab]);

  // Filtered users list: Admin can only see Organizer and Attendee (Customer) accounts
  const visibleUsersList = useMemo(() => {
    if (isSuperAdmin) return usersList;
    return usersList.filter(u => {
      const r = (u.role || '').trim().toLowerCase();
      return r !== 'admin' && r !== 'superadmin';
    });
  }, [isSuperAdmin, usersList]);

  // Role options for Create / Update user modal: Admin ONLY gets Organizer and Attendee
  const userRoleOptions = useMemo(() => {
    if (isSuperAdmin) {
      return rolesList.map(r => ({
        value: r.id,
        label: r.name?.toLowerCase() === 'customer' ? 'Attendee' : r.name
      }));
    }
    const orgRole = rolesList.find(r => r.name?.toLowerCase() === 'organizer');
    const attRole = rolesList.find(r => r.name?.toLowerCase() === 'customer' || r.name?.toLowerCase() === 'attendee');
    return [
      { value: orgRole ? orgRole.id : 3, label: 'Organizer' },
      { value: attRole ? attRole.id : 4, label: 'Attendee' }
    ];
  }, [isSuperAdmin, rolesList]);

  // Form Modal States
  const [showEventModal, setShowEventModal] = useState(false);
  const [showShowModal, setShowShowModal] = useState(false);
  const [isSavingShow, setIsSavingShow] = useState(false);

  // Gate Scanner States
  const [gateEventFilter, setGateEventFilter] = useState('');
  const [gateTicketInput, setGateTicketInput] = useState('');
  const [gateScanResult, setGateScanResult] = useState(null);
  const [isScanningTicket, setIsScanningTicket] = useState(false);
  const [gateStats, setGateStats] = useState(null);
  const [gateActivityLog, setGateActivityLog] = useState([]);
  const [gateName, setGateName] = useState('Main Gate - Entrance A');
  const [isResettingGateTicket, setIsResettingGateTicket] = useState(false);

  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showArtistModal, setShowArtistModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showAuditoriumModal, setShowAuditoriumModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showFooterModal, setShowFooterModal] = useState(false);
  const [showFeeConfigModal, setShowFeeConfigModal] = useState(false);
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [editingFeeConfig, setEditingFeeConfig] = useState(null);
  const [previewAuditorium, setPreviewAuditorium] = useState(null);
  const [adminPreviewTicket, setAdminPreviewTicket] = useState(null);
  const [exportingAudId, setExportingAudId] = useState(null);

  const defaultFooterForm = {
    brandName: 'Event Land',
    tagline: 'Event Land is a single, user-friendly platform, we link fans, artists, and organizers for everything from comedy nights to concerts. 🎵🎭',
    phone: '+92 307 9353185',
    email: 'support@eventland.pk',
    address: 'Karachi, Pakistan',
    copyrightText: '© 2026 Event Land Pakistan. All rights reserved.',
    privacyPolicyUrl: '#',
    termsOfServiceUrl: '#',
    organizerSupportUrl: '#'
  };

  const [footerForm, setFooterForm] = useState(defaultFooterForm);

  const defaultFaqForm = {
    id: null,
    question: '',
    answer: '',
    displayOrder: 1,
    isActive: true
  };

  const [faqForm, setFaqForm] = useState(defaultFaqForm);
  const [draggedFaqIndex, setDraggedFaqIndex] = useState(null);
  const [dragOverFaqIndex, setDragOverFaqIndex] = useState(null);

  // --- Initial Form States ---
  const defaultEventForm = {
    id: null,
    title: '',
    tagIds: [],
    status: 'Live',
    isFeatured: false,
    isPublished: true,
    countryId: '',
    cityId: '',
    venueId: '',
    auditoriumId: '',
    startDateUtc: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    endDateUtc: new Date(Date.now() + 172800000).toISOString().slice(0, 16),
    priceRange: 'PKR 1,500 - PKR 5,000',
    startingPrice: 1500,
    ticketingType: 'categorized',
    auditoriumLayout: '',
    banner: '',
    description: 'Join us for an extraordinary live event experience featuring Pakistan top performers.',
    scarcityText: 'Selling Fast',
    organizerId: ''
  };

  const defaultShowForm = {
    id: null,
    eventId: '',
    showTitle: '',
    startTimeUtc: '',
    endTimeUtc: ''
  };

  const defaultAuditoriumForm = {
    id: null,
    countryId: '',
    cityId: '',
    venueId: '',
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
    genre: 'Pop',
    bio: '',
    imageUrl: '',
    isFeatured: false
  };

  const defaultTierForm = {
    id: null,
    eventId: '',
    name: 'VIP Pass',
    price: 3000,
    totalQuantity: 100,
    availableQuantity: 100,
    perks: 'Standard Entry, Access to Main Arena',
    description: '',
    rowRange: ''
  };

  const defaultUserForm = {
    id: null,
    fullName: '',
    email: '',
    password: '',
    roleId: 2,
    countryId: 1,
    phoneNumber: '',
    imageUrl: '',
    organizerId: ''
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

  const defaultCountryForm = { id: null, name: '', code: '', isActive: true };
  const defaultCityForm = { id: null, countryId: '', name: '', isActive: true };
  const defaultVenueForm = { id: null, countryId: '', cityId: '', name: '', address: '', description: '', isActive: true };
  const defaultBankAccountForm = {
    id: null,
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    iban: '',
    branchCode: '',
    branchName: '',
    qrCodeImageUrl: '',
    instructions: 'Please transfer the exact booking amount via Mobile Banking App, Raast ID, or ATM. Mention your Booking Ref in transfer remarks.',
    isActive: true,
    displayOrder: 1,
    maintenanceNotice: '',
    maintenanceStartUtc: '',
    maintenanceEndUtc: '',
    isMaintenanceMode: false
  };

  // Form Binding States
  const [eventForm, setEventForm] = useState(defaultEventForm);
  const [showForm, setShowForm] = useState(defaultShowForm);
  const [orgForm, setOrgForm] = useState(defaultOrgForm);
  const [artistForm, setArtistForm] = useState(defaultArtistForm);
  const [tierForm, setTierForm] = useState(defaultTierForm);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [roleForm, setRoleForm] = useState(defaultRoleForm);
  const [tagForm, setTagForm] = useState(defaultTagForm);
  const [auditoriumForm, setAuditoriumForm] = useState(defaultAuditoriumForm);
  const [countryForm, setCountryForm] = useState(defaultCountryForm);
  const [cityForm, setCityForm] = useState(defaultCityForm);
  const [venueForm, setVenueForm] = useState(defaultVenueForm);
  const [bankAccountForm, setBankAccountForm] = useState(defaultBankAccountForm);

  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);

  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [venueSearch, setVenueSearch] = useState('');

  // Load Data from Backend API
  const fetchBackendData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setErrorMsg('');
    try {
      const [orgs, evs, arts, bks, rls, usrs, tgs, auds, cnts, cts, vns, faqs, ftr, banks, tiers, shws] = await Promise.all([
        adminApi.organizers.getAll().catch(() => []),
        adminApi.events.getAll(1, 50).catch(() => ({ items: [] })),
        adminApi.artists.getAll(1, 50).catch(() => ({ items: [] })),
        adminApi.bookings.getAll(1, 50).catch(() => ({ items: [] })),
        adminApi.roles.getAll().catch(() => []),
        adminApi.users.getAll(1, 50).catch(() => ({ items: [] })),
        adminApi.tags.getAll().catch(() => []),
        locationsApi.getAuditoriums().catch(() => []),
        locationsApi.getCountries().catch(() => []),
        locationsApi.getCities().catch(() => []),
        locationsApi.getVenues().catch(() => []),
        faqsApi.adminGetAll().catch(() => []),
        footerApi.get().catch(() => null),
        bankAccountsApi.adminGetAll().catch(() => []),
        adminApi.ticketTiers.getAll().catch(() => []),
        adminApi.eventShows.getAll().catch(() => [])
      ]);

      if (Array.isArray(banks)) setBankAccountsList(banks);

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
      const loadedEvents = evs.items || evs || [];
      setEventsList(loadedEvents);

      // Resilient event shows resolution:
      const loadedShows = Array.isArray(shws) ? shws : [];
      let resolvedShows = loadedShows;
      if (resolvedShows.length === 0 && loadedEvents.length > 0) {
        const extractedShows = [];
        for (const ev of loadedEvents) {
          for (const s of (ev.shows || [])) {
            if (!extractedShows.some(x => x.id === s.id)) {
              extractedShows.push({ ...s, eventTitle: ev.title });
            }
          }
        }
        if (extractedShows.length > 0) resolvedShows = extractedShows;
      }
      setShowsList(resolvedShows);

      // Resilient ticket tier resolution:
      let resolvedTiers = Array.isArray(tiers) && tiers.length > 0 ? tiers : [];
      if (resolvedTiers.length === 0 && loadedEvents.length > 0) {
        try {
          const fullDetails = await Promise.all(
            loadedEvents.map(e => eventsApi.getEventById(e.id).catch(() => null))
          );
          const extractedTiers = [];
          for (const fd of fullDetails) {
            if (!fd) continue;
            for (const t of (fd.ticketTiers || [])) {
              if (!extractedTiers.some(x => x.id === t.id)) {
                extractedTiers.push({ ...t, eventTitle: fd.title });
              }
            }
            for (const s of (fd.shows || [])) {
              for (const st of (s.ticketTiers || [])) {
                if (!extractedTiers.some(x => x.id === st.id)) {
                  extractedTiers.push({ ...st, eventTitle: fd.title, showTitle: s.showTitle });
                }
              }
            }
          }
          if (extractedTiers.length > 0) {
            resolvedTiers = extractedTiers;
          }
        } catch (err) {
          console.warn('Fallback ticket tier extraction failed:', err);
        }
      }
      setTicketTiersList(resolvedTiers);
      setArtistsList(arts.items || arts || []);
      setBookingsList(bks.items || bks || []);
      setRolesList(rls || []);
      setUsersList(usrs.items || usrs || []);
      setTagsList(tgs || []);
      setAuditoriumsList(Array.isArray(auds) ? auds : (auds?.items || []));
      setCountriesList(cnts || []);
      setCitiesList(cts || []);
      setVenuesList(vns || []);
      setFaqsList(faqs || []);
      if (ftr) {
        setFooterForm({
          brandName: ftr.brandName || 'Event Land',
          tagline: ftr.tagline || '',
          phone: ftr.phone || '',
          email: ftr.email || '',
          address: ftr.address || '',
          copyrightText: ftr.copyrightText || '',
          privacyPolicyUrl: ftr.privacyPolicyUrl || '#',
          termsOfServiceUrl: ftr.termsOfServiceUrl || '#',
          organizerSupportUrl: ftr.organizerSupportUrl || '#'
        });
      }
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
    const orgId = parseInt(eventForm.organizerId, 10) || (organizersList[0]?.id || 1000);
    
    // Resolve venue automatically from venueId, auditorium layout, or form input
    const selVenueObj = venuesList.find(v => String(v.id) === String(eventForm.venueId));
    const selAudiObj = auditoriumsList.find(a => a.layoutCode === eventForm.auditoriumLayout || a.name === eventForm.auditoriumLayout || String(a.id) === String(eventForm.auditoriumId));
    const resolvedVenueName = eventForm.venue?.trim() || selVenueObj?.name || selAudiObj?.venue || selAudiObj?.name || 'Arts Council of Pakistan';
    const venue = resolvedVenueName;

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

      const countryId = eventForm.countryId ? parseInt(eventForm.countryId, 10) : (countriesList[0]?.id || null);
      const cityId = eventForm.cityId ? parseInt(eventForm.cityId, 10) : (citiesList[0]?.id || null);
      const venueId = eventForm.venueId ? parseInt(eventForm.venueId, 10) : (venuesList[0]?.id || null);
      const auditoriumId = eventForm.auditoriumId ? parseInt(eventForm.auditoriumId, 10) : null;

      const payload = {
        title: title,
        status: statusStr,
        isFeatured: Boolean(eventForm.isFeatured),
        isPublished: eventForm.isPublished !== false,
        countryId: countryId,
        cityId: cityId,
        venueId: venueId,
        auditoriumId: auditoriumId,
        startDateUtc: startDate.toISOString(),
        endDateUtc: endDate.toISOString(),
        startingPrice: parseFloat(eventForm.startingPrice) || 0,
        priceRange: eventForm.priceRange || '',
        ticketingType: eventForm.ticketingType || 'categorized',
        auditoriumLayout: eventForm.auditoriumLayout || '',
        banner: eventForm.banner || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=500&fit=crop',
        description: eventForm.description || title,
        scarcityText: eventForm.scarcityText || 'Selling Fast',
        organizerId: orgId,
        tagIds: tagIds
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
      if (ev.id) {
        let fetched = null;
        try {
          if (adminApi?.events?.getById) fetched = await adminApi.events.getById(ev.id);
        } catch {
          fetched = null;
        }
        if (!fetched || (!fetched.ticketTiers?.length && !fetched.shows?.some(s => s.ticketTiers?.length))) {
          const publicDetail = await eventsApi.getEventById(ev.id).catch(() => null);
          if (publicDetail) fetched = publicDetail;
        }
        if (fetched) fullEv = fetched;
      }
    } catch (err) {
      console.warn('Could not fetch full event detail for edit, using list item:', err);
    }

    // Pre-select the tags already attached to this event (eventTags may carry {tagId} or nested {tag:{id}}).
    const existingTagIds = (fullEv.eventTags || [])
      .map(et => et?.tagId ?? et?.tag?.id ?? et?.id)
      .filter(id => id != null)
      .map(id => String(id));

    setEventForm({
      id: fullEv.id,
      title: fullEv.title || '',
      tagIds: existingTagIds,
      status: fullEv.status || 'Live',
      isFeatured: Boolean(fullEv.isFeatured),
      isPublished: fullEv.isPublished !== false,
      countryId: fullEv.countryId || (countriesList[0]?.id || ''),
      cityId: fullEv.cityId || (citiesList[0]?.id || ''),
      venueId: fullEv.venueId || (venuesList[0]?.id || ''),
      auditoriumId: fullEv.auditoriumId || '',
      startDateUtc: fullEv.startDateUtc ? fullEv.startDateUtc.slice(0, 16) : new Date().toISOString().slice(0, 16),
      endDateUtc: fullEv.endDateUtc ? fullEv.endDateUtc.slice(0, 16) : new Date().toISOString().slice(0, 16),
      priceRange: fullEv.priceRange || '',
      startingPrice: fullEv.startingPrice || 1500,
      ticketingType: (fullEv.ticketingType || 'categorized').toLowerCase(),
      auditoriumLayout: fullEv.seatingZones?.[0]?.layoutJson || fullEv.auditoriumLayout || '',
      banner: fullEv.banner || '',
      description: fullEv.description || '',
      scarcityText: fullEv.scarcityText || 'Selling Fast',
      organizerId: fullEv.organizerId || fullEv.organizer?.id || (organizersList[0]?.id || '')
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

    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
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

    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
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

  // --- CRUD: EVENT SHOWS ---
  const handleSaveShow = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!showForm.eventId) {
      showError('Validation Error', 'Please select an event for this show slot.');
      return;
    }

    const title = (showForm.showTitle || '').trim();
    if (!title) {
      showError('Validation Error', 'Show Title is required.');
      return;
    }

    if (!showForm.startTimeUtc || !showForm.endTimeUtc) {
      showError('Validation Error', 'Please select both start time and end time.');
      return;
    }

    const startInputStr = showForm.startTimeUtc && !showForm.startTimeUtc.includes('+') && !showForm.startTimeUtc.includes('Z')
      ? `${showForm.startTimeUtc}:00+05:00`
      : showForm.startTimeUtc;
    const endInputStr = showForm.endTimeUtc && !showForm.endTimeUtc.includes('+') && !showForm.endTimeUtc.includes('Z')
      ? `${showForm.endTimeUtc}:00+05:00`
      : showForm.endTimeUtc;

    const startDate = new Date(startInputStr);
    const endDate = new Date(endInputStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      showError('Invalid Date', 'Please select valid start and end dates.');
      return;
    }

    if (startDate.getTime() >= endDate.getTime()) {
      showError('Invalid Timing', 'Show start time must be before show end time.');
      return;
    }

    // Strict Event Date Range Validation:
    const parentEvent = eventsList.find(ev => String(ev.id) === String(showForm.eventId));
    if (parentEvent) {
      const evStart = new Date(parentEvent.startDateUtc);
      const evEnd = new Date(parentEvent.endDateUtc);
      if (!isNaN(evStart.getTime()) && !isNaN(evEnd.getTime())) {
        if (startDate.getTime() < evStart.getTime() || endDate.getTime() > evEnd.getTime()) {
          const evStartFmt = evStart.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
          const evEndFmt = evEnd.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
          showError(
            'Date Range Violation',
            `Show slot timing must be scheduled within the event date range (${evStartFmt} to ${evEndFmt}).`
          );
          return;
        }
      }
    }

    setIsSavingShow(true);
    try {
      if (showForm.id) {
        await adminApi.eventShows.update(showForm.id, {
          showTitle: title,
          startTimeUtc: startDate.toISOString(),
          endTimeUtc: endDate.toISOString()
        });
        showSuccess('Show Updated', `Show slot "${title}" updated successfully.`);
      } else {
        await adminApi.eventShows.create({
          eventId: parseInt(showForm.eventId, 10),
          showTitle: title,
          startTimeUtc: startDate.toISOString(),
          endTimeUtc: endDate.toISOString()
        });
        showSuccess('Show Created', `Show slot "${title}" created successfully.`);
      }

      setShowShowModal(false);
      setShowForm(defaultShowForm);
      fetchBackendData();
    } catch (err) {
      console.error('Save Show Error:', err);
      showError('Save Failed', err.message || 'Failed to save show slot.');
    } finally {
      setIsSavingShow(false);
    }
  };

  const handleEditShow = (show) => {
    setShowForm({
      id: show.id,
      eventId: String(show.eventId),
      showTitle: show.showTitle || '',
      startTimeUtc: show.startTimeUtc ? show.startTimeUtc.slice(0, 16) : '',
      endTimeUtc: show.endTimeUtc ? show.endTimeUtc.slice(0, 16) : ''
    });
    setShowShowModal(true);
  };

  const handleDeleteShow = async (show) => {
    if (!window.confirm(`Are you sure you want to delete show slot "${show.showTitle || 'this show'}"? Linked ticket tiers will also be deleted.`)) return;
    try {
      await adminApi.eventShows.delete(show.id);
      showSuccess('Show Deleted', `Show slot "${show.showTitle || 'Show'}" has been deleted.`);
      fetchBackendData();
    } catch (err) {
      showError('Delete Failed', err.message || 'Failed to delete show slot.');
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

    const tierName = (tierForm.name || '').trim();
    if (!tierName) {
      const msg = 'Please enter a ticket tier name.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    const tierPrice = parseFloat(tierForm.price);
    if (isNaN(tierPrice) || tierPrice < 0) {
      const msg = 'Please enter a valid non-negative ticket price.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    const targetEventId = parseInt(tierForm.eventId, 10);
    const targetShowId = tierForm.eventShowId ? parseInt(tierForm.eventShowId, 10) : null;
    const isDupTier = ticketTiersList.some(t =>
      String(t.id) !== String(tierForm.id) &&
      t.eventId === targetEventId &&
      (targetShowId == null || t.eventShowId == null || t.eventShowId === targetShowId) &&
      t.name.trim().toLowerCase() === tierName.toLowerCase()
    );
    if (isDupTier) {
      const msg = `A ticket tier named "${tierName}" already exists for this show slot.`;
      setErrorMsg(msg);
      showError('Duplicate Ticket Tier', msg);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        eventId: targetEventId,
        eventShowId: targetShowId,
        name: tierName,
        description: tierForm.description || '',
        price: tierPrice,
        rowRange: tierForm.rowRange || null,
        availableQuantity: !isNaN(parseInt(tierForm.availableQuantity, 10)) ? parseInt(tierForm.availableQuantity, 10) : 100,
        maxPerOrder: !isNaN(parseInt(tierForm.maxPerOrder, 10)) ? parseInt(tierForm.maxPerOrder, 10) : 5,
        sortOrder: !isNaN(parseInt(tierForm.sortOrder, 10)) ? parseInt(tierForm.sortOrder, 10) : 1
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTicketTier = (tier) => {
    setTierForm({
      id: tier.id,
      eventId: String(tier.eventId),
      eventShowId: tier.eventShowId ? String(tier.eventShowId) : '',
      name: tier.name || '',
      description: tier.description || '',
      price: tier.price !== undefined && tier.price !== null ? tier.price : 1500,
      rowRange: tier.rowRange || '',
      availableQuantity: tier.availableQuantity !== undefined ? tier.availableQuantity : 100,
      maxPerOrder: tier.maxPerOrder || 5,
      sortOrder: tier.sortOrder || 1
    });
    setShowTierModal(true);
  };

  const handleDeleteTicketTier = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ticket tier?')) return;
    try {
      await adminApi.ticketTiers.delete(id);
      showSuccess('Deleted', 'Ticket tier deleted successfully.');
      fetchBackendData();
    } catch (err) {
      showError('Delete Failed', err.message || 'Failed to delete ticket tier.');
    }
  };

  // --- GATE SCANNER & TICKET VALIDATION ---
  useEffect(() => {
    if (activeAdminTab === 'gate-scanner' && gateEventFilter) {
      gateApi.getStats(Number(gateEventFilter))
        .then(setGateStats)
        .catch(err => console.warn('Failed to load gate stats:', err));
    } else if (activeAdminTab === 'gate-scanner' && !gateEventFilter) {
      setGateStats(null);
    }
  }, [activeAdminTab, gateEventFilter]);

  const handleGateScanSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = gateTicketInput.trim();
    if (!cleanCode) return;

    setIsScanningTicket(true);
    try {
      const res = await gateApi.validate({
        ticketCode: cleanCode,
        eventId: gateEventFilter ? Number(gateEventFilter) : null,
        checkIn: true,
        gateName: gateName || 'Main Gate'
      });
      setGateScanResult(res);

      if (res.isValid) {
        showSuccess('Entry Approved ✅', `Welcome ${res.customerName} (${res.ticketTierName || 'Pass'})`);
        setGateActivityLog(prev => [{
          bookingId: res.bookingId,
          bookingRef: res.bookingRef,
          customerName: res.customerName,
          tierName: res.ticketTierName || 'General',
          seats: res.seatLabels?.length > 0 ? res.seatLabels.join(', ') : `${res.quantity} Pass(es)`,
          status: 'APPROVED',
          time: new Date().toLocaleTimeString(),
          gate: gateName
        }, ...prev]);
        setGateTicketInput('');
      } else if (res.status === 'ALREADY_CHECKED_IN') {
        showWarning('Duplicate Entry ⚠️', res.message);
        setGateActivityLog(prev => [{
          bookingId: res.bookingId,
          bookingRef: res.bookingRef,
          customerName: res.customerName,
          tierName: res.ticketTierName || 'General',
          seats: res.seatLabels?.length > 0 ? res.seatLabels.join(', ') : `${res.quantity} Pass(es)`,
          status: 'ALREADY_CHECKED_IN',
          time: new Date().toLocaleTimeString(),
          gate: gateName
        }, ...prev]);
      } else {
        showError('Entry Denied ❌', res.message);
      }

      if (gateEventFilter) {
        gateApi.getStats(Number(gateEventFilter)).then(setGateStats).catch(() => {});
      }
    } catch (err) {
      showError('Validation Error', err.message || 'Failed to validate ticket.');
      setGateScanResult({ isValid: false, status: 'ERROR', message: err.message || 'Validation request failed.' });
    } finally {
      setIsScanningTicket(false);
    }
  };

  const handleResetGateTicket = async (ref) => {
    if (!ref || isResettingGateTicket) return;
    if (!window.confirm(`Reset check-in status for ticket ${ref}?`)) return;

    setIsResettingGateTicket(true);
    try {
      const res = await gateApi.reset({ ticketCode: ref, reason: 'Admin console supervisor reset' });
      showSuccess('Check-in Reset', `Ticket ${ref} is now valid for admission again.`);
      setGateScanResult(res);
      if (gateEventFilter) {
        gateApi.getStats(Number(gateEventFilter)).then(setGateStats).catch(() => {});
      }
    } catch (err) {
      showError('Reset Failed', err.message || 'Could not reset ticket check-in.');
    } finally {
      setIsResettingGateTicket(false);
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

    if (!isSuperAdmin) {
      const chosenRole = rolesList.find(r => String(r.id) === String(userForm.roleId));
      const roleName = (chosenRole?.name || '').trim().toLowerCase();
      if (roleName === 'admin' || roleName === 'superadmin' || Number(userForm.roleId) === 1 || Number(userForm.roleId) === 2) {
        showError('Unauthorized', 'Admins can only assign Organizer or Attendee roles.');
        return;
      }
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const targetEmail = (userForm.email || '').trim().toLowerCase();
    if (!targetEmail || !emailPattern.test(targetEmail)) {
      const msg = 'Please enter a valid email address.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    if (!userForm.id && (!userForm.password || userForm.password.length < 8)) {
      const msg = 'Password is required and must be at least 8 characters long.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    // Duplicate Email check (excluding current user when editing)
    const isDupEmail = usersList.some(u => u.id !== userForm.id && (u.email || '').trim().toLowerCase() === targetEmail);
    if (isDupEmail) {
      const msg = `A user with the email '${userForm.email}' already exists.`;
      setErrorMsg(msg);
      showError('Duplicate Email', msg);
      return;
    }

    const activeCountry = countriesList.find(c => c.id === parseInt(userForm.countryId, 10)) || countriesList[0];
    const dialingCode = activeCountry?.dialingCode || '+92';
    const formattedPhone = formatPhoneNumberOnSubmit(userForm.phoneNumber, dialingCode);

    // Duplicate Phone Number check (excluding current user when editing)
    if (formattedPhone) {
      const isDupPhone = usersList.some(u => u.id !== userForm.id && u.phoneNumber?.trim() === formattedPhone.trim());
      if (isDupPhone) {
        const msg = `A user with the phone number '${formattedPhone}' already exists.`;
        setErrorMsg(msg);
        showError('Duplicate Phone Number', msg);
        return;
      }
    }

    setIsSaving(true);
    try {
      const activeCountry = countriesList.find(c => c.id === parseInt(userForm.countryId, 10)) || countriesList[0];
      const dialingCode = activeCountry?.dialingCode || '+92';
      const formattedPhone = formatPhoneNumberOnSubmit(userForm.phoneNumber, dialingCode);

      const selectedRoleObj = rolesList.find(r => String(r.id) === String(userForm.roleId));
      const isSelectedRoleOrganizer = selectedRoleObj && selectedRoleObj.name?.toLowerCase() === 'organizer';
      const parsedOrgId = isSelectedRoleOrganizer && userForm.organizerId ? parseInt(userForm.organizerId, 10) : null;

      if (userForm.id) {
        const payload = {
          fullName: userForm.fullName,
          roleId: parseInt(userForm.roleId, 10),
          phoneNumber: formattedPhone,
          countryId: parseInt(userForm.countryId, 10),
          organizerId: parsedOrgId,
          imageUrl: userForm.imageUrl || null,
          password: userForm.password || null,
          isActive: true
        };
        await adminApi.users.update(userForm.id, payload);

        if (currentUser && currentUser.id === userForm.id) {
          const updated = {
            ...currentUser,
            name: userForm.fullName,
            fullName: userForm.fullName,
            imageUrl: userForm.imageUrl || null,
            organizerId: parsedOrgId
          };
          if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
          window.dispatchEvent(new CustomEvent('eventland:user-updated', { detail: updated }));
        }

        const msg = 'User account updated successfully!';
        setSuccessMsg(msg);
        showSuccess('User Updated', msg);
      } else {
        const payload = {
          email: userForm.email,
          password: userForm.password,
          fullName: userForm.fullName,
          roleId: parseInt(userForm.roleId, 10),
          phoneNumber: formattedPhone,
          countryId: parseInt(userForm.countryId, 10),
          organizerId: parsedOrgId,
          imageUrl: userForm.imageUrl || null
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenCreateUser = () => {
    const defaultRole = isSuperAdmin
      ? (rolesList.find(r => r.name?.toLowerCase() === 'admin')?.id || rolesList[0]?.id || 2)
      : (rolesList.find(r => r.name?.toLowerCase() === 'organizer')?.id || 3);

    setUserForm({
      ...defaultUserForm,
      roleId: defaultRole
    });
    setShowUserModal(true);
  };

  const handleEditUser = (u) => {
    if (!isSuperAdmin) {
      const userRole = (u.role || '').trim().toLowerCase();
      if (userRole === 'admin' || userRole === 'superadmin') {
        showError('Unauthorized', 'Admins cannot edit Administrator or Super Administrator accounts.');
        return;
      }
    }

    const matchedRole = rolesList.find(r => (r.name || '').toLowerCase() === (u.role || '').toLowerCase());
    const splitPhone = splitPhoneNumberForEdit(u.phoneNumber, countriesList, u.countryId);

    setUserForm({
      id: u.id,
      email: u.email || '',
      password: '',
      fullName: u.fullName || '',
      roleId: matchedRole ? matchedRole.id : (u.roleId || (isSuperAdmin ? 2 : 3)),
      countryId: splitPhone.countryId || u.countryId || 1,
      phoneNumber: splitPhone.nationalNumber || '',
      imageUrl: u.imageUrl || '',
      organizerId: u.organizerId || ''
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (id) => {
    const target = usersList.find(u => u.id === id);
    if (!isSuperAdmin && target) {
      const userRole = (target.role || '').trim().toLowerCase();
      if (userRole === 'admin' || userRole === 'superadmin') {
        showError('Unauthorized', 'Admins cannot delete Administrator or Super Administrator accounts.');
        return;
      }
    }

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

    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
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
    setIsSaving(true);
    try {
      const name = tagForm.name ? tagForm.name.trim() : '';
      const slug = (tagForm.slug ? tagForm.slug.trim() : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')).toLowerCase();
      
      if (!name) {
        const msg = 'Please enter a tag name.';
        setErrorMsg(msg);
        showError('Validation Error', msg);
        setIsSaving(false);
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
        setIsSaving(false);
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
    } finally {
      setIsSaving(false);
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
  const handleOpenNewAuditorium = () => {
    const defaultCountry = countriesList[0]?.id || 1000;
    const filteredCities = citiesList.filter(c => String(c.countryId) === String(defaultCountry));
    const defaultCity = filteredCities[0]?.id || (citiesList[0]?.id || 1000);
    const filteredVenues = venuesList.filter(v => String(v.cityId) === String(defaultCity));
    const defaultVenue = filteredVenues[0]?.id || (venuesList[0]?.id || 1000);
    const matchedVenue = venuesList.find(v => v.id === defaultVenue);

    setAuditoriumForm({
      ...defaultAuditoriumForm,
      countryId: defaultCountry,
      cityId: defaultCity,
      venueId: defaultVenue,
      venue: matchedVenue?.name || '',
      layoutJson: createBlankLayoutJson(10, 20)
    });
    setShowAuditoriumModal(true);
  };

  const handleSaveAuditorium = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const venueId = parseInt(auditoriumForm.venueId, 10) || (venuesList[0]?.id || 1000);
    if (!auditoriumForm.name || !venueId) {
      const msg = 'Please enter an auditorium name and select a venue.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    const layoutCode = auditoriumForm.layoutCode || auditoriumForm.name.toUpperCase().replace(/\s+/g, '_');
    const isDupAuditorium = auditoriumsList.some(a => 
      String(a.id) !== String(auditoriumForm.id) && 
      (a.venueId === venueId || a.venue === auditoriumForm.venue) &&
      (a.name.trim().toLowerCase() === auditoriumForm.name.trim().toLowerCase() ||
       a.layoutCode.trim().toLowerCase() === layoutCode.trim().toLowerCase())
    );
    if (isDupAuditorium) {
      const msg = `An auditorium layout with name '${auditoriumForm.name}' or code '${layoutCode}' already exists for this venue.`;
      setErrorMsg(msg);
      showError('Duplicate Layout', msg);
      return;
    }

    setIsSaving(true);
    try {
      const selVenue = venuesList.find(v => v.id === venueId);
      const payload = {
        venueId: venueId,
        name: auditoriumForm.name.trim(),
        venue: selVenue?.name || auditoriumForm.venue || '',
        city: auditoriumForm.city || 'Karachi',
        layoutCode: layoutCode,
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditAuditorium = (aud) => {
    // Preserve & resolve the 3-tier location hierarchy: Country -> City -> Venue
    const matchedVenue = venuesList.find(v => v.id === aud.venueId || v.name.toLowerCase() === (aud.venueName || aud.venue || '').toLowerCase());
    const venueId = matchedVenue?.id || aud.venueId || (venuesList[0]?.id || '');
    const cityId = matchedVenue?.cityId || (citiesList[0]?.id || '');
    const matchedCity = citiesList.find(c => c.id === cityId);
    const countryId = matchedCity?.countryId || (countriesList[0]?.id || '');

    setAuditoriumForm({
      id: aud.id,
      countryId: countryId,
      cityId: cityId,
      venueId: venueId,
      name: aud.name || '',
      venue: matchedVenue?.name || aud.venueName || aud.venue || '',
      city: matchedCity?.name || aud.city || 'Karachi',
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

  // --- CRUD: COUNTRIES ---
  const handleSaveCountry = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const name = countryForm.name ? countryForm.name.trim() : '';
    const code = countryForm.code ? countryForm.code.trim().toUpperCase() : '';

    if (!name || !code) {
      const msg = 'Please enter country name and ISO code.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    const isDup = countriesList.some(c => 
      String(c.id) !== String(countryForm.id) &&
      (c.name.trim().toLowerCase() === name.toLowerCase() || c.code.trim().toUpperCase() === code)
    );
    if (isDup) {
      const msg = `Country with name '${name}' or code '${code}' already exists.`;
      setErrorMsg(msg);
      showError('Duplicate Country', msg);
      return;
    }

    setIsSaving(true);
    try {
      if (countryForm.id) {
        await locationsApi.updateCountry(countryForm.id, { name, code, isActive: countryForm.isActive });
        const msg = `Country '${name}' updated successfully!`;
        setSuccessMsg(msg);
        showSuccess('Country Updated', msg);
      } else {
        await locationsApi.createCountry({ name, code });
        const msg = `Country '${name}' created successfully!`;
        setSuccessMsg(msg);
        showSuccess('Country Created', msg);
      }
      setShowCountryModal(false);
      setCountryForm(defaultCountryForm);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Failed to save country.';
      setErrorMsg(msg);
      showError('Save Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCountry = (country) => {
    setCountryForm({
      id: country.id,
      name: country.name || '',
      code: country.code || '',
      isActive: country.isActive ?? true
    });
    setShowCountryModal(true);
  };

  const handleDeleteCountry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this country?')) return;
    try {
      await locationsApi.deleteCountry(id);
      const msg = 'Country deleted successfully.';
      setSuccessMsg(msg);
      showSuccess('Country Deleted 🗑️', msg);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Delete failed.';
      setErrorMsg(msg);
      showError('Delete Failed', msg);
    }
  };

  // --- CRUD: CITIES ---
  const handleSaveCity = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const name = cityForm.name ? cityForm.name.trim() : '';
    const countryId = parseInt(cityForm.countryId, 10) || (countriesList[0]?.id || 1000);

    if (!name || !countryId) {
      const msg = 'Please enter city name and select a country.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    const isDup = citiesList.some(c => 
      String(c.id) !== String(cityForm.id) &&
      c.countryId === countryId &&
      c.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (isDup) {
      const msg = `City '${name}' already exists under the selected country.`;
      setErrorMsg(msg);
      showError('Duplicate City', msg);
      return;
    }

    setIsSaving(true);
    try {
      if (cityForm.id) {
        await locationsApi.updateCity(cityForm.id, { name, isActive: cityForm.isActive });
        const msg = `City '${name}' updated successfully!`;
        setSuccessMsg(msg);
        showSuccess('City Updated', msg);
      } else {
        await locationsApi.createCity({ countryId, name });
        const msg = `City '${name}' created successfully!`;
        setSuccessMsg(msg);
        showSuccess('City Created', msg);
      }
      setShowCityModal(false);
      setCityForm(defaultCityForm);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Failed to save city.';
      setErrorMsg(msg);
      showError('Save Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCity = (city) => {
    setCityForm({
      id: city.id,
      countryId: city.countryId || (countriesList[0]?.id || 1000),
      name: city.name || '',
      isActive: city.isActive ?? true
    });
    setShowCityModal(true);
  };

  const handleDeleteCity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this city?')) return;
    try {
      await locationsApi.deleteCity(id);
      const msg = 'City deleted successfully.';
      setSuccessMsg(msg);
      showSuccess('City Deleted 🗑️', msg);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Delete failed.';
      setErrorMsg(msg);
      showError('Delete Failed', msg);
    }
  };

  // --- CRUD: VENUES ---
  const handleSaveVenue = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const name = venueForm.name ? venueForm.name.trim() : '';
    const cityId = parseInt(venueForm.cityId, 10) || (citiesList[0]?.id || 1000);

    if (!name || !cityId) {
      const msg = 'Please enter venue name and select a city.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    const isDup = venuesList.some(v => 
      String(v.id) !== String(venueForm.id) &&
      v.cityId === cityId &&
      v.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (isDup) {
      const msg = `Venue '${name}' already exists in this city.`;
      setErrorMsg(msg);
      showError('Duplicate Venue', msg);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        cityId,
        name,
        address: venueForm.address || '',
        description: venueForm.description || '',
        isActive: venueForm.isActive !== false
      };

      if (venueForm.id) {
        await locationsApi.updateVenue(venueForm.id, payload);
        const msg = `Venue '${name}' updated successfully!`;
        setSuccessMsg(msg);
        showSuccess('Venue Updated', msg);
      } else {
        await locationsApi.createVenue(payload);
        const msg = `Venue '${name}' created successfully!`;
        setSuccessMsg(msg);
        showSuccess('Venue Created', msg);
      }
      setShowVenueModal(false);
      setVenueForm(defaultVenueForm);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Failed to save venue.';
      setErrorMsg(msg);
      showError('Save Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditVenue = (venue) => {
    const matchedCity = citiesList.find(c => c.id === venue.cityId);
    setVenueForm({
      id: venue.id,
      countryId: matchedCity?.countryId || (countriesList[0]?.id || 1000),
      cityId: venue.cityId || (citiesList[0]?.id || 1000),
      name: venue.name || '',
      address: venue.address || '',
      description: venue.description || '',
      isActive: venue.isActive ?? true
    });
    setShowVenueModal(true);
  };

  const handleDeleteVenue = async (id) => {
    if (!window.confirm('Are you sure you want to delete this venue?')) return;
    try {
      await locationsApi.deleteVenue(id);
      const msg = 'Venue deleted successfully.';
      setSuccessMsg(msg);
      showSuccess('Venue Deleted 🗑️', msg);
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Delete failed.';
      setErrorMsg(msg);
      showError('Delete Failed', msg);
    }
  };

  // --- CRUD: FAQS ---
  const handleSaveFaq = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const question = faqForm.question ? faqForm.question.trim() : '';
    const answer = faqForm.answer ? faqForm.answer.trim() : '';
    const displayOrder = parseInt(faqForm.displayOrder, 10) || 1;

    if (!question || !answer) {
      const msg = 'Please enter both question and answer.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    // Validate unique display order number
    const isDuplicateOrder = faqsList.some(f =>
      f.id !== faqForm.id && (f.displayOrder === displayOrder || f.DisplayOrder === displayOrder)
    );
    if (isDuplicateOrder) {
      const msg = `Display Order #${displayOrder} is already in use by another FAQ. Please assign a unique display order number.`;
      setErrorMsg(msg);
      showError('Duplicate Display Order', msg);
      return;
    }

    setIsSaving(true);
    try {
      if (faqForm.id) {
        await faqsApi.update(faqForm.id, {
          question,
          answer,
          displayOrder,
          isActive: faqForm.isActive
        });
        const msg = `FAQ updated successfully!`;
        setSuccessMsg(msg);
        showSuccess('FAQ Updated ✏️', msg);
      } else {
        await faqsApi.create({
          question,
          answer,
          displayOrder
        });
        const msg = `New FAQ created successfully!`;
        setSuccessMsg(msg);
        showSuccess('FAQ Created ✨', msg);
      }
      setShowFaqModal(false);
      setFaqForm(defaultFaqForm);
      window.dispatchEvent(new CustomEvent('faqs-updated'));
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Failed to save FAQ.';
      setErrorMsg(msg);
      showError('Save Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  // --- DRAG AND DROP REORDER FOR FAQS ---
  const handleFaqDragStart = (e, index) => {
    setDraggedFaqIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFaqDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverFaqIndex !== index) {
      setDragOverFaqIndex(index);
    }
  };

  const handleFaqDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedFaqIndex === null || draggedFaqIndex === targetIndex) {
      setDraggedFaqIndex(null);
      setDragOverFaqIndex(null);
      return;
    }

    const updatedList = [...faqsList];
    const [movedItem] = updatedList.splice(draggedFaqIndex, 1);
    updatedList.splice(targetIndex, 0, movedItem);

    // Re-assign displayOrder sequentially (1, 2, 3...)
    const reorderedList = updatedList.map((faq, idx) => ({
      ...faq,
      displayOrder: idx + 1
    }));

    setFaqsList(reorderedList);
    setDraggedFaqIndex(null);
    setDragOverFaqIndex(null);

    // Dispatch realtime event immediately so footer updates without page reload
    window.dispatchEvent(new CustomEvent('faqs-updated', { detail: { faqs: reorderedList } }));

    // Persist new display order sequence to database
    try {
      await Promise.all(
        reorderedList.map(faq =>
          faqsApi.update(faq.id, {
            question: faq.q || faq.question,
            answer: faq.a || faq.answer,
            displayOrder: faq.displayOrder,
            isActive: faq.isActive ?? true
          })
        )
      );
      showSuccess('Order Saved 🔄', 'FAQ sequence reordered and saved successfully!');
    } catch (err) {
      showError('Save Order Error', err.message || 'Failed to save reordered sequence.');
      fetchBackendData();
    }
  };

  const handleFaqDragEnd = () => {
    setDraggedFaqIndex(null);
    setDragOverFaqIndex(null);
  };

  const handleEditFaq = (faq) => {
    setFaqForm({
      id: faq.id,
      question: faq.q || faq.question || '',
      answer: faq.a || faq.answer || '',
      displayOrder: faq.displayOrder || 1,
      isActive: faq.isActive ?? true
    });
    setShowFaqModal(true);
  };

  const handleDeleteFaq = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await faqsApi.delete(id);
      const msg = 'FAQ deleted successfully.';
      setSuccessMsg(msg);
      showSuccess('FAQ Deleted 🗑️', msg);
      window.dispatchEvent(new CustomEvent('faqs-updated'));
      fetchBackendData();
    } catch (err) {
      const msg = err.message || 'Delete failed.';
      setErrorMsg(msg);
      showError('Delete Failed', msg);
    }
  };

  const handleSaveFooterInfo = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSaving(true);
    try {
      await footerApi.update(footerForm);
      const msg = 'Footer information updated successfully!';
      setSuccessMsg(msg);
      showSuccess('Footer Updated 📝', msg);
    } catch (err) {
      const msg = err.message || 'Failed to update footer info.';
      setErrorMsg(msg);
      showError('Save Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  // --- CRUD: BANK ACCOUNTS (SUPER ADMIN ONLY) ---
  const handleSaveBankAccount = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!bankAccountForm.bankName || !bankAccountForm.accountTitle || !bankAccountForm.accountNumber || !bankAccountForm.iban) {
      const msg = 'Please fill out Bank Name, Account Title, Account Number, and IBAN.';
      setErrorMsg(msg);
      showError('Validation Error', msg);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...bankAccountForm,
        maintenanceNotice: bankAccountForm.maintenanceNotice?.trim() || null,
        maintenanceStartUtc: bankAccountForm.maintenanceStartUtc ? new Date(bankAccountForm.maintenanceStartUtc).toISOString() : null,
        maintenanceEndUtc: bankAccountForm.maintenanceEndUtc ? new Date(bankAccountForm.maintenanceEndUtc).toISOString() : null,
        isMaintenanceMode: Boolean(bankAccountForm.isMaintenanceMode)
      };

      if (bankAccountForm.id) {
        await bankAccountsApi.adminUpdate(bankAccountForm.id, payload);
        showSuccess('Bank Account Updated 🏦', `Saved changes to ${bankAccountForm.bankName}`);
      } else {
        await bankAccountsApi.adminCreate(payload);
        showSuccess('Bank Account Created 🏦', `Added ${bankAccountForm.bankName} (${bankAccountForm.accountTitle})`);
      }
      setShowBankAccountModal(false);
      setBankAccountForm(defaultBankAccountForm);
      fetchBackendData();
    } catch (err) {
      showError('Save Failed', err.message || 'Failed to save bank account.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditBankAccount = (acc) => {
    // Format UTC ISO string to local datetime-local input string YYYY-MM-DDTHH:mm
    const toInputDate = (isoStr) => {
      if (!isoStr) return '';
      try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch {
        return '';
      }
    };

    setBankAccountForm({
      id: acc.id,
      bankName: acc.bankName || '',
      accountTitle: acc.accountTitle || '',
      accountNumber: acc.accountNumber || '',
      iban: acc.iban || '',
      branchCode: acc.branchCode || '',
      branchName: acc.branchName || '',
      qrCodeImageUrl: acc.qrCodeImageUrl || '',
      instructions: acc.instructions || '',
      isActive: acc.isActive ?? true,
      displayOrder: acc.displayOrder || 1,
      maintenanceNotice: acc.maintenanceNotice || '',
      maintenanceStartUtc: toInputDate(acc.maintenanceStartUtc),
      maintenanceEndUtc: toInputDate(acc.maintenanceEndUtc),
      isMaintenanceMode: acc.isMaintenanceMode ?? false
    });
    setShowBankAccountModal(true);
  };

  const handleDeleteBankAccount = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bank account?')) return;
    try {
      await bankAccountsApi.adminDelete(id);
      showSuccess('Bank Account Deleted', 'Account removed successfully.');
      fetchBackendData();
    } catch (err) {
      showError('Delete Failed', err.message || 'Failed to delete bank account.');
    }
  };

  const handleToggleActiveBankAccount = async (id) => {
    try {
      await bankAccountsApi.adminToggleActive(id);
      showSuccess('Status Updated', 'Active bank account toggled.');
      fetchBackendData();
    } catch (err) {
      showError('Update Failed', err.message || 'Failed to toggle active status.');
    }
  };

  // --- BOOKING VERIFICATION & CONFIRMATION ---
  const handleConfirmBankPayment = async (bookingId, bookingRef) => {
    if (!window.confirm(`Confirm payment for Booking #${bookingRef}? This will permanently reserve seats and issue the official E-Ticket with QR code.`)) {
      return;
    }
    try {
      await bookingsApi.confirmBankPayment(bookingId);
      showSuccess('Payment Confirmed! 🎟️', `Booking #${bookingRef} verified and official E-Ticket pass generated!`);
      fetchBackendData();
    } catch (err) {
      showError('Confirmation Failed', err.message || 'Failed to verify payment.');
    }
  };

  const handleRejectBankPayment = async (bookingId, bookingRef) => {
    const reason = window.prompt(`Enter reason for rejecting payment for Booking #${bookingRef}:`, 'Transfer could not be verified in bank statement.');
    if (reason === null) return;
    try {
      await bookingsApi.rejectBankPayment(bookingId, { reason });
      showWarning('Payment Rejected', `Booking #${bookingRef} rejected and held seats released.`);
      fetchBackendData();
    } catch (err) {
      showError('Rejection Failed', err.message || 'Failed to reject booking.');
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={32} color="#0d9488" /> Super Admin Control Hub
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
            background: activeAdminTab === 'events' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
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
          onClick={() => setActiveAdminTab('shows')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'shows' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Calendar size={18} /> Shows ({showsList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('ticket-tiers')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'ticket-tiers' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Layers size={18} /> Ticket Tiers ({ticketTiersList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('organizers')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'organizers' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
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
            background: activeAdminTab === 'artists' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
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
            background: activeAdminTab === 'bookings' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
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
          onClick={() => setActiveAdminTab('gate-scanner')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'gate-scanner' ? 'linear-gradient(135deg, #06b6d4, #0284c7)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ScanLine size={18} /> Gate Scanner
        </button>

        <button
          onClick={() => setActiveAdminTab('users')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'users' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Users size={18} /> Users ({visibleUsersList.length})
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveAdminTab('roles')}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              background: activeAdminTab === 'roles' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
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
        )}

        <button
          onClick={() => setActiveAdminTab('auditoriums')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'auditoriums' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
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
          onClick={() => setActiveAdminTab('venues')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'venues' ? 'linear-gradient(135deg, #0d9488, #059669)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Building2 size={18} /> Venues ({venuesList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('cities')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'cities' ? 'linear-gradient(135deg, #0d9488, #059669)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <MapPin size={18} /> Cities ({citiesList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('countries')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'countries' ? 'linear-gradient(135deg, #0d9488, #059669)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Sparkles size={18} /> Countries ({countriesList.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('tags')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'tags' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
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

        <button
          onClick={() => setActiveAdminTab('faqs')}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'faqs' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <HelpCircle size={18} /> FAQs ({faqsList.length})
        </button>

        <button
          onClick={() => {
            setActiveAdminTab('footer-info');
            setShowFooterModal(true);
          }}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeAdminTab === 'footer-info' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileText size={18} /> Footer Info
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveAdminTab('bank-accounts')}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              background: activeAdminTab === 'bank-accounts' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Building2 size={18} /> Bank Accounts ({bankAccountsList.length})
          </button>
        )}

        {isSuperAdmin && (
          <button
            onClick={() => setActiveAdminTab('paypro')}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              background: activeAdminTab === 'paypro' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <ShieldCheck size={18} /> PayPro Gateway
          </button>
        )}
      </div>

      {/* --- TAB 1: EVENTS MANAGEMENT --- */}
      {activeAdminTab === 'events' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Live Events Directory</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setShowForm({
                    ...defaultShowForm,
                    eventId: eventsList[0]?.id ? String(eventsList[0].id) : ''
                  });
                  setShowShowModal(true);
                }}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', color: '#2dd4bf', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Calendar size={16} /> Add Show Slot
              </button>
              <button
                onClick={() => { setTierForm(defaultTierForm); setShowTierModal(true); }}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#c7d2fe', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={16} /> Add Ticket Tier
              </button>
              <button
                onClick={() => { setEventForm(defaultEventForm); setShowEventModal(true); }}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={16} /> Create Event
              </button>
            </div>
          </div>

          <div className="mature-table-wrapper">
            <table className="mature-data-table">
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
                            <span style={{ fontSize: '0.7rem', color: '#2dd4bf', background: 'rgba(13, 148, 136, 0.15)', border: '1px solid rgba(13, 148, 136, 0.3)', padding: '0.1rem 0.4rem', borderRadius: '4px', marginTop: '0.2rem', display: 'inline-block', fontWeight: 600 }}>
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
                          onClick={() => {
                            setShowEventFilter(String(ev.id));
                            setActiveAdminTab('shows');
                          }}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
                          title="Manage show slots for this event"
                        >
                          <Calendar size={14} /> Shows
                        </button>
                        <button
                          onClick={() => {
                            setTierEventFilter(String(ev.id));
                            setActiveAdminTab('ticket-tiers');
                          }}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '6px', color: '#c7d2fe', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
                          title="View and update ticket tiers for this event"
                        >
                          <Layers size={14} /> Tiers
                        </button>
                        <button
                          onClick={() => handleEditEvent(ev)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
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

      {/* --- TAB 2: SHOWS & SCHEDULES MANAGEMENT --- */}
      {activeAdminTab === 'shows' && (() => {
        const filteredShows = showsList.filter(s => {
          if (showEventFilter !== 'All' && String(s.eventId) !== String(showEventFilter)) {
            return false;
          }
          if (showSearch.trim()) {
            const q = showSearch.toLowerCase();
            const matchedEv = eventsList.find(e => e.id === s.eventId);
            const evTitle = (matchedEv?.title || s.eventTitle || '').toLowerCase();
            const sTitle = (s.showTitle || '').toLowerCase();
            if (!sTitle.includes(q) && !evTitle.includes(q)) {
              return false;
            }
          }
          return true;
        });

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Event Shows & Schedules</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Manage performance show slots and timings against each event. Show timings are strictly validated to fall within parent event dates.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ width: '220px' }}>
                  <SearchableSelect
                    value={showEventFilter}
                    onChange={e => setShowEventFilter(e.target.value)}
                    options={[
                      { value: 'All', label: 'All Events' },
                      ...eventsList.map(ev => ({ value: String(ev.id), label: ev.title }))
                    ]}
                    placeholder="Filter by Event..."
                  />
                </div>
                <div style={{ position: 'relative', width: '200px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search shows..."
                    value={showSearch}
                    onChange={e => setShowSearch(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <button
                  onClick={() => {
                    setShowForm({
                      ...defaultShowForm,
                      eventId: showEventFilter !== 'All' ? showEventFilter : (eventsList[0]?.id ? String(eventsList[0].id) : '')
                    });
                    setShowShowModal(true);
                  }}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                >
                  <Plus size={16} /> Add Show Slot
                </button>
              </div>
            </div>

            <div className="mature-table-wrapper">
              <table className="mature-data-table">
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '1rem' }}>Show Slot Title</th>
                    <th style={{ padding: '1rem' }}>Associated Event</th>
                    <th style={{ padding: '1rem' }}>Show Timing (PKT)</th>
                    <th style={{ padding: '1rem' }}>Linked Ticket Tiers</th>
                    <th style={{ padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShows.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                        No show slots found. Click "+ Add Show Slot" to define performance timings for an event.
                      </td>
                    </tr>
                  ) : (
                    filteredShows.map(show => {
                      const matchedEv = eventsList.find(e => e.id === show.eventId);
                      const linkedTiers = ticketTiersList.filter(t => t.eventShowId === show.id);

                      const startFormatted = show.startTimeUtc
                        ? new Date(show.startTimeUtc).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
                        : 'N/A';
                      const endFormatted = show.endTimeUtc
                        ? new Date(show.endTimeUtc).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
                        : 'N/A';

                      return (
                        <tr key={show.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Calendar size={16} color="#2dd4bf" />
                              <div>
                                <span>{show.showTitle}</span>
                                <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.06)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                                  #{show.id}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ color: '#cbd5e1', fontWeight: 500 }}>
                              {matchedEv?.title || show.eventTitle || `Event #${show.eventId}`}
                            </div>
                            {matchedEv && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                                {matchedEv.venueName || matchedEv.venue || ''} • {matchedEv.cityName || matchedEv.city || ''}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.825rem' }}>
                              <div style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Clock size={13} /> {startFormatted}
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '0.75rem', paddingLeft: '1rem' }}>
                                to {endFormatted}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {linkedTiers.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                {linkedTiers.map(t => (
                                  <span key={t.id} style={{ fontSize: '0.7rem', color: '#c7d2fe', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                                    {t.name} (PKR {t.price})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                                All general event passes
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleEditShow(show)}
                                style={{ padding: '0.4rem 0.75rem', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                title="Edit show timing"
                              >
                                <Edit3 size={14} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteShow(show)}
                                style={{ padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                title="Delete show slot"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* --- TAB: TICKET TIERS MANAGEMENT --- */}
      {activeAdminTab === 'ticket-tiers' && (() => {
        const filteredTiers = ticketTiersList.filter(t => {
          if (tierEventFilter !== 'All' && String(t.eventId) !== String(tierEventFilter)) {
            return false;
          }
          if (tierSearch.trim()) {
            const q = tierSearch.toLowerCase();
            const matchedEv = eventsList.find(e => e.id === t.eventId);
            const evTitle = (matchedEv?.title || '').toLowerCase();
            const tName = (t.name || '').toLowerCase();
            const tRow = (t.rowRange || '').toLowerCase();
            if (!tName.includes(q) && !evTitle.includes(q) && !tRow.includes(q)) {
              return false;
            }
          }
          return true;
        });

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Ticket Tiers & Row Pricing</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Manage category passes, VIP packages, and interactive row pricing across all event slots.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ width: '220px' }}>
                  <SearchableSelect
                    value={tierEventFilter}
                    onChange={e => setTierEventFilter(e.target.value)}
                    options={[
                      { value: 'All', label: 'All Events' },
                      ...eventsList.map(ev => ({ value: String(ev.id), label: ev.title }))
                    ]}
                    placeholder="Filter by Event..."
                  />
                </div>
                <div style={{ position: 'relative', width: '200px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search tiers..."
                    value={tierSearch}
                    onChange={e => setTierSearch(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <button
                  onClick={() => {
                    setTierForm({
                      ...defaultTierForm,
                      eventId: tierEventFilter !== 'All' ? tierEventFilter : (eventsList[0]?.id ? String(eventsList[0].id) : '')
                    });
                    setShowTierModal(true);
                  }}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                >
                  <Plus size={16} /> Add Ticket Tier
                </button>
              </div>
            </div>

            <div className="mature-table-wrapper">
              <table className="mature-data-table">
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '1rem' }}>Tier / Pass Name</th>
                    <th style={{ padding: '1rem' }}>Event</th>
                    <th style={{ padding: '1rem' }}>Show Slot</th>
                    <th style={{ padding: '1rem' }}>Row Range</th>
                    <th style={{ padding: '1rem' }}>Price</th>
                    <th style={{ padding: '1rem' }}>Capacity</th>
                    <th style={{ padding: '1rem' }}>Sold</th>
                    <th style={{ padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTiers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                        No ticket tiers found. Click "+ Add Ticket Tier" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredTiers.map(tier => {
                      const matchedEv = eventsList.find(e => e.id === tier.eventId);
                      const shows = matchedEv?.shows || [];
                      const matchedShow = shows.find(s => s.id === tier.eventShowId);

                      return (
                        <tr key={tier.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Ticket size={16} color="#2dd4bf" />
                              <div>
                                <span>{tier.name}</span>
                                {tier.description && (
                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400, marginTop: '0.15rem' }}>
                                    {tier.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', color: '#f8fafc' }}>
                            {matchedEv?.title || `Event #${tier.eventId}`}
                          </td>
                          <td style={{ padding: '1rem', color: '#94a3b8' }}>
                            {matchedShow?.showTitle || (tier.eventShowId ? `Show #${tier.eventShowId}` : 'All Shows')}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {tier.rowRange ? (
                              <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '4px', color: '#2dd4bf', fontSize: '0.75rem', fontWeight: 700 }}>
                                Rows: {tier.rowRange}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>General / Unmapped</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', color: '#4ade80', fontWeight: 700 }}>
                            PKR {tier.price?.toLocaleString()}
                          </td>
                          <td style={{ padding: '1rem', color: '#94a3b8' }}>
                            {tier.availableQuantity}
                          </td>
                          <td style={{ padding: '1rem', color: '#fbbf24', fontWeight: 600 }}>
                            {tier.soldCount || 0}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleEditTicketTier(tier)}
                                style={{ padding: '0.4rem 0.75rem', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
                                title="Update this ticket tier"
                              >
                                <Edit3 size={14} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTicketTier(tier.id)}
                                style={{ padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                title="Delete this ticket tier"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* --- TAB 2: ORGANIZERS MANAGEMENT --- */}
      {activeAdminTab === 'organizers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Organizers Directory</h3>
            <button
              onClick={() => { setOrgForm(defaultOrgForm); setShowOrgModal(true); }}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Add Organizer
            </button>
          </div>

          <div className="mature-table-wrapper">
            <table className="mature-data-table">
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
                    <td style={{ padding: '1rem', color: '#2dd4bf' }}>
                      {(org.websiteUrl || org.WebsiteUrl) ? (
                        <a 
                          href={(org.websiteUrl || org.WebsiteUrl).startsWith('http') ? (org.websiteUrl || org.WebsiteUrl) : `https://${org.websiteUrl || org.WebsiteUrl}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ color: '#2dd4bf', textDecoration: 'underline', fontWeight: 500 }}
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
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
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

          <div className="mature-table-wrapper">
            <table className="mature-data-table">
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

      {/* --- TAB 4: BOOKINGS & E-TICKETS MANAGEMENT --- */}
      {activeAdminTab === 'bookings' && (
        <AdminBookingsTab
          eventsList={eventsList}
          bookingsList={bookingsList}
          loading={loading}
          fetchBackendData={fetchBackendData}
          handleConfirmBankPayment={handleConfirmBankPayment}
          handleRejectBankPayment={handleRejectBankPayment}
          handleDeleteBooking={handleDeleteBooking}
          setAdminPreviewTicket={setAdminPreviewTicket}
        />
      )}

      {/* --- TAB: GATEKEEPER SCANNER & ADMISSION HUB --- */}
      {activeAdminTab === 'gate-scanner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ScanLine size={24} style={{ color: '#06b6d4' }} /> Gatekeeper Ticket Scanner & Admission Hub
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Instant gate check-in, camera QR scanning, handheld USB gun input, fraud double-entry prevention, and live attendance metrics.
              </p>
            </div>
          </div>

          {/* Control Bar: Event Filter & Gate Name */}
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>Scope to Specific Event (Optional):</label>
              <SearchableSelect
                value={gateEventFilter}
                onChange={e => setGateEventFilter(e.target.value)}
                options={[{ value: '', label: 'All Platform Events' }, ...eventsList.map(e => ({ value: e.id, label: e.title }))]}
                placeholder="Filter by Event..."
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>Active Gate Station / Entrance:</label>
              <input
                type="text"
                value={gateName}
                onChange={e => setGateName(e.target.value)}
                placeholder="e.g. Main Entrance Gate A"
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
              />
            </div>
          </div>

          {/* Live Attendance KPIs (if event scoped) */}
          {gateStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total Paid Tickets</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>{gateStats.totalTicketsSold}</div>
              </div>
              <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Checked In at Gate</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>{gateStats.totalCheckedIn}</div>
              </div>
              <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Awaiting Entry</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>{gateStats.totalRemaining}</div>
              </div>
              <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #8b5cf6' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Attendance Rate</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c084fc', marginTop: '0.25rem' }}>{gateStats.attendancePercentage}%</div>
              </div>
            </div>
          )}

          {/* Scanner Input Card */}
          <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid rgba(6, 182, 212, 0.35)', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05), rgba(15, 23, 42, 0.8))' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ScanLine size={18} style={{ color: '#06b6d4' }} /> Scan Ticket QR / Barcode
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Point a 2D handheld USB scanner, paste complete QR payloads, enter verification URLs, or type ticket references (e.g. <code>EVL-10023</code>). Press Enter to validate.
            </p>
            <form onSubmit={handleGateScanSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                autoFocus
                value={gateTicketInput}
                onChange={e => setGateTicketInput(e.target.value)}
                placeholder="Scan QR or enter ticket reference (e.g. EVL-10023)..."
                style={{
                  flex: 1,
                  minWidth: '280px',
                  padding: '0.9rem 1.25rem',
                  fontSize: '1rem',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '2px solid rgba(6, 182, 212, 0.4)',
                  borderRadius: '10px',
                  color: '#fff',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={isScanningTicket || !gateTicketInput.trim()}
                style={{
                  padding: '0.9rem 1.75rem',
                  background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: (isScanningTicket || !gateTicketInput.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (isScanningTicket || !gateTicketInput.trim()) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isScanningTicket ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                {isScanningTicket ? 'Validating...' : 'Admit & Validate Pass'}
              </button>
            </form>
          </div>

          {/* Last Scan Result Card */}
          {gateScanResult && (
            <div className="glass-card" style={{
              padding: '1.75rem',
              borderRadius: '16px',
              border: gateScanResult.isValid
                ? '1px solid rgba(16, 185, 129, 0.5)'
                : gateScanResult.status === 'ALREADY_CHECKED_IN'
                  ? '1px solid rgba(245, 158, 11, 0.5)'
                  : '1px solid rgba(239, 68, 68, 0.5)',
              background: gateScanResult.isValid
                ? 'radial-gradient(circle at top left, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)'
                : gateScanResult.status === 'ALREADY_CHECKED_IN'
                  ? 'radial-gradient(circle at top left, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)'
                  : 'radial-gradient(circle at top left, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {gateScanResult.isValid ? (
                    <CheckCircle size={32} style={{ color: '#10b981' }} />
                  ) : gateScanResult.status === 'ALREADY_CHECKED_IN' ? (
                    <AlertTriangle size={32} style={{ color: '#f59e0b' }} />
                  ) : (
                    <XCircle size={32} style={{ color: '#ef4444' }} />
                  )}
                  <div>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: gateScanResult.isValid ? '#34d399' : gateScanResult.status === 'ALREADY_CHECKED_IN' ? '#fbbf24' : '#f87171' }}>
                      {gateScanResult.isValid ? 'ENTRY APPROVED' : gateScanResult.status === 'ALREADY_CHECKED_IN' ? 'DUPLICATE ENTRY DETECTED' : 'ENTRY REJECTED'}
                    </h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>{gateScanResult.message}</p>
                  </div>
                </div>

                {gateScanResult.status === 'ALREADY_CHECKED_IN' && gateScanResult.bookingRef && (
                  <button
                    onClick={() => handleResetGateTicket(gateScanResult.bookingRef)}
                    disabled={isResettingGateTicket}
                    style={{
                      padding: '0.6rem 1.2rem',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '8px',
                      color: '#fbbf24',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isResettingGateTicket ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Reset Check-In Status
                  </button>
                )}
              </div>

              {gateScanResult.bookingRef && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ATTENDEE</span>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{gateScanResult.customerName || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>REFERENCE</span>
                    <div style={{ fontWeight: 700, color: '#06b6d4' }}>{gateScanResult.bookingRef}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>EVENT</span>
                    <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{gateScanResult.eventTitle || 'Event'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>CATEGORY & SEATS</span>
                    <div style={{ fontWeight: 600, color: '#a78bfa' }}>
                      {gateScanResult.ticketTierName || 'General'} {gateScanResult.seatLabels?.length > 0 ? `(${gateScanResult.seatLabels.join(', ')})` : `(${gateScanResult.quantity} Pass)`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Real-time Activity Log Table */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: '#06b6d4' }} /> Live Gate Activity Log ({gateActivityLog.length})
            </h4>

            {gateActivityLog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                <ScanLine size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <p>No scans recorded yet in this session. Scan a ticket pass above to log entry.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '0.75rem' }}>Time</th>
                      <th style={{ padding: '0.75rem' }}>Pass Ref</th>
                      <th style={{ padding: '0.75rem' }}>Attendee</th>
                      <th style={{ padding: '0.75rem' }}>Tier & Seats</th>
                      <th style={{ padding: '0.75rem' }}>Gate</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateActivityLog.map((log, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{log.time}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: '#06b6d4' }}>{log.bookingRef}</td>
                        <td style={{ padding: '0.75rem', color: '#f8fafc', fontWeight: 600 }}>{log.customerName}</td>
                        <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>{log.tierName} &bull; {log.seats}</td>
                        <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{log.gate}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: log.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: log.status === 'APPROVED' ? '#34d399' : '#fbbf24'
                          }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleResetGateTicket(log.bookingRef)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#94a3b8',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Reset
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 5: USERS MANAGEMENT --- */}
      {activeAdminTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>User Accounts</h3>
            <button
              onClick={handleOpenCreateUser}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Create User Account
            </button>
          </div>

          <div className="mature-table-wrapper">
            <table className="mature-data-table">
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem' }}>Full Name</th>
                  <th style={{ padding: '1rem' }}>Email</th>
                  <th style={{ padding: '1rem' }}>Mobile Number</th>
                  <th style={{ padding: '1rem' }}>Role</th>
                  <th style={{ padding: '1rem' }}>Organizer Company</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsersList.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {u.imageUrl ? (
                          <img src={getUserImageUrl(u.imageUrl)} alt="" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(236, 72, 153, 0.4)' }} />
                        ) : (
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                            {u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div>
                          <div>{u.fullName}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{u.email}</td>
                    <td style={{ padding: '1rem', color: '#2dd4bf', fontWeight: 600, fontSize: '0.85rem' }}>
                      {u.phoneNumber || u.phone || <span style={{ color: '#64748b', fontWeight: 400 }}>N/A</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', fontWeight: 600 }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {u.organizerName ? (
                        <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                          {u.organizerName}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>—</span>
                      )}
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
      {isSuperAdmin && activeAdminTab === 'roles' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Database System Roles</h3>
            <button
              onClick={() => { setRoleForm(defaultRoleForm); setShowRoleModal(true); }}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Create Role
            </button>
          </div>

          <div className="mature-table-wrapper">
            <table className="mature-data-table">
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
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', cursor: 'pointer' }}
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
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Create Tag
            </button>
          </div>

          <div className="mature-table-wrapper">
            <table className="mature-data-table">
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
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#2dd4bf' }}>{t.name}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{t.slug}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditTag(t)}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
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
              onClick={handleOpenNewAuditorium}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Add Auditorium Layout
            </button>
          </div>

          {auditoriumsList.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderRadius: '16px' }}>
              <Grid size={48} color="#0d9488" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
              <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>No Auditorium Layouts In Database</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                You have not added any auditorium layouts yet. Click below to create your custom auditorium blueprint.
              </p>
              <button
                onClick={handleOpenNewAuditorium}
                style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                + Create Your First Auditorium
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {auditoriumsList.map(aud => {
                const matchedVenue = venuesList.find(v => v.id === aud.venueId || (aud.venueName && v.name.toLowerCase() === aud.venueName.toLowerCase()));
                const venueName = aud.venueName || matchedVenue?.name || aud.venue || '';
                const matchedCity = citiesList.find(c => c.id === matchedVenue?.cityId) || citiesList.find(c => aud.city && c.name.toLowerCase() === aud.city.toLowerCase());
                const cityName = matchedVenue?.cityName || matchedCity?.name || aud.city || '';
                const matchedCountry = countriesList.find(co => co.id === matchedCity?.countryId);
                const countryName = matchedCity?.countryName || matchedCountry?.name || '';
                const locationText = [venueName, cityName, countryName].filter(Boolean).join(', ');

                return (
                  <div key={aud.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span className="badge" style={{ backgroundColor: 'rgba(13, 148, 136, 0.15)', color: '#2dd4bf', border: '1px solid rgba(13, 148, 136, 0.3)', marginBottom: '0.35rem' }}>
                          {cityName ? `${cityName} • ` : ''}{aud.totalCapacity} Seats
                        </span>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
                          {aud.name}
                        </h4>
                        <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                          <MapPin size={13} style={{ flexShrink: 0, color: '#2dd4bf' }} />
                          <span>{locationText || 'Location not specified'}</span>
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.83rem', color: '#cbd5e1', lineHeight: 1.4, flexGrow: 1 }}>
                      {aud.description || 'Custom interactive venue blueprint.'}
                    </p>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setPreviewAuditorium(aud)}
                        style={{ padding: '0.5rem 0.85rem', background: 'rgba(13, 148, 136, 0.18)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}
                      >
                        <Eye size={14} /> Preview Chart
                      </button>
                      <button
                        onClick={async () => {
                          if (exportingAudId === aud.id) return;
                          try {
                            setExportingAudId(aud.id);
                            const parsedBlueprint = parseAuditoriumLayout(aud.layoutJson);
                            const exported = await exportAuditoriumChartPdf({
                              auditoriumName: aud.name,
                              venueName: venueName || 'Arts Council of Pakistan',
                              cityName: cityName || 'Karachi',
                              countryName: countryName || 'Pakistan',
                              showName: '',
                              showDate: '',
                              resolvedBlueprint: parsedBlueprint,
                              currentZone: { zone: aud.name, totalCapacity: aud.totalCapacity },
                              eventTitle: ''
                            });
                            if (exported && showSuccess) {
                              showSuccess('Chart Exported 📥', `${aud.name} seating chart downloaded as PDF.`);
                            }
                          } catch (err) {
                            console.error('Error exporting chart PDF:', err);
                            if (showError) showError('Export Failed', 'Failed to export auditorium chart to PDF.');
                          } finally {
                            setExportingAudId(null);
                          }
                        }}
                        disabled={exportingAudId === aud.id}
                        title="Download Seating Chart in PDF format with White Background"
                        style={{
                          padding: '0.5rem 0.85rem',
                          background: exportingAudId === aud.id ? 'rgba(5, 150, 105, 0.6)' : 'linear-gradient(135deg, #059669, #0f766e)',
                          border: '1px solid rgba(45, 212, 191, 0.4)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          cursor: exportingAudId === aud.id ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          fontSize: '0.82rem',
                          fontWeight: 700
                        }}
                      >
                        {exportingAudId === aud.id ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Exporting...
                          </>
                        ) : (
                          <>
                            <Download size={14} /> Download PDF
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleEditAuditorium(aud)}
                        style={{ flex: 1, minWidth: '70px', padding: '0.5rem', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '6px', color: '#2dd4bf', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}
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
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB: VENUES MANAGEMENT --- */}
      {activeAdminTab === 'venues' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search venues by name, city, or address..."
                value={venueSearch}
                onChange={e => setVenueSearch(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', color: '#fff' }}
              />
            </div>
            <button
              onClick={() => {
                const matchedCity = citiesList[0];
                setVenueForm({
                  ...defaultVenueForm,
                  cityId: matchedCity?.id || '',
                  countryId: matchedCity?.countryId || (countriesList[0]?.id || 1000)
                });
                setShowVenueModal(true);
              }}
              style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #0d9488, #059669)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} /> Add New Venue
            </button>
          </div>

          <div className="mature-table-wrapper">
            <table className="mature-data-table">
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>ID</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Venue Name</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>City</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Address</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Auditoriums</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Status</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {venuesList
                  .filter(v => !venueSearch || v.name.toLowerCase().includes(venueSearch.toLowerCase()) || (v.cityName && v.cityName.toLowerCase().includes(venueSearch.toLowerCase())) || (v.address && v.address.toLowerCase().includes(venueSearch.toLowerCase())))
                  .map(v => {
                    const audCount = auditoriumsList.filter(a => a.venueId === v.id).length;
                    const matchedCity = citiesList.find(c => c.id === v.cityId);
                    return (
                      <tr key={v.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>#{v.id}</td>
                        <td style={{ padding: '1rem', color: '#f8fafc', fontWeight: 600 }}>🏛️ {v.name}</td>
                        <td style={{ padding: '1rem', color: '#2dd4bf' }}>🏙️ {v.cityName || matchedCity?.name || 'Karachi'}</td>
                        <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.address || '—'}</td>
                        <td style={{ padding: '1rem', color: '#94a3b8' }}>{audCount} auditoriums</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: v.isActive !== false ? 'rgba(13, 148, 136, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: v.isActive !== false ? '#2dd4bf' : '#f87171' }}>
                            {v.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleEditVenue(v)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(13, 148, 136, 0.2)', border: 'none', borderRadius: '6px', color: '#2dd4bf', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Edit3 size={14} /> Edit</button>
                            <button onClick={() => handleDeleteVenue(v.id)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Trash2 size={14} /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB: CITIES MANAGEMENT --- */}
      {activeAdminTab === 'cities' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search cities..."
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', color: '#fff' }}
              />
            </div>
            <button
              onClick={() => { setCityForm({ ...defaultCityForm, countryId: countriesList[0]?.id || 1000 }); setShowCityModal(true); }}
              style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #0d9488, #059669)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} /> Add New City
            </button>
          </div>

          <div className="mature-table-wrapper">
            <table className="mature-data-table">
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>ID</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>City Name</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Country</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Venues Count</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Status</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {citiesList
                  .filter(c => !citySearch || c.name.toLowerCase().includes(citySearch.toLowerCase()) || (c.countryName && c.countryName.toLowerCase().includes(citySearch.toLowerCase())))
                  .map(c => {
                    const venueCount = venuesList.filter(v => v.cityId === c.id).length;
                    const matchedCountry = countriesList.find(cnt => cnt.id === c.countryId);
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>#{c.id}</td>
                        <td style={{ padding: '1rem', color: '#f8fafc', fontWeight: 600 }}>🏙️ {c.name}</td>
                        <td style={{ padding: '1rem', color: '#94a3b8' }}>🌍 {c.countryName || matchedCountry?.name || 'Pakistan'}</td>
                        <td style={{ padding: '1rem', color: '#94a3b8' }}>{venueCount} venues</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: c.isActive !== false ? 'rgba(13, 148, 136, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: c.isActive !== false ? '#2dd4bf' : '#f87171' }}>
                            {c.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleEditCity(c)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(13, 148, 136, 0.2)', border: 'none', borderRadius: '6px', color: '#2dd4bf', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Edit3 size={14} /> Edit</button>
                            <button onClick={() => handleDeleteCity(c.id)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Trash2 size={14} /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB: COUNTRIES MANAGEMENT --- */}
      {activeAdminTab === 'countries' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search countries by name or ISO code..."
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', color: '#fff' }}
              />
            </div>
            <button
              onClick={() => { setCountryForm(defaultCountryForm); setShowCountryModal(true); }}
              style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #0d9488, #059669)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} /> Add New Country
            </button>
          </div>

          <div className="mature-table-wrapper">
            <table className="mature-data-table">
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>ID</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Country Name</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>ISO Code</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Cities Count</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Status</th>
                  <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {countriesList
                  .filter(c => !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase()))
                  .map(c => {
                    const cityCount = citiesList.filter(ct => ct.countryId === c.id).length;
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>#{c.id}</td>
                        <td style={{ padding: '1rem', color: '#f8fafc', fontWeight: 600 }}>🌍 {c.name}</td>
                        <td style={{ padding: '1rem', color: '#2dd4bf', fontFamily: 'monospace', fontWeight: 700 }}>{c.code}</td>
                        <td style={{ padding: '1rem', color: '#94a3b8' }}>{cityCount} cities</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: c.isActive !== false ? 'rgba(13, 148, 136, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: c.isActive !== false ? '#2dd4bf' : '#f87171' }}>
                            {c.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleEditCountry(c)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(13, 148, 136, 0.2)', border: 'none', borderRadius: '6px', color: '#2dd4bf', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Edit3 size={14} /> Edit</button>
                            <button onClick={() => handleDeleteCountry(c.id)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Trash2 size={14} /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 11: FAQS MANAGEMENT --- */}
      {activeAdminTab === 'faqs' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
                Frequently Asked Questions (FAQs)
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Manage website FAQs. Drag cards using the handle to instantly reorder sequence.
              </p>
            </div>
            <button
              onClick={() => {
                setFaqForm(defaultFaqForm);
                setShowFaqModal(true);
              }}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Plus size={16} /> Add New FAQ
            </button>
          </div>

          {faqsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <HelpCircle size={40} style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <p>No FAQs created in the database yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {faqsList.map((faq, idx) => {
                const isDragging = draggedFaqIndex === idx;
                const isDragOver = dragOverFaqIndex === idx;

                return (
                  <div
                    key={faq.id || idx}
                    draggable
                    onDragStart={(e) => handleFaqDragStart(e, idx)}
                    onDragOver={(e) => handleFaqDragOver(e, idx)}
                    onDrop={(e) => handleFaqDrop(e, idx)}
                    onDragEnd={handleFaqDragEnd}
                    style={{
                      background: isDragging 
                        ? 'rgba(13, 148, 136, 0.15)' 
                        : 'rgba(15, 23, 42, 0.6)',
                      border: isDragOver 
                        ? '2px dashed #2dd4bf' 
                        : '1px solid rgba(13, 148, 136, 0.2)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      opacity: isDragging ? 0.4 : 1,
                      cursor: 'grab',
                      transition: 'all 0.2s ease',
                      boxShadow: isDragOver ? '0 0 15px rgba(13, 148, 136, 0.4)' : 'none'
                    }}
                  >
                    {/* Drag Handle */}
                    <div 
                      style={{ 
                        color: '#64748b', 
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.25rem'
                      }}
                      title="Drag to reorder FAQ sequence"
                    >
                      <GripVertical size={20} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{
                          background: '#1e293b',
                          color: '#2dd4bf',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(13, 148, 136, 0.3)'
                        }}>
                          Order #{faq.displayOrder ?? idx + 1}
                        </span>
                        <span style={{
                          backgroundColor: faq.isActive !== false ? 'rgba(13, 148, 136, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: faq.isActive !== false ? '#2dd4bf' : '#f87171',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          {faq.isActive !== false ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                        {faq.q || faq.question}
                      </h4>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        {faq.a || faq.answer}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEditFaq(faq)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: 'rgba(13, 148, 136, 0.2)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#2dd4bf',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                        title="Edit FAQ"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteFaq(faq.id)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#f87171',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                        title="Delete FAQ"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB: FOOTER INFO MANAGEMENT --- */}
      {activeAdminTab === 'footer-info' && (
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={22} color="#0d9488" /> Footer Info Settings
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Single-row site configuration stored in database table <code>FooterInfo</code>
              </p>
            </div>
            <button
              onClick={() => setShowFooterModal(true)}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Edit3 size={18} /> Edit Footer Info
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Brand Name</span>
              <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600, marginTop: '0.25rem' }}>{footerForm.brandName || 'Event Land'}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Phone</span>
              <div style={{ fontSize: '1.1rem', color: '#0d9488', fontWeight: 600, marginTop: '0.25rem' }}>{footerForm.phone || 'N/A'}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Email</span>
              <div style={{ fontSize: '1.1rem', color: '#0d9488', fontWeight: 600, marginTop: '0.25rem' }}>{footerForm.email || 'N/A'}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Address</span>
              <div style={{ fontSize: '0.95rem', color: '#cbd5e1', marginTop: '0.25rem' }}>{footerForm.address || 'N/A'}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', gridColumn: 'span 2' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Tagline</span>
              <div style={{ fontSize: '0.95rem', color: '#cbd5e1', marginTop: '0.25rem' }}>{footerForm.tagline}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', gridColumn: 'span 2' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Copyright Text</span>
              <div style={{ fontSize: '0.95rem', color: '#cbd5e1', marginTop: '0.25rem' }}>{footerForm.copyrightText}</div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: CREATE / EDIT EVENT --- */}
      <AdminEventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        eventForm={eventForm}
        setEventForm={setEventForm}
        handleSaveEvent={handleSaveEvent}
        isSaving={isSaving}
        organizersList={organizersList}
        tagsList={tagsList}
        countriesList={countriesList}
        citiesList={citiesList}
        venuesList={venuesList}
        auditoriumsList={auditoriumsList}
        onNavigateAuditoriums={() => setActiveAdminTab('auditoriums')}
      />

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
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {isSaving ? <><RefreshCw size={16} className="animate-spin" /> Saving Organizer...</> : (orgForm.id ? 'Update Organizer' : 'Save Organizer')}
                </button>
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
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #a855f7, #6b21a8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {isSaving ? <><RefreshCw size={16} className="animate-spin" /> Saving Artist...</> : (artistForm.id ? 'Update Artist' : 'Save Artist')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT SHOW SLOT --- */}
      <AdminShowSlotModal
        isOpen={showShowModal}
        onClose={() => setShowShowModal(false)}
        showForm={showForm}
        setShowForm={setShowForm}
        handleSaveShow={handleSaveShow}
        isSavingShow={isSavingShow}
        eventsList={eventsList}
      />

      {/* --- MODAL 4: CREATE / EDIT TICKET TIER --- */}
      <AdminTicketTierModal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
        tierForm={tierForm}
        setTierForm={setTierForm}
        handleSaveTicketTier={handleSaveTicketTier}
        isSaving={isSaving}
        eventsList={eventsList}
        showsList={showsList}
      />

      {/* --- MODAL 5: CREATE / EDIT USER ACCOUNT --- */}
      <AdminUserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        userForm={userForm}
        setUserForm={setUserForm}
        handleSaveUser={handleSaveUser}
        isSaving={isSaving}
        isSuperAdmin={isSuperAdmin}
        countriesList={countriesList}
        userRoleOptions={userRoleOptions}
        rolesList={rolesList}
        organizersList={organizersList}
      />

      {/* --- MODAL 6: CREATE / EDIT ROLE --- */}
      {isSuperAdmin && showRoleModal && (
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
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {isSaving ? <><RefreshCw size={16} className="animate-spin" /> Saving Role...</> : 'Save Role'}
                </button>
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
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#2dd4bf', fontFamily: 'monospace' }} 
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  URL-friendly slug (e.g. concerts, sufi-rock, tech-workshops)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowTagModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {isSaving ? <><RefreshCw size={16} className="animate-spin" /> Saving Tag...</> : 'Save Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 8: CREATE / EDIT AUDITORIUM LAYOUT --- */}
      <AdminAuditoriumModal
        isOpen={showAuditoriumModal}
        onClose={() => setShowAuditoriumModal(false)}
        auditoriumForm={auditoriumForm}
        setAuditoriumForm={setAuditoriumForm}
        handleSaveAuditorium={handleSaveAuditorium}
        isSaving={isSaving}
        setPreviewAuditorium={setPreviewAuditorium}
        countriesList={countriesList}
        citiesList={citiesList}
        venuesList={venuesList}
      />

      {/* --- MODAL: CREATE / EDIT COUNTRY --- */}
      {showCountryModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowCountryModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
              {countryForm.id ? 'Edit Country' : 'Add New Country'}
            </h3>
            <form onSubmit={handleSaveCountry} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Country Name *</label>
                <input type="text" required placeholder="e.g. Pakistan" value={countryForm.name} onChange={e => setCountryForm({ ...countryForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>ISO Country Code *</label>
                <input type="text" required placeholder="e.g. PK" value={countryForm.code} onChange={e => setCountryForm({ ...countryForm, code: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#2dd4bf', fontFamily: 'monospace', fontWeight: 700 }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCountryModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #0d9488, #059669)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {isSaving ? <><RefreshCw size={16} className="animate-spin" /> Saving Country...</> : 'Save Country'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT CITY --- */}
      {showCityModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowCityModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
              {cityForm.id ? 'Edit City' : 'Add New City'}
            </h3>
            <form onSubmit={handleSaveCity} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Country *</label>
                <SearchableSelect
                  required
                  value={cityForm.countryId || (countriesList[0]?.id || 1000)}
                  onChange={e => setCityForm({ ...cityForm, countryId: e.target.value })}
                  options={countriesList.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                  placeholder="Select Country..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>City Name *</label>
                <input type="text" required placeholder="e.g. Karachi" value={cityForm.name} onChange={e => setCityForm({ ...cityForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCityModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #0d9488, #059669)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {isSaving ? <><RefreshCw size={16} className="animate-spin" /> Saving City...</> : 'Save City'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT VENUE --- */}
      {showVenueModal && (() => {
        const selectedCountryId = venueForm.countryId || (countriesList[0]?.id || 1000);
        const filteredCities = citiesList.filter(c => c.countryId === parseInt(selectedCountryId, 10));

        return (
          <div className="modal-overlay">
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '2rem', position: 'relative' }}>
              <button
                onClick={() => setShowVenueModal(false)}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
                {venueForm.id ? 'Edit Venue' : 'Add New Venue'}
              </h3>
              <form onSubmit={handleSaveVenue} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Country *</label>
                    <SearchableSelect
                      required
                      value={selectedCountryId}
                      onChange={e => {
                        const newCountryId = e.target.value;
                        const newFilteredCities = citiesList.filter(c => c.countryId === parseInt(newCountryId, 10));
                        setVenueForm({
                          ...venueForm,
                          countryId: newCountryId,
                          cityId: newFilteredCities[0]?.id || ''
                        });
                      }}
                      options={countriesList.map(c => ({ value: c.id, label: c.name }))}
                      placeholder="Select Country..."
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>City *</label>
                    <SearchableSelect
                      required
                      value={venueForm.cityId || (filteredCities[0]?.id || '')}
                      onChange={e => setVenueForm({ ...venueForm, cityId: e.target.value })}
                      options={filteredCities.map(c => ({ value: c.id, label: c.name }))}
                      placeholder="Select City..."
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Venue Name *</label>
                  <input type="text" required placeholder="e.g. Arts Council of Pakistan" value={venueForm.name} onChange={e => setVenueForm({ ...venueForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Full Address</label>
                  <input type="text" placeholder="e.g. M.R. Kiyani Road, Saddar, Karachi" value={venueForm.address} onChange={e => setVenueForm({ ...venueForm, address: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Description & Highlights</label>
                  <textarea rows={3} placeholder="Premier cultural venue hosting live concerts, theatre, and conventions..." value={venueForm.description} onChange={e => setVenueForm({ ...venueForm, description: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }} />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowVenueModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #0d9488, #059669)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {isSaving ? <><RefreshCw size={16} className="animate-spin" /> Saving Venue...</> : (venueForm.id ? 'Update Venue' : 'Save Venue')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* --- MODAL: CREATE / EDIT FAQ --- */}
      {showFaqModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowFaqModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
              {faqForm.id ? 'Edit FAQ' : 'Add New FAQ'}
            </h3>
            <form onSubmit={handleSaveFaq} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Question *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How do I book tickets on Event Land?"
                  value={faqForm.question}
                  onChange={e => setFaqForm({ ...faqForm, question: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Answer *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide a clear, detailed answer..."
                  value={faqForm.answer}
                  onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={faqForm.displayOrder}
                    onChange={e => setFaqForm({ ...faqForm, displayOrder: parseInt(e.target.value, 10) || 1 })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={faqForm.isActive}
                      onChange={e => setFaqForm({ ...faqForm, isActive: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#0d9488' }}
                    />
                    Active on Website
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowFaqModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #0d9488, #059669)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {isSaving ? <><RefreshCw size={16} className="animate-spin" /> Saving FAQ...</> : (faqForm.id ? 'Update FAQ' : 'Save FAQ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT FOOTER INFO --- */}
      {showFooterModal && (
        <div className="modal-overlay" onClick={() => setShowFooterModal(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              onClick={() => setShowFooterModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText color="#0d9488" size={24} /> Edit Footer Info
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Update site branding, tagline, contact information, and policy URLs stored in table <code>FooterInfo</code>.
            </p>

            <form onSubmit={handleSaveFooterInfo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={footerForm.brandName || ''}
                    onChange={e => setFooterForm({ ...footerForm, brandName: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={footerForm.phone || ''}
                    onChange={e => setFooterForm({ ...footerForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={footerForm.email || ''}
                    onChange={e => setFooterForm({ ...footerForm, email: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Physical Address
                  </label>
                  <input
                    type="text"
                    value={footerForm.address || ''}
                    onChange={e => setFooterForm({ ...footerForm, address: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Brand Tagline
                </label>
                <textarea
                  rows={3}
                  value={footerForm.tagline || ''}
                  onChange={e => setFooterForm({ ...footerForm, tagline: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Copyright Text
                </label>
                <input
                  type="text"
                  value={footerForm.copyrightText || ''}
                  onChange={e => setFooterForm({ ...footerForm, copyrightText: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Privacy Policy URL
                  </label>
                  <input
                    type="text"
                    value={footerForm.privacyPolicyUrl || ''}
                    onChange={e => setFooterForm({ ...footerForm, privacyPolicyUrl: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Terms of Service URL
                  </label>
                  <input
                    type="text"
                    value={footerForm.termsOfServiceUrl || ''}
                    onChange={e => setFooterForm({ ...footerForm, termsOfServiceUrl: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Organizer Support URL
                  </label>
                  <input
                    type="text"
                    value={footerForm.organizerSupportUrl || ''}
                    onChange={e => setFooterForm({ ...footerForm, organizerSupportUrl: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowFooterModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #0d9488, #059669)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {isSaving ? <><RefreshCw size={16} className="animate-spin" /> Updating Footer Info...</> : 'Save Footer Info'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- TAB: BANK ACCOUNTS (SUPER ADMIN ONLY) --- */}
      {activeAdminTab === 'bank-accounts' && isSuperAdmin && (
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={22} color="#2dd4bf" /> Bank Accounts Management (Super Admin)
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Configure receiving bank accounts for customer direct transfer checkout. The active account is displayed on checkout.
              </p>
            </div>
            <button
              onClick={() => {
                setBankAccountForm(defaultBankAccountForm);
                setShowBankAccountModal(true);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Plus size={18} /> Add New Bank Account
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
            {bankAccountsList.map(acc => (
              <div key={acc.id} style={{
                backgroundColor: '#0f172a',
                border: `1px solid ${acc.isActive ? 'rgba(13, 148, 136, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: acc.isActive ? '0 10px 30px rgba(13, 148, 136, 0.15)' : 'none'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                      {acc.bankName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleActiveBankAccount(acc.id)}
                      style={{
                        background: acc.isActive ? 'rgba(13, 148, 136, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: acc.isActive ? '#2dd4bf' : '#f87171',
                        border: `1px solid ${acc.isActive ? 'rgba(13, 148, 136, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                        borderRadius: '9999px',
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Click to toggle active receiving account"
                    >
                      {acc.isActive ? '✓ Active (Checkout)' : 'Inactive'}
                    </button>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    marginBottom: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Account Title</span>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{acc.accountTitle}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Account Number</span>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2dd4bf' }}>{acc.accountNumber}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>IBAN</span>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', wordBreak: 'break-all' }}>{acc.iban}</div>
                      </div>
                      {acc.branchName && (
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          Branch: {acc.branchName} {acc.branchCode ? `(${acc.branchCode})` : ''}
                        </div>
                      )}
                    </div>

                    {acc.qrCodeImageUrl && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'rgba(13, 148, 136, 0.08)',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(45, 212, 191, 0.3)',
                        flexShrink: 0
                      }}>
                        <img
                          src={getQrCodeImageUrl(acc.qrCodeImageUrl)}
                          alt="Bank QR Code"
                          style={{
                            width: '140px',
                            height: '140px',
                            objectFit: 'contain',
                            background: '#ffffff',
                            padding: '6px',
                            borderRadius: '10px',
                            border: '2px solid rgba(45, 212, 191, 0.5)',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)'
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span style={{ fontSize: '0.68rem', color: '#2dd4bf', fontWeight: 700, textTransform: 'uppercase' }}>
                          Transfer QR
                        </span>
                      </div>
                    )}
                  </div>

                  {acc.instructions && (
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                      "{acc.instructions}"
                    </p>
                  )}

                  {/* Maintenance Notice on Card */}
                  {acc.maintenanceNotice && (
                    <div style={{
                      background: acc.isUnderMaintenance ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      border: `1px solid ${acc.isUnderMaintenance ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      marginBottom: '1rem',
                      fontSize: '0.78rem'
                    }}>
                      <div style={{ fontWeight: 700, color: acc.isUnderMaintenance ? '#fca5a5' : '#fbbf24', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>⚠️ {acc.isUnderMaintenance ? 'Maintenance Active (Seat Selection Paused)' : 'Scheduled Maintenance Notice'}</span>
                      </div>
                      <div style={{ color: '#cbd5e1' }}>{acc.maintenanceNotice}</div>
                      {(acc.maintenanceStartUtc || acc.maintenanceEndUtc) && (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                          Range: {acc.maintenanceStartUtc ? new Date(acc.maintenanceStartUtc).toLocaleString() : 'Now'} → {acc.maintenanceEndUtc ? new Date(acc.maintenanceEndUtc).toLocaleString() : 'Ongoing'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => handleEditBankAccount(acc)}
                    style={{ flex: 1, padding: '0.6rem', background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)', borderRadius: '8px', color: '#2dd4bf', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    <Edit3 size={14} /> Edit Account
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBankAccount(acc.id)}
                    style={{ padding: '0.6rem 0.85rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#f87171', cursor: 'pointer' }}
                    title="Delete Bank Account"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB: PAYPRO GATEWAY SWITCH (SUPER ADMIN) --- */}
      {activeAdminTab === 'paypro' && isSuperAdmin && (
        <PayProAdminPanel />
      )}

      {/* --- MODAL: ADD / EDIT BANK ACCOUNT (STATIC MODAL) --- */}
      {showBankAccountModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '650px', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              onClick={() => setShowBankAccountModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 color="#2dd4bf" size={24} /> {bankAccountForm.id ? 'Edit Bank Account' : 'Add New Bank Account'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Enter receiving bank details and optional maintenance downtime notifications.
            </p>

            <form onSubmit={handleSaveBankAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Meezan Bank Limited"
                    value={bankAccountForm.bankName}
                    onChange={e => setBankAccountForm({ ...bankAccountForm, bankName: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Account Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Event Land Official Pvt Ltd"
                    value={bankAccountForm.accountTitle}
                    onChange={e => setBankAccountForm({ ...bankAccountForm, accountTitle: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0102030405060701"
                    value={bankAccountForm.accountNumber}
                    onChange={e => setBankAccountForm({ ...bankAccountForm, accountNumber: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                    IBAN Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PK64MEZN0001020304050607"
                    value={bankAccountForm.iban}
                    onChange={e => setBankAccountForm({ ...bankAccountForm, iban: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Branch Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0102"
                    value={bankAccountForm.branchCode || ''}
                    onChange={e => setBankAccountForm({ ...bankAccountForm, branchCode: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Branch Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Clifton Branch, Karachi"
                    value={bankAccountForm.branchName || ''}
                    onChange={e => setBankAccountForm({ ...bankAccountForm, branchName: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <FileUploadField
                label="Bank Account QR Code Image"
                value={bankAccountForm.qrCodeImageUrl || ''}
                onChange={url => setBankAccountForm({ ...bankAccountForm, qrCodeImageUrl: url })}
                type="qrcode"
                entityName={bankAccountForm.bankName}
                entityId={bankAccountForm.id}
                placeholder="Upload QR code image or enter image URL..."
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Transfer Instructions for Buyer
                </label>
                <textarea
                  rows={2}
                  value={bankAccountForm.instructions || ''}
                  onChange={e => setBankAccountForm({ ...bankAccountForm, instructions: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              {/* Maintenance Notification Section */}
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '1rem', marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fca5a5', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>⚠️ Bank Channel Maintenance & Downtime Notification</span>
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                  If bank channels or 1Link are undergoing maintenance, enter a description and optional time window. When active, authorized buyers cannot select seats until maintenance completes. Leave description empty for normal smooth bookings.
                </p>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Maintenance Notice / Description (Leave empty if channels are operational)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Bank 1Link channel is undergoing scheduled maintenance from 02:00 AM to 05:00 AM. Ticket bookings are temporarily paused."
                    value={bankAccountForm.maintenanceNotice || ''}
                    onChange={e => setBankAccountForm({ ...bankAccountForm, maintenanceNotice: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fff', fontSize: '0.82rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
                      Maintenance Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={bankAccountForm.maintenanceStartUtc || ''}
                      onChange={e => setBankAccountForm({ ...bankAccountForm, maintenanceStartUtc: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
                      Maintenance End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={bankAccountForm.maintenanceEndUtc || ''}
                      onChange={e => setBankAccountForm({ ...bankAccountForm, maintenanceEndUtc: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="acc-maintenance-force"
                    checked={bankAccountForm.isMaintenanceMode}
                    onChange={e => setBankAccountForm({ ...bankAccountForm, isMaintenanceMode: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#ef4444' }}
                  />
                  <label htmlFor="acc-maintenance-force" style={{ color: '#fca5a5', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                    Force Enable Maintenance Mode Now (Pauses seat booking immediately)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="acc-active"
                  checked={bankAccountForm.isActive}
                  onChange={e => setBankAccountForm({ ...bankAccountForm, isActive: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#0d9488' }}
                />
                <label htmlFor="acc-active" style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  Set as Active Account for Checkout
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowBankAccountModal(false)} className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    fontWeight: 700,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Saving Bank Account...
                    </>
                  ) : (
                    bankAccountForm.id ? 'Save Changes' : 'Create Bank Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* --- ADMIN DIGITAL TICKET PREVIEW MODAL --- */}
      {adminPreviewTicket && (
        <DigitalTicketModal
          ticket={adminPreviewTicket}
          onClose={() => setAdminPreviewTicket(null)}
        />
      )}

      {/* --- BLUEPRINT PREVIEW MODAL --- */}
      {previewAuditorium && (() => {
        const pVenue = previewAuditorium.venueName || venuesList.find(v => v.id === previewAuditorium.venueId)?.name || previewAuditorium.venue || '';
        const pCityObj = citiesList.find(c => c.id === venuesList.find(v => v.id === previewAuditorium.venueId)?.cityId);
        const pCity = pCityObj?.name || previewAuditorium.city || '';
        const pCountry = pCityObj?.countryName || countriesList.find(co => co.id === pCityObj?.countryId)?.name || '';
        const pLocation = [pVenue, pCity, pCountry].filter(Boolean).join(', ');
        return (
          <InteractiveSeatPicker
            isPreview={true}
            event={{
              id: 'preview-' + previewAuditorium.id,
              title: `${previewAuditorium.name} (Blueprint Preview)`,
              venue: pLocation || previewAuditorium.name,
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
        );
      })()}
    </div>
  );
}
