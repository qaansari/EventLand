import React from 'react';

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
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '2rem',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2.5rem',
            borderRadius: '16px',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#f43f5e' }}>
              Oops! Something went wrong
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {this.state.error?.message || 'An unexpected application error occurred.'}
            </p>
            <button
              onClick={this.handleReload}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s, opacity 0.2s'
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
