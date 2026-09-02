import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught React UI error:', error, errorInfo);
  }

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#061017',
          backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(13, 148, 136, 0.15), transparent)',
          color: '#f8fafc',
          padding: '1.5rem',
          fontFamily: 'var(--font-body, system-ui, sans-serif)',
          textAlign: 'center'
        }}>
          <div style={{
            background: '#0b1328',
            border: '1px solid rgba(13, 148, 136, 0.35)',
            padding: '2.5rem 2rem',
            borderRadius: '24px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem'
          }}>
            {/* Logo Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <img src="/logo-icon.png" alt="EventLand" style={{ height: '32px', width: 'auto' }} />
              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>
                Event <span style={{ color: '#10b981' }}>Land</span>
              </span>
            </div>

            {/* Warning Halo */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={32} color="#fbbf24" />
            </div>

            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem 0' }}>
                Oops! Something went wrong
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                An unexpected interface issue occurred. Our system isolated it to keep your session secure.
              </p>
            </div>

            {/* Error Message Box */}
            <div style={{
              width: '100%',
              backgroundColor: '#16233f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              fontSize: '0.82rem',
              color: '#f87171',
              fontFamily: 'monospace',
              wordBreak: 'break-word',
              textAlign: 'left'
            }}>
              {this.state.error?.message || 'Unknown runtime exception occurred.'}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <button
                onClick={this.handleTryAgain}
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  fontSize: '0.88rem',
                  borderRadius: '12px',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <RotateCcw size={16} /> Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  fontSize: '0.88rem',
                  borderRadius: '12px',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  background: 'linear-gradient(135deg, #0d9488, #059669)'
                }}
              >
                <RefreshCw size={16} /> Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
