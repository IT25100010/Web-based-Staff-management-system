import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '48px 32px' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1 }}>404</h1>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '12px' }}>Page Not Found</h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '8px' }}>
          The requested staff management page or route does not exist.
        </p>
        <div style={{ marginTop: '24px' }}>
          <button onClick={() => navigate(-1)} className="btn btn-primary">
            <Home size={16} /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
};
