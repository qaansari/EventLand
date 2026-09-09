export const JWT_STORAGE_KEY = 'eventland_jwt_token';
export const USER_STORAGE_KEY = 'eventland_logged_user';

/**
 * Retrieves the stored JWT token.
 * @returns {string|null}
 */
export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(JWT_STORAGE_KEY);
}

/**
 * Retrieves the stored user profile.
 * @returns {object|null}
 */
export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Persists session token and user profile in storage.
 * @param {string} token 
 * @param {object} user 
 */
export function setStoredSession(token, user) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(JWT_STORAGE_KEY, token);
  if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

/**
 * Clears the stored session credentials.
 */
export function clearStoredSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(JWT_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Normalizes user role strings across backend and frontend conventions.
 * @param {string|null} role 
 * @returns {'admin'|'organizer'|'customer'}
 */
export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return 'customer';
  const clean = role.trim().toLowerCase();
  if (clean.includes('admin')) return 'admin';
  if (clean.includes('organizer')) return 'organizer';
  return 'customer';
}

/**
 * Checks if user has administrative privileges.
 * @param {object|null} user 
 * @returns {boolean}
 */
export function isAdmin(user) {
  if (!user) return false;
  return normalizeRole(user.role) === 'admin';
}

/**
 * Checks if user has organizer or administrative privileges.
 * @param {object|null} user 
 * @returns {boolean}
 */
export function isOrganizer(user) {
  if (!user) return false;
  const role = normalizeRole(user.role);
  return role === 'organizer' || role === 'admin';
}
