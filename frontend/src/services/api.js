export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4257';
export const BASE_URL = import.meta.env.VITE_API_URL || `${BACKEND_URL}/api`;
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

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('eventland_jwt_token');

  const headers = {
    'Content-Type': 'application/json',
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
      const errJson = await response.json();
      if (errJson.errors && typeof errJson.errors === 'object') {
        const errorMessages = Object.entries(errJson.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ');
        errorText = errorMessages || errJson.title || errorText;
      } else {
        errorText = errJson.message || errJson.title || JSON.stringify(errJson);
      }
    } catch {
      errorText = await response.text();
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
  getMe: async () => request('/auth/me')
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
  getEventById: async (id) => request(`/events/${id}`)
};

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
  getBookingsByEmail: async (email, pageNumber = 1, pageSize = 10) => request(`/bookings/user/${email}?pageNumber=${pageNumber}&pageSize=${pageSize}`)
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
    create: async (dto) => request('/admin/events', { method: 'POST', body: JSON.stringify(dto) }),
    update: async (id, dto) => request(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: async (id) => request(`/admin/events/${id}`, { method: 'DELETE' })
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

    const response = await fetch(`/api/upload?${query.toString()}`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      let errText = 'Upload failed';
      try {
        const json = await response.json();
        errText = json.message || errText;
      } catch {}
      throw new Error(errText);
    }
    return await response.json();
  }
};

