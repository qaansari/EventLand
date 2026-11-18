import React from 'react';

export interface RequireAuthProps {
  currentUser: any;
  allowedRoles?: string[];
  fallback?: React.ReactNode;
  onUnauthorized?: () => void;
  children: React.ReactNode;
}

export default function RequireAuth({
  currentUser,
  allowedRoles,
  fallback,
  onUnauthorized,
  children
}: RequireAuthProps) {
  if (!currentUser) {
    if (onUnauthorized) {
      onUnauthorized();
    }
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="container" style={{ padding: '5rem 1rem', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
        <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>Sign In Required</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Please sign in to access this area.
          </p>
        </div>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (currentUser.role || 'customer').toLowerCase();
    const hasRole = allowedRoles.some(r => r.toLowerCase() === userRole || (userRole === 'admin' && r.toLowerCase() === 'organizer'));

    if (!hasRole) {
      return fallback ? (
        <>{fallback}</>
      ) : (
        <div className="container" style={{ padding: '5rem 1rem', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171', marginBottom: '0.5rem' }}>Access Denied</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              You do not have the required permissions to view this portal.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
