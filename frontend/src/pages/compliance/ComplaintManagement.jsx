import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  MessageSquareWarning,
  Search,
  Filter,
  Eye,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Send,
  User,
  Calendar,
  Building2,
  RefreshCw,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  'Workplace Issues',
  'Salary / Payroll',
  'Leave Problems',
  'Harassment / Misconduct',
  'Policy Violations',
  'Other'
];

export const ComplaintManagement = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [viewComplaint, setViewComplaint] = useState(null);
  const [responseComplaint, setResponseComplaint] = useState(null);

  // Form states
  const [responseForm, setResponseForm] = useState({
    status: 'IN_PROGRESS',
    adminResponse: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await apiClient.get('/compliance/complaints', { params });
      setComplaints(res.data || []);
    } catch (err) {
      console.error('Error fetching employee complaints:', err);
      setErrorMsg('Failed to load employee complaints. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchComplaints();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setStatusFilter('');
    setTimeout(() => {
      fetchComplaints();
    }, 0);
  };

  const openViewModal = (complaint) => {
    setViewComplaint(complaint);
  };

  const openResponseModal = (complaint) => {
    setResponseComplaint(complaint);
    setResponseForm({
      status: complaint.status || 'IN_PROGRESS',
      adminResponse: complaint.adminResponse || ''
    });
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSaveResponse = async (e) => {
    e.preventDefault();
    if (!responseComplaint) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      setSubmitting(true);
      // Submit HR response and status
      const res = await apiClient.patch(`/compliance/complaints/${responseComplaint.id}/response`, {
        status: responseForm.status,
        adminResponse: responseForm.adminResponse
      });

      setSuccessMsg(`Complaint ${responseComplaint.complaintCode || ''} successfully updated.`);
      
      // Update in local state
      setComplaints((prev) =>
        prev.map((c) => (c.id === responseComplaint.id ? res.data : c))
      );

      // If view modal is open for same complaint, refresh it
      if (viewComplaint && viewComplaint.id === responseComplaint.id) {
        setViewComplaint(res.data);
      }

      setResponseComplaint(null);
    } catch (err) {
      console.error('Error submitting response:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update complaint response.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (complaintId, newStatus) => {
    try {
      const res = await apiClient.patch(`/compliance/complaints/${complaintId}/status`, {
        status: newStatus
      });
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? res.data : c))
      );
      if (viewComplaint && viewComplaint.id === complaintId) {
        setViewComplaint(res.data);
      }
    } catch (err) {
      console.error('Error changing complaint status:', err);
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const stats = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter((c) => c.status === 'PENDING').length;
    const inProgress = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
    const resolved = complaints.filter((c) => c.status === 'RESOLVED').length;
    return { total, pending, inProgress, resolved };
  }, [complaints]);

  const columns = [
    {
      header: 'Complaint Code',
      accessor: 'complaintCode',
      render: (row) => (
        <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--primary, #2563eb)' }}>
          {row.complaintCode || `CMP-${row.id}`}
        </span>
      )
    },
    {
      header: 'Employee',
      accessor: 'employee',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.employee?.fullName || 'Unknown Employee'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {row.employee?.employeeCode || 'N/A'} • {row.employee?.department?.name || 'Staff'}
          </div>
        </div>
      )
    },
    {
      header: 'Category & Title',
      accessor: 'title',
      render: (row) => (
        <div style={{ maxWidth: '280px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--primary, #2563eb)',
              display: 'inline-block',
              marginBottom: '4px'
            }}
          >
            {row.category}
          </span>
          <div
            style={{
              fontWeight: 500,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={row.title}
          >
            {row.title}
          </div>
        </div>
      )
    },
    {
      header: 'Submitted Date',
      accessor: 'createdAt',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : '—'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Resolution',
      accessor: 'adminResponse',
      render: (row) =>
        row.adminResponse ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8rem',
              color: '#059669',
              fontWeight: 500
            }}
          >
            <CheckCircle2 size={14} /> Responded
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8rem',
              color: '#d97706',
              fontWeight: 500
            }}
          >
            <Clock size={14} /> Pending HR
          </span>
        )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => openViewModal(row)}
            title="View Full Details"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.6rem' }}
          >
            <Eye size={14} />
            <span>Details</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => openResponseModal(row)}
            title="Update Status / Official HR Response"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.6rem' }}
          >
            <MessageSquare size={14} />
            <span>Respond</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Employee Grievance & Complaint Management
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            FR6 Compliance: Review confidential employee workplace issues, update resolution statuses, and communicate official HR responses.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchComplaints}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Global Notifications */}
      {successMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            borderRadius: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10b981',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            borderRadius: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Total Complaints"
          value={stats.total}
          subtitle="All recorded grievances"
          icon={MessageSquareWarning}
          color="#3b82f6"
        />
        <StatCard
          title="Pending Review"
          value={stats.pending}
          subtitle="Awaiting initial HR review"
          icon={Clock}
          color="#f59e0b"
        />
        <StatCard
          title="Under Investigation"
          value={stats.inProgress}
          subtitle="Currently in progress"
          icon={AlertCircle}
          color="#6366f1"
        />
        <StatCard
          title="Resolved"
          value={stats.resolved}
          subtitle="Officially closed by HR"
          icon={CheckCircle2}
          color="#10b981"
        />
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          backgroundColor: 'var(--card-bg, #ffffff)',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'flex-end'
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Search Complaints
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Title, description, code, or staff name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ width: '100%', paddingLeft: '2.25rem' }}
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Category Filter
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={16} />
              <span>Search</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetFilters}
              title="Reset Filters"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Complaints Table */}
      <div className="card" style={{ padding: '1rem', backgroundColor: 'var(--card-bg, #ffffff)', borderRadius: '8px' }}>
        <DataTable
          columns={columns}
          data={complaints}
          loading={loading}
          emptyMessage="No employee complaints found matching current filters."
        />
      </div>

      {/* Modal 1: Full Details Modal */}
      {viewComplaint && (
        <Modal
          isOpen={!!viewComplaint}
          onClose={() => setViewComplaint(null)}
          title={`Complaint Dossier: ${viewComplaint.complaintCode || ('CMP-' + viewComplaint.id)}`}
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Summary Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(241, 245, 249, 0.7)',
                borderRadius: '6px'
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--primary, #2563eb)',
                    marginRight: '0.5rem'
                  }}
                >
                  {viewComplaint.category}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Filed on {viewComplaint.createdAt ? new Date(viewComplaint.createdAt).toLocaleString('en-GB') : '—'}
                </span>
              </div>
              <StatusBadge status={viewComplaint.status} />
            </div>

            {/* Employee Information Card */}
            <div
              style={{
                padding: '1rem',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                backgroundColor: '#fafbfc'
              }}
            >
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} color="var(--primary, #2563eb)" />
                Employee Profile
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Full Name</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{viewComplaint.employee?.fullName || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Employee Code</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{viewComplaint.employee?.employeeCode || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Department</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{viewComplaint.employee?.department?.name || 'Staff'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Designation</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{viewComplaint.employee?.designation || 'Staff Member'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Email</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{viewComplaint.employee?.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Grievance Statement */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="var(--primary, #2563eb)" />
                Grievance Statement: {viewComplaint.title}
              </h4>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)'
                }}
              >
                {viewComplaint.description}
              </div>
            </div>

            {/* Official HR Response / Resolution Section */}
            <div
              style={{
                padding: '1rem',
                border: '1px solid',
                borderColor: viewComplaint.adminResponse ? '#10b981' : '#f59e0b',
                backgroundColor: viewComplaint.adminResponse ? 'rgba(16, 185, 129, 0.04)' : 'rgba(245, 158, 11, 0.04)',
                borderRadius: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: viewComplaint.adminResponse ? '#065f46' : '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={16} />
                  Official HR Response & Corrective Actions
                </h4>
                {viewComplaint.handledBy && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Handled by: <strong>{viewComplaint.handledBy.fullName || viewComplaint.handledBy.username}</strong>
                  </span>
                )}
              </div>

              {viewComplaint.adminResponse ? (
                <>
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      marginBottom: '0.5rem'
                    }}
                  >
                    {viewComplaint.adminResponse}
                  </div>
                  {viewComplaint.resolvedAt && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Resolved at: {new Date(viewComplaint.resolvedAt).toLocaleString('en-GB')}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#92400e', margin: '0.25rem 0 0.5rem 0' }}>
                  No official HR response has been submitted yet. The employee is awaiting resolution.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewComplaint(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const comp = viewComplaint;
                  setViewComplaint(null);
                  openResponseModal(comp);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <MessageSquare size={16} />
                <span>{viewComplaint.adminResponse ? 'Update Response / Status' : 'Submit Official Response'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 2: Submit/Update Response Modal */}
      {responseComplaint && (
        <Modal
          isOpen={!!responseComplaint}
          onClose={() => setResponseComplaint(null)}
          title={`Official HR Action: ${responseComplaint.complaintCode || ('CMP-' + responseComplaint.id)}`}
          maxWidth="600px"
        >
          <form onSubmit={handleSaveResponse} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
              <div><strong>Employee:</strong> {responseComplaint.employee?.fullName} ({responseComplaint.employee?.employeeCode})</div>
              <div><strong>Category:</strong> {responseComplaint.category}</div>
              <div style={{ marginTop: '0.25rem' }}><strong>Title:</strong> {responseComplaint.title}</div>
            </div>

            {errorMsg && (
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', borderRadius: '4px', fontSize: '0.85rem' }}>
                {errorMsg}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                Complaint Status <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={responseForm.status}
                onChange={(e) => setResponseForm({ ...responseForm, status: e.target.value })}
                className="form-control"
                style={{ width: '100%' }}
                required
              >
                <option value="PENDING">PENDING – Pending Initial Review</option>
                <option value="IN_PROGRESS">IN_PROGRESS – Investigation In Progress</option>
                <option value="RESOLVED">RESOLVED – Resolved / Remediation Completed</option>
                <option value="REJECTED">REJECTED – Grievance Rejected / Dismissed</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                Official HR Response & Feedback <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={5}
                value={responseForm.adminResponse}
                onChange={(e) => setResponseForm({ ...responseForm, adminResponse: e.target.value })}
                placeholder="Detail the findings of the investigation, actions taken, or instructions provided to the employee. This response will be made available directly to the employee in their portal."
                className="form-control"
                style={{ width: '100%', resize: 'vertical' }}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                The employee will be notified and can view this official message in their "My Complaints" list.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResponseComplaint(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Send size={16} />
                <span>{submitting ? 'Saving...' : 'Submit HR Decision'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
