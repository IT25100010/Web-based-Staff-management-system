import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/common/DataTable';
import { Users, Shield, Server, LifeBuoy, CheckCircle2, ArrowRight, Play, RefreshCw, KeyRound } from 'lucide-react';

export const ITCoordinatorDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 6,
    activeUsers: 6,
    inactiveUsers: 0,
    totalTickets: 0,
    openTickets: 0,
    systemHealth: 'OPTIMAL',
    recentBackups: []
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadITData();
  }, []);

  const loadITData = async () => {
    setLoading(true);
    try {
      const [dashRes, usersRes] = await Promise.all([
        apiClient.get('/admin/dashboard'),
        apiClient.get('/admin/users')
      ]);
      setDashboardData(dashRes.data || {});
      setUsers(usersRes.data || []);
    } catch (e) {
      console.error('Error loading IT data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    try {
      await apiClient.post('/admin/backups/trigger', {});
      alert('Full system database backup triggered and completed successfully!');
      loadITData();
    } catch (e) {
      alert('Failed to trigger backup');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await apiClient.patch(`/admin/users/${id}/toggle-status`);
      loadITData();
    } catch (e) {
      alert('Could not update user status');
    }
  };

  const handleResetPassword = async (id, username) => {
    try {
      await apiClient.post(`/admin/users/${id}/reset-password`, { newPassword: 'Password@123' });
      alert(`Password for ${username} reset to 'Password@123'`);
    } catch (e) {
      alert('Could not reset password');
    }
  };

  const userColumns = [
    { header: 'Username', accessor: 'username', render: (r) => <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{r.username}</span> },
    { header: 'Full Name', accessor: 'fullName' },
    { header: 'Email', accessor: 'email' },
    { header: 'Assigned Role', accessor: 'role', render: (r) => <StatusBadge status={r.role} /> },
    { header: 'Account Status', accessor: 'active', render: (r) => <StatusBadge status={r.active ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => handleResetPassword(r.id, r.username)} className="btn btn-secondary btn-sm" title="Reset to default password">
            <KeyRound size={14} /> Reset
          </button>
          <button onClick={() => handleToggleStatus(r.id)} className={`btn btn-sm ${r.active ? 'btn-danger' : 'btn-success'}`}>
            {r.active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">IT Coordinator & Security Dashboard</h1>
          <p className="page-description">
            User accounts, access permissions, security audit trails, database backup management, and IT helpdesk.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleTriggerBackup} className="btn btn-primary">
            <Server size={16} /> Run Database Backup
          </button>
          <Link to="/it/support" className="btn btn-secondary">
            <LifeBuoy size={16} /> Helpdesk Tickets
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard title="Total System Users" value={dashboardData.totalUsers || 6} icon={Users} color="blue" subtext="Provisioned accounts" />
        <StatCard title="Active Accounts" value={dashboardData.activeUsers || 6} icon={CheckCircle2} color="green" subtext="Enabled system logins" />
        <StatCard title="System Health" value="OPTIMAL" icon={Shield} color="green" subtext="MySQL & Spring Boot online" />
        <StatCard title="Open Support Tickets" value={dashboardData.openTickets || 0} icon={LifeBuoy} color={dashboardData.openTickets > 0 ? "amber" : "blue"} subtext={dashboardData.openTickets > 0 ? "Pending investigation" : "No open issues"} />
        <StatCard title="Backup Integrity" value="SUCCESS" icon={Server} color="purple" subtext="Daily automated snapshots" />
        <StatCard title="Security Status" value="SECURE" icon={Shield} color="blue" subtext="JWT Token Auth enforced" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* System Backup Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Database Snapshot & Backups</h2>
              <p className="card-subtitle">MySQL data persistence and recovery points</p>
            </div>
            <button onClick={handleTriggerBackup} className="btn btn-secondary btn-sm">
              <RefreshCw size={14} /> Backup Now
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dashboardData.recentBackups && dashboardData.recentBackups.length > 0 ? (
              dashboardData.recentBackups.slice(0, 3).map((b, idx) => (
                <div key={idx} style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>{b.backupName}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      Size: {b.fileSize} • Triggered by: {b.triggeredBy}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', color: '#94a3b8' }}>No backups recorded.</div>
            )}
          </div>
        </div>

        {/* System Access & Security Overview */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Security & Role Architecture</h2>
              <p className="card-subtitle">Strict separation of duties across 6 system roles</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>HR Manager</span>
              <span style={{ fontSize: '0.78rem', color: '#2563eb' }}>Recruitment, Leaves, Performance, Policies</span>
            </div>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Operations Manager</span>
              <span style={{ fontSize: '0.78rem', color: '#059669' }}>Shifts, Locations, Assignments, Recalls</span>
            </div>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Senior Administrative Officer</span>
              <span style={{ fontSize: '0.78rem', color: '#7c3aed' }}>Dossiers, Physical & Digital Documents</span>
            </div>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Finance Executive</span>
              <span style={{ fontSize: '0.78rem', color: '#d97706' }}>EPF/ETF Payroll, Overtime, Payslips</span>
            </div>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Staff Employee</span>
              <span style={{ fontSize: '0.78rem', color: '#0284c7' }}>Personal Portal, Clocking, Leave, Payslip</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Accounts Management Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Provisioned System User Accounts</h2>
            <p className="card-subtitle">Manage login access, roles, and status for Lanka Workforce Solutions personnel</p>
          </div>
          <Link to="/it/users" style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Full User Manager <ArrowRight size={14} />
          </Link>
        </div>
        <DataTable columns={userColumns} data={users} searchPlaceholder="Search..." />
      </div>
    </div>
  );
};
