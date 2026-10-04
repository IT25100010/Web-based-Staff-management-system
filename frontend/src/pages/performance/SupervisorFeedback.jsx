import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { MessageSquare, Plus, Star, ThumbsUp, Eye, Edit2, Trash2, Award } from 'lucide-react';

export const SupervisorFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [formData, setFormData] = useState({
    employeeId: '',
    feedbackType: 'Operational Efficiency',
    rating: 5,
    feedbackNotes: ''
  });

  // View Modal
  const [viewFb, setViewFb] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal
  const [editFb, setEditFb] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    feedbackType: 'Operational Efficiency',
    rating: 5,
    feedbackNotes: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal
  const [deleteFb, setDeleteFb] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fbRes, empRes] = await Promise.all([
        apiClient.get('/performance/feedbacks'),
        apiClient.get('/employees')
      ]);
      setFeedbacks(fbRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await apiClient.post('/performance/feedbacks', {
        ...formData,
        rating: parseInt(formData.rating) || 5
      });
      setModalOpen(false);
      setFormData({
        employeeId: '',
        feedbackType: 'Operational Efficiency',
        rating: 5,
        feedbackNotes: ''
      });
      fetchData();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error logging feedback');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (fb) => {
    setEditFb(fb);
    setEditError('');
    setEditForm({
      feedbackType: fb.feedbackType || 'Operational Efficiency',
      rating: fb.rating || 5,
      feedbackNotes: fb.feedbackNotes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await apiClient.put(`/performance/feedbacks/${editFb.id}`, {
        ...editForm,
        rating: parseInt(editForm.rating) || 5
      });
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error updating feedback');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (fb) => {
    setDeleteFb(fb);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/performance/feedbacks/${deleteFb.id}`);
      setIsDeleteModalOpen(false);
      setDeleteFb(null);
      fetchData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error deleting feedback');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    const matchesType = !filterType || f.feedbackType === filterType;
    const matchesRating = !filterRating || f.rating?.toString() === filterRating;
    const matchesSearch = !searchQuery.trim() ||
      (f.employee?.firstName && f.employee.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.employee?.lastName && f.employee.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.employee?.employeeId && f.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.feedbackNotes && f.feedbackNotes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesRating && matchesSearch;
  });

  const columns = [
    {
      header: 'Employee Assessed',
      accessor: 'employee',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.employee?.firstName} {row.employee?.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.employee?.employeeId || `EMP-${row.employee?.id}`} • {row.employee?.department?.name || 'Dept'}
          </div>
        </div>
      )
    },
    {
      header: 'Focus Category',
      accessor: 'feedbackType',
      render: (row) => (
        <span style={{ fontWeight: 600, color: '#1e3a8a' }}>{row.feedbackType}</span>
      )
    },
    {
      header: 'Rating',
      accessor: 'rating',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={14}
              fill={i < (row.rating || 0) ? '#f59e0b' : 'transparent'}
              color={i < (row.rating || 0) ? '#f59e0b' : '#cbd5e1'}
            />
          ))}
          <span style={{ marginLeft: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
            {row.rating}/5
          </span>
        </div>
      )
    },
    {
      header: 'Supervisor Field Notes',
      accessor: 'feedbackNotes',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', color: '#475569' }}>
          {row.feedbackNotes?.length > 70 ? `${row.feedbackNotes.substring(0, 70)}...` : row.feedbackNotes}
        </span>
      )
    },
    {
      header: 'Recorded By',
      render: (row) => row.supervisor?.username || 'Shift Operations Lead'
    },
    {
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => { setViewFb(row); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Edit Feedback"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Feedback"
            onClick={() => handleOpenDelete(row)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Supervisor Shift Feedback
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Capture rapid operational feedback and safety compliance notes direct from site supervisors
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} />
          <span>Log Field Feedback</span>
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Total Logged Observations"
          value={`${feedbacks.length} Notes`}
          subtitle="Supervisor shift logs"
          icon={MessageSquare}
          color="#3b82f6"
        />
        <StatCard
          title="Safety & Compliance Rate"
          value="96.2%"
          subtitle="Zero incident rating"
          icon={ThumbsUp}
          color="#10b981"
        />
        <StatCard
          title="Average Shift Rating"
          value="4.7 / 5.0"
          subtitle="Terminal operational score"
          icon={Star}
          color="#f59e0b"
        />
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1rem', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '200px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Operational Efficiency">Operational Efficiency</option>
            <option value="Safety Compliance">Safety Compliance</option>
            <option value="Teamwork & Coordination">Teamwork & Coordination</option>
            <option value="Leadership on Deck">Leadership on Deck</option>
          </select>

          <select
            className="form-control"
            style={{ width: '150px' }}
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="Search notes or employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredFeedbacks}
          loading={loading}
          searchPlaceholder="Filter feedback entries..."
        />
      </div>

      {/* MODAL 1: Log Feedback */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log Supervisor Field Observation"
      >
        <form onSubmit={handleCreate}>
          {addError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
              {addError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Employee Under Review *</label>
            <select
              className="form-control"
              required
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            >
              <option value="">Select registered employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeId || `EMP-${emp.id}`} — {emp.firstName} {emp.lastName} ({emp.department?.name})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Observation Category</label>
              <select
                className="form-control"
                value={formData.feedbackType}
                onChange={(e) => setFormData({ ...formData, feedbackType: e.target.value })}
              >
                <option value="Operational Efficiency">Operational Efficiency</option>
                <option value="Safety Compliance">Safety Compliance</option>
                <option value="Teamwork & Coordination">Teamwork & Coordination</option>
                <option value="Leadership on Deck">Leadership on Deck</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Rating (1 to 5 Stars)</label>
              <select
                className="form-control"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              >
                <option value="5">5 - Outstanding Performance</option>
                <option value="4">4 - Good / Reliable</option>
                <option value="3">3 - Satisfactory</option>
                <option value="2">2 - Needs Attention</option>
                <option value="1">1 - Unsatisfactory</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Supervisor Notes & Remarks *</label>
            <textarea
              className="form-control"
              rows={3}
              required
              placeholder="State concrete observations, adherence to protocols, and incident details"
              value={formData.feedbackNotes}
              onChange={(e) => setFormData({ ...formData, feedbackNotes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Saving...' : 'Save Feedback'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: View Details */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Supervisor Observation Details">
        {viewFb && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
                  {viewFb.employee?.firstName} {viewFb.employee?.lastName}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {viewFb.employee?.employeeId} • {viewFb.employee?.department?.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={16} fill="#f59e0b" color="#f59e0b" />
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{viewFb.rating}/5</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Focus Category</span>
                <strong style={{ color: '#1e3a8a' }}>{viewFb.feedbackType}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Assessing Supervisor</span>
                <strong>{viewFb.supervisor?.username || 'Shift Lead'}</strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Field Notes</span>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155' }}>{viewFb.feedbackNotes}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Edit Feedback */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Shift Feedback">
        {editFb && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Observation Category</label>
                <select
                  className="form-control"
                  value={editForm.feedbackType}
                  onChange={(e) => setEditForm({ ...editForm, feedbackType: e.target.value })}
                >
                  <option value="Operational Efficiency">Operational Efficiency</option>
                  <option value="Safety Compliance">Safety Compliance</option>
                  <option value="Teamwork & Coordination">Teamwork & Coordination</option>
                  <option value="Leadership on Deck">Leadership on Deck</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Rating</label>
                <select
                  className="form-control"
                  value={editForm.rating}
                  onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })}
                >
                  <option value="5">5 - Outstanding</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Satisfactory</option>
                  <option value="2">2 - Needs Attention</option>
                  <option value="1">1 - Unsatisfactory</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={3}
                required
                value={editForm.feedbackNotes}
                onChange={(e) => setEditForm({ ...editForm, feedbackNotes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Update Feedback'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: Delete Feedback */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Feedback Record">
        {deleteFb && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to delete this observation record for <strong>{deleteFb.employee?.firstName} {deleteFb.employee?.lastName}</strong>?
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
