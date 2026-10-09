import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export const UnauthorizedPage = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const handleReturn = () => {
    switch (role) {
      case 'HR_MANAGER': navigate('/hr/dashboard'); break;
      case 'OPERATIONS_MANAGER': navigate('/operations/dashboard'); break;
      case 'SENIOR_ADMIN': navigate('/admin-officer/dashboard'); break;
      case 'FINANCE_EXECUTIVE': navigate('/finance/dashboard'); break;
      case 'EMPLOYEE': navigate('/employee/dashboard'); break;
      case 'IT_COORDINATOR': navigate('/it/dashboard'); break;
      default: navigate('/login');
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '48px 32px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Access Restricted</h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '8px', lineHeight: 1.5 }}>
          Your current system role (<strong>{role?.replace(/_/g, ' ')}</strong>) is not authorized to access this module or administrative function.
        </p>
        <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button onClick={handleReturn} className="btn btn-primary">
            <Home size={16} /> Return to My Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
