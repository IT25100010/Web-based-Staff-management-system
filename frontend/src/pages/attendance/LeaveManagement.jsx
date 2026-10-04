import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { 
  CheckCircle, 
  XCircle, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2, 
  Calendar, 
  Umbrella, 
  Filter, 
  AlertCircle 
} from 'lucide-react';

export const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Add Leave Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    employeeId: '',
    leaveType: 'Annual',
    startDate: '',
    endDate: '',
    totalDays: '1',
    reason: ''
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // View Details Modal
  const [viewRecord, setViewRecord] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal (for Pending leaves)
  const [editRecord, setEditRecord] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    leaveType: 'Annual',
    startDate: '',
    endDate: '',
    totalDays: '1',
    reason: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Review (Approve/Reject) Modal
  const [reviewRecord, setReviewRecord] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve'); // 'approve' | 'reject'
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Delete Modal
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadEmployees();
    loadLeaves();
  }, [filterStatus]);

  const loadEmployees = async () => {
    try {
      const res = await apiClient.get('/employees');
      setEmployees(res.data || []);
    } catch (e) {
      console.error('Failed to load employees', e);
    }
  };

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const url = filterStatus ? `/attendance/leaves?status=${filterStatus}` : '/attendance/leaves';
      const res = await apiClient.get(url);
      setLeaves(res.data || []);
    } catch (e) {
      console.error('Failed to load leaves', e);
    } finally {
      setLoading(false);
    }
  };

  // Add Leave
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await apiClient.post('/attendance/leaves', addForm);
      setIsAddModalOpen(false);
      setAddForm({
        employeeId: '',
        leaveType: 'Annual',
        startDate: '',
        endDate: '',
        totalDays: '1',
        reason: ''
      });
      loadLeaves();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to submit leave application.');
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit
  const handleOpenEdit = (r) => {
    setEditRecord(r);
    setEditError('');
    setEditForm({
      leaveType: r.leaveType || 'Annual',
      startDate: r.startDate || '',
      endDate: r.endDate || '',
      totalDays: r.totalDays?.toString() || '1',
      reason: r.reason || ''
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit
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
      loadLeaves();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update leave record.');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Review (Approve / Reject)
  const handleOpenReview = (r, action) => {
    setReviewRecord(r);
    setReviewAction(action);
    setReviewRemarks(action === 'approve' ? 'Approved by HR Manager' : 'Declined due to operational staffing requirements');
    setReviewError('');
    setIsReviewModalOpen(true);
  };

  // Submit Review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewLoading(true);
    setReviewError('');
    try {
      if (reviewAction === 'approve') {
        await apiClient.put(`/attendance/leaves/${reviewRecord.id}/approve`, { remarks: reviewRemarks });
      } else {
        await apiClient.put(`/attendance/leaves/${reviewRecord.id}/reject`, { remarks: reviewRemarks });
      }
      setIsReviewModalOpen(false);
      loadLeaves();
    } catch (err) {
      setReviewError(err.response?.data?.message || `Failed to ${reviewAction} leave.`);
    } finally {
      setReviewLoading(false);
    }
  };

  // Open Delete
  const handleOpenDelete = (r) => {
    setDeleteRecord(r);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/attendance/leaves/${deleteRecord.id}`);
      setIsDeleteModalOpen(false);
      setDeleteRecord(null);
      loadLeaves();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete leave request.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Client-side filtering
  const filteredLeaves = leaves.filter((r) => {
    const matchesType = !filterType || r.leaveType === filterType;
    const matchesSearch = !searchQuery.trim() || 
      (r.employee?.firstName && r.employee.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.employee?.lastName && r.employee.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.employee?.employeeId && r.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.reason && r.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const columns = [
    {
      header: 'Employee',
      accessor: 'employee',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>
            {r.employee?.firstName} {r.employee?.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {r.employee?.employeeId || `EMP-${r.employee?.id}`} • {r.employee?.department?.name || 'Department'}
          </div>
        </div>
      )
    },
    {
      header: 'Leave Type',
      accessor: 'leaveType',
      render: (r) => (
        <span style={{ color: '#1e3a8a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Umbrella size={13} /> {r.leaveType}
        </span>
      )
    },
    {
      header: 'Period & Duration',
      accessor: 'dates',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.startDate} to {r.endDate}</div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
            {r.totalDays} {r.totalDays === 1 ? 'Day' : 'Days'}
          </div>
        </div>
      )
    },
    {
      header: 'Reason',
      accessor: 'reason',
      render: (r) => <span style={{ fontSize: '0.825rem', color: '#475569' }}>{r.reason || '—'}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (r) => <StatusBadge status={r.status} />
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => { setViewRecord(r); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          
          {r.status === 'PENDING' && (
            <>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                title="Edit Leave Request"
                onClick={() => handleOpenEdit(r)}
              >
                <Edit2 size={13} />
              </button>
              <button
                className="btn btn-success"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                title="Approve Leave"
                onClick={() => handleOpenReview(r, 'approve')}
              >
                <CheckCircle size={13} />
              </button>
              <button
                className="btn btn-danger"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                title="Reject Leave"
                onClick={() => handleOpenReview(r, 'reject')}
              >
                <XCircle size={13} />
              </button>
            </>
          )}

          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Request"
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
          <h1 className="page-title">Leave Approvals & Management</h1>
          <p className="page-description">
            Review, approve, or decline employee leave applications and track statutory time-off entitlements.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} /> Record Employee Leave
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Status:</span>
            <select
              className="form-control"
              style={{ width: '160px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Type:</span>
            <select
              className="form-control"
              style={{ width: '160px' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Annual">Annual Leave</option>
              <option value="Casual">Casual Leave</option>
              <option value="Medical">Medical Leave</option>
              <option value="Maternity / Special">Maternity / Special</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by employee name, ID or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={filteredLeaves} loading={loading} searchPlaceholder="Filter leaves..." />
      </div>

      {/* MODAL 1: ADD LEAVE */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record / Apply Employee Leave">
        <form onSubmit={handleAddSubmit}>
          {addError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
              {addError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Employee *</label>
            <select
              className="form-control"
              required
              value={addForm.employeeId}
              onChange={(e) => setAddForm({ ...addForm, employeeId: e.target.value })}
            >
              <option value="">Select registered employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeId || `EMP-${emp.id}`} — {emp.firstName} {emp.lastName} ({emp.department?.name || 'Dept'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Leave Category *</label>
            <select
              className="form-control"
              value={addForm.leaveType}
              onChange={(e) => setAddForm({ ...addForm, leaveType: e.target.value })}
            >
              <option value="Annual">Annual Leave (Statutory entitlement)</option>
              <option value="Casual">Casual Leave (Short duration)</option>
              <option value="Medical">Medical / Sick Leave</option>
              <option value="Maternity / Special">Maternity / Special Purpose Leave</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                required
                className="form-control"
                value={addForm.startDate}
                onChange={(e) => setAddForm({ ...addForm, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date *</label>
              <input
                type="date"
                required
                className="form-control"
                value={addForm.endDate}
                onChange={(e) => setAddForm({ ...addForm, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Total Days Requested *</label>
            <input
              type="number"
              min="1"
              max="90"
              required
              className="form-control"
              value={addForm.totalDays}
              onChange={(e) => setAddForm({ ...addForm, totalDays: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Reason / Justification *</label>
            <textarea
              className="form-control"
              rows={3}
              required
              placeholder="State reason for absence"
              value={addForm.reason}
              onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Submitting...' : 'Save Leave Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW DETAILS */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Leave Request Details">
        {viewRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                  {viewRecord.employee?.firstName} {viewRecord.employee?.lastName}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {viewRecord.employee?.employeeId} • {viewRecord.employee?.department?.name || 'Department'}
                </span>
              </div>
              <StatusBadge status={viewRecord.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Leave Type</span>
                <strong>{viewRecord.leaveType} Leave</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Total Duration</span>
                <strong>{viewRecord.totalDays} Day(s)</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Start Date</span>
                <strong>{viewRecord.startDate}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>End Date</span>
                <strong>{viewRecord.endDate}</strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Reason Given</span>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>{viewRecord.reason || 'No details provided'}</p>
            </div>

            {viewRecord.remarks && (
              <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                <span style={{ color: '#1e40af', display: 'block', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>
                  HR Remarks / Review Note
                </span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e3a8a' }}>{viewRecord.remarks}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: EDIT LEAVE (PENDING ONLY) */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Pending Leave Request">
        {editRecord && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {editError}
              </div>
            )}

            <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '14px', fontSize: '0.85rem' }}>
              <strong>Applicant:</strong> {editRecord.employee?.firstName} {editRecord.employee?.lastName} ({editRecord.employee?.employeeId})
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Leave Type *</label>
              <select
                className="form-control"
                value={editForm.leaveType}
                onChange={(e) => setEditForm({ ...editForm, leaveType: e.target.value })}
              >
                <option value="Annual">Annual Leave</option>
                <option value="Casual">Casual Leave</option>
                <option value="Medical">Medical Leave</option>
                <option value="Maternity / Special">Maternity / Special</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Total Days *</label>
              <input
                type="number"
                min="1"
                required
                className="form-control"
                value={editForm.totalDays}
                onChange={(e) => setEditForm({ ...editForm, totalDays: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Reason *</label>
              <textarea
                className="form-control"
                rows={3}
                required
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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

      {/* MODAL 4: APPROVE / REJECT */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={reviewAction === 'approve' ? 'Approve Leave Application' : 'Reject Leave Application'}
      >
        {reviewRecord && (
          <form onSubmit={handleReviewSubmit}>
            {reviewError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {reviewError}
              </div>
            )}

            <p style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '14px' }}>
              You are about to <strong>{reviewAction === 'approve' ? 'APPROVE' : 'REJECT'}</strong> the leave request of{' '}
              <strong>{reviewRecord.employee?.firstName} {reviewRecord.employee?.lastName}</strong> ({reviewRecord.leaveType} Leave for {reviewRecord.totalDays} days from {reviewRecord.startDate} to {reviewRecord.endDate}).
            </p>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Review Remarks / Justification *</label>
              <textarea
                className="form-control"
                rows={3}
                required
                placeholder="Enter remarks recorded in audit history"
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsReviewModalOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className={`btn ${reviewAction === 'approve' ? 'btn-success' : 'btn-danger'}`}
                disabled={reviewLoading}
              >
                {reviewLoading ? 'Processing...' : reviewAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 5: DELETE CONFIRMATION */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Leave Request">
        {deleteRecord && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to delete the leave request for{' '}
              <strong>{deleteRecord.employee?.firstName} {deleteRecord.employee?.lastName}</strong> ({deleteRecord.leaveType} Leave)?
            </p>
            {deleteRecord.status === 'APPROVED' && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.85rem', color: '#991b1b', marginBottom: '18px' }}>
                ⚠️ Warning: This leave request has already been APPROVED. Deleting approved leaves may be restricted to preserve attendance audits.
              </div>
            )}
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
