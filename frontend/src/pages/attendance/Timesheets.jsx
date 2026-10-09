import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { FileSpreadsheet, Plus, CheckCircle, Eye, Edit2, Trash2, Calendar, Lock } from 'lucide-react';

export const Timesheets = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter & Search
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Create Draft Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: '',
    periodStart: '',
    periodEnd: '',
    regularHours: '',
    overtimeHours: ''
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // View Modal
  const [viewRecord, setViewRecord] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal
  const [editRecord, setEditRecord] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    periodStart: '',
    periodEnd: '',
    regularHours: '',
    overtimeHours: '',
    status: 'DRAFT'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal
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
      const [tsRes, empRes] = await Promise.all([
        apiClient.get('/attendance/timesheets'),
        apiClient.get('/employees')
      ]);
      setTimesheets(tsRes.data || []);
      setEmployees(empRes.data || []);
    } catch (e) {
      console.error('Failed to load timesheets', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await apiClient.post('/attendance/timesheets/finalize', {
        ...form,
        regularHours: parseFloat(form.regularHours) || 0,
        overtimeHours: parseFloat(form.overtimeHours) || 0
      });
      setIsModalOpen(false);
      setForm({
        employeeId: '',
        periodStart: '',
        periodEnd: '',
        regularHours: '',
        overtimeHours: ''
      });
      loadData();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error creating timesheet');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (r) => {
    setEditRecord(r);
    setEditError('');
    setEditForm({
      periodStart: r.periodStart || '',
      periodEnd: r.periodEnd || '',
      regularHours: r.regularHours?.toString() || '',
      overtimeHours: r.overtimeHours?.toString() || '',
      status: r.status || 'DRAFT'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await apiClient.put(`/attendance/timesheets/${editRecord.id}`, {
        periodStart: editForm.periodStart,
        periodEnd: editForm.periodEnd,
        regularHours: parseFloat(editForm.regularHours) || 0,
        overtimeHours: parseFloat(editForm.overtimeHours) || 0,
        status: editForm.status
      });
      setIsEditModalOpen(false);
      loadData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error updating timesheet');
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
      await apiClient.delete(`/attendance/timesheets/${deleteRecord.id}`);
      setIsDeleteModalOpen(false);
      setDeleteRecord(null);
      loadData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error deleting timesheet');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredTimesheets = timesheets.filter((r) => {
    const matchesStatus = !filterStatus || r.status === filterStatus;
    const matchesSearch = !searchQuery.trim() ||
      (r.employee?.firstName && r.employee.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.employee?.lastName && r.employee.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.employee?.employeeId && r.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase()));
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
    { header: 'Period', render: (r) => `${r.periodStart} to ${r.periodEnd}` },
    { header: 'Regular Hours', accessor: 'regularHours', render: (r) => `${r.regularHours} hrs` },
    { header: 'Overtime Hours', accessor: 'overtimeHours', render: (r) => `${r.overtimeHours} hrs` },
    { 
      header: 'Total Hours', 
      accessor: 'totalHours', 
      render: (r) => (
        <strong style={{ color: '#1e3a8a' }}>
          {(parseFloat(r.totalHours) || (parseFloat(r.regularHours || 0) + parseFloat(r.overtimeHours || 0))).toFixed(1)} hrs
        </strong>
      )
    },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
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
          
          {r.status !== 'FINALIZED' ? (
            <>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                title="Edit Timesheet"
                onClick={() => handleOpenEdit(r)}
              >
                <Edit2 size={13} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
                title="Delete Timesheet"
                onClick={() => handleOpenDelete(r)}
              >
                <Trash2 size={13} />
              </button>
            </>
          ) : (
            <span title="Finalized records cannot be modified" style={{ display: 'inline-flex', alignItems: 'center', padding: '0 4px', color: '#94a3b8' }}>
              <Lock size={13} />
            </span>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Timesheet Verification & Finalization</h1>
          <p className="page-description">
            Audit consolidated shift attendance and overtime hours before forwarding to Finance for payroll disbursement.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} /> Create / Finalize Timesheet
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
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="FINALIZED">Finalized</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by employee name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={filteredTimesheets} loading={loading} searchPlaceholder="Filter timesheets..." />
      </div>

      {/* MODAL 1: FINALIZE / CREATE TIMESHEET */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create / Finalize Employee Timesheet">
        <form onSubmit={handleFinalize}>
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
              <label className="form-label">Period Start Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={form.periodStart}
                onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Period End Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={form.periodEnd}
                onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Regular Hours Verified *</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="form-control"
                required
                placeholder="e.g. 160"
                value={form.regularHours}
                onChange={(e) => setForm({ ...form, regularHours: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Overtime Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="form-control"
                placeholder="e.g. 15"
                value={form.overtimeHours}
                onChange={(e) => setForm({ ...form, overtimeHours: e.target.value })}
              />
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: '#eff6ff', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', color: '#1e40af' }}>
            Total Verified Hours: <strong>{(Number(form.regularHours || 0) + Number(form.overtimeHours || 0)).toFixed(1)} Hours</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Saving...' : 'Finalize & Submit to Finance'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW DETAILS */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Timesheet Details">
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
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Pay Period</span>
                <strong>{viewRecord.periodStart} to {viewRecord.periodEnd}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Total Verified Hours</span>
                <strong style={{ color: '#1e3a8a', fontSize: '1.05rem' }}>
                  {(parseFloat(viewRecord.totalHours) || (parseFloat(viewRecord.regularHours || 0) + parseFloat(viewRecord.overtimeHours || 0))).toFixed(1)} hrs
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Regular Shift Hours</span>
                <strong>{viewRecord.regularHours} hrs</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Overtime Hours</span>
                <strong>{viewRecord.overtimeHours} hrs</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
              {viewRecord.status !== 'FINALIZED' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleOpenEdit(viewRecord);
                  }}
                >
                  Edit Timesheet
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: EDIT TIMESHEET */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Draft Timesheet">
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
                <label className="form-label">Period Start Date *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={editForm.periodStart}
                  onChange={(e) => setEditForm({ ...editForm, periodStart: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Period End Date *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={editForm.periodEnd}
                  onChange={(e) => setEditForm({ ...editForm, periodEnd: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Regular Hours *</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-control"
                  required
                  value={editForm.regularHours}
                  onChange={(e) => setEditForm({ ...editForm, regularHours: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Overtime Hours *</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-control"
                  required
                  value={editForm.overtimeHours}
                  onChange={(e) => setEditForm({ ...editForm, overtimeHours: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Timesheet Status</label>
              <select
                className="form-control"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending Review</option>
                <option value="FINALIZED">Finalized (Forwarded to Finance)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Update Timesheet'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: DELETE TIMESHEET */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Timesheet">
        {deleteRecord && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to delete the timesheet record for{' '}
              <strong>{deleteRecord.employee?.firstName} {deleteRecord.employee?.lastName}</strong> ({deleteRecord.periodStart} to {deleteRecord.periodEnd})?
            </p>
            {deleteRecord.status === 'FINALIZED' && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.85rem', color: '#991b1b', marginBottom: '18px' }}>
                ⚠️ This timesheet has been FINALIZED. Finalized timesheets cannot be deleted because they are locked for payroll calculations.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleteLoading || deleteRecord.status === 'FINALIZED'}
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
