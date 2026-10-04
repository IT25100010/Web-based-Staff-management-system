import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { LifeBuoy, Plus, CheckCircle2, Clock, AlertTriangle, Eye, Pencil, Trash2, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const TechSupportView = () => {
  const { role } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionText, setResolutionText] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'HARDWARE',
    priority: 'HIGH',
    reportedBy: ''
  });

  const [editFormData, setEditFormData] = useState({
    subject: '',
    description: '',
    category: 'HARDWARE',
    priority: 'HIGH',
    status: 'OPEN',
    resolutionNotes: '',
    reportedBy: ''
  });

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/tickets');
      setTickets(res.data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/tickets', formData);
      setModalOpen(false);
      setFormData({
        subject: '',
        description: '',
        category: 'HARDWARE',
        priority: 'HIGH',
        reportedBy: ''
      });
      fetchTickets();
    } catch (err) {
      alert('Error creating ticket: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    try {
      await apiClient.patch(`/admin/tickets/${selectedTicket.id}/status`, {
        status: 'RESOLVED',
        resolutionNotes: resolutionText
      });
      setResolveModalOpen(false);
      setSelectedTicket(null);
      setResolutionText('');
      fetchTickets();
    } catch (err) {
      alert('Error resolving ticket: ' + (err.response?.data?.message || err.message));
    }
  };

  const openEditModal = (t) => {
    setSelectedTicket(t);
    setEditFormData({
      subject: t.subject || '',
      description: t.description || '',
      category: t.category || 'HARDWARE',
      priority: t.priority || 'HIGH',
      status: t.status || 'OPEN',
      resolutionNotes: t.resolutionNotes || '',
      reportedBy: t.reportedBy || ''
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/admin/tickets/${selectedTicket.id}`, editFormData);
      setEditModalOpen(false);
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      alert('Error updating ticket: ' + (err.response?.data?.message || err.message));
    }
  };

  const openDeleteModal = (t) => {
    setSelectedTicket(t);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/admin/tickets/${selectedTicket.id}`);
      setDeleteModalOpen(false);
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      alert('Error deleting ticket: ' + (err.response?.data?.message || err.message));
    }
  };

  const canManage = role === 'IT_COORDINATOR' || role === 'SENIOR_ADMIN';

  const filteredTickets = tickets.filter((t) => {
    const matchesCategory = !categoryFilter || t.category === categoryFilter;
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    const matchesStatus = !statusFilter || t.status === statusFilter;
    return matchesCategory && matchesPriority && matchesStatus;
  });

  const columns = [
    {
      header: 'Ticket # & Subject',
      accessor: 'ticketNumber',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.subject}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{row.ticketNumber}</span> • Reported by {row.reportedBy || 'Staff'}
          </div>
        </div>
      )
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
          {row.category}
        </span>
      )
    },
    {
      header: 'Priority',
      accessor: 'priority',
      render: (row) => (
        <StatusBadge status={row.priority || 'HIGH'} />
      )
    },
    {
      header: 'Issue Details',
      accessor: 'description',
      render: (row) => (
        <div style={{ maxWidth: '280px', fontSize: '0.85rem' }}>
          <div style={{ color: 'var(--text-secondary)' }}>{row.description}</div>
          {row.resolutionNotes && (
            <div style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              <strong>Resolved:</strong> {row.resolutionNotes}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <StatusBadge status={row.status || 'OPEN'} />
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setViewTicket(row)}
            title="View Ticket Details"
            style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.5rem' }}
          >
            <Eye size={13} />
          </button>
          {canManage && (
            <>
              {row.status !== 'RESOLVED' && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedTicket(row);
                    setResolutionText(row.resolutionNotes || '');
                    setResolveModalOpen(true);
                  }}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', color: 'var(--success)' }}
                >
                  Resolve
                </button>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => openEditModal(row)}
                title="Edit Ticket"
                style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.5rem' }}
              >
                <Pencil size={13} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => openDeleteModal(row)}
                title="Delete Ticket"
                style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.5rem', color: 'var(--danger)' }}
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            IT Helpdesk & Technical Support
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Biometric terminal syncing, network infrastructure, hardware issues, and application bug tickets
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} />
          <span>Raise Support Ticket</span>
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Open Tickets"
          value={tickets.filter(t => t.status === 'OPEN').length}
          subtitle="Pending IT investigation"
          icon={AlertTriangle}
          color="#ef4444"
        />
        <StatCard
          title="In Progress"
          value={tickets.filter(t => t.status === 'IN_PROGRESS').length}
          subtitle="Under active troubleshooting"
          icon={Clock}
          color="#f59e0b"
        />
        <StatCard
          title="Resolved Tickets"
          value={tickets.filter(t => t.status === 'RESOLVED').length}
          subtitle="Successfully fixed and closed"
          icon={CheckCircle2}
          color="#10b981"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Filter size={16} />
            <span>Filters:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Category:</label>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '150px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="HARDWARE">HARDWARE</option>
              <option value="NETWORK">NETWORK</option>
              <option value="SOFTWARE">SOFTWARE</option>
              <option value="ACCOUNT">ACCOUNT</option>
              <option value="HRIS_SYSTEM">HRIS_SYSTEM</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Priority:</label>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '130px' }}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</label>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '130px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
          {(categoryFilter || priorityFilter || statusFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setCategoryFilter(''); setPriorityFilter(''); setStatusFilter(''); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredTickets}
          loading={loading}
          searchPlaceholder="Search tickets by subject, #, or reporter..."
        />
      </div>

      {/* Modal: New Ticket */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Raise Technical Support Ticket"
        >
          <form onSubmit={handleCreate}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Reported By</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Enter reporter name or workstation"
                value={formData.reportedBy}
                onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Subject / Issue Summary</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Brief summary of issue"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-control"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="HARDWARE">HARDWARE (Terminal, PC, Printer)</option>
                  <option value="NETWORK">NETWORK (LAN, Wi-Fi, VPN)</option>
                  <option value="SOFTWARE">SOFTWARE (Bug, Sync, OS)</option>
                  <option value="ACCOUNT">ACCOUNT (Password, Permissions)</option>
                  <option value="HRIS_SYSTEM">HRIS_SYSTEM</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Urgency Priority</label>
                <select
                  className="form-control"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="CRITICAL">CRITICAL (System Halt)</option>
                  <option value="HIGH">HIGH (Blocking Operations)</option>
                  <option value="MEDIUM">MEDIUM (Degraded Performance)</option>
                  <option value="LOW">LOW (General Inquiry)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Detailed Description</label>
              <textarea
                className="form-control"
                rows={4}
                required
                placeholder="Steps to reproduce, error codes, and symptoms"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Log Ticket
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Edit Ticket */}
      {editModalOpen && selectedTicket && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => { setEditModalOpen(false); setSelectedTicket(null); }}
          title={`Edit Ticket — ${selectedTicket.ticketNumber}`}
        >
          <form onSubmit={handleUpdate}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Subject / Issue Summary</label>
              <input
                type="text"
                required
                className="form-control"
                value={editFormData.subject}
                onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-control"
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                >
                  <option value="HARDWARE">HARDWARE</option>
                  <option value="NETWORK">NETWORK</option>
                  <option value="SOFTWARE">SOFTWARE</option>
                  <option value="ACCOUNT">ACCOUNT</option>
                  <option value="HRIS_SYSTEM">HRIS_SYSTEM</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-control"
                  value={editFormData.priority}
                  onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Detailed Description</label>
              <textarea
                className="form-control"
                rows={3}
                required
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Resolution Notes / Actions Taken</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Technical notes on how this issue was resolved"
                value={editFormData.resolutionNotes}
                onChange={(e) => setEditFormData({ ...editFormData, resolutionNotes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setEditModalOpen(false); setSelectedTicket(null); }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Resolve Ticket */}
      {selectedTicket && resolveModalOpen && (
        <Modal
          isOpen={resolveModalOpen}
          onClose={() => { setResolveModalOpen(false); setSelectedTicket(null); }}
          title={`Resolve Ticket — ${selectedTicket.ticketNumber}`}
        >
          <form onSubmit={handleResolve}>
            <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <strong>Subject:</strong> {selectedTicket.subject}
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Resolution Actions Taken</label>
              <textarea
                className="form-control"
                rows={3}
                required
                placeholder="Detail technical remediation steps taken"
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setResolveModalOpen(false); setSelectedTicket(null); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
              >
                Mark as Resolved
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: View Details */}
      {viewTicket && (
        <Modal
          isOpen={true}
          onClose={() => setViewTicket(null)}
          title={`Support Ticket — ${viewTicket.ticketNumber}`}
        >
          <div style={{ background: 'var(--bg-page)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {viewTicket.subject}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Reported by <strong>{viewTicket.reportedBy || 'Staff'}</strong>
                </div>
              </div>
              <div>
                <StatusBadge status={viewTicket.status || 'OPEN'} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</label>
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{viewTicket.category}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority</label>
                <div><StatusBadge status={viewTicket.priority || 'HIGH'} /></div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Issue Description</label>
              <div style={{ marginTop: '0.25rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {viewTicket.description}
              </div>
            </div>

            {viewTicket.resolutionNotes && (
              <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>Resolution Notes</label>
                <div style={{ marginTop: '0.25rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  {viewTicket.resolutionNotes}
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Logged At: {viewTicket.createdAt ? new Date(viewTicket.createdAt).toLocaleString() : '—'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={() => setViewTicket(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteModalOpen && selectedTicket && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => { setDeleteModalOpen(false); setSelectedTicket(null); }}
          title="Confirm Ticket Deletion"
        >
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Are you sure you want to delete ticket <strong>{selectedTicket.ticketNumber} ({selectedTicket.subject})</strong>?
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '1.5rem' }}>
              This action cannot be undone and will permanently remove this support incident from IT records.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setDeleteModalOpen(false); setSelectedTicket(null); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDelete}
              >
                Delete Ticket
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
