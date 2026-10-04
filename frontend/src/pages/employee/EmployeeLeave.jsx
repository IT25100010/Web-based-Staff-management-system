import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CalendarCheck, Plus, CheckCircle2, Umbrella, Eye, Edit2, Trash2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const EmployeeLeave = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Apply Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: user?.employeeId || '',
    leaveType: 'Casual',
    startDate: '',
    endDate: '',
    totalDays: '1',
    reason: ''
  });

  // View Details Modal
  const [viewRecord, setViewRecord] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Pending Modal
  const [editRecord, setEditRecord] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    leaveType: 'Casual',
    startDate: '',
    endDate: '',
    totalDays: '1',
    reason: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Cancel / Delete Modal
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/attendance/leaves');
      const all = res.data || [];
      const empId = user?.employeeId;
      const myLeaves = empId ? all.filter(l => l.employee?.id === empId || l.employee?.employeeId === empId) : all;
      setLeaves(myLeaves);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    setApplyLoading(true);
    setApplyError('');
    try {
      await apiClient.post('/attendance/leaves', {
        ...formData,
        employeeId: user?.employeeId,
        totalDays: parseInt(formData.totalDays) || 1
      });
      setModalOpen(false);
      setFormData({
        employeeId: user?.employeeId || '',
        leaveType: 'Casual',
        startDate: '',
        endDate: '',
        totalDays: '1',
        reason: ''
      });
      fetchLeaves();
    } catch (err) {
      setApplyError(err.response?.data?.message || err.message || 'Error submitting leave');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleOpenEdit = (row) => {
    setEditRecord(row);
    setEditError('');
    setEditForm({
      leaveType: row.leaveType || 'Casual',
      startDate: row.startDate || '',
      endDate: row.endDate || '',
      totalDays: row.totalDays?.toString() || '1',
      reason: row.reason || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await apiClient.put(`/attendance/leaves/${editRecord.id}`, {
        leaveType: editForm.leaveType,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        totalDays: parseInt(editForm.totalDays) || 1,
        reason: editForm.reason
      });
      setIsEditModalOpen(false);
      fetchLeaves();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update leave request');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (row) => {
    setDeleteRecord(row);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/attendance/leaves/${deleteRecord.id}`);
      setIsDeleteModalOpen(false);
      setDeleteRecord(null);
      fetchLeaves();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to cancel leave request');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredLeaves = leaves.filter((l) => {
    const matchesStatus = !filterStatus || l.status === filterStatus;
    const matchesType = !filterType || l.leaveType === filterType;
    const matchesSearch = !searchQuery.trim() || 
      (l.reason && l.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.leaveType && l.leaveType.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesType && matchesSearch;
  });

  const columns = [
    {
      header: 'Leave Type',
      accessor: 'leaveType',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{row.leaveType} Leave</span>
      )
    },
    {
      header: 'Period',
      render: (row) => `${row.startDate} to ${row.endDate}`
    },
    {
      header: 'Duration',
      accessor: 'totalDays',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>{row.totalDays} day(s)</span>
      )
    },
    {
      header: 'Reason',
      accessor: 'reason',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{row.reason}</span>
      )
    },
    {
      header: 'Approval Status',
      accessor: 'status',
      render: (row) => (
        <StatusBadge status={row.status || 'PENDING'} />
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => { setViewRecord(row); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          {row.status === 'PENDING' && (
            <>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                title="Edit Request"
                onClick={() => handleOpenEdit(row)}
              >
                <Edit2 size={13} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
                title="Cancel Request"
                onClick={() => handleOpenDelete(row)}
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  const annualUsed = leaves.filter(l => l.leaveType === 'Annual' && l.status === 'APPROVED').reduce((acc, l) => acc + (l.totalDays || 0), 0);
  const casualUsed = leaves.filter(l => l.leaveType === 'Casual' && l.status === 'APPROVED').reduce((acc, l) => acc + (l.totalDays || 0), 0);
  const medicalUsed = leaves.filter(l => l.leaveType === 'Medical' && l.status === 'APPROVED').reduce((acc, l) => acc + (l.totalDays || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            My Leave Applications & Balances
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Submit statutory leave requests, review entitlements under Sri Lanka Shop & Office Act
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Sri Lanka Statutory Leave Balance Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Annual Leave"
          value={`${Math.max(0, 14 - annualUsed)} / 14 Days`}
          subtitle={`${annualUsed} days utilized this year`}
          icon={Umbrella}
          color="#3b82f6"
        />
        <StatCard
          title="Casual Leave"
          value={`${Math.max(0, 7 - casualUsed)} / 7 Days`}
          subtitle={`${casualUsed} days utilized this year`}
          icon={CalendarCheck}
          color="#10b981"
        />
        <StatCard
          title="Medical Leave"
          value={`${Math.max(0, 14 - medicalUsed)} / 14 Days`}
          subtitle={`${medicalUsed} days utilized this year`}
          icon={CheckCircle2}
          color="#8b5cf6"
        />
      </div>

      {/* Filter bar */}
      <div className="card" style={{ marginBottom: '1rem', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '150px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            className="form-control"
            style={{ width: '150px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Annual">Annual</option>
            <option value="Casual">Casual</option>
            <option value="Medical">Medical</option>
            <option value="Maternity / Special">Maternity / Special</option>
          </select>

          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '180px' }}
            placeholder="Search my leaves..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredLeaves}
          loading={loading}
          searchPlaceholder="Filter leaves..."
        />
      </div>

      {/* MODAL 1: Apply for Leave */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Apply for Statutory Leave"
      >
        <form onSubmit={handleApply}>
          {applyError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
              {applyError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Leave Category</label>
            <select
              className="form-control"
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
            >
              <option value="Annual">Annual Leave (14 days entitlement)</option>
              <option value="Casual">Casual Leave (7 days entitlement)</option>
              <option value="Medical">Medical Leave (14 days entitlement)</option>
              <option value="Maternity / Special">Maternity / Special Leave</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Total Days Requested</label>
            <input
              type="number"
              min="1"
              max="14"
              required
              className="form-control"
              placeholder="Enter number of days"
              value={formData.totalDays}
              onChange={(e) => setFormData({ ...formData, totalDays: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Reason / Justification</label>
            <textarea
              className="form-control"
              rows={3}
              required
              placeholder="Enter reason for absence"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={applyLoading}>
              {applyLoading ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: View Details */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Leave Request Details">
        {viewRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 600, fontSize: '1.05rem', color: '#0f172a' }}>{viewRecord.leaveType} Leave</span>
              <StatusBadge status={viewRecord.status} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Duration</span>
                <strong>{viewRecord.totalDays} Day(s)</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Period</span>
                <strong>{viewRecord.startDate} to {viewRecord.endDate}</strong>
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Reason</span>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>{viewRecord.reason}</p>
            </div>
            {viewRecord.remarks && (
              <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                <span style={{ color: '#1e40af', display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>
                  HR Manager Remarks
                </span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e3a8a' }}>{viewRecord.remarks}</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Edit Pending Request */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Pending Leave">
        {editRecord && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {editError}
              </div>
            )}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Leave Category</label>
              <select
                className="form-control"
                value={editForm.leaveType}
                onChange={(e) => setEditForm({ ...editForm, leaveType: e.target.value })}
              >
                <option value="Annual">Annual Leave</option>
                <option value="Casual">Casual Leave</option>
                <option value="Medical">Medical Leave</option>
                <option value="Maternity / Special">Maternity / Special Leave</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Total Days Requested</label>
              <input
                type="number"
                min="1"
                required
                className="form-control"
                value={editForm.totalDays}
                onChange={(e) => setEditForm({ ...editForm, totalDays: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Reason</label>
              <textarea
                className="form-control"
                rows={3}
                required
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Update Leave Request'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: Cancel / Delete Request */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Cancel Leave Request">
        {deleteRecord && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to cancel your pending <strong>{deleteRecord.leaveType} Leave</strong> application ({deleteRecord.startDate} to {deleteRecord.endDate})?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Keep Application
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
              >
                {deleteLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
