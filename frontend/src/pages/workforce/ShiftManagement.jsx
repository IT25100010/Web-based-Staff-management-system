import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Clock, Plus, Eye, Edit2, Trash2, MapPin, Users, Calendar, AlertCircle } from 'lucide-react';

export const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    shiftName: '',
    shiftDate: '',
    startTime: '',
    endTime: '',
    workLocationId: '',
    requiredEmployees: '',
    status: 'SCHEDULED'
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // View Modal
  const [viewShift, setViewShift] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal
  const [editShift, setEditShift] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    shiftName: '',
    shiftDate: '',
    startTime: '',
    endTime: '',
    workLocationId: '',
    requiredEmployees: '',
    status: 'SCHEDULED'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal
  const [deleteShift, setDeleteShift] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [shRes, locRes] = await Promise.all([
        apiClient.get('/workforce/shifts'),
        apiClient.get('/workforce/locations')
      ]);
      setShifts(shRes.data || []);
      setLocations(locRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChangeForAdd = (locationId) => {
    const loc = locations.find(l => l.id.toString() === locationId.toString());
    if (loc) {
      setForm(prev => ({
        ...prev,
        workLocationId: locationId,
        shiftDate: prev.shiftDate || loc.workforcePlan?.startDate || '',
        requiredEmployees: loc.capacity || 20
      }));
    } else {
      setForm(prev => ({
        ...prev,
        workLocationId: '',
        requiredEmployees: ''
      }));
    }
    setAddError('');
  };

  const handleLocationChangeForEdit = (locationId) => {
    const loc = locations.find(l => l.id.toString() === locationId.toString());
    if (loc) {
      setEditForm(prev => ({
        ...prev,
        workLocationId: locationId,
        requiredEmployees: loc.capacity || 20
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        workLocationId: '',
        requiredEmployees: ''
      }));
    }
    setEditError('');
  };

  const validateShiftDate = (locationId, shiftDate) => {
    if (!locationId) return 'Please select a work location.';
    if (!shiftDate) return 'Please enter a shift date.';
    const loc = locations.find(l => l.id.toString() === locationId.toString());
    if (!loc) return 'Selected work location not found.';

    // Validate shift date is within the workforce plan date range
    const plan = loc.workforcePlan;
    if (plan) {
      if (shiftDate < plan.startDate || shiftDate > plan.endDate) {
        return 'Shift date must be within the selected Workforce Plan date range.';
      }
    }

    return null;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');

    const dateValidationError = validateShiftDate(form.workLocationId, form.shiftDate);
    if (dateValidationError) {
      setAddError(dateValidationError);
      setAddLoading(false);
      return;
    }

    try {
      await apiClient.post('/workforce/shifts', {
        ...form,
        workLocationId: parseInt(form.workLocationId),
        requiredEmployees: parseInt(form.requiredEmployees) || 5
      });
      setIsModalOpen(false);
      setForm({
        shiftName: '',
        shiftDate: '',
        startTime: '',
        endTime: '',
        workLocationId: '',
        requiredEmployees: '',
        status: 'SCHEDULED'
      });
      loadData();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error creating shift');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (sh) => {
    setEditShift(sh);
    setEditError('');
    setEditForm({
      shiftName: sh.shiftName || '',
      shiftDate: sh.shiftDate || '',
      startTime: sh.startTime?.substring(0, 5) || '',
      endTime: sh.endTime?.substring(0, 5) || '',
      workLocationId: sh.workLocation?.id?.toString() || '',
      requiredEmployees: sh.requiredEmployees?.toString() || (sh.workLocation?.capacity?.toString() || '5'),
      status: sh.status || 'SCHEDULED'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    const dateValidationError = validateShiftDate(editForm.workLocationId, editForm.shiftDate);
    if (dateValidationError) {
      setEditError(dateValidationError);
      setEditLoading(false);
      return;
    }

    try {
      await apiClient.put(`/workforce/shifts/${editShift.id}`, {
        ...editForm,
        workLocationId: parseInt(editForm.workLocationId),
        requiredEmployees: parseInt(editForm.requiredEmployees) || 5
      });
      setIsEditModalOpen(false);
      loadData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error updating shift');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (sh) => {
    setDeleteShift(sh);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/workforce/shifts/${deleteShift.id}`);
      setIsDeleteModalOpen(false);
      setDeleteShift(null);
      loadData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error deleting shift');
    } finally {
      setDeleteLoading(false);
    }
  };

  const selectedLocInAdd = locations.find(l => l.id.toString() === form.workLocationId.toString());
  const selectedLocInEdit = locations.find(l => l.id.toString() === editForm.workLocationId.toString());

  const filteredShifts = shifts.filter((s) => {
    const matchesLocation = !filterLocation || (s.workLocation && s.workLocation.id.toString() === filterLocation.toString());
    const matchesStatus = !filterStatus || s.status === filterStatus;
    const matchesDate = !filterDate || s.shiftDate === filterDate;
    const matchesSearch = !searchQuery.trim() ||
      (s.shiftName && s.shiftName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.shiftCode && s.shiftCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.workLocation?.locationName && s.workLocation.locationName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLocation && matchesStatus && matchesDate && matchesSearch;
  });

  const columns = [
    { 
      header: 'Shift Code', 
      accessor: 'shiftCode', 
      render: (r) => <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{r.shiftCode}</span> 
    },
    { 
      header: 'Shift Title', 
      accessor: 'shiftName', 
      render: (r) => <span style={{ fontWeight: 600 }}>{r.shiftName}</span> 
    },
    { 
      header: 'Terminal / Location', 
      render: (r) => r.workLocation ? (
        <div>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.workLocation.locationName}</span>
          {r.workLocation.workforcePlan && (
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Plan: {r.workLocation.workforcePlan.planName} ({r.workLocation.workforcePlan.startDate} ~ {r.workLocation.workforcePlan.endDate})
            </div>
          )}
        </div>
      ) : <span style={{ color: '#94a3b8' }}>—</span>
    },
    { 
      header: 'Shift Date', 
      accessor: 'shiftDate',
      render: (r) => <span style={{ fontWeight: 600, color: '#0369a1' }}>{r.shiftDate}</span>
    },
    { 
      header: 'Hours Window', 
      render: (r) => `${r.startTime?.substring(0, 5)} - ${r.endTime?.substring(0, 5)}` 
    },
    { 
      header: 'Inherited Capacity', 
      render: (r) => <strong style={{ color: '#0369a1' }}>{r.requiredEmployees} Staff</strong> 
    },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Shift"
            onClick={() => { setViewShift(r); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Edit Shift"
            onClick={() => handleOpenEdit(r)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Shift"
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
          <h1 className="page-title">Shift Management & Rostering</h1>
          <p className="page-description">
            Schedule operational shifts linked to Work Locations, inherit staffing capacities, and align shift dates with Workforce Plans.
          </p>
        </div>
        <button onClick={() => { setAddError(''); setIsModalOpen(true); }} className="btn btn-primary">
          <Plus size={16} /> Create Shift
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Location:</span>
            <select
              className="form-control"
              style={{ width: '170px' }}
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.locationName}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Status:</span>
            <select
              className="form-control"
              style={{ width: '150px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Date:</span>
            <input
              type="date"
              className="form-control"
              style={{ width: '150px' }}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search shifts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={filteredShifts} loading={loading} searchPlaceholder="Filter shifts..." />
      </div>

      {/* MODAL 1: CREATE SHIFT */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Operational Shift">
        <form onSubmit={handleCreate}>
          {addError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{addError}</span>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Operating Work Location *</label>
            <select
              className="form-control"
              required
              value={form.workLocationId}
              onChange={(e) => handleLocationChangeForAdd(e.target.value)}
            >
              <option value="">-- Select Work Location --</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.locationName} {loc.workforcePlan ? `(Plan: ${loc.workforcePlan.planName})` : ''} — Capacity: {loc.capacity} Staff
                </option>
              ))}
            </select>
          </div>

          {/* Display Work Location, Automatically Identified Workforce Plan, Dates & Inherited Capacity */}
          {selectedLocInAdd && (
            <div style={{ padding: '12px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, color: '#0369a1' }}>
                  Location: {selectedLocInAdd.locationName}
                </span>
                <span style={{ background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                  Automatic Quota: {selectedLocInAdd.capacity} Staff
                </span>
              </div>
              {selectedLocInAdd.workforcePlan ? (
                <div style={{ color: '#0369a1', fontSize: '0.825rem' }}>
                  <div>Linked Workforce Plan: <strong>{selectedLocInAdd.workforcePlan.planName}</strong></div>
                  <div style={{ marginTop: '3px', color: '#0f172a' }}>
                    Valid Plan Date Range: <strong>{selectedLocInAdd.workforcePlan.startDate}</strong> to <strong>{selectedLocInAdd.workforcePlan.endDate}</strong>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#b91c1c', fontSize: '0.8rem' }}>
                  ⚠️ This work location is not linked to an active Workforce Plan.
                </div>
              )}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Shift Title *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Morning Quay Crane Shift A"
              value={form.shiftName}
              onChange={(e) => setForm({ ...form, shiftName: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Shift Date *</label>
              <input
                type="date"
                className="form-control"
                required
                min={selectedLocInAdd?.workforcePlan?.startDate}
                max={selectedLocInAdd?.workforcePlan?.endDate}
                value={form.shiftDate}
                onChange={(e) => {
                  setForm({ ...form, shiftDate: e.target.value });
                  setAddError('');
                }}
              />
              <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                {selectedLocInAdd?.workforcePlan
                  ? `Must be within: ${selectedLocInAdd.workforcePlan.startDate} to ${selectedLocInAdd.workforcePlan.endDate}`
                  : 'Must fall within linked Workforce Plan dates'}
              </small>
            </div>
            <div className="form-group">
              <label className="form-label">Inherited Shift Capacity (Staff Quota) *</label>
              <input
                type="number"
                className="form-control"
                readOnly
                disabled
                style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed', fontWeight: 600, color: '#0284c7' }}
                value={form.requiredEmployees}
                placeholder="Auto-assigned from Work Location"
              />
              <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Auto-inherited from Work Location / Plan quota</small>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input
                type="time"
                className="form-control"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input
                type="time"
                className="form-control"
                required
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Publishing...' : 'Publish Shift'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW DETAILS */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Operational Shift Details">
        {viewShift && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e3a8a' }}>{viewShift.shiftName}</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Code: {viewShift.shiftCode}</span>
              </div>
              <StatusBadge status={viewShift.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Operating Location</span>
                <strong style={{ color: '#0f172a' }}>{viewShift.workLocation?.locationName || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Linked Workforce Plan</span>
                <strong style={{ color: '#0369a1' }}>
                  {viewShift.workLocation?.workforcePlan?.planName || '—'}
                </strong>
                {viewShift.workLocation?.workforcePlan && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Plan Range: {viewShift.workLocation.workforcePlan.startDate} to {viewShift.workLocation.workforcePlan.endDate}
                  </div>
                )}
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Shift Date</span>
                <strong style={{ color: '#0369a1' }}>{viewShift.shiftDate}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Working Hours Window</span>
                <strong>{viewShift.startTime?.substring(0, 5)} to {viewShift.endTime?.substring(0, 5)}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Inherited Staff Capacity</span>
                <strong style={{ color: '#0369a1' }}>{viewShift.requiredEmployees} Staff Quota</strong>
              </div>
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
                  handleOpenEdit(viewShift);
                }}
              >
                Edit Shift
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: EDIT SHIFT */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Operational Shift">
        {editShift && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{editError}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Operating Work Location *</label>
              <select
                className="form-control"
                required
                value={editForm.workLocationId}
                onChange={(e) => handleLocationChangeForEdit(e.target.value)}
              >
                <option value="">-- Select Work Location --</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.locationName} {loc.workforcePlan ? `(Plan: ${loc.workforcePlan.planName})` : ''} — Capacity: {loc.capacity} Staff
                  </option>
                ))}
              </select>
            </div>

            {selectedLocInEdit && (
              <div style={{ padding: '12px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, color: '#0369a1' }}>
                    Location: {selectedLocInEdit.locationName}
                  </span>
                  <span style={{ background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                    Automatic Quota: {selectedLocInEdit.capacity} Staff
                  </span>
                </div>
                {selectedLocInEdit.workforcePlan ? (
                  <div style={{ color: '#0369a1', fontSize: '0.825rem' }}>
                    <div>Linked Workforce Plan: <strong>{selectedLocInEdit.workforcePlan.planName}</strong></div>
                    <div style={{ marginTop: '3px', color: '#0f172a' }}>
                      Valid Plan Date Range: <strong>{selectedLocInEdit.workforcePlan.startDate}</strong> to <strong>{selectedLocInEdit.workforcePlan.endDate}</strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#b91c1c', fontSize: '0.8rem' }}>
                    ⚠️ This work location is not linked to an active Workforce Plan.
                  </div>
                )}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Shift Title *</label>
              <input
                type="text"
                className="form-control"
                required
                value={editForm.shiftName}
                onChange={(e) => setEditForm({ ...editForm, shiftName: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Shift Date *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  min={selectedLocInEdit?.workforcePlan?.startDate}
                  max={selectedLocInEdit?.workforcePlan?.endDate}
                  value={editForm.shiftDate}
                  onChange={(e) => {
                    setEditForm({ ...editForm, shiftDate: e.target.value });
                    setEditError('');
                  }}
                />
                <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                  {selectedLocInEdit?.workforcePlan
                    ? `Must be within: ${selectedLocInEdit.workforcePlan.startDate} to ${selectedLocInEdit.workforcePlan.endDate}`
                    : 'Must fall within linked Workforce Plan dates'}
                </small>
              </div>
              <div className="form-group">
                <label className="form-label">Inherited Shift Capacity (Staff Quota) *</label>
                <input
                  type="number"
                  className="form-control"
                  readOnly
                  disabled
                  style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed', fontWeight: 600, color: '#0284c7' }}
                  value={editForm.requiredEmployees}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <input
                  type="time"
                  className="form-control"
                  required
                  value={editForm.startTime}
                  onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Time *</label>
                <input
                  type="time"
                  className="form-control"
                  required
                  value={editForm.endTime}
                  onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Update Shift'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: DELETE SHIFT */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Operational Shift">
        {deleteShift && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to remove the shift <strong>{deleteShift.shiftName}</strong> ({deleteShift.shiftCode}) on <strong>{deleteShift.shiftDate}</strong>?
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
                {deleteLoading ? 'Processing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
