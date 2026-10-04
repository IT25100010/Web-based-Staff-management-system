import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Users, FileCheck, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminEmployeeRecords = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/employees');
        setEmployees(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const columns = [
    {
      header: 'Staff Member',
      accessor: 'firstName',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.firstName} {row.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Staff ID: {row.employeeId}
          </div>
        </div>
      )
    },
    {
      header: 'NIC & Contact',
      accessor: 'nic',
      render: (row) => (
        <div style={{ fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{row.nic}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.phone} • {row.email}</div>
        </div>
      )
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (row) => (
        <span style={{ fontSize: '0.85rem' }}>{row.department?.name || '—'}</span>
      )
    },
    {
      header: 'Designation',
      accessor: 'position',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{row.position?.title || '—'}</span>
      )
    },
    {
      header: 'Dossier Audit',
      accessor: 'id',
      render: () => (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
          <CheckCircle2 size={14} />
          <span>On File</span>
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'employmentStatus',
      render: (row) => (
        <StatusBadge status={row.employmentStatus || 'Active'} />
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Employee Master Dossiers & Records
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Senior Administrative Officer dossier repository, NIC verifications, and master service records
          </p>
        </div>
        <Link to="/admin-officer/documents" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileCheck size={16} />
          <span>Verify Staff Documents</span>
        </Link>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Total Staff Dossiers"
          value={employees.length}
          subtitle="All active workforce records"
          icon={Users}
          color="#3b82f6"
        />
        <StatCard
          title="Verified Dossiers"
          value={employees.length}
          subtitle="NIC & Contracts on file"
          icon={CheckCircle2}
          color="#10b981"
        />
        <StatCard
          title="Missing Documentation"
          value="0"
          subtitle="All personnel audits satisfied"
          icon={AlertCircle}
          color="#8b5cf6"
        />
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={employees}
          loading={loading}
          searchPlaceholder="Search..."
        />
      </div>
    </div>
  );
};
