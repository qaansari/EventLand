// Reusable captcha verification state management across EventLand
const STORAGE_KEY_VERIFIED = 'eventland_captcha_verified';
const STORAGE_KEY_TOKEN = 'eventland_captcha_token';

export const isCaptchaVerified = () => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(STORAGE_KEY_VERIFIED) === 'true';
};

export const getStoredCaptchaToken = () => {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(STORAGE_KEY_TOKEN) || '';
};

export const setCaptchaVerified = (token) => {
  if (typeof window === 'undefined') return;
  const validToken = token || `verified-${Date.now()}`;
  sessionStorage.setItem(STORAGE_KEY_VERIFIED, 'true');
  sessionStorage.setItem(STORAGE_KEY_TOKEN, validToken);
  window.dispatchEvent(new CustomEvent('eventland:captcha-verified', { detail: { token: validToken } }));
};

export const clearCaptchaVerified = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY_VERIFIED);
  sessionStorage.removeItem(STORAGE_KEY_TOKEN);
  window.dispatchEvent(new CustomEvent('eventland:captcha-reset'));
};
