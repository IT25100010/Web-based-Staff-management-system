import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Layers, Plus, Eye, Edit2, Trash2, Calendar, Users } from 'lucide-react';

export const WorkforcePlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    planName: '',
    startDate: '',
    endDate: '',
    requiredHeadcount: '',
    description: '',
    status: 'ACTIVE'
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // View Modal
  const [viewPlan, setViewPlan] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal
  const [editPlan, setEditPlan] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    planName: '',
    startDate: '',
    endDate: '',
    requiredHeadcount: '',
    description: '',
    status: 'ACTIVE'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal
  const [deletePlan, setDeletePlan] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/workforce/plans');
      setPlans(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await apiClient.post('/workforce/plans', {
        ...form,
        requiredHeadcount: parseInt(form.requiredHeadcount) || 1
      });
      setIsModalOpen(false);
      setForm({ planName: '', startDate: '', endDate: '', requiredHeadcount: '', description: '', status: 'ACTIVE' });
      loadPlans();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error creating workforce plan');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (plan) => {
    setEditPlan(plan);
    setEditError('');
    setEditForm({
      planName: plan.planName || '',
      startDate: plan.startDate || '',
      endDate: plan.endDate || '',
      requiredHeadcount: plan.requiredHeadcount?.toString() || '1',
      description: plan.description || '',
      status: plan.status || 'ACTIVE'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await apiClient.put(`/workforce/plans/${editPlan.id}`, {
        ...editForm,
        requiredHeadcount: parseInt(editForm.requiredHeadcount) || 1
      });
      setIsEditModalOpen(false);
      loadPlans();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error updating workforce plan');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (plan) => {
    setDeletePlan(plan);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/workforce/plans/${deletePlan.id}`);
      setIsDeleteModalOpen(false);
      setDeletePlan(null);
      loadPlans();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error deleting workforce plan');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    const matchesStatus = !filterStatus || p.status === filterStatus;
    const matchesSearch = !searchQuery.trim() ||
      (p.planName && p.planName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const columns = [
    { 
      header: 'Plan Name', 
      accessor: 'planName', 
      render: (r) => <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{r.planName}</span> 
    },
    { header: 'Period', render: (r) => `${r.startDate} to ${r.endDate}` },
    { 
      header: 'Required Headcount', 
      accessor: 'requiredHeadcount', 
      render: (r) => <strong style={{ color: '#0f172a' }}>{r.requiredHeadcount} Staff</strong> 
    },
    { header: 'Description', accessor: 'description', render: (r) => r.description || '—' },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => { setViewPlan(r); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Edit Plan"
            onClick={() => handleOpenEdit(r)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Plan"
            onClick={() => handleOpenDelete(r)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workforce Strategic Planning</h1>
          <p className="page-description">
            Define headcount capacity, seasonal demand targets, and site resource allocations.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} /> Create Workforce Plan
        </button>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Status:</span>
            <select
              className="form-control"
              style={{ width: '150px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by plan name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={filteredPlans} loading={loading} searchPlaceholder="Filter plans..." />
      </div>

      {/* MODAL 1: CREATE PLAN */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Strategic Workforce Plan">
        <form onSubmit={handleCreate}>
          {addError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
              {addError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Plan Name *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Q4 Peak Port Operations Plan"
              value={form.planName}
              onChange={(e) => setForm({ ...form, planName: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Required Headcount *</label>
              <input
                type="number"
                min="1"
                className="form-control"
                required
                placeholder="Number of staff"
                value={form.requiredHeadcount}
                onChange={(e) => setForm({ ...form, requiredHeadcount: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Outline operational objectives and staffing targets"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Saving...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW DETAILS */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Workforce Plan Details">
        {viewPlan && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e3a8a' }}>{viewPlan.planName}</h3>
              <StatusBadge status={viewPlan.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Timeline</span>
                <strong>{viewPlan.startDate} to {viewPlan.endDate}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Required Headcount</span>
                <strong style={{ color: '#0f172a' }}>{viewPlan.requiredHeadcount} Employees</strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Strategic Scope / Objectives</span>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155' }}>{viewPlan.description || 'No detailed scope provided.'}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(viewPlan);
                }}
              >
                Edit Plan
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: EDIT PLAN */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Workforce Plan">
        {editPlan && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {editError}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Plan Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={editForm.planName}
                onChange={(e) => setEditForm({ ...editForm, planName: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Required Headcount *</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  required
                  value={editForm.requiredHeadcount}
                  onChange={(e) => setEditForm({ ...editForm, requiredHeadcount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Update Plan'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: DELETE PLAN */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Workforce Plan">
        {deletePlan && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to permanently delete the workforce plan <strong>{deletePlan.planName}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
