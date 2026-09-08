/**
 * DOMPurify wrapper for sanitizing HTML content to prevent XSS attacks
 */
import DOMPurify from 'dompurify';

// Configure DOMPurify with secure defaults
DOMPurify.setConfig({
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'blockquote', 'code', 'pre'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'title', 'class', 'id'],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?):)/i,
  ADD_TAGS: ['mark'],
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'script', 'style', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur']
});

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param {string} dirty - The raw HTML string to sanitize
 * @returns {string} - Sanitized HTML string
 */
export function sanitizeHTML(dirty) {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(dirty);
}

/**
 * Sanitize text content (escape HTML entities)
 * @param {string} text - The raw text to sanitize
 * @returns {string} - Escaped text safe for rendering
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validate and sanitize URL to prevent javascript: protocol attacks
 * @param {string} url - The URL to validate
 * @returns {string|null} - Sanitized URL or null if invalid
 */
export function sanitizeURL(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  const trimmed = url.trim();
  
  // Allow relative URLs
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }
  
  // Only allow http/https protocols
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    // If URL parsing fails, check if it's a valid relative path
    if (!trimmed.includes(':')) {
      return trimmed;
    }
  }
  
  return null;
}

export default DOMPurify;
