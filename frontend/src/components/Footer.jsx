import React, { useState } from 'react';
import { ChevronDown, Send, Phone, Mail } from 'lucide-react';

export default function Footer({ onSelectCity }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribedToast, setSubscribedToast] = useState(false);

  const faqs = [
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
  ];

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setSubscribedToast(true);
    setNewsletterEmail('');
    setTimeout(() => setSubscribedToast(false), 3000);
  };

  return (
    <footer style={{
      backgroundColor: '#050912',
      borderTop: '1px solid rgba(59, 130, 246, 0.15)',
      marginTop: '4rem',
      paddingTop: '3.5rem',
      paddingBottom: '2rem',
      color: '#94a3b8'
    }}>
      <div className="container">
        {/* FAQ Section */}
        <div style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', textAlign: 'center' }}>
            Frequently Asked Questions
          </h2>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#10192d',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
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
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: '#3b82f6'
                    }}
                  />
                </button>
                {openFaq === idx && (
                  <div style={{ padding: '0 1.25rem 1.25rem', color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Grid */}
        <div style={{
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
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
                EVENT <span style={{ color: '#3b82f6' }}>LAND</span>
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              Pakistan's premier event ticketing, artist booking, and live entertainment discovery platform.
            </p>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={14} color="#3b82f6" /> +92 331 0286867
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={14} color="#3b82f6" /> support@eventland.pk
              </div>
            </div>
          </div>

          {/* Quick Cities */}
          <div>
            <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>Major Cities</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
              {["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Multan", "Faisalabad"].map((city) => (
                <li key={city}>
                  <a
                    href="#explore"
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectCity(city);
                    }}
                    style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => (e.target.style.color = '#3b82f6')}
                    onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
                  >
                    Events in {city}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
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
                  border: '1px solid rgba(59, 130, 246, 0.25)',
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
              <span style={{ display: 'block', color: '#60a5fa', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                ✓ Subscribed! You will receive upcoming event drops.
              </span>
            )}
          </div>
        </div>

        {/* Bottom Copyright */}
        <div style={{
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.8rem'
        }}>
          <span>© 2026 EventLand Pakistan. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms of Service</a>
            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Organizer Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
