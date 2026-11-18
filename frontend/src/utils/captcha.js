// Safe helper utilities for Cloudflare Turnstile bot verification
// Note: Client-side sessionStorage persistence was removed in Phase 4 (Audit #12)
// to prevent trivial spoofing. Captcha tokens are now single-use and authoritative on the server.

export const isCaptchaVerified = () => {
  return false;
};

export const getStoredCaptchaToken = () => {
  return '';
};

export const setCaptchaVerified = () => {
  // Deprecated in Phase 4 - handled through CaptchaContext
};

export const clearCaptchaVerified = () => {
  // Deprecated in Phase 4 - handled through CaptchaContext
};
