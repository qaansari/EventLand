import React, { useState, useEffect } from 'react';
import { ChevronDown, Send, Phone, Mail } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { footerApi } from '../services/api';

export default function Footer({ onSelectCity }) {
  const { showSuccess } = useToast();
  const [openFaq, setOpenFaq] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribedToast, setSubscribedToast] = useState(false);

  // Dynamic state loaded from Database/API
  const [footerData, setFooterData] = useState({
    brandName: 'EventLand',
    tagline: "Event Land is a single, user-friendly platform, we link fans, artists, and organizers for everything from comedy nights to concerts. 🎵🎭",
    phone: '+92 307 9353185',
    email: 'support@eventland.pk',
    copyrightText: '© 2026 EventLand Pakistan. All rights reserved.',
    privacyPolicyUrl: '#',
    termsOfServiceUrl: '#',
    organizerSupportUrl: '#',
    faqs: [
      {
        q: "How do I book tickets on EventLand?",
        a: "Browse events on EventLand, select your desired city and ticket tier or interactive seat, and pay securely via JazzCash, EasyPaisa, bank transfer, or card. Your official digital E-Ticket with QR code is generated instantly."
      },
      {
        q: "What is EventLand's refund policy?",
        a: "Tickets are non-refundable unless an event is cancelled or rescheduled. If an event is cancelled, full refunds are issued within 5 business days."
      },
      {
        q: "Which major Pakistani cities are covered?",
        a: "EventLand features live concerts, comedy shows, bazaars, and theatre across Karachi, Lahore, Islamabad, Rawalpindi, Multan, Faisalabad, and Hyderabad."
      },
      {
        q: "Can I list my own event and sell tickets?",
        a: "Yes! Event organizers can list their event using our instant 'List Your Event' portal, set ticket tiers, and start selling tickets to audiences across Pakistan immediately."
      }
    ],
    majorCities: ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Multan", "Faisalabad"]
  });

  useEffect(() => {
    let isMounted = true;

    const loadFooterData = () => {
      footerApi.get()
        .then((data) => {
          if (isMounted && data) {
            setFooterData((prev) => ({
              ...prev,
              brandName: data.brandName || prev.brandName,
              tagline: data.tagline || prev.tagline,
              phone: data.phone || prev.phone,
              email: data.email || prev.email,
              copyrightText: data.copyrightText || prev.copyrightText,
              privacyPolicyUrl: data.privacyPolicyUrl || prev.privacyPolicyUrl,
              termsOfServiceUrl: data.termsOfServiceUrl || prev.termsOfServiceUrl,
              organizerSupportUrl: data.organizerSupportUrl || prev.organizerSupportUrl,
              faqs: data.faqs && data.faqs.length > 0 ? data.faqs : prev.faqs,
              majorCities: data.majorCities && data.majorCities.length > 0 ? data.majorCities : prev.majorCities
            }));
          }
        })
        .catch((err) => {
          console.warn("Using fallback footer data. Backend fetch note:", err.message);
        });
    };

    loadFooterData();

    // Listen for realtime FAQ updates from admin actions
    const handleFaqsUpdated = (e) => {
      if (e?.detail?.faqs && Array.isArray(e.detail.faqs)) {
        setFooterData(prev => ({
          ...prev,
          faqs: e.detail.faqs
        }));
      } else {
        loadFooterData();
      }
    };

    window.addEventListener('faqs-updated', handleFaqsUpdated);
    window.addEventListener('footer-updated', loadFooterData);

    return () => {
      isMounted = false;
      window.removeEventListener('faqs-updated', handleFaqsUpdated);
      window.removeEventListener('footer-updated', loadFooterData);
    };
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setSubscribedToast(true);
    showSuccess('Subscribed 📧', `Subscribed ${newsletterEmail} to ${footerData.brandName} newsletter updates!`);
    setNewsletterEmail('');
    setTimeout(() => setSubscribedToast(false), 3000);
  };

  return (
    <footer style={{
      backgroundColor: '#040812',
      borderTop: '1px solid rgba(13, 148, 136, 0.3)',
      boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(45, 212, 191, 0.15)',
      marginTop: '4.5rem',
      paddingTop: '4rem',
      paddingBottom: '2.5rem',
      color: '#94a3b8'
    }}>
      <div className="container">
        {/* FAQ Section Loaded From Database */}
        <div style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', textAlign: 'center' }}>
            Frequently Asked Questions
          </h2>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {footerData.faqs.map((faq, idx) => (
              <div
                key={faq.id || idx}
                style={{
                  backgroundColor: '#10192d',
                  border: '1px solid rgba(13, 148, 136, 0.15)',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <span>{faq.q || faq.question}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: '#0d9488'
                    }}
                  />
                </button>
                {openFaq === idx && (
                  <div style={{ padding: '0 1.25rem 1.25rem', color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    {faq.a || faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Grid Loaded From Database */}
        <div className="footer-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '2.5rem',
          paddingBottom: '2.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <img
                src="/logo-icon.png"
                alt="EventLand Icon"
                style={{ height: '38px', width: 'auto' }}
              />
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', textTransform: 'capitalize' }}>
                Event <span style={{ color: '#10b981' }}>Land</span>
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              {footerData.tagline}
            </p>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {footerData.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={14} color="#0d9488" /> {footerData.phone}
                </div>
              )}
              {footerData.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={14} color="#0d9488" /> {footerData.email}
                </div>
              )}
            </div>
          </div>

          {/* Quick Cities */}
          <div>
            <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>Major Cities</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
              {footerData.majorCities.map((city) => (
                <li key={city}>
                  <a
                    href="#explore"
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectCity(city);
                    }}
                    style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => (e.target.style.color = '#0d9488')}
                    onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
                  >
                    Events in {city}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="footer-newsletter">
            <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>Stay Updated</h4>
            <p style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
              Subscribe to receive instant alerts on upcoming concerts and early bird ticket drops.
            </p>
            <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="email"
                placeholder="Enter your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                style={{
                  backgroundColor: '#10192d',
                  border: '1px solid rgba(13, 148, 136, 0.25)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none',
                  flexGrow: 1
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 0.85rem' }}>
                <Send size={15} />
              </button>
            </form>
            {subscribedToast && (
              <span style={{ display: 'block', color: '#2dd4bf', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                ✓ Subscribed! You will receive upcoming event drops.
              </span>
            )}
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="footer-bottom" style={{
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.8rem'
        }}>
          <span>{footerData.copyrightText}</span>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <a href={footerData.privacyPolicyUrl || '#'} style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</a>
            <a href={footerData.termsOfServiceUrl || '#'} style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms of Service</a>
            <a href={footerData.organizerSupportUrl || '#'} style={{ color: '#94a3b8', textDecoration: 'none' }}>Organizer Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
