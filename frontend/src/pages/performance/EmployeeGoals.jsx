import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Target, Plus, CheckCircle, Clock, Eye, Edit2, Trash2, Calendar } from 'lucide-react';

export const EmployeeGoals = () => {
  const [goals, setGoals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [formData, setFormData] = useState({
    employeeId: '',
    goalTitle: '',
    targetDescription: '',
    deadline: '',
    progressPercentage: '0',
    status: 'IN_PROGRESS'
  });

  // View Modal
  const [viewGoal, setViewGoal] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal
  const [editGoal, setEditGoal] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    goalTitle: '',
    targetDescription: '',
    deadline: '',
    progressPercentage: '0',
    status: 'IN_PROGRESS'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal
  const [deleteGoal, setDeleteGoal] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [goalsRes, empRes] = await Promise.all([
        apiClient.get('/performance/goals'),
        apiClient.get('/employees')
      ]);
      setGoals(goalsRes.data || []);
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
      await apiClient.post('/performance/goals', {
        ...formData,
        progressPercentage: parseInt(formData.progressPercentage) || 0
      });
      setModalOpen(false);
      setFormData({
        employeeId: '',
        goalTitle: '',
        targetDescription: '',
        deadline: '',
        progressPercentage: '0',
        status: 'IN_PROGRESS'
      });
      fetchData();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error creating goal');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (g) => {
    setEditGoal(g);
    setEditError('');
    setEditForm({
      goalTitle: g.goalTitle || '',
      targetDescription: g.targetDescription || '',
      deadline: g.deadline || '',
      progressPercentage: g.progressPercentage?.toString() || '0',
      status: g.status || 'IN_PROGRESS'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await apiClient.put(`/performance/goals/${editGoal.id}`, {
        ...editForm,
        progressPercentage: parseInt(editForm.progressPercentage) || 0
      });
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error updating goal');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (g) => {
    setDeleteGoal(g);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/performance/goals/${deleteGoal.id}`);
      setIsDeleteModalOpen(false);
      setDeleteGoal(null);
      fetchData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error deleting goal');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredGoals = goals.filter((g) => {
    const matchesStatus = !filterStatus || g.status === filterStatus;
    const matchesSearch = !searchQuery.trim() ||
      (g.goalTitle && g.goalTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (g.targetDescription && g.targetDescription.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (g.employee?.firstName && g.employee.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (g.employee?.lastName && g.employee.lastName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const columns = [
    {
      header: 'Goal Title & Description',
      accessor: 'goalTitle',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.goalTitle}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.targetDescription}</div>
        </div>
      )
    },
    {
      header: 'Staff Member',
      accessor: 'employee',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600 }}>
            {row.employee?.firstName} {row.employee?.lastName}
          </span>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.employee?.employeeId}</div>
        </div>
      )
    },
    {
      header: 'Progress',
      accessor: 'progressPercentage',
      render: (row) => (
        <div style={{ width: '130px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
            <span>Completed</span>
            <span style={{ fontWeight: 600 }}>{row.progressPercentage || 0}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, row.progressPercentage || 0)}%`,
                height: '100%',
                background: (row.progressPercentage || 0) >= 100 ? '#10b981' : '#2563eb',
                borderRadius: '3px'
              }}
            />
          </div>
        </div>
      )
    },
    {
      header: 'Target Deadline',
      accessor: 'deadline'
    },
    {
      header: 'Goal Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'IN_PROGRESS'} />
    },
    {
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => { setViewGoal(row); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Update Progress"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Goal"
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
            Employee Professional Goals & Milestones
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Monitor individualized target objectives, skill upscaling milestones, and delivery deadlines
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} />
          <span>Set Employee Goal</span>
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Active Performance Goals"
          value={`${goals.filter(g => g.status === 'IN_PROGRESS').length} In Progress`}
          subtitle="Ongoing delivery targets"
          icon={Target}
          color="#3b82f6"
        />
        <StatCard
          title="Achieved Milestones"
          value={`${goals.filter(g => g.status === 'ACHIEVED').length} Completed`}
          subtitle="Successfully fulfilled targets"
          icon={CheckCircle}
          color="#10b981"
        />
        <StatCard
          title="Overall Goal Completion"
          value="74.2%"
          subtitle="On track for target cycle"
          icon={Clock}
          color="#8b5cf6"
        />
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1rem', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '180px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ACHIEVED">Achieved</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="Search goals by title, description, employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredGoals}
          loading={loading}
          searchPlaceholder="Filter goals..."
        />
      </div>

      {/* MODAL 1: Set Employee Goal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Establish Employee Target Goal"
      >
        <form onSubmit={handleCreate}>
          {addError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
              {addError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Assign to Employee *</label>
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

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Goal Title *</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Master STS Crane Tele-Operation Certification"
              value={formData.goalTitle}
              onChange={(e) => setFormData({ ...formData, goalTitle: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Target Completion Deadline *</label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Initial Progress (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="form-control"
                value={formData.progressPercentage}
                onChange={(e) => setFormData({ ...formData, progressPercentage: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Success Criteria & Scope *</label>
            <textarea
              className="form-control"
              rows={3}
              required
              placeholder="State measurable target criteria, testing benchmarks, and required outputs"
              value={formData.targetDescription}
              onChange={(e) => setFormData({ ...formData, targetDescription: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Setting...' : 'Set Goal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: View Details */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Goal Details">
        {viewGoal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e3a8a' }}>{viewGoal.goalTitle}</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {viewGoal.employee?.firstName} {viewGoal.employee?.lastName} ({viewGoal.employee?.employeeId})
                </span>
              </div>
              <StatusBadge status={viewGoal.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Target Deadline</span>
                <strong>{viewGoal.deadline}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Progress Level</span>
                <strong style={{ color: '#0369a1', fontSize: '1.1rem' }}>{viewGoal.progressPercentage}% Completed</strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Target Scope & Deliverables</span>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155' }}>{viewGoal.targetDescription || '—'}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Edit Goal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Update Goal & Progress">
        {editGoal && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {editError}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Goal Title *</label>
              <input
                type="text"
                required
                className="form-control"
                value={editForm.goalTitle}
                onChange={(e) => setEditForm({ ...editForm, goalTitle: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Target Deadline *</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Progress Percentage (0 - 100%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  className="form-control"
                  value={editForm.progressPercentage}
                  onChange={(e) => setEditForm({ ...editForm, progressPercentage: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ACHIEVED">Achieved</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Target Description *</label>
              <textarea
                className="form-control"
                rows={3}
                required
                value={editForm.targetDescription}
                onChange={(e) => setEditForm({ ...editForm, targetDescription: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Update Goal'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: Delete Goal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Employee Goal">
        {deleteGoal && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to delete the goal <strong>{deleteGoal.goalTitle}</strong> for{' '}
              <strong>{deleteGoal.employee?.firstName} {deleteGoal.employee?.lastName}</strong>?
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
