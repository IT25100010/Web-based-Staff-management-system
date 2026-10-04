import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { FileCheck, CheckCircle2, AlertTriangle, Plus, Eye, Trash2, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PolicyAcknowledgements = () => {
  const { role } = useAuth();
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewAck, setViewAck] = useState(null);
  const [deleteAck, setDeleteAck] = useState(null);

  // Filters
  const [policyFilter, setPolicyFilter] = useState('');

  // Form
  const [formData, setFormData] = useState({
    employeeId: '',
    policyId: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ackRes, empRes, polRes] = await Promise.all([
        apiClient.get('/compliance/acknowledgements'),
        apiClient.get('/employees'),
        apiClient.get('/compliance/policies')
      ]);
      setAcknowledgements(ackRes.data || []);
      setEmployees(empRes.data || []);
      setPolicies(polRes.data || []);
    } catch (err) {
      console.error('Error fetching acknowledgements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/compliance/acknowledgements', formData);
      setCreateModalOpen(false);
      setFormData({ employeeId: '', policyId: '' });
      fetchData();
    } catch (err) {
      alert('Error recording policy acknowledgement: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/compliance/acknowledgements/${deleteAck.id}`);
      setDeleteAck(null);
      fetchData();
    } catch (err) {
      alert('Error revoking acknowledgement: ' + (err.response?.data?.message || err.message));
    }
  };

  const canManage = role === 'HR_MANAGER' || role === 'SENIOR_ADMIN';

  const filteredData = acknowledgements.filter((a) => {
    if (!policyFilter) return true;
    return a.policy?.id?.toString() === policyFilter || a.policyId?.toString() === policyFilter;
  });

  const columns = [
    {
      header: 'Staff Member',
      accessor: 'employeeId',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : `Staff #${row.employeeId}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.employee?.employeeId || '—'} • {row.employee?.department?.name || 'Department'}
          </div>
        </div>
      )
    },
    {
      header: 'Policy Code & Title',
      accessor: 'policyId',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
            {row.policy ? `${row.policy.policyCode} — ${row.policy.title}` : `Policy #${row.policyId}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Category: {row.policy?.category || 'General'}
          </div>
        </div>
      )
    },
    {
      header: 'Signed Timestamp',
      accessor: 'acknowledgedAt',
      render: (row) => (
        <span style={{ fontSize: '0.85rem' }}>
          {row.acknowledgedAt ? new Date(row.acknowledgedAt).toLocaleString() : '—'}
        </span>
      )
    },
    {
      header: 'Audit Status',
      accessor: 'status',
      render: (row) => (
        <StatusBadge status={row.status || 'ACKNOWLEDGED'} />
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setViewAck(row)}
            title="View Sign-off Details"
            style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.5rem' }}
          >
            <Eye size={14} />
            <span>Details</span>
          </button>
          {canManage && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setDeleteAck(row)}
              title="Revoke / Delete Acknowledgement"
              style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.5rem', color: 'var(--danger)' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Policy Acknowledgement Audit
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Real-time tracking of employee digital signatures for compliance audits and legal protection
          </p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} />
            <span>Record Sign-Off</span>
          </button>
        )}
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Signed Acknowledgements"
          value={acknowledgements.length}
          subtitle="Legally binding digital sign-offs"
          icon={CheckCircle2}
          color="#10b981"
        />
        <StatCard
          title="Total Staff Monitored"
          value={employees.length}
          subtitle="Employees registered in workforce"
          icon={FileCheck}
          color="#3b82f6"
        />
        <StatCard
          title="Active Corporate Policies"
          value={policies.filter(p => p.status === 'ACTIVE').length}
          subtitle="Standards requiring sign-off"
          icon={AlertTriangle}
          color="#f59e0b"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Filter size={16} />
            <span>Filter:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>By Policy:</label>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '220px' }}
              value={policyFilter}
              onChange={(e) => setPolicyFilter(e.target.value)}
            >
              <option value="">All Policies</option>
              {policies.map(p => (
                <option key={p.id} value={p.id}>
                  {p.policyCode} — {p.title}
                </option>
              ))}
            </select>
          </div>
          {policyFilter && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPolicyFilter('')}
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          searchPlaceholder="Search by staff name, policy code, or status..."
        />
      </div>

      {/* Modal: Record Acknowledgement */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Record Policy Digital Acknowledgement"
        >
          <form onSubmit={handleCreate}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Select Employee</label>
              <select
                className="form-control"
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              >
                <option value="">Select an employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeId} - {emp.firstName} {emp.lastName} ({emp.department?.name || 'Department'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Select Policy Document</label>
              <select
                className="form-control"
                required
                value={formData.policyId}
                onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
              >
                <option value="">Select a policy...</option>
                {policies.map(pol => (
                  <option key={pol.id} value={pol.id}>
                    {pol.policyCode} — {pol.title} (v{pol.version})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Record Sign-Off
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: View Details */}
      {viewAck && (
        <Modal
          isOpen={true}
          onClose={() => setViewAck(null)}
          title="Digital Acknowledgement Audit Record"
        >
          <div style={{ background: 'var(--bg-page)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff Member</label>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {viewAck.employee ? `${viewAck.employee.firstName} ${viewAck.employee.lastName}` : `Staff #${viewAck.employeeId}`}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  NIC: {viewAck.employee?.nic || '—'} | ID: {viewAck.employee?.employeeId || '—'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Policy Document</label>
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  {viewAck.policy ? `${viewAck.policy.policyCode} — ${viewAck.policy.title}` : `Policy #${viewAck.policyId}`}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Version: v{viewAck.policy?.version || '1.0'} | Category: {viewAck.policy?.category || 'General'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Signed At</label>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {viewAck.acknowledgedAt ? new Date(viewAck.acknowledgedAt).toLocaleString() : '—'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</label>
                <div>
                  <StatusBadge status={viewAck.status || 'ACKNOWLEDGED'} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={() => setViewAck(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteAck && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteAck(null)}
          title="Revoke Policy Acknowledgement"
        >
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Are you sure you want to revoke the sign-off record for{' '}
              <strong>{deleteAck.employee ? `${deleteAck.employee.firstName} ${deleteAck.employee.lastName}` : `Staff #${deleteAck.employeeId}`}</strong>{' '}
              on policy <strong>{deleteAck.policy ? deleteAck.policy.policyCode : `Policy #${deleteAck.policyId}`}</strong>?
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '1.5rem' }}>
              This will remove the employee's documented digital compliance signature from system audits.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteAck(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDelete}
              >
                Revoke Record
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
