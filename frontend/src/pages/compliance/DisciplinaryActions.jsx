import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Shield, Plus, CheckCircle2, AlertCircle, Eye, Pencil, Trash2, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DisciplinaryActions = () => {
  const { role } = useAuth();
  const [actions, setActions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewAction, setViewAction] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    employeeId: '',
    actionType: 'Safety Retraining & Counseling',
    actionDate: '',
    description: '',
    documentation: '',
    status: 'RECORDED'
  });

  const [editFormData, setEditFormData] = useState({
    actionType: 'Safety Retraining & Counseling',
    actionDate: '',
    description: '',
    documentation: '',
    status: 'RECORDED'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aRes, empRes] = await Promise.all([
        apiClient.get('/compliance/disciplinary'),
        apiClient.get('/employees')
      ]);
      setActions(aRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error('Error fetching disciplinary actions:', err);
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
      await apiClient.post('/compliance/disciplinary', formData);
      setCreateModalOpen(false);
      setFormData({
        employeeId: '',
        actionType: 'Safety Retraining & Counseling',
        actionDate: '',
        description: '',
        documentation: '',
        status: 'RECORDED'
      });
      fetchData();
    } catch (err) {
      alert('Error recording disciplinary action: ' + (err.response?.data?.message || err.message));
    }
  };

  const openEditModal = (a) => {
    setSelectedAction(a);
    setEditFormData({
      actionType: a.actionType || 'Safety Retraining & Counseling',
      actionDate: a.actionDate || '',
      description: a.description || '',
      documentation: a.documentation || '',
      status: a.status || 'RECORDED'
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/compliance/disciplinary/${selectedAction.id}`, editFormData);
      setEditModalOpen(false);
      setSelectedAction(null);
      fetchData();
    } catch (err) {
      alert('Error updating disciplinary action: ' + (err.response?.data?.message || err.message));
    }
  };

  const openDeleteModal = (a) => {
    setSelectedAction(a);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/compliance/disciplinary/${selectedAction.id}`);
      setDeleteModalOpen(false);
      setSelectedAction(null);
      fetchData();
    } catch (err) {
      alert('Error deleting disciplinary action: ' + (err.response?.data?.message || err.message));
    }
  };

  const canManage = role === 'HR_MANAGER' || role === 'SENIOR_ADMIN';

  const filteredActions = actions.filter((a) => {
    const matchesType = !typeFilter || a.actionType === typeFilter;
    const matchesStatus = !statusFilter || a.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const columns = [
    {
      header: 'Employee Involved',
      accessor: 'employee',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.employee?.firstName} {row.employee?.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.employee?.employeeId} • {row.employee?.department?.name || 'Staff'}
          </div>
        </div>
      )
    },
    {
      header: 'Disciplinary Action Type',
      accessor: 'actionType',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{row.actionType}</span>
      )
    },
    {
      header: 'Inquiry Findings & Directives',
      accessor: 'description',
      render: (row) => (
        <div style={{ maxWidth: '300px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {row.description}
        </div>
      )
    },
    {
      header: 'Formal Dossier Ref',
      accessor: 'documentation',
      render: (row) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {row.documentation || '—'}
        </span>
      )
    },
    {
      header: 'Action Date',
      accessor: 'actionDate'
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <StatusBadge status={row.status || 'RECORDED'} />
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setViewAction(row)}
            title="View Details"
            style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.5rem' }}
          >
            <Eye size={14} />
            <span>Details</span>
          </button>
          {canManage && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => openEditModal(row)}
                title="Edit Record"
                style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.5rem' }}
              >
                <Pencil size={14} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => openDeleteModal(row)}
                title="Delete Record"
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
            Formal Disciplinary Actions & Inquiries
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Official records of domestic inquiries, corrective counseling, and statutory tribunal compliance
          </p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} />
            <span>Record Disciplinary Action</span>
          </button>
        )}
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Total Actions Recorded"
          value={actions.length}
          subtitle="Formal domestic inquiries"
          icon={Shield}
          color="#3b82f6"
        />
        <StatCard
          title="Active Monitoring"
          value={actions.filter(a => a.status === 'RECORDED' || a.status === 'UNDER_REVIEW').length}
          subtitle="Pending post-inquiry review"
          icon={AlertCircle}
          color="#f59e0b"
        />
        <StatCard
          title="Resolved Actions"
          value={actions.filter(a => a.status === 'RESOLVED').length}
          subtitle="Completed corrective actions"
          icon={CheckCircle2}
          color="#10b981"
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
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Action Type:</label>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '220px' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Action Types</option>
              <option value="Safety Retraining & Counseling">Safety Retraining & Counseling</option>
              <option value="Official Reprimand on Dossier">Official Reprimand on Dossier</option>
              <option value="Temporary Shift Suspension">Temporary Shift Suspension</option>
              <option value="Demotion / Reassignment">Demotion / Reassignment</option>
              <option value="Employment Termination">Employment Termination</option>
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
              <option value="RECORDED">RECORDED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>
          {(typeFilter || statusFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setTypeFilter(''); setStatusFilter(''); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredActions}
          loading={loading}
          searchPlaceholder="Search by employee name, action type, or dossier..."
        />
      </div>

      {/* Modal: Record Action */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Record Formal Disciplinary Action"
        >
          <form onSubmit={handleCreate}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Employee</label>
              <select
                className="form-control"
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              >
                <option value="">Select employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeId} - {emp.firstName} {emp.lastName} ({emp.department?.name || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Action Measure</label>
                <select
                  className="form-control"
                  value={formData.actionType}
                  onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                >
                  <option value="Safety Retraining & Counseling">Safety Retraining & Counseling</option>
                  <option value="Official Reprimand on Dossier">Official Reprimand on Dossier</option>
                  <option value="Temporary Shift Suspension">Temporary Shift Suspension</option>
                  <option value="Demotion / Reassignment">Demotion / Reassignment</option>
                  <option value="Employment Termination">Employment Termination</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Execution Date</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={formData.actionDate}
                  onChange={(e) => setFormData({ ...formData, actionDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Findings of Formal Inquiry</label>
              <textarea
                className="form-control"
                rows={3}
                required
                placeholder="Detail the inquiry conclusions and disciplinary verdict"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Supporting Document / File Reference</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. INQ-2025-089-A"
                value={formData.documentation}
                onChange={(e) => setFormData({ ...formData, documentation: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Commit Record
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Edit Action */}
      {editModalOpen && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => { setEditModalOpen(false); setSelectedAction(null); }}
          title={`Edit Disciplinary Record — ${selectedAction?.employee?.firstName} ${selectedAction?.employee?.lastName}`}
        >
          <form onSubmit={handleUpdate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Action Measure</label>
                <select
                  className="form-control"
                  value={editFormData.actionType}
                  onChange={(e) => setEditFormData({ ...editFormData, actionType: e.target.value })}
                >
                  <option value="Safety Retraining & Counseling">Safety Retraining & Counseling</option>
                  <option value="Official Reprimand on Dossier">Official Reprimand on Dossier</option>
                  <option value="Temporary Shift Suspension">Temporary Shift Suspension</option>
                  <option value="Demotion / Reassignment">Demotion / Reassignment</option>
                  <option value="Employment Termination">Employment Termination</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Execution Date</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={editFormData.actionDate}
                  onChange={(e) => setEditFormData({ ...editFormData, actionDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              >
                <option value="RECORDED">RECORDED</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Findings of Formal Inquiry</label>
              <textarea
                className="form-control"
                rows={3}
                required
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Supporting Document / File Reference</label>
              <input
                type="text"
                className="form-control"
                value={editFormData.documentation}
                onChange={(e) => setEditFormData({ ...editFormData, documentation: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setEditModalOpen(false); setSelectedAction(null); }}
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

      {/* Modal: View Details */}
      {viewAction && (
        <Modal
          isOpen={true}
          onClose={() => setViewAction(null)}
          title="Formal Disciplinary Action Dossier"
        >
          <div style={{ background: 'var(--bg-page)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff Member</label>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {viewAction.employee?.firstName} {viewAction.employee?.lastName}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ID: {viewAction.employee?.employeeId} | Dept: {viewAction.employee?.department?.name || 'Staff'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Action Measure</label>
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  {viewAction.actionType}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Execution Date: {viewAction.actionDate}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inquiry Findings & Directives</label>
              <div style={{ marginTop: '0.25rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {viewAction.description}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dossier Documentation Ref</label>
                <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {viewAction.documentation || '—'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</label>
                <div><StatusBadge status={viewAction.status || 'RECORDED'} /></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={() => setViewAction(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteModalOpen && selectedAction && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => { setDeleteModalOpen(false); setSelectedAction(null); }}
          title="Confirm Disciplinary Action Deletion"
        >
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Are you sure you want to delete the disciplinary record for{' '}
              <strong>{selectedAction.employee?.firstName} {selectedAction.employee?.lastName}</strong> ({selectedAction.actionType})?
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '1.5rem' }}>
              This record will be permanently deleted from the employee's formal compliance dossier.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setDeleteModalOpen(false); setSelectedAction(null); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDelete}
              >
                Delete Record
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
