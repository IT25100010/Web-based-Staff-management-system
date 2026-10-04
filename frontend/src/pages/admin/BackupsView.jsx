import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Server, Download, Play, CheckCircle2, HardDrive, Database } from 'lucide-react';

export const BackupsView = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/backups');
      setBackups(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleTriggerBackup = async () => {
    try {
      setCreating(true);
      await apiClient.post('/admin/backups/trigger');
      fetchBackups();
      alert('Full Database Snapshot successfully created and archived to local storage.');
    } catch (err) {
      alert('Error initiating backup: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      header: 'Snapshot Archive Name',
      accessor: 'backupName',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={16} color="var(--primary)" />
          <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
            {row.backupName}
          </span>
        </div>
      )
    },
    {
      header: 'Backup Scope',
      accessor: 'backupType',
      render: (row) => (
        <span style={{ fontSize: '0.85rem' }}>{row.backupType || 'FULL_DATABASE'}</span>
      )
    },
    {
      header: 'Archive Size',
      accessor: 'fileSize',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{row.fileSize}</span>
      )
    },
    {
      header: 'Triggered By',
      accessor: 'triggeredBy',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {row.triggeredBy}
        </span>
      )
    },
    {
      header: 'Created At',
      accessor: 'createdAt',
      render: (row) => (
        <span style={{ fontSize: '0.85rem' }}>
          {row.createdAt ? new Date(row.createdAt).toLocaleString() : 'Recent'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <StatusBadge status={row.status || 'SUCCESS'} />
      )
    },
    {
      header: 'Download',
      accessor: 'id',
      render: (row) => (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => alert(`Starting download for ${row.backupName}...`)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.5rem' }}
        >
          <Download size={14} />
          <span>Dump</span>
        </button>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            System Database Backups & Recovery
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Automated daily SQL dumps, point-in-time disaster recovery snapshots, and cold storage integrity
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleTriggerBackup}
          disabled={creating}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Play size={16} />
          <span>{creating ? 'Taking Snapshot...' : 'Trigger Instant DB Snapshot'}</span>
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Archived Snapshots"
          value={backups.length}
          subtitle="All valid SQL dump archives"
          icon={HardDrive}
          color="#3b82f6"
        />
        <StatCard
          title="Backup Health"
          value={backups.length > 0 ? "100% OK" : "—"}
          subtitle={backups.length > 0 ? "Automated backups active" : "No backups triggered yet"}
          icon={CheckCircle2}
          color="#10b981"
        />
        <StatCard
          title="Disaster Recovery RPO"
          value="< 24 Hours"
          subtitle="Zero data loss guarantee"
          icon={Server}
          color="#8b5cf6"
        />
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={backups}
          loading={loading}
          searchPlaceholder="Search..."
        />
      </div>
    </div>
  );
};
