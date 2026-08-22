import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Ticket, Flame, Compass, RefreshCw } from 'lucide-react';
import { getEventImageUrl } from '../services/api';
import { MOCK_EVENTS } from '../data/mockEvents';

export default function AiEventAssistant({ onSelectEvent }) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "👋 Hi! I'm EventVibe AI. Tell me what kind of event experience you are looking for, or pick a vibe below!",
      suggestedEvents: []
    }
  ]);
  const [inputText, setInputText] = useState('');

  const quickPrompts = [
    "Rock concert in Islamabad this month",
    "Family street food festival in Lahore",
    "Under 2000 PKR entry in Karachi",
    "Theatre play & dramatic performances"
  ];

  const handleSendMessage = (userPrompt) => {
    const textToSubmit = userPrompt || inputText;
    if (!textToSubmit.trim()) return;

    const newMessages = [
      ...messages,
      { sender: 'user', text: textToSubmit }
    ];

    setMessages(newMessages);
    if (!userPrompt) setInputText('');

    // Process intelligent matching
    setTimeout(() => {
      const lower = textToSubmit.toLowerCase();
      let matched = [];

      if (lower.includes('rock') || lower.includes('concert') || lower.includes('ali noor') || lower.includes('music')) {
        matched = MOCK_EVENTS.filter((e) => e.category === 'Concerts');
      } else if (lower.includes('food') || lower.includes('lahore') || lower.includes('qawwali')) {
        matched = MOCK_EVENTS.filter((e) => e.category === 'Food' || e.city === 'Lahore');
      } else if (lower.includes('2000') || lower.includes('under') || lower.includes('cheap')) {
        matched = MOCK_EVENTS.filter((e) => e.startingPrice <= 2000);
      } else if (lower.includes('theatre') || lower.includes('play')) {
        matched = MOCK_EVENTS.filter((e) => e.category === 'Theatre');
      } else {
        matched = MOCK_EVENTS.slice(0, 3);
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Here are the top event recommendations matching "${textToSubmit}":`,
          suggestedEvents: matched
        }
      ]);
    }, 600);
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '840px' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          color: '#c084fc',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '0.4rem 1rem',
          borderRadius: '9999px',
          fontWeight: 700,
          fontSize: '0.85rem',
          marginBottom: '0.75rem'
        }}>
          <Sparkles size={16} /> POWERED BY EVENTVIBE AI
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          color: '#fff',
          marginBottom: '0.5rem'
        }}>
          Personalized Event Matchmaker
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
          Not sure what to attend? Ask EventVibe AI to find the perfect concerts, bazaars, and shows tailored to your mood.
        </p>
      </div>

      {/* Chat Container */}
      <div className="glass-card" style={{ height: '520px', display: 'flex', flexDirection: 'column' }}>
        {/* Messages Body */}
        <div style={{
          flexGrow: 1,
          padding: '1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              {m.sender === 'bot' && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c084fc',
                  flexShrink: 0
                }}>
                  <Bot size={20} />
                </div>
              )}

              <div style={{ maxWidth: '78%' }}>
                <div style={{
                  backgroundColor: m.sender === 'user' ? '#10b981' : '#1f2937',
                  color: m.sender === 'user' ? '#04140e' : '#f3f4f6',
                  fontWeight: m.sender === 'user' ? 600 : 400,
                  padding: '0.85rem 1.15rem',
                  borderRadius: m.sender === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                  fontSize: '0.92rem',
                  lineHeight: 1.4
                }}>
                  {m.text}
                </div>

                {/* Event Suggestions */}
                {m.suggestedEvents && m.suggestedEvents.length > 0 && (
                  <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {m.suggestedEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => onSelectEvent(ev)}
                        style={{
                          backgroundColor: '#090d16',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '12px',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img src={getEventImageUrl(ev.banner)} alt={ev.title} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                          <div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', display: 'block' }}>{ev.title}</span>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{ev.city} • {ev.date}</span>
                          </div>
                        </div>
                        <button className="btn btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}>
                          <Ticket size={14} /> Book PKR {ev.startingPrice}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#04140e',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  <User size={18} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Prompts Strip */}
        <div style={{
          padding: '0.6rem 1.25rem',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto'
        }}>
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                color: '#c084fc',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              ✨ {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '0.75rem'
          }}
        >
          <input
            type="text"
            placeholder="Ask EventVibe AI (e.g. Find me a comedy night in Karachi)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flexGrow: 1,
              backgroundColor: '#1f2937',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '9999px',
              padding: '0.75rem 1.25rem',
              color: '#fff',
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.4rem' }}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
