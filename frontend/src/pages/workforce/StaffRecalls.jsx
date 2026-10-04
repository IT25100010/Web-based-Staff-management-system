import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { AlertTriangle, Plus, PhoneCall, CheckCircle, Clock, Eye, Edit2, Trash2, MapPin } from 'lucide-react';

export const StaffRecalls = () => {
  const [recalls, setRecalls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [formData, setFormData] = useState({
    recallTitle: '',
    targetEmployees: '',
    recallDate: '',
    recallTime: '',
    location: '',
    priority: 'CRITICAL',
    reason: '',
    status: 'ACTIVE'
  });

  // View Modal
  const [viewRecall, setViewRecall] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal
  const [editRecall, setEditRecall] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    recallTitle: '',
    targetEmployees: '',
    recallDate: '',
    recallTime: '',
    location: '',
    priority: 'CRITICAL',
    reason: '',
    status: 'ACTIVE'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal
  const [deleteRecall, setDeleteRecall] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Target Recipients State
  const [allEmployees, setAllEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [recipientDeptFilter, setRecipientDeptFilter] = useState('');
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [empSearch, setEmpSearch] = useState('');

  const fetchRecalls = async () => {
    try {
      setLoading(true);
      const [res, empRes, deptRes] = await Promise.all([
        apiClient.get('/workforce/recalls'),
        apiClient.get('/employees').catch(() => ({ data: [] })),
        apiClient.get('/employees/departments').catch(() => ({ data: [] }))
      ]);
      setRecalls(res.data || []);
      setAllEmployees(empRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecalls();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!isBroadcast && selectedRecipientIds.length === 0) {
      setAddError('Please select at least one employee recipient or choose broadcast.');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      await apiClient.post('/workforce/recalls', {
        ...formData,
        isBroadcast: isBroadcast,
        recipientIds: isBroadcast ? [] : selectedRecipientIds
      });
      setModalOpen(false);
      setFormData({
        recallTitle: '',
        targetEmployees: '',
        recallDate: '',
        recallTime: '',
        location: '',
        priority: 'CRITICAL',
        reason: '',
        status: 'ACTIVE'
      });
      setSelectedRecipientIds([]);
      setIsBroadcast(false);
      fetchRecalls();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error creating recall broadcast');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (r) => {
    setEditRecall(r);
    setEditError('');
    setEditForm({
      recallTitle: r.recallTitle || '',
      targetEmployees: r.targetEmployees || '',
      recallDate: r.recallDate || '',
      recallTime: r.recallTime?.substring(0, 5) || '',
      location: r.location || '',
      priority: r.priority || 'CRITICAL',
      reason: r.reason || '',
      status: r.status || 'ACTIVE'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await apiClient.put(`/workforce/recalls/${editRecall.id}`, editForm);
      setIsEditModalOpen(false);
      fetchRecalls();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error updating recall');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (r) => {
    setDeleteRecall(r);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/workforce/recalls/${deleteRecall.id}`);
      setIsDeleteModalOpen(false);
      setDeleteRecall(null);
      fetchRecalls();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error deleting recall');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredRecalls = recalls.filter((r) => {
    const matchesPriority = !filterPriority || r.priority === filterPriority;
    const matchesStatus = !filterStatus || r.status === filterStatus;
    const matchesSearch = !searchQuery.trim() ||
      (r.recallTitle && r.recallTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.targetEmployees && r.targetEmployees.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.location && r.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.reason && r.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPriority && matchesStatus && matchesSearch;
  });

  const activeRecallsCount = recalls.filter(r => r.status === 'ACTIVE').length;
  const criticalCount = recalls.filter(r => r.priority === 'CRITICAL' && r.status === 'ACTIVE').length;

  const columns = [
    {
      header: 'Emergency Recall Title',
      accessor: 'recallTitle',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} color={row.priority === 'CRITICAL' ? '#ef4444' : '#f59e0b'} />
            {row.recallTitle}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.reason}</div>
        </div>
      )
    },
    {
      header: 'Target Workforce',
      accessor: 'targetEmployees',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {row.targetEmployees}
        </span>
      )
    },
    { header: 'Reporting Location', accessor: 'location' },
    {
      header: 'Recall Time',
      accessor: 'recallDate',
      render: (row) => (
        <div style={{ fontSize: '0.85rem' }}>
          <div>{row.recallDate}</div>
          <div style={{ color: 'var(--primary)', fontWeight: 600 }}>{row.recallTime?.substring(0, 5)}</div>
        </div>
      )
    },
    {
      header: 'Priority',
      accessor: 'priority',
      render: (row) => <StatusBadge status={row.priority || 'HIGH'} />
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'ACTIVE'} />
    },
    {
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => { setViewRecall(row); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Edit Broadcast"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Recall"
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
            Emergency Staff Recall & Mobilization
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Rapid broadcast dispatch for unexpected vessel turnarounds, weather contingencies, and terminal surges
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#dc2626' }}>
          <Plus size={16} />
          <span>Broadcast Emergency Recall</span>
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Active Recalls"
          value={`${activeRecallsCount} Active`}
          subtitle="Mobilization notices in effect"
          icon={AlertTriangle}
          color="#ef4444"
        />
        <StatCard
          title="Critical Surge Operations"
          value={`${criticalCount} Emergency`}
          subtitle="Top tier priority mobilization"
          icon={Clock}
          color="#f59e0b"
        />
        <StatCard
          title="Recall Broadcast Mode"
          value="SMS & Push"
          subtitle="Automated notification dispatch active"
          icon={PhoneCall}
          color="#10b981"
        />
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1rem', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '150px' }}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
          </select>

          <select
            className="form-control"
            style={{ width: '150px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="Search recalls by title, location, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredRecalls}
          loading={loading}
          searchPlaceholder="Filter emergency recalls..."
        />
      </div>

      {/* MODAL 1: Broadcast Emergency Recall */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Broadcast Emergency Staff Recall"
      >
        <form onSubmit={handleCreate}>
          {addError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
              {addError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Recall Subject / Incident *</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Vessel Container Congestion - Night Shift Surge"
              value={formData.recallTitle}
              onChange={(e) => setFormData({ ...formData, recallTitle: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Target Audience Mode *</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="radio"
                  name="recipientMode"
                  checked={!isBroadcast}
                  onChange={() => {
                    setIsBroadcast(false);
                    if (formData.targetEmployees === 'All Active Personnel') {
                      setFormData({ ...formData, targetEmployees: '' });
                    }
                  }}
                />
                <span>Target Specific Staff Members</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="radio"
                  name="recipientMode"
                  checked={isBroadcast}
                  onChange={() => {
                    setIsBroadcast(true);
                    setFormData({ ...formData, targetEmployees: 'All Active Personnel' });
                  }}
                />
                <span>Broadcast to All Active Personnel</span>
              </label>
            </div>

            {!isBroadcast && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Filter by Department</label>
                    <select
                      className="form-control"
                      value={recipientDeptFilter}
                      onChange={(e) => setRecipientDeptFilter(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id || d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Search Staff</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Name, email, or EPF..."
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Selected Recipients: {selectedRecipientIds.length} employee(s)
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      onClick={() => {
                        const matching = allEmployees
                          .filter(e => (!recipientDeptFilter || e.department?.name === recipientDeptFilter || e.department === recipientDeptFilter) &&
                            (!empSearch || (e.fullName || `${e.firstName} ${e.lastName}`).toLowerCase().includes(empSearch.toLowerCase()) || (e.epfNo && e.epfNo.toLowerCase().includes(empSearch.toLowerCase()))))
                          .map(e => e.id);
                        setSelectedRecipientIds(Array.from(new Set([...selectedRecipientIds, ...matching])));
                      }}
                    >
                      Select All Filtered
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      onClick={() => setSelectedRecipientIds([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', padding: '6px' }}>
                  {allEmployees
                    .filter(e => (!recipientDeptFilter || e.department?.name === recipientDeptFilter || e.department === recipientDeptFilter) &&
                      (!empSearch || (e.fullName || `${e.firstName} ${e.lastName}`).toLowerCase().includes(empSearch.toLowerCase()) || (e.epfNo && e.epfNo.toLowerCase().includes(empSearch.toLowerCase()))))
                    .map((emp) => {
                      const isChecked = selectedRecipientIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '4px 6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            borderRadius: '4px',
                            background: isChecked ? '#eff6ff' : 'transparent'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecipientIds([...selectedRecipientIds, emp.id]);
                              } else {
                                setSelectedRecipientIds(selectedRecipientIds.filter(id => id !== emp.id));
                              }
                            }}
                          />
                          <span><strong>{emp.fullName || `${emp.firstName} ${emp.lastName}`}</strong> ({emp.epfNo || 'No EPF'}) - {emp.department?.name || emp.department || 'General'}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Workforce Summary Label *</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. Crane Operators Team B, Night Standby"
                value={formData.targetEmployees}
                onChange={(e) => setFormData({ ...formData, targetEmployees: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mobilization Priority</label>
              <select
                className="form-control"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="CRITICAL">Critical (Immediate Deployment &lt; 2 hrs)</option>
                <option value="URGENT">Urgent (Within 4 Hours)</option>
                <option value="HIGH">High Priority (Next Shift Reinforcement)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Recall Date *</label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.recallDate}
                onChange={(e) => setFormData({ ...formData, recallDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Required Arrival Time *</label>
              <input
                type="time"
                required
                className="form-control"
                value={formData.recallTime}
                onChange={(e) => setFormData({ ...formData, recallTime: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Reporting Terminal / Site *</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Colombo Deepwater Terminal Gate 4"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Operational Reason & Instructions *</label>
            <textarea
              className="form-control"
              rows={3}
              required
              placeholder="State emergency cause, standby allowance eligibility, and briefing notes"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: '#dc2626' }} disabled={addLoading}>
              {addLoading ? 'Broadcasting...' : 'Broadcast Recall'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: View Details */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Staff Recall Details">
        {viewRecall && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#dc2626' }}>{viewRecall.recallTitle}</h3>
              <StatusBadge status={viewRecall.priority} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Target Workforce</span>
                <strong>{viewRecall.targetEmployees}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Reporting Terminal</span>
                <strong>{viewRecall.location}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Recall Date & Time</span>
                <strong>{viewRecall.recallDate} at {viewRecall.recallTime?.substring(0, 5)}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Status</span>
                <StatusBadge status={viewRecall.status || 'ACTIVE'} />
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Operational Reason & Instructions</span>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155' }}>{viewRecall.reason}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Edit Recall */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Recall Broadcast">
        {editRecall && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {editError}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Recall Subject *</label>
              <input
                type="text"
                required
                className="form-control"
                value={editForm.recallTitle}
                onChange={(e) => setEditForm({ ...editForm, recallTitle: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Target Workforce *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={editForm.targetEmployees}
                  onChange={(e) => setEditForm({ ...editForm, targetEmployees: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-control"
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Recall Date *</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={editForm.recallDate}
                  onChange={(e) => setEditForm({ ...editForm, recallDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Required Arrival Time *</label>
                <input
                  type="time"
                  required
                  className="form-control"
                  value={editForm.recallTime}
                  onChange={(e) => setEditForm({ ...editForm, recallTime: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Reporting Terminal *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Reason & Instructions *</label>
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
                {editLoading ? 'Saving...' : 'Update Recall'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: Delete Recall */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Staff Recall">
        {deleteRecall && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to delete the emergency recall broadcast <strong>{deleteRecall.recallTitle}</strong>?
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
