import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { FileCheck, CheckCircle2, Eye, ShieldAlert, FileText, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const EmployeePolicies = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('policies'); // 'policies' | 'warnings' | 'disciplinary'
  const [policies, setPolicies] = useState([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState([]);
  const [myWarnings, setMyWarnings] = useState([]);
  const [myDisciplinary, setMyDisciplinary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePolicy, setActivePolicy] = useState(null);
  const [selectedWarning, setSelectedWarning] = useState(null);
  const [selectedDisciplinary, setSelectedDisciplinary] = useState(null);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      const [polRes, ackRes, warnRes, discRes] = await Promise.all([
        apiClient.get('/compliance/policies?status=ACTIVE'),
        apiClient.get('/compliance/my-acknowledgements').catch(() => ({ data: [] })),
        apiClient.get('/compliance/my-warnings').catch(() => ({ data: [] })),
        apiClient.get('/compliance/my-disciplinary-actions').catch(() => ({ data: [] }))
      ]);

      const activePolicies = polRes.data || [];
      const myAcks = ackRes.data || [];
      const ackIds = myAcks.map((a) => a.policy?.id).filter(Boolean);

      setPolicies(activePolicies);
      setAcknowledgedIds(ackIds);
      setMyWarnings(warnRes.data || []);
      setMyDisciplinary(discRes.data || []);
    } catch (err) {
      console.error('Error fetching employee compliance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const handleAcknowledge = async (policyId) => {
    try {
      await apiClient.post('/compliance/acknowledgements', {
        policyId: policyId
      });
      setAcknowledgedIds((prev) => Array.from(new Set([...prev, policyId])));
      alert('Policy digital acknowledgement recorded. Thank you for your compliance.');
      if (activePolicy?.id === policyId) {
        setActivePolicy(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error recording acknowledgement.');
    }
  };

  const policyColumns = [
    {
      header: 'Policy Code',
      accessor: 'policyCode',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{row.policyCode}</span>
      )
    },
    {
      header: 'Policy Title',
      accessor: 'title',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.title}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category: {row.category}</div>
        </div>
      )
    },
    {
      header: 'Version',
      accessor: 'version',
      render: (row) => (
        <span style={{ fontSize: '0.85rem' }}>v{row.version}</span>
      )
    },
    {
      header: 'Effective Date',
      accessor: 'effectiveDate'
    },
    {
      header: 'My Signature Status',
      accessor: 'id',
      render: (row) => {
        const isAck = acknowledgedIds.includes(row.id);
        return isAck ? (
          <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <CheckCircle2 size={14} />
            Acknowledged
          </span>
        ) : (
          <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ShieldAlert size={14} />
            Pending Signature
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => {
        const isAck = acknowledgedIds.includes(row.id);
        return (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setActivePolicy(row)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.5rem' }}
            >
              <Eye size={14} />
              <span>Read</span>
            </button>
            {!isAck && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleAcknowledge(row.id)}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
              >
                Sign Now
              </button>
            )}
          </div>
        );
      }
    }
  ];

  const warningColumns = [
    { header: 'ID', accessor: 'id', width: '60px' },
    {
      header: 'Warning Level',
      accessor: 'warningLevel',
      render: (row) => (
        <span style={{ fontWeight: 700, color: row.warningLevel?.includes('Final') ? '#dc2626' : '#d97706' }}>
          {row.warningLevel}
        </span>
      )
    },
    { header: 'Date Issued', accessor: 'warningDate' },
    { header: 'Reason', accessor: 'reason' },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'ACTIVE'} />
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setSelectedWarning(row)}
        >
          <Eye size={14} /> View
        </button>
      )
    }
  ];

  const disciplinaryColumns = [
    { header: 'ID', accessor: 'id', width: '60px' },
    {
      header: 'Action Type',
      accessor: 'actionType',
      render: (row) => <span style={{ fontWeight: 700, color: '#dc2626' }}>{row.actionType}</span>
    },
    { header: 'Date', accessor: 'actionDate' },
    { header: 'Description', accessor: 'description' },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'OPEN'} />
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setSelectedDisciplinary(row)}
        >
          <Eye size={14} /> View
        </button>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          My Compliance & Workplace Standards
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Mandatory workplace policies, digital sign-offs, official notices, and disciplinary records
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Active Company Policies"
          value={policies.length}
          subtitle="Corporate rules and standards"
          icon={FileText}
          color="#3b82f6"
        />
        <StatCard
          title="Signed & Acknowledged"
          value={`${acknowledgedIds.length} / ${policies.length}`}
          subtitle="Digital acknowledgement record"
          icon={CheckCircle2}
          color="#10b981"
        />
        <StatCard
          title="Official Warning Notices"
          value={myWarnings.length}
          subtitle={myWarnings.length > 0 ? "Requires compliance attention" : "No active warnings on record"}
          icon={AlertTriangle}
          color={myWarnings.length > 0 ? "#f59e0b" : "#64748b"}
        />
        <StatCard
          title="Disciplinary Actions"
          value={myDisciplinary.length}
          subtitle={myDisciplinary.length > 0 ? "Official disciplinary records" : "Clean conduct record"}
          icon={AlertOctagon}
          color={myDisciplinary.length > 0 ? "#ef4444" : "#10b981"}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setActiveTab('policies')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'policies' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'policies' ? '#2563eb' : '#64748b'
          }}
        >
          Company Policies ({policies.length})
        </button>
        <button
          onClick={() => setActiveTab('warnings')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'warnings' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'warnings' ? '#2563eb' : '#64748b'
          }}
        >
          My Warning Notices ({myWarnings.length})
        </button>
        <button
          onClick={() => setActiveTab('disciplinary')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'disciplinary' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'disciplinary' ? '#2563eb' : '#64748b'
          }}
        >
          My Disciplinary Actions ({myDisciplinary.length})
        </button>
      </div>

      {activeTab === 'policies' && (
        <div className="card">
          <DataTable
            columns={policyColumns}
            data={policies}
            loading={loading}
            searchPlaceholder="Search policies..."
          />
        </div>
      )}

      {activeTab === 'warnings' && (
        <div className="card">
          <DataTable
            columns={warningColumns}
            data={myWarnings}
            loading={loading}
            searchPlaceholder="Search warning notices..."
          />
        </div>
      )}

      {activeTab === 'disciplinary' && (
        <div className="card">
          <DataTable
            columns={disciplinaryColumns}
            data={myDisciplinary}
            loading={loading}
            searchPlaceholder="Search disciplinary actions..."
          />
        </div>
      )}

      {/* Modal: Read Policy & Digital Signature */}
      {activePolicy && (
        <Modal
          isOpen={true}
          onClose={() => setActivePolicy(null)}
          title={`${activePolicy.policyCode} — ${activePolicy.title}`}
        >
          <div style={{ background: 'var(--bg-page)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div><strong>Category:</strong> {activePolicy.category}</div>
              <div><strong>Version:</strong> v{activePolicy.version}</div>
              <div><strong>Effective Date:</strong> {activePolicy.effectiveDate}</div>
            </div>

            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
              {activePolicy.content}
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              By clicking "Acknowledge & Sign Digitally", I confirm that I have read, understood, and agree to abide by the above policy and company regulations.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button className="btn btn-secondary" onClick={() => setActivePolicy(null)}>
              Close
            </button>
            {!acknowledgedIds.includes(activePolicy.id) && (
              <button
                className="btn btn-primary"
                onClick={() => handleAcknowledge(activePolicy.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <CheckCircle2 size={16} />
                <span>Acknowledge & Sign Digitally</span>
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: Warning Details */}
      {selectedWarning && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedWarning(null)}
          title={`Warning Notice — ${selectedWarning.warningLevel}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '12px', borderRadius: '6px', color: '#92400e' }}>
              <strong>Date Issued:</strong> {selectedWarning.warningDate} · <strong>Status:</strong> {selectedWarning.status || 'ACTIVE'}
            </div>
            <div>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Reason:</span>
              <p style={{ marginTop: '4px', color: '#1e293b' }}>{selectedWarning.reason}</p>
            </div>
            {selectedWarning.actionRequired && (
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Required Corrective Action:</span>
                <p style={{ marginTop: '4px', color: '#1e293b' }}>{selectedWarning.actionRequired}</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedWarning(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Disciplinary Details */}
      {selectedDisciplinary && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDisciplinary(null)}
          title={`Disciplinary Record — ${selectedDisciplinary.actionType}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '12px', borderRadius: '6px', color: '#991b1b' }}>
              <strong>Action Date:</strong> {selectedDisciplinary.actionDate} · <strong>Status:</strong> {selectedDisciplinary.status || 'OPEN'}
            </div>
            <div>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Description:</span>
              <p style={{ marginTop: '4px', color: '#1e293b' }}>{selectedDisciplinary.description}</p>
            </div>
            {selectedDisciplinary.documentation && (
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Documentation / Reference:</span>
                <p style={{ marginTop: '4px', color: '#1e293b' }}>{selectedDisciplinary.documentation}</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedDisciplinary(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
