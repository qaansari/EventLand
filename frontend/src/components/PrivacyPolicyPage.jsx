import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  UserCheck,
  CreditCard,
  QrCode,
  Database,
  Trash2,
  Cookie,
  Mail,
  ArrowLeft,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Info,
  Calendar,
  Layers,
  Sparkles,
  FileCheck
} from 'lucide-react';

export default function PrivacyPolicyPage({ onBack }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Privacy Policy | EventLand Pakistan';
    return () => {
      document.title = 'EventLand - Pakistan Events & Ticket Booking';
    };
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@eventland.pk');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const sections = [
    { id: 'overview', title: '1. Overview & Scope', icon: Info },
    { id: 'information-collected', title: '2. Information We Collect', icon: Database },
    { id: 'social-logins', title: '3. Google & Meta (Facebook) Logins', icon: UserCheck },
    { id: 'how-we-use', title: '4. How We Use Your Data', icon: Layers },
    { id: 'payment-security', title: '5. Payment & Financial Data', icon: CreditCard },
    { id: 'qr-ticketing', title: '6. QR Gate Pass & Verification', icon: QrCode },
    { id: 'data-sharing', title: '7. Third-Party Sharing', icon: ExternalLink },
    { id: 'data-deletion', title: '8. Facebook Data Deletion Instructions', icon: Trash2 },
    { id: 'cookies-storage', title: '9. Cookies & Local Storage', icon: Cookie },
    { id: 'security-retention', title: '10. Security & Retention', icon: Lock },
    { id: 'your-rights', title: '11. Your Rights & Choices', icon: Shield },
    { id: 'contact-us', title: '12. Contact & Grievances', icon: Mail },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#040911',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(13, 148, 136, 0.15) 0%, transparent 70%), radial-gradient(ellipse at 85% 30%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)',
      color: '#cbd5e1',
      fontFamily: 'var(--font-body, "Poppins", -apple-system, sans-serif)',
      paddingBottom: '5rem'
    }}>
      {/* Hero Header */}
      <header style={{
        borderBottom: '1px solid rgba(13, 148, 136, 0.25)',
        background: 'linear-gradient(180deg, rgba(8, 20, 32, 0.95) 0%, rgba(4, 9, 17, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        paddingTop: '2.5rem',
        paddingBottom: '2.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative glow */}
        <div style={{
          position: 'absolute',
          top: '-40%',
          right: '10%',
          width: '400px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(45, 212, 191, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            {onBack && (
              <button
                onClick={onBack}
                type="button"
                className="btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'rgba(13, 148, 136, 0.15)',
                  border: '1px solid rgba(13, 148, 136, 0.35)',
                  color: '#2dd4bf',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(13, 148, 136, 0.3)';
                  e.currentTarget.style.transform = 'translateX(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(13, 148, 136, 0.15)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <ArrowLeft size={16} /> Back to Events
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={handlePrint}
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94a3b8',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                <Printer size={15} /> Print / Save PDF
              </button>

              <button
                onClick={handleCopyEmail}
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: copiedEmail ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: copiedEmail ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
                  color: copiedEmail ? '#34d399' : '#94a3b8',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {copiedEmail ? <Check size={15} /> : <Copy size={15} />}
                {copiedEmail ? 'Copied support@eventland.pk' : 'Copy Privacy Contact'}
              </button>
            </div>
          </div>

          <div style={{ maxWidth: '850px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(13, 148, 136, 0.15)', border: '1px solid rgba(45, 212, 191, 0.3)', borderRadius: '9999px', padding: '0.25rem 0.85rem', marginBottom: '1rem' }}>
              <Shield size={14} color="#2dd4bf" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: '#2dd4bf', textTransform: 'uppercase' }}>
                EventLand Data Protection & Legal Trust
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.2,
              marginBottom: '0.75rem'
            }}>
              Privacy Policy & Security Statement
            </h1>

            <p style={{
              fontSize: '1rem',
              lineHeight: 1.65,
              color: '#94a3b8',
              marginBottom: '1rem'
            }}>
              At EventLand (<strong style={{ color: '#f8fafc' }}>eventland.pk</strong>), we are committed to transparent, principled data privacy. This policy explains what information we gather, why we need it, how your transactions and QR gate passes are secured, and how you can exercise full control over your personal information—including Google and Meta (Facebook) social authentications.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#64748b' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={14} color="#0d9488" /> Effective Date: September 29, 2026
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={14} color="#d97706" /> Version: 2.4 (Compliant with Meta Platform Terms & Google Identity Standards)
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Highlights Bar */}
      <section style={{
        backgroundColor: 'rgba(10, 24, 38, 0.7)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '1.75rem 0'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              backgroundColor: 'rgba(13, 33, 46, 0.6)',
              border: '1px solid rgba(13, 148, 136, 0.25)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              gap: '0.85rem'
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserCheck size={20} color="#2dd4bf" />
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.2rem' }}>OAuth 2.0 Only</h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                  We never view or store passwords when signing in via Google or Facebook.
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(13, 33, 46, 0.6)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              gap: '0.85rem'
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CreditCard size={20} color="#34d399" />
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.2rem' }}>PCI-DSS Gateways</h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                  PayPro and 1Link handle financial details. We never hold credit card numbers.
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(13, 33, 46, 0.6)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              gap: '0.85rem'
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(217, 119, 6, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <QrCode size={20} color="#fbbf24" />
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.2rem' }}>HMAC Signed Passes</h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                  Event gate tickets are cryptographically validated to stop duplicate fraud.
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(13, 33, 46, 0.6)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              gap: '0.85rem'
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={20} color="#f87171" />
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.2rem' }}>Full Data Deletion</h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                  Clear instructions to purge Facebook app data or permanently delete your account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <main className="container" style={{ maxWidth: '1200px', margin: '2.5rem auto 0 auto', padding: '0 1.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: '2.5rem',
          alignItems: 'start'
        }}>
          {/* Main Article Container with Side Navigation */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '280px minmax(0, 1fr)',
            gap: '2.5rem',
            alignItems: 'start'
          }}>
            {/* Desktop Sticky Table of Contents */}
            <aside style={{
              position: 'sticky',
              top: '1.5rem',
              backgroundColor: 'rgba(10, 24, 38, 0.85)',
              border: '1px solid rgba(13, 148, 136, 0.25)',
              borderRadius: '16px',
              padding: '1.25rem',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <FileCheck size={18} color="#2dd4bf" />
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Contents
                </h3>
              </div>

              <nav aria-label="Table of contents" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {sections.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      style={{
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: isActive ? 600 : 400,
                        backgroundColor: isActive ? 'rgba(13, 148, 136, 0.2)' : 'transparent',
                        color: isActive ? '#2dd4bf' : '#94a3b8',
                        border: isActive ? '1px solid rgba(45, 212, 191, 0.3)' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                          e.currentTarget.style.color = '#fff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#94a3b8';
                        }
                      }}
                    >
                      <Icon size={14} color={isActive ? '#2dd4bf' : '#64748b'} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sec.title}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <a
                  href="#data-deletion"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('data-deletion');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 0.75rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '8px',
                    color: '#f87171',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <Trash2 size={14} /> Facebook Data Deletion
                </a>
              </div>
            </aside>

            {/* Document Content */}
            <article style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

              {/* Section 1: Overview */}
              <section id="overview" style={{
                backgroundColor: 'rgba(10, 24, 38, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Info size={18} color="#2dd4bf" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    1. Overview & Scope
                  </h2>
                </div>

                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                  EventLand (operated as <strong style={{ color: '#fff' }}>Event Land Pakistan</strong>, reachable at <strong style={{ color: '#2dd4bf' }}>https://eventland.pk</strong>) is an end-to-end ticketing, seating reservation, and event hosting service connecting event enthusiasts, verified performing artists, and organizers across Karachi, Lahore, Islamabad, and nationwide.
                </p>
                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1' }}>
                  This Privacy Policy applies to all users: event attendees purchasing digital gate passes, authorized artists, event organizers creating and managing tier allocations, and system administrators. By using our website, services, mobile interfaces, or purchasing passes, you consent to the information handling principles described in this statement.
                </p>
              </section>

              {/* Section 2: Information Collected */}
              <section id="information-collected" style={{
                backgroundColor: 'rgba(10, 24, 38, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={18} color="#2dd4bf" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    2. Information We Collect
                  </h2>
                </div>

                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '1.25rem' }}>
                  We collect only the minimum necessary data needed to confirm your identity, process your bookings, prevent gate fraud, and comply with tax and event venue requirements:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ backgroundColor: 'rgba(13, 30, 43, 0.7)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <h4 style={{ color: '#2dd4bf', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>Personal & Contact Details</h4>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.84rem', lineHeight: 1.6, color: '#94a3b8' }}>
                      <li>Full Legal Name</li>
                      <li>Email Address (used for digital PDF ticket delivery)</li>
                      <li>Phone / WhatsApp Number (used for SMS gate alerts & PayPro OTP verification)</li>
                      <li>City of residence</li>
                    </ul>
                  </div>

                  <div style={{ backgroundColor: 'rgba(13, 30, 43, 0.7)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <h4 style={{ color: '#34d399', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ticketing & Seat Allocations</h4>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.84rem', lineHeight: 1.6, color: '#94a3b8' }}>
                      <li>Event ID, show time, venue, and tier selected</li>
                      <li>Assigned seat row, seat number, and zone coordinates</li>
                      <li>Unique booking reference code (e.g., EVL-XXXXX)</li>
                      <li>Gate verification timestamps & scan logs</li>
                    </ul>
                  </div>

                  <div style={{ backgroundColor: 'rgba(13, 30, 43, 0.7)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <h4 style={{ color: '#fbbf24', fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>Technical & Device Metadata</h4>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.84rem', lineHeight: 1.6, color: '#94a3b8' }}>
                      <li>IP Address & rough geographic location (city level)</li>
                      <li>Browser type, user agent, and screen resolution</li>
                      <li>Cloudflare Turnstile bot verification clearance</li>
                      <li>Session tokens stored securely in browser storage</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3: Social Logins */}
              <section id="social-logins" style={{
                backgroundColor: 'rgba(10, 24, 38, 0.6)',
                border: '1px solid rgba(13, 148, 136, 0.25)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={18} color="#2dd4bf" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    3. Google & Meta (Facebook) Social Logins
                  </h2>
                </div>

                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '1.25rem' }}>
                  EventLand provides streamlined, one-click social authentication using Google Identity Services and Meta (Facebook) Graph OAuth. Here is how your social data is handled:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ backgroundColor: 'rgba(13, 30, 43, 0.7)', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #4285f4' }}>
                    <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#4285f4' }}>●</span> Google Identity Services (Google Sign-In)
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                      When you authenticate using Google, Google transmits a cryptographically signed JSON Web Token (JWT) directly to our backend API. Our server verifies the token’s authenticity against Google's public keys. We extract solely your <strong>Google Account ID</strong>, <strong>verified email address</strong>, <strong>display name</strong>, and optional avatar image. We do not request access to your Google Drive, contacts, calendar, or any Google services.
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'rgba(13, 30, 43, 0.7)', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #1877f2' }}>
                    <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#1877f2' }}>●</span> Meta (Facebook) Login
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                      When you authenticate via Facebook Login, EventLand requests only standard read permissions: <code style={{ color: '#2dd4bf', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>public_profile</code> and <code style={{ color: '#2dd4bf', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>email</code>. Our server exchanges the client authorization token directly with Meta Graph API (<code style={{ color: '#94a3b8' }}>graph.facebook.com/me</code>) over HTTPS. We store solely your <strong>Facebook User ID</strong>, <strong>name</strong>, and <strong>email</strong>. EventLand does NOT publish to your timeline, view your friends list, access private messages, or access financial data.
                    </p>
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(45, 212, 191, 0.08)', border: '1px dashed rgba(45, 212, 191, 0.3)', borderRadius: '10px', padding: '1rem', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                  <strong style={{ color: '#2dd4bf' }}>Security Guarantee:</strong> EventLand never receives or stores your Google or Facebook password. Account sessions are managed via short-lived, encrypted EventLand JWT bearer tokens.
                </div>
              </section>

              {/* Section 4: How We Use Data */}
              <section id="how-we-use" style={{
                backgroundColor: 'rgba(10, 24, 38, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={18} color="#2dd4bf" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    4. How We Use Your Data
                  </h2>
                </div>

                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                  We process personal data solely for legitimate, transparent purposes related to event management:
                </p>

                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: 1.7, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li><strong style={{ color: '#fff' }}>Digital Ticket Delivery:</strong> Generating and issuing your high-resolution E-Ticket and scannable gate pass.</li>
                  <li><strong style={{ color: '#fff' }}>Venue Capacity & Seating Management:</strong> Locking seats in realtime across concurrent buyers to prevent double-booking.</li>
                  <li><strong style={{ color: '#fff' }}>Transactional Notifications:</strong> Sending purchase confirmations, invoice reminders, gate access instructions, or emergency event rescheduling alerts.</li>
                  <li><strong style={{ color: '#fff' }}>Anti-Fraud & Ticket Verification:</strong> Verifying that only one entry is granted per issued QR code and validating against counterfeit passes.</li>
                  <li><strong style={{ color: '#fff' }}>Customer Support:</strong> Assisting you with booking queries, ticket re-issuance, or invoice reconciliation via phone or email.</li>
                </ul>
              </section>

              {/* Section 5: Payment Security */}
              <section id="payment-security" style={{
                backgroundColor: 'rgba(10, 24, 38, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={18} color="#34d399" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    5. Payment & Financial Data
                  </h2>
                </div>

                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                  EventLand partners with regulated payment gateways (including <strong style={{ color: '#fff' }}>PayPro Pakistan</strong>, 1Link Bill Payment, JazzCash, EasyPaisa, and Pakistani interbank transfers).
                </p>

                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
                  <h4 style={{ color: '#34d399', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Our Zero Financial Footprint Promise:
                  </h4>
                  <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', lineHeight: 1.6, color: '#cbd5e1' }}>
                    <li>EventLand <strong>NEVER</strong> captures, transmits, or stores full debit or credit card numbers, CVVs, expiration dates, or bank account PINs.</li>
                    <li>Online card and mobile wallet transactions occur entirely within PayPro's PCI-DSS compliant hosted payment gateway.</li>
                    <li>For manual bank transfers, payment proof screenshots uploaded are processed through SkiaSharp media sanitization, removing malicious payload metadata before administrative validation.</li>
                  </ul>
                </div>
              </section>

              {/* Section 6: QR Gate Pass */}
              <section id="qr-ticketing" style={{
                backgroundColor: 'rgba(10, 24, 38, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(217, 119, 6, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QrCode size={18} color="#fbbf24" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    6. QR Gate Pass & Verification
                  </h2>
                </div>

                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                  Digital passes issued by EventLand embed a cryptographic verification signature. When your pass is scanned at the venue gate:
                </p>

                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: 1.7, color: '#94a3b8' }}>
                  <li>The scanner decodes the ticket token and confirms the pass status against our secure gate API in realtime.</li>
                  <li>Once an attendee enters the venue, the pass is atomically marked as <code style={{ color: '#34d399', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Admitted</code> to invalidate duplicate screen captures or forwarded tickets.</li>
                  <li>Gate operators see only the ticket holder's name and tier selection for verification purposes; no private financial records or passwords are ever exposed.</li>
                </ul>
              </section>

              {/* Section 7: Third-Party Sharing */}
              <section id="data-sharing" style={{
                backgroundColor: 'rgba(10, 24, 38, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ExternalLink size={18} color="#2dd4bf" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    7. Third-Party Sharing & Processors
                  </h2>
                </div>

                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '1.25rem' }}>
                  We do <strong style={{ color: '#fff' }}>not sell, rent, or trade your personal information</strong> to data brokers or advertising networks. We share information strictly with verified operational partners:
                </p>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.85rem',
                    textAlign: 'left'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(13, 30, 43, 0.8)', borderBottom: '1px solid rgba(13, 148, 136, 0.3)' }}>
                        <th style={{ padding: '0.75rem 1rem', color: '#2dd4bf', fontWeight: 600 }}>Partner / Service</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#2dd4bf', fontWeight: 600 }}>Purpose</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#2dd4bf', fontWeight: 600 }}>Data Shared</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.75rem 1rem', color: '#fff', fontWeight: 600 }}>Google Identity Services</td>
                        <td style={{ padding: '0.75rem 1rem' }}>OAuth User Authentication</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>OAuth tokens, email, name</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.75rem 1rem', color: '#fff', fontWeight: 600 }}>Meta Platforms, Inc.</td>
                        <td style={{ padding: '0.75rem 1rem' }}>OAuth User Authentication</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>Facebook user ID, email, name</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.75rem 1rem', color: '#fff', fontWeight: 600 }}>PayPro Pakistan</td>
                        <td style={{ padding: '0.75rem 1rem' }}>Bill generation & payment gateway</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>Order amount, customer name, mobile</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.75rem 1rem', color: '#fff', fontWeight: 600 }}>Cloudflare</td>
                        <td style={{ padding: '0.75rem 1rem' }}>DDoS protection & Turnstile bot check</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>IP address, request headers</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '0.75rem 1rem', color: '#fff', fontWeight: 600 }}>Event Venue & Organizer</td>
                        <td style={{ padding: '0.75rem 1rem' }}>Gate admission & guest roster check</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>Attendee name, tier, seat number</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 8: Facebook User Data Deletion Instructions (CRITICAL FOR META APP REVIEW) */}
              <section id="data-deletion" style={{
                backgroundColor: 'rgba(20, 20, 35, 0.85)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '16px',
                padding: '2rem',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={18} color="#f87171" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                      8. Meta (Facebook) User Data Deletion Instructions
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      In compliance with Meta Platform Terms §4.b
                    </span>
                  </div>
                </div>

                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '1.25rem' }}>
                  EventLand respects your right to control personal data obtained via Facebook Login. If you authenticated using your Facebook account and wish to delete your activities and data associated with the EventLand application, you can do so by following either of the two standard options below:
                </p>

                {/* Option A: Facebook Settings */}
                <div style={{ backgroundColor: 'rgba(13, 24, 38, 0.8)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.25rem' }}>
                  <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#1877f2', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>A</span>
                    Option 1: Remove EventLand from your Facebook Account
                  </h4>
                  <ol style={{ paddingLeft: '1.5rem', margin: 0, fontSize: '0.86rem', lineHeight: 1.7, color: '#94a3b8' }}>
                    <li>Open your Facebook profile and navigate to <strong>Settings & Privacy &gt; Settings</strong>.</li>
                    <li>Scroll down in the left navigation to <strong>Apps and Websites</strong>.</li>
                    <li>Locate <strong style={{ color: '#fff' }}>EventLand</strong> (or Event Land Pakistan) in your active apps list.</li>
                    <li>Click the <strong>Remove</strong> button.</li>
                    <li>Check the box to delete all posts, videos, or events EventLand may have posted on your behalf (if applicable).</li>
                    <li>Click <strong>Remove</strong> again to confirm. This immediately revokes EventLand’s OAuth access token.</li>
                  </ol>
                </div>

                {/* Option B: Direct EventLand Deletion Request */}
                <div style={{ backgroundColor: 'rgba(13, 24, 38, 0.8)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#0d9488', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>B</span>
                    Option 2: Direct Account & Data Purge Request
                  </h4>
                  <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                    To permanently purge your account records, social identifiers (Facebook ID / Google ID), phone numbers, and profile data from our databases:
                  </p>
                  <ol style={{ paddingLeft: '1.5rem', margin: '0 0 1rem 0', fontSize: '0.86rem', lineHeight: 1.7, color: '#94a3b8' }}>
                    <li>Send an email to <a href="mailto:support@eventland.pk?subject=Facebook%20User%20Data%20Deletion%20Request" style={{ color: '#2dd4bf', textDecoration: 'underline' }}>support@eventland.pk</a> with the subject line: <code style={{ color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Data Deletion Request - Facebook</code>.</li>
                    <li>Include your full name and the email address linked to your Facebook account.</li>
                    <li>Our data protection team will verify your request and securely delete your profile, social linkage, and session tokens within <strong>30 calendar days</strong>.</li>
                    <li>You will receive a formal confirmation receipt once the deletion has been executed across our active and backup databases.</li>
                  </ol>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                    * Note: Past financial transaction records (such as completed PayPro invoice receipts) may be retained in anonymized format solely to satisfy statutory accounting and tax compliance obligations under Pakistani law.
                  </div>
                </div>
              </section>

              {/* Section 9: Cookies & Storage */}
              <section id="cookies-storage" style={{
                backgroundColor: 'rgba(10, 24, 38, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Cookie size={18} color="#2dd4bf" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    9. Cookies & Local Storage
                  </h2>
                </div>

                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                  EventLand uses minimal local storage and session items essential for application functionality:
                </p>

                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: 1.7, color: '#94a3b8' }}>
                  <li><strong style={{ color: '#fff' }}>Authentication Session Token:</strong> Cryptographically signed JWT stored in local storage (<code style={{ color: '#2dd4bf' }}>eventland_token</code>) so you stay signed in across browser visits.</li>
                  <li><strong style={{ color: '#fff' }}>Saved Favorites & City Filters:</strong> Storing your selected city preference (<code style={{ color: '#2dd4bf' }}>eventland_saved_events</code>) to personalize your upcoming concerts feed.</li>
                  <li><strong style={{ color: '#fff' }}>Security & CAPTCHA:</strong> Cloudflare Turnstile tokens verifying human interaction to mitigate automated bot attacks against seat reservations.</li>
                </ul>
              </section>

              {/* Section 10: Security & Retention */}
              <section id="security-retention" style={{
                backgroundColor: 'rgba(10, 24, 38, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={18} color="#2dd4bf" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    10. Security & Retention Policies
                  </h2>
                </div>

                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                  We implement enterprise-grade security protocols across all layers of our tech stack:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(13, 30, 43, 0.7)', padding: '1rem', borderRadius: '10px' }}>
                    <h5 style={{ color: '#2dd4bf', fontWeight: 600, marginBottom: '0.3rem' }}>End-to-End Encryption</h5>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                      Strict HTTPS/TLS 1.3 encryption across all client-server communications with HSTS enforcement.
                    </p>
                  </div>
                  <div style={{ backgroundColor: 'rgba(13, 30, 43, 0.7)', padding: '1rem', borderRadius: '10px' }}>
                    <h5 style={{ color: '#2dd4bf', fontWeight: 600, marginBottom: '0.3rem' }}>Role-Gated Backend APIs</h5>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                      Admin and organizer controllers are protected with fine-grained authorization filters and IP rate limiting.
                    </p>
                  </div>
                  <div style={{ backgroundColor: 'rgba(13, 30, 43, 0.7)', padding: '1rem', borderRadius: '10px' }}>
                    <h5 style={{ color: '#2dd4bf', fontWeight: 600, marginBottom: '0.3rem' }}>Database Protection</h5>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                      SQL Server relational storage with parameterized EF Core queries, automated daily snapshots, and zero plaintext credentials.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 11: Your Rights */}
              <section id="your-rights" style={{
                backgroundColor: 'rgba(10, 24, 38, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={18} color="#2dd4bf" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    11. Your Rights & Choices
                  </h2>
                </div>

                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                  Regardless of your location, EventLand grants you comprehensive rights regarding your personal records:
                </p>

                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: 1.7, color: '#94a3b8' }}>
                  <li><strong style={{ color: '#fff' }}>Access & Portability:</strong> You may request a complete export of your past booking history and profile details.</li>
                  <li><strong style={{ color: '#fff' }}>Rectification:</strong> You can update incorrect phone numbers or display names at any time from your Attendee Dashboard.</li>
                  <li><strong style={{ color: '#fff' }}>Erasure (Right to be Forgotten):</strong> You may request deletion of your account and unlinking of Google/Facebook authentication tokens.</li>
                  <li><strong style={{ color: '#fff' }}>Marketing Opt-Out:</strong> You can unsubscribe from newsletter event drops at any time with one click in the email footer.</li>
                </ul>
              </section>

              {/* Section 12: Contact & Grievances */}
              <section id="contact-us" style={{
                backgroundColor: 'rgba(10, 24, 38, 0.9)',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                borderRadius: '16px',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={18} color="#2dd4bf" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    12. Contact & Grievances Officer
                  </h2>
                </div>

                <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '1.25rem' }}>
                  If you have questions about this Privacy Policy, your personal information, or wish to file a data deletion request, our dedicated Privacy Team is here to help:
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                  backgroundColor: 'rgba(13, 30, 43, 0.7)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Official Email</span>
                    <div style={{ marginTop: '0.2rem' }}>
                      <a href="mailto:support@eventland.pk" style={{ color: '#2dd4bf', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}>
                        support@eventland.pk
                      </a>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Helpline & WhatsApp</span>
                    <div style={{ marginTop: '0.2rem', color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                      +92 307 9353185
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Country of Operation</span>
                    <div style={{ marginTop: '0.2rem', color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                      Islamic Republic of Pakistan
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                  <button
                    onClick={onBack}
                    type="button"
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.75rem',
                      borderRadius: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowLeft size={16} /> Return to EventLand Home
                  </button>
                </div>
              </section>

            </article>
          </div>
        </div>
      </main>
    </div>
  );
}
