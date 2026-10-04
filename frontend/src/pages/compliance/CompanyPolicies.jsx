import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { FileCheck, Plus, Eye, ShieldAlert, CheckCircle2, Pencil, Trash2, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const CompanyPolicies = () => {
  const { role } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewPolicy, setViewPolicy] = useState(null);
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    policyCode: '',
    title: '',
    category: 'Health & Safety',
    content: '',
    version: '1.0',
    effectiveDate: '',
    status: 'ACTIVE'
  });

  const [editFormData, setEditFormData] = useState({
    title: '',
    category: 'Health & Safety',
    content: '',
    version: '1.0',
    effectiveDate: '',
    status: 'ACTIVE'
  });

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/compliance/policies');
      setPolicies(res.data || []);
    } catch (err) {
      console.error('Error fetching policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/compliance/policies', formData);
      setModalOpen(false);
      setFormData({
        policyCode: '',
        title: '',
        category: 'Health & Safety',
        content: '',
        version: '1.0',
        effectiveDate: '',
        status: 'ACTIVE'
      });
      fetchPolicies();
    } catch (err) {
      alert('Error publishing policy: ' + (err.response?.data?.message || err.message));
    }
  };

  const openEditModal = (policy) => {
    setSelectedPolicy(policy);
    setEditFormData({
      title: policy.title || '',
      category: policy.category || 'Health & Safety',
      content: policy.content || '',
      version: policy.version || '1.0',
      effectiveDate: policy.effectiveDate || '',
      status: policy.status || 'ACTIVE'
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/compliance/policies/${selectedPolicy.id}`, editFormData);
      setEditModalOpen(false);
      setSelectedPolicy(null);
      fetchPolicies();
    } catch (err) {
      alert('Error updating policy: ' + (err.response?.data?.message || err.message));
    }
  };

  const openDeleteModal = (policy) => {
    setSelectedPolicy(policy);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      const res = await apiClient.delete(`/compliance/policies/${selectedPolicy.id}`);
      if (res.data?.message) {
        alert(res.data.message);
      }
      setDeleteModalOpen(false);
      setSelectedPolicy(null);
      fetchPolicies();
    } catch (err) {
      alert('Error removing policy: ' + (err.response?.data?.message || err.message));
    }
  };

  const canManage = role === 'HR_MANAGER' || role === 'SENIOR_ADMIN';

  const filteredPolicies = policies.filter((p) => {
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesCategory && matchesStatus;
  });

  const columns = [
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
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>v{row.version}</span>
      )
    },
    {
      header: 'Effective Date',
      accessor: 'effectiveDate'
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <StatusBadge status={row.status || 'ACTIVE'} />
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setViewPolicy(row)}
            title="Read Document"
            style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem' }}
          >
            <Eye size={14} />
            <span>Read</span>
          </button>
          {canManage && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => openEditModal(row)}
                title="Edit Policy"
                style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.5rem' }}
              >
                <Pencil size={14} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => openDeleteModal(row)}
                title="Delete or Archive Policy"
                style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.5rem', color: 'var(--danger)' }}
              >
                <Trash2 size={14} />
              </button>
            </>
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
            Company Operational Policies & Standards
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Official corporate directives, occupational safety standards, and employment guidelines
          </p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} />
            <span>Publish New Policy</span>
          </button>
        )}
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Active Corporate Policies"
          value={policies.filter(p => p.status === 'ACTIVE').length}
          subtitle="Enforced across all work sites"
          icon={FileCheck}
          color="#3b82f6"
        />
        <StatCard
          title="Archived Directives"
          value={policies.filter(p => p.status === 'ARCHIVED').length}
          subtitle="Historical policies safely preserved"
          icon={CheckCircle2}
          color="#10b981"
        />
        <StatCard
          title="Total Policies"
          value={policies.length}
          subtitle="All catalogued compliance standards"
          icon={ShieldAlert}
          color="#8b5cf6"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Filter size={16} />
            <span>Filters:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Category:</label>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '170px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Health & Safety">Health & Safety</option>
              <option value="Code of Conduct">Code of Conduct</option>
              <option value="Attendance">Attendance</option>
              <option value="Operational Protocols">Operational Protocols</option>
              <option value="IT & Data Security">IT & Data Security</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</label>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '140px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          {(categoryFilter || statusFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setCategoryFilter(''); setStatusFilter(''); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredPolicies}
          loading={loading}
          searchPlaceholder="Search policies by code, title, or category..."
        />
      </div>

      {/* Modal: Publish Policy */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Publish New Corporate Policy"
      >
        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Policy Code</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. POL-HS-01"
                value={formData.policyCode}
                onChange={(e) => setFormData({ ...formData, policyCode: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Policy Title</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Enter policy title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Health & Safety">Health & Safety</option>
                <option value="Code of Conduct">Code of Conduct</option>
                <option value="Attendance">Attendance</option>
                <option value="Operational Protocols">Operational Protocols</option>
                <option value="IT & Data Security">IT & Data Security</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Version</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. 1.0"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Effective Date</label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Full Policy Text & Directives</label>
            <textarea
              className="form-control"
              rows={5}
              required
              placeholder="Enter policy text and directives"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Publish Directive
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Policy */}
      {editModalOpen && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => { setEditModalOpen(false); setSelectedPolicy(null); }}
          title={`Edit Policy — ${selectedPolicy?.policyCode}`}
        >
          <form onSubmit={handleUpdate}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Policy Title</label>
              <input
                type="text"
                required
                className="form-control"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-control"
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                >
                  <option value="Health & Safety">Health & Safety</option>
                  <option value="Code of Conduct">Code of Conduct</option>
                  <option value="Attendance">Attendance</option>
                  <option value="Operational Protocols">Operational Protocols</option>
                  <option value="IT & Data Security">IT & Data Security</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Version</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={editFormData.version}
                  onChange={(e) => setEditFormData({ ...editFormData, version: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Effective Date</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={editFormData.effectiveDate}
                  onChange={(e) => setEditFormData({ ...editFormData, effectiveDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Enforcement Status</label>
                <select
                  className="form-control"
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Full Policy Text & Directives</label>
              <textarea
                className="form-control"
                rows={6}
                required
                value={editFormData.content}
                onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setEditModalOpen(false); setSelectedPolicy(null); }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: View Full Policy Document */}
      {viewPolicy && (
        <Modal
          isOpen={true}
          onClose={() => setViewPolicy(null)}
          title={`${viewPolicy.policyCode} — ${viewPolicy.title}`}
        >
          <div style={{ background: 'var(--bg-page)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div><strong>Category:</strong> {viewPolicy.category}</div>
              <div><strong>Version:</strong> v{viewPolicy.version}</div>
              <div><strong>Effective Date:</strong> {viewPolicy.effectiveDate}</div>
              <div><strong>Status:</strong> <StatusBadge status={viewPolicy.status || 'ACTIVE'} /></div>
            </div>

            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {viewPolicy.content}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={() => setViewPolicy(null)}>
              Close Document
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Delete / Archive Confirmation */}
      {deleteModalOpen && selectedPolicy && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => { setDeleteModalOpen(false); setSelectedPolicy(null); }}
          title="Confirm Policy Deletion / Archive"
        >
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Are you sure you want to delete policy <strong>{selectedPolicy.policyCode} ({selectedPolicy.title})</strong>?
            </p>
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '1.5rem' }}>
              <strong>Safe Archive Protection:</strong> If any staff member has already acknowledged this policy, it will automatically be safely <strong>ARCHIVED</strong> rather than permanently deleted, preserving legal audit trail records.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setDeleteModalOpen(false); setSelectedPolicy(null); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDelete}
              >
                Confirm Delete / Archive
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
