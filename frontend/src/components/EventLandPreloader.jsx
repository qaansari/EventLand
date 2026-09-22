import React from 'react';

/**
 * EventLandPreloader - Signature Branded Preloader
 * Designed directly from the EventLand logo (/logo-icon.png, brand wordmark, emerald/teal glow & golden accents).
 *
 * @param {boolean} fullScreen - Renders as a full-viewport backdrop overlay
 * @param {string} text - Optional status/progress message
 * @param {boolean} compact - Compact variant for cards/modals
 * @param {string} minHeight - CSS minHeight when rendered inline
 * @param {string} className - Optional additional CSS class
 * @param {object} style - Optional container inline styles
 */
export default function EventLandPreloader({
  fullScreen = false,
  text = 'Discover • Book • Experience',
  compact = false,
  minHeight = '320px',
  className = '',
  style = {}
}) {
  const content = (
    <div className={`eventland-preloader-inner ${compact ? 'preloader-compact' : ''}`}>
      {/* Central Logo Ring with Orbiting Glow */}
      <div className="eventland-preloader-emblem">
        {/* Ambient Glow Aura */}
        <div className="preloader-ambient-glow" />

        {/* Outer Orbiting Conic/Neon Ring */}
        <div className="preloader-orbit-ring" />

        {/* Reverse Inner Dashed Ring */}
        <div className="preloader-inner-ring" />

        {/* Central Logo Badge */}
        <div className="preloader-logo-badge">
          <img
            src="/logo-icon.png"
            alt="EventLand Logo"
            className="preloader-logo-img"
          />
        </div>
      </div>

      {/* Brand Wordmark & Tagline */}
      <div className="preloader-brand-wrapper">
        <div className="preloader-brand-title">
          Event <span className="preloader-brand-highlight">Land</span>
        </div>
        <div className="preloader-brand-tagline">
          DISCOVER | BOOK | EXPERIENCE
        </div>
      </div>

      {/* Futuristic Progress Energy Bar */}
      <div className="preloader-track">
        <div className="preloader-bar" />
      </div>

      {/* Dynamic Status Text */}
      {text && (
        <div className="preloader-status-text">
          {text}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={`eventland-preloader-fullscreen ${className}`}
        style={style}
        role="status"
        aria-live="polite"
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={`eventland-preloader-container ${className}`}
      style={{ minHeight, ...style }}
      role="status"
      aria-live="polite"
    >
      {content}
    </div>
  );
}
