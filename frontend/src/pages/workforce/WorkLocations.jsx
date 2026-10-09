import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { MapPin, Plus, Eye, Edit2, Trash2, Phone, User, Building, Layers, AlertCircle } from 'lucide-react';

export const WorkLocations = () => {
  const [locations, setLocations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    workforcePlanId: '',
    locationCode: '',
    locationName: '',
    address: '',
    contactPerson: '',
    contactPhone: '',
    capacity: '',
    status: 'ACTIVE'
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // View Modal
  const [viewLoc, setViewLoc] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal
  const [editLoc, setEditLoc] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    workforcePlanId: '',
    locationCode: '',
    locationName: '',
    address: '',
    contactPerson: '',
    contactPhone: '',
    capacity: '',
    status: 'ACTIVE'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal
  const [deleteLoc, setDeleteLoc] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locRes, planRes] = await Promise.all([
        apiClient.get('/workforce/locations'),
        apiClient.get('/workforce/plans')
      ]);
      setLocations(locRes.data || []);
      setPlans(planRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChangeForAdd = (planId) => {
    const selectedPlan = plans.find(p => p.id.toString() === planId.toString());
    if (selectedPlan) {
      setForm(prev => ({
        ...prev,
        workforcePlanId: planId,
        capacity: selectedPlan.requiredHeadcount
      }));
    } else {
      setForm(prev => ({
        ...prev,
        workforcePlanId: '',
        capacity: ''
      }));
    }
    setAddError('');
  };

  const handlePlanChangeForEdit = (planId) => {
    const selectedPlan = plans.find(p => p.id.toString() === planId.toString());
    if (selectedPlan) {
      setEditForm(prev => ({
        ...prev,
        workforcePlanId: planId,
        capacity: selectedPlan.requiredHeadcount
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        workforcePlanId: '',
        capacity: ''
      }));
    }
    setEditError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');

    if (!form.workforcePlanId) {
      setAddError('Please select a workforce plan.');
      setAddLoading(false);
      return;
    }

    try {
      await apiClient.post('/workforce/locations', {
        ...form,
        workforcePlanId: parseInt(form.workforcePlanId),
        capacity: parseInt(form.capacity) || 20
      });
      setIsModalOpen(false);
      setForm({
        workforcePlanId: '',
        locationCode: '',
        locationName: '',
        address: '',
        contactPerson: '',
        contactPhone: '',
        capacity: '',
        status: 'ACTIVE'
      });
      loadData();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error registering location');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (loc) => {
    setEditLoc(loc);
    setEditError('');
    setEditForm({
      workforcePlanId: loc.workforcePlan?.id?.toString() || '',
      locationCode: loc.locationCode || '',
      locationName: loc.locationName || '',
      address: loc.address || '',
      contactPerson: loc.contactPerson || '',
      contactPhone: loc.contactPhone || '',
      capacity: loc.capacity?.toString() || (loc.workforcePlan?.requiredHeadcount?.toString() || '20'),
      status: loc.status || 'ACTIVE'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    try {
      await apiClient.put(`/workforce/locations/${editLoc.id}`, {
        ...editForm,
        workforcePlanId: editForm.workforcePlanId ? parseInt(editForm.workforcePlanId) : null,
        capacity: parseInt(editForm.capacity) || 20
      });
      setIsEditModalOpen(false);
      loadData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error updating location');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (loc) => {
    setDeleteLoc(loc);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await apiClient.delete(`/workforce/locations/${deleteLoc.id}`);
      if (res.data?.status === 'DEACTIVATED') {
        alert(res.data.message);
      }
      setIsDeleteModalOpen(false);
      setDeleteLoc(null);
      loadData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error deleting location');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredLocations = locations.filter((l) => {
    const matchesStatus = !filterStatus || l.status === filterStatus;
    const matchesPlan = !filterPlan || (l.workforcePlan && l.workforcePlan.id.toString() === filterPlan.toString());
    const matchesSearch = !searchQuery.trim() ||
      (l.locationName && l.locationName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.locationCode && l.locationCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.address && l.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.workforcePlan?.planName && l.workforcePlan.planName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.contactPerson && l.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesPlan && matchesSearch;
  });

  const columns = [
    { 
      header: 'Location Code', 
      accessor: 'locationCode', 
      render: (r) => <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{r.locationCode}</span> 
    },
    { 
      header: 'Terminal Name', 
      accessor: 'locationName', 
      render: (r) => <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.locationName}</span> 
    },
    {
      header: 'Workforce Plan',
      render: (r) => r.workforcePlan ? (
        <div>
          <span style={{ fontWeight: 600, color: '#0369a1' }}>{r.workforcePlan.planName}</span>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Plan Period: {r.workforcePlan.startDate} to {r.workforcePlan.endDate}
          </div>
        </div>
      ) : <span style={{ color: '#94a3b8' }}>—</span>
    },
    { header: 'Address', accessor: 'address' },
    { 
      header: 'Contact Lead', 
      render: (r) => `${r.contactPerson || '—'} (${r.contactPhone || '—'})` 
    },
    { 
      header: 'Capacity (Plan Quota)', 
      accessor: 'capacity', 
      render: (r) => <strong style={{ color: '#0284c7' }}>{r.capacity || 0} Staff</strong> 
    },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => { setViewLoc(r); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Edit Location"
            onClick={() => handleOpenEdit(r)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete / Deactivate"
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
          <h1 className="page-title">Work Locations & Site Logistics</h1>
          <p className="page-description">
            Manage operational terminals and depots linked to Workforce Plans with automatic capacity inheritance.
          </p>
        </div>
        <button onClick={() => { setAddError(''); setIsModalOpen(true); }} className="btn btn-primary">
          <Plus size={16} /> Add Work Location
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Plan:</span>
            <select
              className="form-control"
              style={{ width: '180px' }}
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
            >
              <option value="">All Workforce Plans</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.planName}</option>
              ))}
            </select>
          </div>

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
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by location name, code, plan, address, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={filteredLocations} loading={loading} searchPlaceholder="Filter locations..." />
      </div>

      {/* MODAL 1: REGISTER WORK LOCATION */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Work Location">
        <form onSubmit={handleCreate}>
          {addError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{addError}</span>
            </div>
          )}

          {/* Workforce Plan Selection */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Related Workforce Plan *</label>
            <select
              className="form-control"
              required
              value={form.workforcePlanId}
              onChange={(e) => handlePlanChangeForAdd(e.target.value)}
            >
              <option value="">-- Select Workforce Plan --</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.planName} ({p.startDate} to {p.endDate}) — Capacity: {p.requiredHeadcount} Staff
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Location Code</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. TRM-COL-01 (optional, auto-generated if empty)"
                value={form.locationCode}
                onChange={(e) => setForm({ ...form, locationCode: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Terminal / Location Name *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. Colombo Deepwater Container Terminal"
                value={form.locationName}
                onChange={(e) => setForm({ ...form, locationName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Site Address *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Full physical street address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Inherited Capacity (Staff) *</label>
            <input
              type="number"
              className="form-control"
              readOnly
              disabled
              style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed', fontWeight: 600, color: '#0284c7' }}
              value={form.capacity}
              placeholder="Select a Workforce Plan to auto-load capacity"
            />
            <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Capacity automatically derives from the selected Workforce Plan</small>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input
                type="text"
                className="form-control"
                placeholder="Site Manager name"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                className="form-control"
                placeholder="+94 11 234 5678"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Saving...' : 'Register Location'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW DETAILS */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Work Location Details">
        {viewLoc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>{viewLoc.locationName}</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Code: {viewLoc.locationCode}</span>
              </div>
              <StatusBadge status={viewLoc.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Workforce Plan</span>
                <strong style={{ color: '#0369a1' }}>
                  {viewLoc.workforcePlan?.planName || '—'}
                </strong>
                {viewLoc.workforcePlan && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Plan Period: {viewLoc.workforcePlan.startDate} to {viewLoc.workforcePlan.endDate}
                  </div>
                )}
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Inherited Staff Capacity</span>
                <strong style={{ color: '#0284c7' }}>{viewLoc.capacity} Staff Members</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Physical Address</span>
                <strong>{viewLoc.address || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Contact Lead</span>
                <strong>{viewLoc.contactPerson || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Contact Number</span>
                <strong>{viewLoc.contactPhone || '—'}</strong>
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
                  handleOpenEdit(viewLoc);
                }}
              >
                Edit Location
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: EDIT LOCATION */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Work Location">
        {editLoc && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{editError}</span>
              </div>
            )}

            {/* Workforce Plan Selection */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Related Workforce Plan</label>
              <select
                className="form-control"
                value={editForm.workforcePlanId}
                onChange={(e) => handlePlanChangeForEdit(e.target.value)}
              >
                <option value="">-- Select Workforce Plan --</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.planName} ({p.startDate} to {p.endDate}) — Capacity: {p.requiredHeadcount} Staff
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Location Code</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={editForm.locationCode}
                  onChange={(e) => setEditForm({ ...editForm, locationCode: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Terminal / Location Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={editForm.locationName}
                  onChange={(e) => setEditForm({ ...editForm, locationName: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Site Address *</label>
              <input
                type="text"
                className="form-control"
                required
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Inherited Capacity (Staff) *</label>
              <input
                type="number"
                className="form-control"
                readOnly
                disabled
                style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed', fontWeight: 600, color: '#0284c7' }}
                value={editForm.capacity}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.contactPerson}
                  onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.contactPhone}
                  onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
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
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Update Location'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: DELETE / DEACTIVATE LOCATION */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete or Deactivate Location">
        {deleteLoc && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to remove <strong>{deleteLoc.locationName}</strong> ({deleteLoc.locationCode})?
            </p>
            <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '6px', fontSize: '0.85rem', color: '#854d0e', marginBottom: '18px' }}>
              ℹ️ Safe Deletion: If this location has existing shifts or workforce assignments, the system will automatically deactivate it (status = INACTIVE) instead of permanently deleting it, maintaining all scheduling audit records.
            </div>
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
