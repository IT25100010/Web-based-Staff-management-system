import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Clock, Plus, Eye, Edit2, Trash2, CheckCircle2, DollarSign, Filter, Check, X } from 'lucide-react';

export const OvertimeManagement = () => {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: '',
    overtimeDate: '',
    hours: '',
    hourlyRate: '',
    multiplier: 1.5,
    reason: ''
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // View Modal state
  const [viewRecord, setViewRecord] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal state
  const [editRecord, setEditRecord] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    overtimeDate: '',
    hours: '',
    hourlyRate: '',
    multiplier: 1.5,
    reason: '',
    status: 'PENDING'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal state
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [otRes, empRes] = await Promise.all([
        apiClient.get('/attendance/overtime'),
        apiClient.get('/employees')
      ]);
      setRecords(otRes.data || []);
      setEmployees(empRes.data || []);
    } catch (e) {
      console.error('Failed to load overtime records', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await apiClient.post('/attendance/overtime', {
        ...form,
        hours: parseFloat(form.hours) || 0,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : null,
        multiplier: parseFloat(form.multiplier) || 1.5
      });
      setIsModalOpen(false);
      setForm({
        employeeId: '',
        overtimeDate: '',
        hours: '',
        hourlyRate: '',
        multiplier: 1.5,
        reason: ''
      });
      loadData();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error logging overtime');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (r) => {
    setEditRecord(r);
    setEditError('');
    setEditForm({
      overtimeDate: r.overtimeDate || '',
      hours: r.hours?.toString() || '',
      hourlyRate: r.hourlyRate?.toString() || '',
      multiplier: r.multiplier || 1.5,
      reason: r.reason || '',
      status: r.status || 'PENDING'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await apiClient.put(`/attendance/overtime/${editRecord.id}`, {
        overtimeDate: editForm.overtimeDate,
        hours: parseFloat(editForm.hours) || 0,
        hourlyRate: editForm.hourlyRate ? parseFloat(editForm.hourlyRate) : null,
        multiplier: parseFloat(editForm.multiplier) || 1.5,
        reason: editForm.reason,
        status: editForm.status
      });
      setIsEditModalOpen(false);
      loadData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error updating overtime record');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (r) => {
    setDeleteRecord(r);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/attendance/overtime/${deleteRecord.id}`);
      setIsDeleteModalOpen(false);
      setDeleteRecord(null);
      loadData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error deleting overtime record');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleApprove = async (record) => {
    try {
      await apiClient.put(`/attendance/overtime/${record.id}`, { status: 'APPROVED' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve overtime record');
    }
  };

  const handleReject = async (record) => {
    try {
      await apiClient.put(`/attendance/overtime/${record.id}`, { status: 'REJECTED' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject overtime record');
    }
  };

  const pendingCount = records.filter((r) => r.status === 'PENDING').length;
  const approvedCount = records.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = records.filter((r) => r.status === 'REJECTED').length;
  const totalApprovedHours = records
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (Number(r.hours) || 0), 0)
    .toFixed(1);

  const filteredRecords = records.filter((r) => {
    const matchesStatus = !filterStatus || r.status === filterStatus;
    const matchesSearch = !searchQuery.trim() ||
      (r.employee?.firstName && r.employee.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.employee?.lastName && r.employee.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.employee?.employeeId && r.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.reason && r.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
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
            {r.employee?.employeeId || `EMP-${r.employee?.id}`} • {r.employee?.department?.name || 'Dept'}
          </div>
        </div>
      )
    },
    { header: 'Date', accessor: 'overtimeDate' },
    {
      header: 'Worked Hours',
      render: (r) => {
        const reg = r.employee?.position?.regularWorkingHoursPerDay || 8;
        const total = (Number(r.hours) || 0) + reg;
        return <span style={{ fontWeight: 600 }}>{total.toFixed(1)} hrs</span>;
      }
    },
    {
      header: 'Regular Hours',
      render: (r) => `${r.employee?.position?.regularWorkingHoursPerDay || 8} hrs`
    },
    { 
      header: 'OT Hours', 
      accessor: 'hours', 
      render: (r) => (
        <span style={{ fontWeight: 700, color: '#0369a1' }}>
          {r.hours} hrs
        </span>
      )
    },
    {
      header: 'OT Rate',
      accessor: 'hourlyRate',
      render: (r) => r.hourlyRate ? `LKR ${Number(r.hourlyRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'LKR 0.00'
    },
    { 
      header: 'OT Amount', 
      accessor: 'totalAmount', 
      render: (r) => (
        <strong style={{ color: '#059669' }}>
          LKR {Number(r.totalAmount || (Number(r.hours || 0) * Number(r.hourlyRate || 0))).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </strong>
      )
    },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            title="View Details"
            onClick={() => { setViewRecord(r); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          {r.status === 'PENDING' && (
            <>
              <button
                className="btn btn-sm"
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Approve OT"
                onClick={() => handleApprove(r)}
              >
                <Check size={13} /> Approve
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Reject OT"
                onClick={() => handleReject(r)}
              >
                <X size={13} /> Reject
              </button>
            </>
          )}
          {r.status === 'APPROVED' && (
            <button
              className="btn btn-sm"
              style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px 8px', fontSize: '0.75rem' }}
              title="Revoke / Reject"
              onClick={() => handleReject(r)}
            >
              Reject
            </button>
          )}
          {r.status === 'REJECTED' && (
            <button
              className="btn btn-sm"
              style={{ background: '#d1fae5', color: '#065f46', border: 'none', padding: '4px 8px', fontSize: '0.75rem' }}
              title="Approve"
              onClick={() => handleApprove(r)}
            >
              Approve
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            style={{ color: '#ef4444' }}
            title="Delete Record"
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
          <h1 className="page-title">Overtime Hours & Approvals</h1>
          <p className="page-description">
            Track, audit, and authorize shift overtime hours for direct incorporation into monthly payroll disbursements.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} /> Log Overtime Hours
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <StatCard
          title="Pending OT"
          value={`${pendingCount} Records`}
          subtitle="Awaiting manager review"
          icon={Clock}
          color="#f59e0b"
        />
        <StatCard
          title="Approved OT"
          value={`${approvedCount} Records`}
          subtitle="Authorized for payroll"
          icon={CheckCircle2}
          color="#10b981"
        />
        <StatCard
          title="Rejected OT"
          value={`${rejectedCount} Records`}
          subtitle="Excluded from payroll"
          icon={X}
          color="#ef4444"
        />
        <StatCard
          title="Total Approved Hours"
          value={`${totalApprovedHours} hrs`}
          subtitle="Billable OT duration"
          icon={DollarSign}
          color="#2563eb"
        />
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
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by employee name, ID or operational reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={filteredRecords} loading={loading} searchPlaceholder="Filter records..." />
      </div>

      {/* MODAL 1: LOG OVERTIME */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Employee Overtime">
        <form onSubmit={handleCreate}>
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
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            >
              <option value="">Select registered employee</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.employeeId || `EMP-${e.id}`} — {e.firstName} {e.lastName} ({e.department?.name})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Overtime Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={form.overtimeDate}
                onChange={(e) => setForm({ ...form, overtimeDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Hours Worked *</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="16"
                className="form-control"
                required
                placeholder="e.g. 2.5"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Standard Hourly Rate (LKR)</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g. 500"
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Overtime Multiplier</label>
              <select
                className="form-control"
                value={form.multiplier}
                onChange={(e) => setForm({ ...form, multiplier: parseFloat(e.target.value) || 1.5 })}
              >
                <option value="1.5">1.5x (Standard Shift OT)</option>
                <option value="2.0">2.0x (Sunday / Public Holiday)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Operational Reason *</label>
            <textarea
              className="form-control"
              rows={2}
              required
              placeholder="e.g. Vessel delay turnaround, extended warehouse dispatch"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Saving...' : 'Log Overtime'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW DETAILS */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Overtime Record Details">
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
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Overtime Date</span>
                <strong>{viewRecord.overtimeDate}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>OT Hours</span>
                <strong style={{ color: '#0284c7' }}>{viewRecord.hours} Hours</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Hourly Base Rate</span>
                <strong>{viewRecord.hourlyRate ? `LKR ${Number(viewRecord.hourlyRate).toLocaleString()}` : 'Standard Base'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Multiplier</span>
                <strong>{viewRecord.multiplier}x</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Total Computed Payout</span>
                <strong style={{ color: '#059669', fontSize: '1.05rem' }}>
                  LKR {Number(viewRecord.totalAmount || (viewRecord.hours * (viewRecord.hourlyRate || 0) * (viewRecord.multiplier || 1.5))).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Operational Justification</span>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>{viewRecord.reason || '—'}</p>
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
                  handleOpenEdit(viewRecord);
                }}
              >
                Edit Record
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: EDIT OVERTIME */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Overtime Record">
        {editRecord && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {editError}
              </div>
            )}

            <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '14px', fontSize: '0.85rem' }}>
              <strong>Employee:</strong> {editRecord.employee?.firstName} {editRecord.employee?.lastName} ({editRecord.employee?.employeeId})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Overtime Date *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={editForm.overtimeDate}
                  onChange={(e) => setEditForm({ ...editForm, overtimeDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Hours *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="16"
                  className="form-control"
                  required
                  value={editForm.hours}
                  onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Hourly Rate (LKR)</label>
                <input
                  type="number"
                  className="form-control"
                  value={editForm.hourlyRate}
                  onChange={(e) => setEditForm({ ...editForm, hourlyRate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Multiplier</label>
                <select
                  className="form-control"
                  value={editForm.multiplier}
                  onChange={(e) => setEditForm({ ...editForm, multiplier: parseFloat(e.target.value) || 1.5 })}
                >
                  <option value="1.5">1.5x (Standard Shift OT)</option>
                  <option value="2.0">2.0x (Sunday / Public Holiday)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Reason *</label>
              <textarea
                className="form-control"
                rows={2}
                required
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Update Overtime'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: DELETE OVERTIME */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Overtime Record">
        {deleteRecord && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to delete the overtime record for{' '}
              <strong>{deleteRecord.employee?.firstName} {deleteRecord.employee?.lastName}</strong> on{' '}
              <strong>{deleteRecord.overtimeDate}</strong> ({deleteRecord.hours} hrs)?
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
