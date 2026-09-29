import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, Info, HelpCircle, CheckCircle2, Trash2, X } from 'lucide-react';

export default function ConfirmationModal({ isOpen, options, onConfirm, onCancel }) {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const inputRef = useRef(null);
  const confirmBtnRef = useRef(null);

  const {
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    description = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary', // 'danger' | 'warning' | 'primary' | 'info' | 'success'
    isPrompt = false,
    isAlert = false,
    defaultValue = '',
    placeholder = '',
    inputLabel = '',
    required = false,
  } = options || {};

  // Reset or populate input when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isPrompt) {
        setInputValue(defaultValue || '');
        setInputError('');
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, 80);
      } else {
        setTimeout(() => {
          if (confirmBtnRef.current) {
            confirmBtnRef.current.focus();
          }
        }, 80);
      }
    }
  }, [isOpen, isPrompt, defaultValue]);

  // Handle keyboard events (Escape to cancel, Enter to submit prompt)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (isPrompt) {
      if (required && !inputValue.trim()) {
        setInputError('This field cannot be empty.');
        if (inputRef.current) inputRef.current.focus();
        return;
      }
      onConfirm(inputValue);
    } else {
      onConfirm(true);
    }
  };

  const handlePromptKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirmClick();
    }
  };

  // Color & Icon Theme Mapping
  const themeConfig = {
    danger: {
      icon: /delete|remove|trash|purge/i.test(`${title} ${message}`) ? Trash2 : AlertTriangle,
      accentColor: '#ef4444',
      glowColor: 'rgba(239, 68, 68, 0.35)',
      btnClass: 'btn-danger',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      badgeBorder: 'rgba(239, 68, 68, 0.35)',
      confirmBtnBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      confirmBtnShadow: '0 4px 14px rgba(239, 68, 68, 0.45)',
    },
    warning: {
      icon: AlertTriangle,
      accentColor: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.25)',
      btnClass: 'btn-warning',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeBorder: 'rgba(245, 158, 11, 0.35)',
      confirmBtnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      confirmBtnShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
    },
    success: {
      icon: CheckCircle2,
      accentColor: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.25)',
      btnClass: 'btn-success',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeBorder: 'rgba(16, 185, 129, 0.35)',
      confirmBtnBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      confirmBtnShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
    },
    info: {
      icon: Info,
      accentColor: '#38bdf8',
      glowColor: 'rgba(56, 189, 248, 0.25)',
      btnClass: 'btn-info',
      badgeBg: 'rgba(56, 189, 248, 0.15)',
      badgeBorder: 'rgba(56, 189, 248, 0.35)',
      confirmBtnBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      confirmBtnShadow: '0 4px 14px rgba(56, 189, 248, 0.4)',
    },
    primary: {
      icon: HelpCircle,
      accentColor: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.25)',
      btnClass: 'btn-primary',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeBorder: 'rgba(16, 185, 129, 0.35)',
      confirmBtnBg: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
      confirmBtnShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
    },
  };

  const theme = themeConfig[variant] || themeConfig.primary;
  const IconComponent = options?.icon || theme.icon;

  return (
    <div
      className="modal-overlay modal fade show modal-dialog-centered"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-body"
      style={{
        zIndex: 11000,
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '1rem',
      }}
      onClick={(e) => {
        // Dismiss on clicking backdrop outside modal content
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        role="document"
        style={{
          width: '100%',
          maxWidth: isPrompt ? '520px' : '460px',
          margin: '0 auto',
          transform: 'translate(0, 0)',
          animation: 'confirmModalScale 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div
          className="modal-content glass-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(165deg, rgba(17, 24, 39, 0.96) 0%, rgba(10, 15, 29, 0.98) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '1.25rem',
            boxShadow: `0 24px 60px -12px rgba(0, 0, 0, 0.8), 0 0 28px ${theme.glowColor}`,
            overflow: 'hidden',
            color: '#f8fafc',
            position: 'relative',
          }}
        >
          {/* Subtle top accent bar */}
          <div
            style={{
              height: '3px',
              width: '100%',
              background: `linear-gradient(90deg, transparent, ${theme.accentColor}, transparent)`,
            }}
          />

          {/* Modal Header */}
          <div
            className="modal-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem 0.75rem',
              borderBottom: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: theme.badgeBg,
                  border: `1px solid ${theme.badgeBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.accentColor,
                  flexShrink: 0,
                  boxShadow: `0 0 16px ${theme.glowColor}`,
                }}
              >
                <IconComponent size={22} />
              </div>
              <h5
                id="confirm-modal-title"
                className="modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: '#ffffff',
                }}
              >
                {title}
              </h5>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onCancel}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Modal Body */}
          <div
            id="confirm-modal-body"
            className="modal-body"
            style={{
              padding: '0.75rem 1.5rem 1.25rem',
              color: '#cbd5e1',
              fontSize: '0.95rem',
              lineHeight: 1.55,
            }}
          >
            <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 500, wordBreak: 'break-word' }}>
              {message}
            </p>

            {description && (
              <p
                style={{
                  marginTop: '0.65rem',
                  marginBottom: 0,
                  fontSize: '0.85rem',
                  color: '#94a3b8',
                  lineHeight: 1.45,
                }}
              >
                {description}
              </p>
            )}

            {isPrompt && (
              <div style={{ marginTop: '1.1rem' }}>
                {inputLabel && (
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#94a3b8',
                      marginBottom: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {inputLabel} {required && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  className="form-control"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (inputError) setInputError('');
                  }}
                  onKeyDown={handlePromptKeyDown}
                  placeholder={placeholder}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.95rem',
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: inputError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '0.925rem',
                    outline: 'none',
                    boxShadow: inputError ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    if (!inputError) {
                      e.target.style.borderColor = theme.accentColor;
                      e.target.style.boxShadow = `0 0 0 3px ${theme.glowColor}`;
                    }
                  }}
                  onBlur={(e) => {
                    if (!inputError) {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                />
                {inputError && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.35rem', fontWeight: 500 }}>
                    {inputError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            className="modal-footer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              padding: '1rem 1.5rem 1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            {!isAlert && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.13)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                {cancelText}
              </button>
            )}

            <button
              ref={confirmBtnRef}
              type="button"
              className={`btn ${theme.btnClass}`}
              onClick={handleConfirmClick}
              style={{
                padding: '0.625rem 1.45rem',
                borderRadius: '10px',
                background: theme.confirmBtnBg,
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: theme.confirmBtnShadow,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes confirmModalScale {
          0% {
            opacity: 0;
            transform: scale(0.94) translateY(8px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
