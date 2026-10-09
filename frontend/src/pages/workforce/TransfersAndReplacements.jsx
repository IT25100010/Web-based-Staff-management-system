import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Repeat, UserCheck, Plus, CheckCircle, XCircle, Eye, Edit2, Trash2 } from 'lucide-react';

export const TransfersAndReplacements = () => {
  const [activeTab, setActiveTab] = useState('transfers');
  const [transfers, setTransfers] = useState([]);
  const [replacements, setReplacements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterTransferStatus, setFilterTransferStatus] = useState('');
  const [transferSearch, setTransferSearch] = useState('');
  const [replacementSearch, setReplacementSearch] = useState('');

  // Transfer Modals
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    employeeId: '',
    fromLocationId: '',
    toLocationId: '',
    transferDate: '',
    reason: ''
  });
  const [transferAddLoading, setTransferAddLoading] = useState(false);
  const [transferAddError, setTransferAddError] = useState('');

  const [viewTransfer, setViewTransfer] = useState(null);
  const [isViewTransferOpen, setIsViewTransferOpen] = useState(false);

  const [editTransfer, setEditTransfer] = useState(null);
  const [isEditTransferOpen, setIsEditTransferOpen] = useState(false);
  const [editTransferForm, setEditTransferForm] = useState({
    fromLocationId: '',
    toLocationId: '',
    transferDate: '',
    reason: '',
    status: 'PENDING'
  });
  const [editTransferLoading, setEditTransferLoading] = useState(false);
  const [editTransferError, setEditTransferError] = useState('');

  const [deleteTransfer, setDeleteTransfer] = useState(null);
  const [isDeleteTransferOpen, setIsDeleteTransferOpen] = useState(false);
  const [deleteTransferLoading, setDeleteTransferLoading] = useState(false);
  const [deleteTransferError, setDeleteTransferError] = useState('');

  // Replacement Modals
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [repSuggestions, setRepSuggestions] = useState([]);
  const [repSuggestionsLoading, setRepSuggestionsLoading] = useState(false);
  const [replacementForm, setReplacementForm] = useState({
    shiftId: '',
    originalEmployeeId: '',
    replacementEmployeeId: '',
    replacementDate: '',
    reason: ''
  });
  const [repAddLoading, setRepAddLoading] = useState(false);
  const [repAddError, setRepAddError] = useState('');

  const [viewReplacement, setViewReplacement] = useState(null);
  const [isViewRepOpen, setIsViewRepOpen] = useState(false);

  const [deleteReplacement, setDeleteReplacement] = useState(null);
  const [isDeleteRepOpen, setIsDeleteRepOpen] = useState(false);
  const [deleteRepLoading, setDeleteRepLoading] = useState(false);
  const [deleteRepError, setDeleteRepError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [trRes, repRes, empRes, locRes, shRes] = await Promise.all([
        apiClient.get('/workforce/transfers'),
        apiClient.get('/workforce/replacements'),
        apiClient.get('/employees'),
        apiClient.get('/workforce/locations'),
        apiClient.get('/workforce/shifts')
      ]);
      setTransfers(trRes.data || []);
      setReplacements(repRes.data || []);
      setEmployees(empRes.data || []);
      setLocations(locRes.data || []);
      setShifts(shRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Transfer Handlers
  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    setTransferAddLoading(true);
    setTransferAddError('');
    try {
      await apiClient.post('/workforce/transfers', transferForm);
      setIsTransferModalOpen(false);
      setTransferForm({
        employeeId: '',
        fromLocationId: '',
        toLocationId: '',
        transferDate: '',
        reason: ''
      });
      loadData();
    } catch (err) {
      setTransferAddError(err.response?.data?.message || 'Error creating transfer');
    } finally {
      setTransferAddLoading(false);
    }
  };

  // Real Backend Approve & Reject Actions
  const handleApproveTransfer = async (id) => {
    try {
      await apiClient.post(`/workforce/transfers/${id}/approve`, {
        adminRemarks: 'Approved by Operations Management'
      });
      loadData();
    } catch (e) {
      alert(e.response?.data?.message || 'Error approving transfer');
    }
  };

  const handleRejectTransfer = async (id) => {
    const reason = prompt('Please enter rejection reason:', 'Operational constraints');
    if (reason) {
      try {
        await apiClient.post(`/workforce/transfers/${id}/reject`, {
          adminRemarks: reason
        });
        loadData();
      } catch (e) {
        alert(e.response?.data?.message || 'Error rejecting transfer');
      }
    }
  };

  const fetchReplacementSuggestions = async (shiftId, originalEmpId) => {
    if (!shiftId || !originalEmpId) {
      setRepSuggestions([]);
      return;
    }
    try {
      setRepSuggestionsLoading(true);
      const res = await apiClient.get(`/workforce/shifts/${shiftId}/replacement-suggestions?employeeId=${originalEmpId}`);
      setRepSuggestions(res.data || []);
    } catch (err) {
      console.error('Failed to load replacement suggestions', err);
      setRepSuggestions([]);
    } finally {
      setRepSuggestionsLoading(false);
    }
  };

  const handleOpenEditTransfer = (t) => {
    setEditTransfer(t);
    setEditTransferError('');
    setEditTransferForm({
      fromLocationId: t.fromLocation?.id?.toString() || '',
      toLocationId: t.toLocation?.id?.toString() || '',
      transferDate: t.transferDate || '',
      reason: t.reason || '',
      status: t.status || 'PENDING'
    });
    setIsEditTransferOpen(true);
  };

  const handleEditTransferSubmit = async (e) => {
    e.preventDefault();
    setEditTransferLoading(true);
    setEditTransferError('');
    try {
      await apiClient.put(`/workforce/transfers/${editTransfer.id}`, editTransferForm);
      setIsEditTransferOpen(false);
      loadData();
    } catch (err) {
      setEditTransferError(err.response?.data?.message || 'Error updating transfer');
    } finally {
      setEditTransferLoading(false);
    }
  };

  const handleOpenDeleteTransfer = (t) => {
    setDeleteTransfer(t);
    setDeleteTransferError('');
    setIsDeleteTransferOpen(true);
  };

  const handleConfirmDeleteTransfer = async () => {
    setDeleteTransferLoading(true);
    setDeleteTransferError('');
    try {
      await apiClient.delete(`/workforce/transfers/${deleteTransfer.id}`);
      setIsDeleteTransferOpen(false);
      setDeleteTransfer(null);
      loadData();
    } catch (err) {
      setDeleteTransferError(err.response?.data?.message || 'Error deleting transfer');
    } finally {
      setDeleteTransferLoading(false);
    }
  };

  // Replacement Workflow Confirmation (Shift -> Confirm Replacement)
  const handleCreateReplacement = async (e) => {
    e.preventDefault();
    if (!replacementForm.shiftId || !replacementForm.originalEmployeeId || !replacementForm.replacementEmployeeId) {
      setRepAddError('Please select Shift, Unavailable Employee, and Replacement Associate.');
      return;
    }
    setRepAddLoading(true);
    setRepAddError('');
    try {
      await apiClient.post(`/workforce/shifts/${replacementForm.shiftId}/confirm-replacement`, {
        originalEmployeeId: parseInt(replacementForm.originalEmployeeId),
        replacementEmployeeId: parseInt(replacementForm.replacementEmployeeId),
        reason: replacementForm.reason || 'Operational replacement confirmed'
      });
      setIsReplacementModalOpen(false);
      setReplacementForm({
        shiftId: '',
        originalEmployeeId: '',
        replacementEmployeeId: '',
        replacementDate: '',
        reason: ''
      });
      setRepSuggestions([]);
      loadData();
    } catch (err) {
      setRepAddError(err.response?.data?.message || 'Error confirming shift replacement');
    } finally {
      setRepAddLoading(false);
    }
  };

  const handleOpenDeleteRep = (r) => {
    setDeleteReplacement(r);
    setDeleteRepError('');
    setIsDeleteRepOpen(true);
  };

  const handleConfirmDeleteRep = async () => {
    setDeleteRepLoading(true);
    setDeleteRepError('');
    try {
      await apiClient.delete(`/workforce/replacements/${deleteReplacement.id}`);
      setIsDeleteRepOpen(false);
      setDeleteReplacement(null);
      loadData();
    } catch (err) {
      setDeleteRepError(err.response?.data?.message || 'Error deleting replacement');
    } finally {
      setDeleteRepLoading(false);
    }
  };

  // Filtered lists
  const filteredTransfers = transfers.filter((t) => {
    const matchesStatus = !filterTransferStatus || t.status === filterTransferStatus;
    const matchesSearch = !transferSearch.trim() ||
      (t.employee?.firstName && t.employee.firstName.toLowerCase().includes(transferSearch.toLowerCase())) ||
      (t.employee?.lastName && t.employee.lastName.toLowerCase().includes(transferSearch.toLowerCase())) ||
      (t.employee?.employeeId && t.employee.employeeId.toLowerCase().includes(transferSearch.toLowerCase())) ||
      (t.reason && t.reason.toLowerCase().includes(transferSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const filteredReplacements = replacements.filter((r) => {
    return !replacementSearch.trim() ||
      (r.originalEmployee?.firstName && r.originalEmployee.firstName.toLowerCase().includes(replacementSearch.toLowerCase())) ||
      (r.replacementEmployee?.firstName && r.replacementEmployee.firstName.toLowerCase().includes(replacementSearch.toLowerCase())) ||
      (r.shift?.shiftName && r.shift.shiftName.toLowerCase().includes(replacementSearch.toLowerCase())) ||
      (r.reason && r.reason.toLowerCase().includes(replacementSearch.toLowerCase()));
  });

  const transferColumns = [
    { 
      header: 'Employee', 
      accessor: 'employee', 
      render: (r) => (
        <div>
          <span style={{ fontWeight: 600 }}>{r.employee?.firstName} {r.employee?.lastName}</span>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.employee?.employeeId}</div>
        </div>
      )
    },
    { header: 'From Terminal', accessor: 'fromLocation', render: (r) => r.fromLocation?.locationName || '—' },
    { header: 'To Terminal', accessor: 'toLocation', render: (r) => <strong style={{ color: '#2563eb' }}>{r.toLocation?.locationName || '—'}</strong> },
    { header: 'Transfer Date', accessor: 'transferDate' },
    { header: 'Reason', accessor: 'reason', render: (r) => <span style={{ fontSize: '0.85rem' }}>{r.reason || '—'}</span> },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Workflow Action',
      render: (r) => (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(r.status === 'PENDING' || r.status === 'REQUESTED') && (
            <>
              <button
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}
                title="Approve Transfer"
                onClick={() => handleApproveTransfer(r.id)}
              >
                Approve
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}
                title="Reject Transfer"
                onClick={() => handleRejectTransfer(r.id)}
              >
                Reject
              </button>
            </>
          )}
          {r.status === 'APPROVED' && (
            <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>Approved</span>
          )}
          {r.status === 'REJECTED' && (
            <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>Rejected</span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => { setViewTransfer(r); setIsViewTransferOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Edit Transfer"
            onClick={() => handleOpenEditTransfer(r)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Record"
            onClick={() => handleOpenDeleteTransfer(r)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];

  const replacementColumns = [
    { header: 'Shift', accessor: 'shift', render: (r) => <span style={{ fontWeight: 600 }}>{r.shift?.shiftName}</span> },
    { header: 'Unavailable Employee', accessor: 'originalEmployee', render: (r) => <span style={{ color: '#ef4444', fontWeight: 600 }}>{r.originalEmployee?.firstName} {r.originalEmployee?.lastName}</span> },
    { header: 'Replacement Associate', accessor: 'replacementEmployee', render: (r) => <span style={{ color: '#10b981', fontWeight: 600 }}>{r.replacementEmployee?.firstName} {r.replacementEmployee?.lastName}</span> },
    { header: 'Date', accessor: 'replacementDate' },
    { header: 'Reason', accessor: 'reason', render: (r) => <span style={{ fontSize: '0.85rem' }}>{r.reason || '—'}</span> },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => { setViewReplacement(r); setIsViewRepOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Record"
            onClick={() => handleOpenDeleteRep(r)}
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
          <h1 className="page-title">Workforce Movements & Staff Swaps</h1>
          <p className="page-description">
            Coordinate inter-site terminal transfers and immediate employee replacements for unavailable shift staff.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'transfers' ? (
            <button onClick={() => { setTransferAddError(''); setIsTransferModalOpen(true); }} className="btn btn-primary">
              <Plus size={16} /> Execute Transfer
            </button>
          ) : (
            <button onClick={() => { setRepAddError(''); setIsReplacementModalOpen(true); }} className="btn btn-primary">
              <Plus size={16} /> Schedule Replacement
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`btn btn-sm ${activeTab === 'transfers' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Repeat size={16} /> Site Transfers ({transfers.length})
        </button>
        <button
          onClick={() => setActiveTab('replacements')}
          className={`btn btn-sm ${activeTab === 'replacements' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <UserCheck size={16} /> Shift Replacements ({replacements.length})
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        {activeTab === 'transfers' ? (
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Status:</span>
              <select
                className="form-control"
                style={{ width: '150px' }}
                value={filterTransferStatus}
                onChange={(e) => setFilterTransferStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="REQUESTED">Requested</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search transfers by staff name, ID, or reason..."
                value={transferSearch}
                onChange={(e) => setTransferSearch(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search replacements by associate name, shift, or reason..."
                value={replacementSearch}
                onChange={(e) => setReplacementSearch(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="card">
        {activeTab === 'transfers' ? (
          <DataTable columns={transferColumns} data={filteredTransfers} loading={loading} searchPlaceholder="Filter transfers..." />
        ) : (
          <DataTable columns={replacementColumns} data={filteredReplacements} loading={loading} searchPlaceholder="Filter replacements..." />
        )}
      </div>

      {/* MODAL 1: DIRECT TRANSFER */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Submit Employee Transfer Request">
        <form onSubmit={handleCreateTransfer}>
          {transferAddError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
              {transferAddError}
            </div>
          )}

          <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', color: '#166534' }}>
            📋 <strong>Transfer Approval Workflow:</strong> Submitted transfers will be created with status <strong>REQUESTED</strong> pending management review and approval.
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Employee *</label>
            <select
              className="form-control"
              required
              value={transferForm.employeeId}
              onChange={(e) => setTransferForm({ ...transferForm, employeeId: e.target.value })}
            >
              <option value="">Select employee</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.employeeId} — {e.firstName} {e.lastName}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Current / Origin Terminal *</label>
              <select
                className="form-control"
                required
                value={transferForm.fromLocationId}
                onChange={(e) => setTransferForm({ ...transferForm, fromLocationId: e.target.value })}
              >
                <option value="">Select origin</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.locationName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Destination Terminal *</label>
              <select
                className="form-control"
                required
                value={transferForm.toLocationId}
                onChange={(e) => setTransferForm({ ...transferForm, toLocationId: e.target.value })}
              >
                <option value="">Select destination</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.locationName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Effective Transfer Date *</label>
            <input
              type="date"
              className="form-control"
              required
              value={transferForm.transferDate}
              onChange={(e) => setTransferForm({ ...transferForm, transferDate: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Transfer Justification *</label>
            <textarea
              className="form-control"
              rows={3}
              required
              placeholder="e.g. Operational requirement, port terminal re-allocation"
              value={transferForm.reason}
              onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setIsTransferModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={transferAddLoading}>
              {transferAddLoading ? 'Executing Transfer...' : 'Execute Transfer & Notify'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW TRANSFER */}
      <Modal isOpen={isViewTransferOpen} onClose={() => setIsViewTransferOpen(false)} title="Transfer Request Details">
        {viewTransfer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
                  {viewTransfer.employee?.firstName} {viewTransfer.employee?.lastName}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{viewTransfer.employee?.employeeId}</span>
              </div>
              <StatusBadge status={viewTransfer.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Origin Terminal</span>
                <strong>{viewTransfer.fromLocation?.locationName || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Destination Terminal</span>
                <strong style={{ color: '#2563eb' }}>{viewTransfer.toLocation?.locationName || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Effective Date</span>
                <strong>{viewTransfer.transferDate}</strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Justification</span>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>{viewTransfer.reason || '—'}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsViewTransferOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: EDIT TRANSFER */}
      <Modal isOpen={isEditTransferOpen} onClose={() => setIsEditTransferOpen(false)} title="Edit Transfer Request">
        {editTransfer && (
          <form onSubmit={handleEditTransferSubmit}>
            {editTransferError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {editTransferError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Origin Location</label>
                <select
                  className="form-control"
                  value={editTransferForm.fromLocationId}
                  onChange={(e) => setEditTransferForm({ ...editTransferForm, fromLocationId: e.target.value })}
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.locationName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Destination Location</label>
                <select
                  className="form-control"
                  value={editTransferForm.toLocationId}
                  onChange={(e) => setEditTransferForm({ ...editTransferForm, toLocationId: e.target.value })}
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.locationName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Transfer Date</label>
              <input
                type="date"
                className="form-control"
                value={editTransferForm.transferDate}
                onChange={(e) => setEditTransferForm({ ...editTransferForm, transferDate: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Reason</label>
              <textarea
                className="form-control"
                rows={3}
                value={editTransferForm.reason}
                onChange={(e) => setEditTransferForm({ ...editTransferForm, reason: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsEditTransferOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editTransferLoading}>
                {editTransferLoading ? 'Saving...' : 'Update Transfer'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: DELETE TRANSFER */}
      <Modal isOpen={isDeleteTransferOpen} onClose={() => setIsDeleteTransferOpen(false)} title="Delete Transfer Request">
        {deleteTransfer && (
          <div>
            {deleteTransferError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteTransferError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to delete the transfer request for <strong>{deleteTransfer.employee?.firstName} {deleteTransfer.employee?.lastName}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteTransferOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleteTransferLoading}
                onClick={handleConfirmDeleteTransfer}
              >
                {deleteTransferLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 5: SCHEDULE REPLACEMENT */}
      <Modal isOpen={isReplacementModalOpen} onClose={() => setIsReplacementModalOpen(false)} title="Schedule Shift Staff Replacement">
        <form onSubmit={handleCreateReplacement}>
          {repAddError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
              {repAddError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Shift *</label>
            <select
              className="form-control"
              required
              value={replacementForm.shiftId}
              onChange={(e) => {
                const sid = e.target.value;
                setReplacementForm(prev => ({ ...prev, shiftId: sid }));
                fetchReplacementSuggestions(sid, replacementForm.originalEmployeeId);
              }}
            >
              <option value="">Select shift</option>
              {shifts.map(s => (
                <option key={s.id} value={s.id}>{s.shiftName} ({s.shiftDate} | {s.workLocation?.locationName})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Unavailable Employee *</label>
            <select
              className="form-control"
              required
              value={replacementForm.originalEmployeeId}
              onChange={(e) => {
                const oid = e.target.value;
                setReplacementForm(prev => ({ ...prev, originalEmployeeId: oid }));
                fetchReplacementSuggestions(replacementForm.shiftId, oid);
              }}
            >
              <option value="">Select employee</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.employeeId} — {e.firstName} {e.lastName} ({e.department?.name || 'Staff'})</option>
              ))}
            </select>
          </div>

          {/* Smart Replacement Recommendations Panel */}
          {replacementForm.shiftId && replacementForm.originalEmployeeId && (
            <div style={{ marginBottom: '16px', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px', background: '#f0f9ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1' }}>
                  💡 Ranked Stand-in Recommendations (Workload & Skills Ranked)
                </span>
                {repSuggestionsLoading && <span style={{ fontSize: '0.75rem', color: '#0284c7' }}>Finding replacements...</span>}
              </div>

              {repSuggestions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {repSuggestions.map((cand) => (
                    <div
                      key={cand.employeeId}
                      onClick={() => setReplacementForm(prev => ({ ...prev, replacementEmployeeId: cand.employeeId.toString() }))}
                      style={{
                        padding: '8px 10px',
                        background: replacementForm.replacementEmployeeId.toString() === cand.employeeId.toString() ? '#dcfce7' : '#ffffff',
                        border: replacementForm.replacementEmployeeId.toString() === cand.employeeId.toString() ? '1px solid #16a34a' : '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                          {cand.employeeName} ({cand.employeeCode})
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#64748b' }}>
                            {cand.department} • {cand.position}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', color: '#475569' }}>
                            Week load: {cand.weeklyHours != null ? cand.weeklyHours : (cand.currentWeeklyHours ?? 0)}h ({cand.shiftsThisWeek} shifts)
                          </span>
                          {cand.reasons && cand.reasons.map((r, i) => (
                            <span key={i} style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px' }}>
                              ★ {r}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: '10px' }}>
                          Score: {cand.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !repSuggestionsLoading && (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                    No eligible stand-in associates available without schedule conflict or leave.
                  </div>
                )
              )}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Replacement Associate *</label>
            <select
              className="form-control"
              required
              value={replacementForm.replacementEmployeeId}
              onChange={(e) => setReplacementForm(prev => ({ ...prev, replacementEmployeeId: e.target.value }))}
            >
              <option value="">Select replacement</option>
              {employees.filter(e => e.id.toString() !== replacementForm.originalEmployeeId.toString()).map(e => (
                <option key={e.id} value={e.id}>{e.employeeId} — {e.firstName} {e.lastName} ({e.department?.name || 'Staff'})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Shift Date (Locked to Shift)</label>
            <input
              type="text"
              className="form-control"
              readOnly
              disabled
              value={shifts.find(s => s.id.toString() === replacementForm.shiftId.toString())?.shiftDate || '— (Auto-derived from selected shift)'}
              style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Reason / Justification *</label>
            <textarea
              className="form-control"
              rows={2}
              required
              placeholder="e.g. Sudden medical emergency, standby call-up"
              value={replacementForm.reason}
              onChange={(e) => setReplacementForm({ ...replacementForm, reason: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setIsReplacementModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={repAddLoading}>
              {repAddLoading ? 'Scheduling...' : 'Confirm Replacement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: VIEW REPLACEMENT */}
      <Modal isOpen={isViewRepOpen} onClose={() => setIsViewRepOpen(false)} title="Replacement Details">
        {viewReplacement && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>{viewReplacement.shift?.shiftName}</h3>
              <StatusBadge status={viewReplacement.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Unavailable Associate</span>
                <strong style={{ color: '#ef4444' }}>
                  {viewReplacement.originalEmployee?.firstName} {viewReplacement.originalEmployee?.lastName} ({viewReplacement.originalEmployee?.employeeId})
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Stand-in Associate</span>
                <strong style={{ color: '#10b981' }}>
                  {viewReplacement.replacementEmployee?.firstName} {viewReplacement.replacementEmployee?.lastName} ({viewReplacement.replacementEmployee?.employeeId})
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Date</span>
                <strong>{viewReplacement.replacementDate}</strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Reason</span>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>{viewReplacement.reason || '—'}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsViewRepOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>



      {/* MODAL 8: DELETE REPLACEMENT */}
      <Modal isOpen={isDeleteRepOpen} onClose={() => setIsDeleteRepOpen(false)} title="Delete Replacement Record">
        {deleteReplacement && (
          <div>
            {deleteRepError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteRepError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to delete the replacement record for shift <strong>{deleteReplacement.shift?.shiftName}</strong> on <strong>{deleteReplacement.replacementDate}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteRepOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleteRepLoading}
                onClick={handleConfirmDeleteRep}
              >
                {deleteRepLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
