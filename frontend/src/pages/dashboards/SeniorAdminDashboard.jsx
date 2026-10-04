import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/common/DataTable';
import { Users, FileText, AlertCircle, FileCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export const SeniorAdminDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/employees');
      setEmployees(res.data || []);
    } catch (e) {
      console.error('Error loading admin data', e);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: 'Employee ID', accessor: 'employeeId', render: (r) => <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{r.employeeId}</span> },
    { header: 'Full Name', accessor: 'fullName', render: (r) => <span style={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</span> },
    { header: 'NIC / ID', accessor: 'nic' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Department', accessor: 'department', render: (r) => r.department?.name },
    { header: 'Doc Status', render: () => <StatusBadge status="VERIFIED" text="Docs Complete" /> },
    {
      header: 'Actions',
      render: (r) => (
        <Link to={`/admin-officer/documents?employeeId=${r.id}`} className="btn btn-secondary btn-sm">
          <FileText size={14} /> Audit Docs
        </Link>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Senior Administrative Officer Dashboard</h1>
          <p className="page-description">
            Employee documentation audit, records verification, and administrative file governance.
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard title="Total Staff Records" value={employees.length} icon={Users} color="blue" subtext="Centralized database profiles" />
        <StatCard title="Verified Documents" value={`${employees.reduce((acc, e) => acc + (e.documents?.filter(d => d.status === 'VERIFIED').length || 0), 0)} Files`} icon={FileCheck} color="green" subtext="Attested personnel documents" />
        <StatCard title="Pending Verifications" value={`${employees.reduce((acc, e) => acc + (e.documents?.filter(d => d.status === 'PENDING').length || 0), 0)} Files`} icon={AlertCircle} color="amber" subtext="Awaiting admin sign-off" />
        <StatCard title="Missing Documents" value={`${employees.filter(e => !e.documents || e.documents.length === 0).length} Staff`} icon={AlertCircle} color="red" subtext="Dossiers pending document uploads" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Missing Documents Alert Box */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Missing & Pending Document Audit</h2>
              <p className="card-subtitle">Personnel dossiers requiring administrative verification</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {employees.filter(e => !e.documents || e.documents.length === 0).length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                No pending or missing document alerts at this time.
              </div>
            ) : (
              employees.filter(e => !e.documents || e.documents.length === 0).slice(0, 3).map(e => (
                <div key={e.id} style={{ padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem' }}>{e.firstName} {e.lastName} ({e.employeeId})</div>
                    <div style={{ fontSize: '0.78rem', color: '#78350f', marginTop: '2px' }}>Required: Mandatory NIC copy & employment contract</div>
                  </div>
                  <Link to={`/admin-officer/documents?employeeId=${e.id}`} className="btn btn-warning btn-sm">
                    Upload Docs
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Administrative Task Checklist */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Administrative Support Tasks</h2>
              <p className="card-subtitle">Scheduled registry duties</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
              <CheckCircle2 size={18} color="#10b981" />
              <span style={{ fontSize: '0.875rem', color: '#0f172a' }}>Audit employee physical dossiers & digital scan archives</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
              <CheckCircle2 size={18} color="#10b981" />
              <span style={{ fontSize: '0.875rem', color: '#0f172a' }}>Review signed employee non-disclosure agreements</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
              <CheckCircle2 size={18} color="#94a3b8" />
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Coordinate identification cards and site access passes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Employee Document Registry</h2>
            <p className="card-subtitle">Search and audit employee dossiers across Lanka Workforce Solutions</p>
          </div>
        </div>
        <DataTable columns={columns} data={employees} searchPlaceholder="Search..." />
      </div>
    </div>
  );
};
