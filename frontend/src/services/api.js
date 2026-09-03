const rawBackend = (import.meta.env.VITE_BACKEND_URL || '').trim();
const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();

// Failsafe: If running on remote host (Vercel) but env var points to localhost, fallback to ngrok URL
const isProductionDomain = typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && window.location.hostname !== '127.0.0.1';

export const BACKEND_URL = (isProductionDomain && (!rawBackend || rawBackend.includes('localhost')))
  ? 'https://celiac-briley-commandingly.ngrok-free.dev'
  : (rawBackend || 'https://celiac-briley-commandingly.ngrok-free.dev');

export const BASE_URL = (isProductionDomain && (!rawApiUrl || rawApiUrl.includes('localhost')))
  ? `${BACKEND_URL}/api`
  : (rawApiUrl || `${BACKEND_URL}/api`);

export const SERVER_BASE = BASE_URL.replace(/\/api\/?$/, '') || BACKEND_URL;

export function getOrganizerImageUrl(logoUrl) {
  if (!logoUrl) return '';
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) return logoUrl;
  const fileName = logoUrl.split('/').pop().split('\\').pop();
  return `${SERVER_BASE}/assets/images/organizers/${fileName}`;
}

export function getEventImageUrl(bannerUrl) {
  if (!bannerUrl) return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=500&fit=crop';
  if (bannerUrl.startsWith('http://') || bannerUrl.startsWith('https://')) return bannerUrl;
  const fileName = bannerUrl.split('/').pop().split('\\').pop();
  return `${SERVER_BASE}/assets/images/events/${fileName}`;
}

export function getUserImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  const fileName = imageUrl.split('/').pop().split('\\').pop();
  return `${SERVER_BASE}/assets/images/users/${fileName}`;
}

export function getPaymentSlipUrl(slipUrl) {
  if (!slipUrl) return '';
  if (slipUrl.startsWith('http://') || slipUrl.startsWith('https://')) return slipUrl;
  const fileName = slipUrl.split('/').pop().split('\\').pop();
  return `${SERVER_BASE}/assets/images/slips/${fileName}`;
}

export function getQrCodeImageUrl(qrUrl) {
  if (!qrUrl) return '';
  if (qrUrl.startsWith('http://') || qrUrl.startsWith('https://') || qrUrl.startsWith('data:image/') || qrUrl.startsWith('blob:')) return qrUrl;
  if (qrUrl.startsWith('/assets/')) return `${SERVER_BASE}${qrUrl}`;
  const fileName = qrUrl.split('/').pop().split('\\').pop();
  return `${SERVER_BASE}/assets/images/qr_codes/${fileName}`;
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('eventland_jwt_token');

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    let errorText = 'API Request Failed';
    try {
      const rawText = await response.text();
      try {
        const errJson = JSON.parse(rawText);
        if (errJson.errors && typeof errJson.errors === 'object') {
          const errorMessages = Object.entries(errJson.errors)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          errorText = errorMessages || errJson.title || errorText;
        } else {
          errorText = errJson.message || errJson.title || (typeof errJson === 'string' ? errJson : rawText);
        }
      } catch {
        errorText = rawText || `Error ${response.status}`;
      }
    } catch {
      errorText = `Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorText || `Error ${response.status}`);
  }

  if (response.status === 204) return true;
  return await response.json();
}

// --- Auth API ---
export const authApi = {
  login: async (email, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      localStorage.setItem('eventland_jwt_token', data.token);
    }
    return data;
  },
  register: async (fullName, email, password, phoneNumber = null, countryId = null) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password, phoneNumber, countryId })
    });
    if (data.token) {
      localStorage.setItem('eventland_jwt_token', data.token);
    }
    return data;
  },
  getMe: async () => request('/auth/me'),
  changePassword: async (oldPassword, newPassword) => request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword })
  })
};

// --- Public Events API ---
export const eventsApi = {
  getEvents: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.city && params.city !== 'All Cities') query.append('city', params.city);
    if (params.search) query.append('search', params.search);
    if (params.tag) query.append('tag', params.tag);
    if (params.pageNumber) query.append('pageNumber', params.pageNumber);
    if (params.pageSize) query.append('pageSize', params.pageSize);

    const queryString = query.toString();
    return request(`/events${queryString ? `?${queryString}` : ''}`);
  },
  getEventById: async (identifier) => request(`/events/${encodeURIComponent(identifier)}`)
};

export function toEventSlug(event) {
  if (!event) return '';
  const rawTitle = typeof event === 'object' ? (event.title || event.name || '') : String(event);
  const rawId = typeof event === 'object' ? event.id : event;

  const cleanTitle = String(rawTitle)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  if (!cleanTitle) {
    return `event-${rawId}`;
  }

  return rawId ? `${cleanTitle}-${rawId}` : cleanTitle;
}

// --- Public Artists API ---
export const artistsApi = {
  getArtists: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.featured !== undefined) query.append('featured', params.featured);
    if (params.pageNumber) query.append('pageNumber', params.pageNumber);
    if (params.pageSize) query.append('pageSize', params.pageSize);

    const queryString = query.toString();
    return request(`/artists${queryString ? `?${queryString}` : ''}`);
  },
  getArtistById: async (id) => request(`/artists/${id}`)
};

// --- Public Bookings API ---
export const bookingsApi = {
  createBooking: async (dto) => request('/bookings', {
    method: 'POST',
    body: JSON.stringify(dto)
  }),
  getBookingById: async (id) => request(`/bookings/${id}`),
  getBookingByRef: async (ref) => request(`/bookings/ref/${ref}`),
  getBookingsByEmail: async (email, pageNumber = 1, pageSize = 10) => request(`/bookings/user/${email}?pageNumber=${pageNumber}&pageSize=${pageSize}`),
  submitPaymentProof: async (id, dto) => request(`/bookings/${id}/submit-proof`, {
    method: 'POST',
    body: JSON.stringify(dto)
  }),
  confirmBankPayment: async (id, dto = {}) => request(`/bookings/${id}/confirm-bank-payment`, {
    method: 'POST',
    body: JSON.stringify(dto)
  }),
  rejectBankPayment: async (id, dto = {}) => request(`/bookings/${id}/reject-bank-payment`, {
    method: 'POST',
    body: JSON.stringify(dto)
  })
};

// --- Seat Hold API ---
export const seatHoldApi = {
  holdSeats: async (eventId, seatIds, customerEmail, eventShowId = null) => request('/seatHold/hold', {
    method: 'POST',
    body: JSON.stringify({ eventId, seatIds, customerEmail, eventShowId })
  }),
  releaseSeats: async (eventId, seatIds, eventShowId = null) => request('/seatHold/release', {
    method: 'POST',
    body: JSON.stringify({ eventId, seatIds, eventShowId })
  }),
  getHeldSeats: async (eventId, showId = null) => request(`/seatHold/event/${eventId}${showId ? `?showId=${showId}` : ''}`)
};

// --- Admin API Suite ---
export const adminApi = {
  events: {
    getAll: async (pageNumber = 1, pageSize = 10) => request(`/admin/events?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    getById: async (id) => request(`/admin/events/${id}`),
    create: async (dto) => request('/admin/events', { method: 'POST', body: JSON.stringify(dto) }),
    update: async (id, dto) => request(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: async (id) => request(`/admin/events/${id}`, { method: 'DELETE' })
  },
  eventShows: {
    create: async (dto) => request('/admin/event-shows', { method: 'POST', body: JSON.stringify(dto) }),
    update: async (id, dto) => request(`/admin/event-shows/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: async (id) => request(`/admin/event-shows/${id}`, { method: 'DELETE' })
  },
  organizers: {
    getAll: async () => request('/admin/organizers'),
    getById: async (id) => request(`/admin/organizers/${id}`),
    create: async (dto) => request('/admin/organizers', { method: 'POST', body: JSON.stringify(dto) }),
    update: async (id, dto) => request(`/admin/organizers/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: async (id) => request(`/admin/organizers/${id}`, { method: 'DELETE' })
  },
  ticketTiers: {
    create: async (dto) => request('/admin/ticket-tiers', { method: 'POST', body: JSON.stringify(dto) }),
    update: async (id, dto) => request(`/admin/ticket-tiers/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: async (id) => request(`/admin/ticket-tiers/${id}`, { method: 'DELETE' })
  },
  seatingZones: {
    create: async (dto) => request('/admin/seating-zones', { method: 'POST', body: JSON.stringify(dto) }),
    update: async (id, dto) => request(`/admin/seating-zones/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: async (id) => request(`/admin/seating-zones/${id}`, { method: 'DELETE' })
  },
  bookings: {
    getAll: async (pageNumber = 1, pageSize = 10, eventId = null, search = null) => {
      const query = new URLSearchParams({ pageNumber, pageSize });
      if (eventId) query.append('eventId', eventId);
      if (search) query.append('search', search);
      return request(`/admin/bookings?${query.toString()}`);
    },
    getById: async (id) => request(`/admin/bookings/${id}`),
    updateStatus: async (id, status, paymentStatus) => request(`/admin/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, paymentStatus })
    }),
    delete: async (id) => request(`/admin/bookings/${id}`, { method: 'DELETE' })
  },
  artists: {
    getAll: async (pageNumber = 1, pageSize = 10) => request(`/admin/artists?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    getById: async (id) => request(`/admin/artists/${id}`),
    create: async (dto) => request('/admin/artists', { method: 'POST', body: JSON.stringify(dto) }),
    update: async (id, dto) => request(`/admin/artists/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: async (id) => request(`/admin/artists/${id}`, { method: 'DELETE' })
  },
  tags: {
    getAll: async () => request('/admin/tags'),
    create: async (dto) => request('/admin/tags', { method: 'POST', body: JSON.stringify(dto) }),
    update: async (id, dto) => request(`/admin/tags/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: async (id) => request(`/admin/tags/${id}`, { method: 'DELETE' })
  },
  users: {
    getAll: async (pageNumber = 1, pageSize = 10) => request(`/admin/users?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    getById: async (id) => request(`/admin/users/${id}`),
    create: async (dto) => request('/admin/users', { method: 'POST', body: JSON.stringify(dto) }),
    update: async (id, dto) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: async (id) => request(`/admin/users/${id}`, { method: 'DELETE' })
  },
  roles: {
    getAll: async () => request('/admin/roles'),
    create: async (dto) => request('/admin/roles', { method: 'POST', body: JSON.stringify(dto) }),
    update: async (id, dto) => request(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: async (id) => request(`/admin/roles/${id}`, { method: 'DELETE' })
  },
  auditoriumLayouts: {
    getAll: async () => request('/admin/auditorium-layouts'),
    getById: async (id) => request(`/admin/auditorium-layouts/${id}`),
    create: async (dto) => request('/admin/auditorium-layouts', { method: 'POST', body: JSON.stringify(dto) }),
    update: async (id, dto) => request(`/admin/auditorium-layouts/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: async (id) => request(`/admin/auditorium-layouts/${id}`, { method: 'DELETE' })
  }
};

// --- Public Auditorium Layouts API ---
export const auditoriumLayoutsApi = {
  getAll: async () => request('/auditorium-layouts'),
  getById: async (id) => request(`/auditorium-layouts/${id}`)
};

// --- Public Locations & Admin Locations API ---
export const locationsApi = {
  getCountries: async () => request('/countries'),
  createCountry: async (dto) => request('/countries', { method: 'POST', body: JSON.stringify(dto) }),
  updateCountry: async (id, dto) => request(`/countries/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deleteCountry: async (id) => request(`/countries/${id}`, { method: 'DELETE' }),

  getCities: async (countryId = null) => request(`/cities${countryId ? `?countryId=${countryId}` : ''}`),
  createCity: async (dto) => request('/cities', { method: 'POST', body: JSON.stringify(dto) }),
  updateCity: async (id, dto) => request(`/cities/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deleteCity: async (id) => request(`/cities/${id}`, { method: 'DELETE' }),

  getVenues: async (cityId = null) => request(`/venues${cityId ? `?cityId=${cityId}` : ''}`),
  createVenue: async (dto) => request('/venues', { method: 'POST', body: JSON.stringify(dto) }),
  updateVenue: async (id, dto) => request(`/venues/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deleteVenue: async (id) => request(`/venues/${id}`, { method: 'DELETE' }),

  getAuditoriums: async (venueId = null) => request(`/auditoriums${venueId ? `?venueId=${venueId}` : ''}`),
  getAuditoriumById: async (id) => request(`/auditoriums/${id}`),
  createAuditorium: async (dto) => request('/auditoriums', { method: 'POST', body: JSON.stringify(dto) }),
  updateAuditorium: async (id, dto) => request(`/auditoriums/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deleteAuditorium: async (id) => request(`/auditoriums/${id}`, { method: 'DELETE' })
};

// --- Public Tags API ---
export const tagsApi = {
  getAll: async () => request('/tags')
};

// --- Payments & Refunds API ---
export const paymentsApi = {
  getPaymentStatus: async (bookingRef) => request(`/payments/status/${bookingRef}`),
  processRefund: async (dto) => request('/payments/refund', { method: 'POST', body: JSON.stringify(dto) })
};

// --- File & Image Upload API ---
export const uploadApi = {
  uploadFile: async (file, type = 'events', name = null, id = null) => {
    const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';
    if (!['webp', 'jpg', 'jpeg', 'png'].includes(ext)) {
      throw new Error(`Unsupported file extension .${ext}. Only webp, jpg, and png images are allowed.`);
    }

    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('eventland_jwt_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const query = new URLSearchParams({ type });
    if (name) query.append('name', name);
    if (id) query.append('id', id);

    const response = await fetch(`${BASE_URL}/upload?${query.toString()}`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      let errText = 'Upload failed';
      try {
        const json = await response.json();
        errText = json.message || errText;
      } catch {
        // Ignore malformed non-JSON responses and fall back to the base error.
      }
      throw new Error(errText);
    }
    return await response.json();
  }
};

// --- FAQs & Footer APIs ---
export const faqsApi = {
  getAll: async () => request('/faqs'),
  adminGetAll: async () => request('/admin/faqs'),
  create: async (dto) => request('/admin/faqs', { method: 'POST', body: JSON.stringify(dto) }),
  update: async (id, dto) => request(`/admin/faqs/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: async (id) => request(`/admin/faqs/${id}`, { method: 'DELETE' })
};

export const footerApi = {
  get: async () => request('/footer'),
  update: async (dto) => request('/footer', { method: 'PUT', body: JSON.stringify(dto) })
};

// --- Bank Accounts API (Public & Super Admin) ---
export const bankAccountsApi = {
  getActive: async () => request('/bank-accounts/active'),
  adminGetAll: async () => request('/admin/bank-accounts'),
  adminGetById: async (id) => request(`/admin/bank-accounts/${id}`),
  adminCreate: async (dto) => request('/admin/bank-accounts', { method: 'POST', body: JSON.stringify(dto) }),
  adminUpdate: async (id, dto) => request(`/admin/bank-accounts/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  adminDelete: async (id) => request(`/admin/bank-accounts/${id}`, { method: 'DELETE' }),
  adminToggleActive: async (id) => request(`/admin/bank-accounts/${id}/toggle-active`, { method: 'PUT' })
};

// --- Phone Number Dialing Code Helpers ---
export const formatPhoneNumberOnSubmit = (rawPhone, dialingCode) => {
  if (!rawPhone || !rawPhone.trim()) return null;
  let clean = rawPhone.trim();
  // Trim leading zero if present
  if (clean.startsWith('0')) {
    clean = clean.substring(1).trim();
  }
  const prefix = dialingCode ? dialingCode.trim() : '+92';
  if (clean.startsWith(prefix)) {
    return clean;
  }
  return `${prefix} ${clean}`;
};

export const splitPhoneNumberForEdit = (fullPhone, countryList = [], countryId = null) => {
  if (!fullPhone) return { dialingCode: '+92', nationalNumber: '', countryId: countryId || 1 };

  let clean = fullPhone.trim();
  let foundCountry = countryList.find(c => c.id === countryId);
  let dialingCode = foundCountry?.dialingCode || '+92';

  if (!foundCountry) {
    foundCountry = countryList.find(c => c.dialingCode && clean.startsWith(c.dialingCode));
    if (foundCountry) {
      dialingCode = foundCountry.dialingCode;
    }
  }

  if (dialingCode && clean.startsWith(dialingCode)) {
    clean = clean.slice(dialingCode.length).trim();
  }

  return {
    dialingCode,
    nationalNumber: clean,
    countryId: foundCountry?.id || countryId || 1
  };
};


