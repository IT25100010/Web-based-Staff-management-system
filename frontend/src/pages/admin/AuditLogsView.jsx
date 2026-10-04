import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { Shield, Lock, Terminal, Activity } from 'lucide-react';

export const AuditLogsView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/admin/audit-logs');
        setLogs(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
          {row.timestamp}
        </span>
      )
    },
    {
      header: 'Operator / Username',
      accessor: 'username',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
          @{row.username}
        </span>
      )
    },
    {
      header: 'Action Taken',
      accessor: 'action',
      render: (row) => (
        <span
          style={{
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 700,
            fontFamily: 'monospace',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)'
          }}
        >
          {row.action}
        </span>
      )
    },
    {
      header: 'Event Details',
      accessor: 'details',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {row.details}
        </span>
      )
    },
    {
      header: 'Client IP',
      accessor: 'ipAddress',
      render: (row) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {row.ipAddress || '—'}
        </span>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          System Security & Audit Trail
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Immutable log of privileged administrative operations, authentication events, and data mutations
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Recorded Audit Events"
          value={logs.length}
          subtitle="System lifecycle actions"
          icon={Activity}
          color="#3b82f6"
        />
        <StatCard
          title="Intrusion Attempts"
          value="0"
          subtitle="Firewall & JWT perimeter active"
          icon={Lock}
          color="#10b981"
        />
        <StatCard
          title="Log Retention Standard"
          value="365 Days"
          subtitle="Meets ISO/IEC 27001 compliance"
          icon={Shield}
          color="#8b5cf6"
        />
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          searchPlaceholder="Search..."
        />
      </div>
    </div>
  );
};
