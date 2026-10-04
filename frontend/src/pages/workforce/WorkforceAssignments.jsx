import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Users, Plus, AlertCircle, Eye, Edit2, Trash2, Calendar, MapPin, CheckCircle } from 'lucide-react';

export const WorkforceAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterShift, setFilterShift] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [availableSuggestions, setAvailableSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [form, setForm] = useState({
    employeeId: '',
    shiftId: '',
    assignmentDate: ''
  });

  // View Modal
  const [viewAsg, setViewAsg] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal
  const [editAsg, setEditAsg] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    shiftId: '',
    assignmentDate: '',
    status: 'ASSIGNED'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal
  const [deleteAsg, setDeleteAsg] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [asRes, empRes, shRes, locRes] = await Promise.all([
        apiClient.get('/workforce/assignments'),
        apiClient.get('/employees'),
        apiClient.get('/workforce/shifts'),
        apiClient.get('/workforce/locations')
      ]);
      setAssignments(asRes.data || []);
      setEmployees(empRes.data || []);
      setShifts(shRes.data || []);
      setLocations(locRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleShiftSelectInAdd = async (shiftId) => {
    const selected = shifts.find(s => s.id.toString() === shiftId.toString());
    setForm(prev => ({
      ...prev,
      shiftId: shiftId,
      assignmentDate: selected?.shiftDate || prev.assignmentDate
    }));
    setAddError('');
    setAvailableSuggestions([]);

    if (shiftId) {
      try {
        setLoadingSuggestions(true);
        const res = await apiClient.get(`/workforce/shifts/${shiftId}/available-employees`);
        setAvailableSuggestions(res.data || []);
      } catch (err) {
        console.error('Failed to load available employee recommendations', err);
        setAvailableSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }
  };

  const handleShiftSelectInEdit = (shiftId) => {
    const selected = shifts.find(s => s.id.toString() === shiftId.toString());
    setEditForm(prev => ({
      ...prev,
      shiftId: shiftId,
      assignmentDate: selected?.shiftDate || prev.assignmentDate
    }));
    setEditError('');
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);

    const selectedEmp = employees.find(emp => emp.id.toString() === form.employeeId.toString());
    if (selectedEmp && selectedEmp.status && selectedEmp.status.toUpperCase() !== 'ACTIVE') {
      setAddError('Selected employee is not active. Only ACTIVE employees can be assigned.');
      setAddLoading(false);
      return;
    }

    try {
      await apiClient.post('/workforce/assignments', {
        employeeId: parseInt(form.employeeId),
        shiftId: parseInt(form.shiftId),
        assignmentDate: form.assignmentDate
      });
      setIsModalOpen(false);
      setForm({
        employeeId: '',
        shiftId: '',
        assignmentDate: ''
      });
      loadData();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Conflict detected: Employee already assigned or location capacity exceeded.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (asg) => {
    setEditAsg(asg);
    setEditError('');
    setEditForm({
      shiftId: asg.shift?.id?.toString() || '',
      assignmentDate: asg.assignmentDate || '',
      status: asg.status || 'ASSIGNED'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await apiClient.put(`/workforce/assignments/${editAsg.id}`, {
        shiftId: parseInt(editForm.shiftId),
        assignmentDate: editForm.assignmentDate,
        status: editForm.status
      });
      setIsEditModalOpen(false);
      loadData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error updating assignment');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (asg) => {
    setDeleteAsg(asg);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/workforce/assignments/${deleteAsg.id}`);
      setIsDeleteModalOpen(false);
      setDeleteAsg(null);
      loadData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error deleting assignment');
    } finally {
      setDeleteLoading(false);
    }
  };

  const activeEmployees = employees.filter(e => !e.status || e.status.toUpperCase() === 'ACTIVE');
  const selectedShiftInAdd = shifts.find(s => s.id.toString() === form.shiftId.toString());
  const selectedShiftInEdit = shifts.find(s => s.id.toString() === editForm.shiftId.toString());

  const filteredAssignments = assignments.filter((a) => {
    const matchesShift = !filterShift || (a.shift && a.shift.id.toString() === filterShift.toString());
    const matchesLocation = !filterLocation || (a.shift?.workLocation && a.shift.workLocation.id.toString() === filterLocation.toString());
    const matchesStatus = !filterStatus || a.status === filterStatus;
    const matchesDate = !filterDate || a.assignmentDate === filterDate;
    const matchesSearch = !searchQuery.trim() ||
      (a.employee?.firstName && a.employee.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.employee?.lastName && a.employee.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.employee?.employeeId && a.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.shift?.shiftName && a.shift.shiftName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesShift && matchesLocation && matchesStatus && matchesDate && matchesSearch;
  });

  const columns = [
    {
      header: 'Staff Member',
      accessor: 'employee',
      render: (r) => (
        <div>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>
            {r.employee?.firstName} {r.employee?.lastName}
          </span>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {r.employee?.employeeId} • {r.employee?.designation || r.employee?.department?.name || 'Staff'}
          </div>
        </div>
      )
    },
    {
      header: 'Shift & Time',
      render: (r) => (
        <div>
          <span style={{ fontWeight: 600, color: '#1e3a8a' }}>{r.shift?.shiftName}</span>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {r.shift?.startTime?.substring(0, 5)} - {r.shift?.endTime?.substring(0, 5)}
          </div>
        </div>
      )
    },
    {
      header: 'Terminal / Location',
      render: (r) => r.shift?.workLocation ? (
        <div>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.shift.workLocation.locationName}</span>
          {r.shift.workLocation.workforcePlan && (
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Plan: {r.shift.workLocation.workforcePlan.planName}
            </div>
          )}
        </div>
      ) : <span style={{ color: '#94a3b8' }}>—</span>
    },
    { header: 'Date', accessor: 'assignmentDate' },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => { setViewAsg(r); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Edit Assignment"
            onClick={() => handleOpenEdit(r)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Cancel / Remove Assignment"
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
          <h1 className="page-title">Workforce Assignments</h1>
          <p className="page-description">
            Roster and assign active personnel to operational shifts, adhering to site capacity quotas and plan schedules.
          </p>
        </div>
        <button onClick={() => { setAddError(''); setIsModalOpen(true); }} className="btn btn-primary">
          <Plus size={16} /> Assign Employee
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
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Shift:</span>
            <select
              className="form-control"
              style={{ width: '160px' }}
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
            >
              <option value="">All Shifts</option>
              {shifts.map(s => (
                <option key={s.id} value={s.id}>{s.shiftName}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Status:</span>
            <select
              className="form-control"
              style={{ width: '140px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
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
              placeholder="Search by staff name, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={filteredAssignments} loading={loading} searchPlaceholder="Filter assignments..." />
      </div>

      {/* MODAL 1: ASSIGN EMPLOYEE */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Employee to Shift & Location">
        {addError && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{addError}</span>
          </div>
        )}

        <form onSubmit={handleAssign}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Operational Shift *</label>
            <select
              className="form-control"
              required
              value={form.shiftId}
              onChange={(e) => handleShiftSelectInAdd(e.target.value)}
            >
              <option value="">-- Select Operational Shift --</option>
              {shifts.map(s => (
                <option key={s.id} value={s.id}>
                  {s.shiftName} ({s.shiftDate} | {s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)}) — Terminal: {s.workLocation?.locationName || 'N/A'} (Cap: {s.requiredEmployees})
                </option>
              ))}
            </select>
          </div>

          {selectedShiftInAdd && (
            <div style={{ padding: '12px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, color: '#0369a1' }}>
                  Terminal: {selectedShiftInAdd.workLocation?.locationName || 'Site'}
                </span>
                <span style={{ background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                  Location Quota: {selectedShiftInAdd.workLocation?.capacity || selectedShiftInAdd.requiredEmployees} Staff
                </span>
              </div>
              {selectedShiftInAdd.workLocation?.workforcePlan && (
                <div style={{ color: '#0369a1', fontSize: '0.8rem' }}>
                  Workforce Plan: <strong>{selectedShiftInAdd.workLocation.workforcePlan.planName}</strong>
                </div>
              )}
              <div style={{ color: '#0f172a', fontSize: '0.8rem', marginTop: '4px' }}>
                Shift Date: <strong>{selectedShiftInAdd.shiftDate}</strong> ({selectedShiftInAdd.startTime?.substring(0, 5)} - {selectedShiftInAdd.endTime?.substring(0, 5)})
              </div>
            </div>
          )}

          {/* Smart Available Employee Recommendations */}
          {form.shiftId && (
            <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a' }}>
                  💡 Smart Candidate Recommendations (Conflict & Workload Checked)
                </span>
                {loadingSuggestions && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Calculating availability...</span>}
              </div>

              {availableSuggestions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {availableSuggestions.map((cand) => (
                    <div
                      key={cand.employeeId}
                      onClick={() => {
                        setForm(prev => ({ ...prev, employeeId: cand.employeeId.toString() }));
                        setAddError('');
                      }}
                      style={{
                        padding: '8px 10px',
                        background: form.employeeId.toString() === cand.employeeId.toString() ? '#e0f2fe' : '#ffffff',
                        border: form.employeeId.toString() === cand.employeeId.toString() ? '1px solid #0284c7' : '1px solid #e2e8f0',
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
                            <span key={i} style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px' }}>
                              ✓ {r}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', background: '#f0f9ff', padding: '2px 8px', borderRadius: '10px' }}>
                          Score: {cand.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !loadingSuggestions && (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                    No available candidates found without shift/leave conflicts.
                  </div>
                )
              )}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Active Employee *</label>
            <select
              className="form-control"
              required
              value={form.employeeId}
              onChange={(e) => {
                setForm({ ...form, employeeId: e.target.value });
                setAddError('');
              }}
            >
              <option value="">-- Select Active Employee --</option>
              {activeEmployees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.employeeId || `EMP-${e.id}`} — {e.firstName} {e.lastName} ({e.department?.name || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Assignment Date *</label>
            <input
              type="date"
              className="form-control"
              required
              value={form.assignmentDate}
              onChange={(e) => {
                setForm({ ...form, assignmentDate: e.target.value });
                setAddError('');
              }}
            />
            <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Aligned with shift operational date</small>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW DETAILS */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Workforce Assignment Details">
        {viewAsg && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
                  {viewAsg.employee?.firstName} {viewAsg.employee?.lastName}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  ID: {viewAsg.employee?.employeeId} • {viewAsg.employee?.department?.name || 'Staff'}
                </span>
              </div>
              <StatusBadge status={viewAsg.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Assigned Shift</span>
                <strong style={{ color: '#1e3a8a' }}>{viewAsg.shift?.shiftName || '—'}</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {viewAsg.shift?.startTime?.substring(0, 5)} to {viewAsg.shift?.endTime?.substring(0, 5)}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Assignment Date</span>
                <strong>{viewAsg.assignmentDate}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Work Location Terminal</span>
                <strong>{viewAsg.shift?.workLocation?.locationName || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Linked Workforce Plan</span>
                <strong style={{ color: '#0369a1' }}>
                  {viewAsg.shift?.workLocation?.workforcePlan?.planName || '—'}
                </strong>
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
                  handleOpenEdit(viewAsg);
                }}
              >
                Edit Assignment
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: EDIT ASSIGNMENT */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Workforce Assignment">
        {editAsg && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{editError}</span>
              </div>
            )}

            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', marginBottom: '14px', fontSize: '0.875rem' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Employee</span>
              <strong>{editAsg.employee?.firstName} {editAsg.employee?.lastName} ({editAsg.employee?.employeeId})</strong>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Shift *</label>
              <select
                className="form-control"
                required
                value={editForm.shiftId}
                onChange={(e) => handleShiftSelectInEdit(e.target.value)}
              >
                <option value="">-- Select Shift --</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.shiftName} ({s.shiftDate} | {s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)})
                  </option>
                ))}
              </select>
            </div>

            {selectedShiftInEdit && (
              <div style={{ padding: '10px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem' }}>
                <div>Terminal: <strong>{selectedShiftInEdit.workLocation?.locationName}</strong></div>
                {selectedShiftInEdit.workLocation?.workforcePlan && (
                  <div>Plan: <strong>{selectedShiftInEdit.workLocation.workforcePlan.planName}</strong></div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <div className="form-group">
                <label className="form-label">Assignment Date *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={editForm.assignmentDate}
                  onChange={(e) => setEditForm({ ...editForm, assignmentDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="ASSIGNED">Assigned</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Update Assignment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: DELETE ASSIGNMENT */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Cancel Workforce Assignment">
        {deleteAsg && (
          <div>
            {deleteError && (
              <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', fontSize: '0.85rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to remove the shift assignment for <strong>{deleteAsg.employee?.firstName} {deleteAsg.employee?.lastName}</strong> from <strong>{deleteAsg.shift?.shiftName}</strong> on <strong>{deleteAsg.assignmentDate}</strong>?
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
