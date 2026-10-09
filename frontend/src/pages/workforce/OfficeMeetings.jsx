import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CalendarDays, Plus, Eye, Edit2, Trash2, MapPin, Users, Clock } from 'lucide-react';

export const OfficeMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    meetingDate: '',
    startTime: '',
    endTime: '',
    location: '',
    requiredEmployees: '',
    description: '',
    status: 'SCHEDULED'
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // View Modal
  const [viewMeeting, setViewMeeting] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal
  const [editMeeting, setEditMeeting] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    meetingDate: '',
    startTime: '',
    endTime: '',
    location: '',
    requiredEmployees: '',
    description: '',
    status: 'SCHEDULED'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal
  const [deleteMeeting, setDeleteMeeting] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/workforce/meetings');
      setMeetings(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await apiClient.post('/workforce/meetings', form);
      setIsModalOpen(false);
      setForm({ title: '', meetingDate: '', startTime: '', endTime: '', location: '', requiredEmployees: '', description: '', status: 'SCHEDULED' });
      loadMeetings();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error scheduling meeting');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (m) => {
    setEditMeeting(m);
    setEditError('');
    setEditForm({
      title: m.title || '',
      meetingDate: m.meetingDate || '',
      startTime: m.startTime?.substring(0, 5) || '',
      endTime: m.endTime?.substring(0, 5) || '',
      location: m.location || '',
      requiredEmployees: m.requiredEmployees || '',
      description: m.description || '',
      status: m.status || 'SCHEDULED'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await apiClient.put(`/workforce/meetings/${editMeeting.id}`, editForm);
      setIsEditModalOpen(false);
      loadMeetings();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error updating meeting');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (m) => {
    setDeleteMeeting(m);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/workforce/meetings/${deleteMeeting.id}`);
      setIsDeleteModalOpen(false);
      setDeleteMeeting(null);
      loadMeetings();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error deleting meeting');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    const matchesStatus = !filterStatus || m.status === filterStatus;
    const matchesSearch = !searchQuery.trim() ||
      (m.title && m.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.location && m.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.requiredEmployees && m.requiredEmployees.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const columns = [
    { 
      header: 'Meeting Subject', 
      accessor: 'title', 
      render: (r) => <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{r.title}</span> 
    },
    { header: 'Date', accessor: 'meetingDate' },
    { 
      header: 'Time Window', 
      render: (r) => (
        <span style={{ color: '#0369a1', fontWeight: 500 }}>
          {r.startTime?.substring(0, 5)} – {r.endTime?.substring(0, 5)}
        </span>
      )
    },
    { header: 'Location / Venue', accessor: 'location' },
    { header: 'Required Attendees', accessor: 'requiredEmployees', render: (r) => r.requiredEmployees || '—' },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Details"
            onClick={() => { setViewMeeting(r); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Edit Meeting"
            onClick={() => handleOpenEdit(r)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Meeting"
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
          <h1 className="page-title">Office & Site Operations Meetings</h1>
          <p className="page-description">
            Coordinate safety briefings, shift handovers, and supervisory planning sessions.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} /> Schedule Meeting
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Status:</span>
            <select
              className="form-control"
              style={{ width: '160px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search meetings by subject, venue, attendees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={filteredMeetings} loading={loading} searchPlaceholder="Filter meetings..." />
      </div>

      {/* MODAL 1: SCHEDULE MEETING */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule Operations Meeting">
        <form onSubmit={handleCreate}>
          {addError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
              {addError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Meeting Title / Subject *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Daily Shift Handover & Safety Briefing"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={form.meetingDate}
                onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location / Platform *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. Terminal Briefing Room B"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
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

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Target Attendees / Groups</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Shift Supervisors, Logistics Leads, Crane Operators"
              value={form.requiredEmployees}
              onChange={(e) => setForm({ ...form, requiredEmployees: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Agenda / Description</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Enter meeting agenda points"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Saving...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW DETAILS */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Meeting Details">
        {viewMeeting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e3a8a' }}>{viewMeeting.title}</h3>
              <StatusBadge status={viewMeeting.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Date</span>
                <strong>{viewMeeting.meetingDate}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Time</span>
                <strong>{viewMeeting.startTime?.substring(0, 5)} to {viewMeeting.endTime?.substring(0, 5)}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Location / Venue</span>
                <strong>{viewMeeting.location}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Required Attendees</span>
                <strong>{viewMeeting.requiredEmployees || 'Open Session'}</strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Agenda & Notes</span>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>{viewMeeting.description || 'No detailed agenda provided.'}</p>
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
                  handleOpenEdit(viewMeeting);
                }}
              >
                Edit Meeting
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: EDIT MEETING */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Operations Meeting">
        {editMeeting && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {editError}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Meeting Title *</label>
              <input
                type="text"
                className="form-control"
                required
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={editForm.meetingDate}
                  onChange={(e) => setEditForm({ ...editForm, meetingDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Venue / Platform *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Required Attendees</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.requiredEmployees}
                  onChange={(e) => setEditForm({ ...editForm, requiredEmployees: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Agenda / Notes</label>
              <textarea
                className="form-control"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Update Meeting'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: DELETE MEETING */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Meeting Record">
        {deleteMeeting && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to delete the meeting <strong>{deleteMeeting.title}</strong> on <strong>{deleteMeeting.meetingDate}</strong>?
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
