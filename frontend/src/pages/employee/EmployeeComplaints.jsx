import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  MessageSquareWarning,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  ShieldCheck,
  Send
} from 'lucide-react';

const CATEGORIES = [
  'Workplace Issues',
  'Salary / Payroll',
  'Leave Problems',
  'Harassment / Misconduct',
  'Policy Violations',
  'Other'
];

export const EmployeeComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    category: 'Workplace Issues',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/compliance/complaints/my');
      setComplaints(res.data || []);
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!form.title.trim()) {
      setErrorMsg('Complaint title is required.');
      return;
    }
    if (!form.category) {
      setErrorMsg('Please select a valid complaint category.');
      return;
    }
    if (!form.description.trim()) {
      setErrorMsg('Please provide a description of the grievance.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.post('/compliance/complaints', {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim()
      });

      setSuccessMsg(`Complaint ${res.data.complaintCode || ''} submitted successfully.`);
      setForm({ title: '', category: 'Workplace Issues', description: '' });
      setIsSubmitModalOpen(false);
      fetchComplaints();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit complaint. Please check fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetails = (row) => {
    setSelectedComplaint(row);
    setIsDetailModalOpen(true);
  };

  const columns = [
    {
      header: 'Complaint ID',
      accessor: 'complaintCode',
      render: (r) => (
        <span style={{ fontWeight: 700, color: '#1e3a8a', fontFamily: 'monospace', fontSize: '0.9rem' }}>
          {r.complaintCode || `#CMP-${r.id}`}
        </span>
      )
    },
    {
      header: 'Title',
      accessor: 'title',
      render: (r) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</span>
      )
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (r) => (
        <span style={{
          padding: '4px 10px',
          background: '#f1f5f9',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#475569'
        }}>
          {r.category}
        </span>
      )
    },
    {
      header: 'Submitted Date',
      accessor: 'createdAt',
      render: (r) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (r) => <StatusBadge status={r.status || 'PENDING'} />
    },
    {
      header: 'Action',
      render: (r) => (
        <button
          className="btn btn-outline btn-sm"
          onClick={() => openDetails(r)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <Eye size={14} /> View Details
        </button>
      )
    }
  ];

  const pendingCount = complaints.filter(c => c.status === 'PENDING').length;
  const inProgressCount = complaints.filter(c => c.status === 'IN_PROGRESS').length;
  const resolvedCount = complaints.filter(c => c.status === 'RESOLVED').length;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            My Complaints & Inquiries
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Submit confidential workplace grievances, salary queries, and policy concerns directly to HR Management
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => { setErrorMsg(''); setIsSubmitModalOpen(true); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={18} /> Submit Complaint
        </button>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Total Complaints"
          value={complaints.length}
          subtitle="All submitted tickets"
          icon={MessageSquareWarning}
          color="#3b82f6"
        />
        <StatCard
          title="Pending Review"
          value={pendingCount}
          subtitle="Awaiting HR intake"
          icon={Clock}
          color="#f59e0b"
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtitle="Under investigation"
          icon={AlertCircle}
          color="#8b5cf6"
        />
        <StatCard
          title="Resolved"
          value={resolvedCount}
          subtitle="Closed with response"
          icon={CheckCircle2}
          color="#10b981"
        />
      </div>

      {/* Complaints Table */}
      <div className="card">
        <DataTable
          columns={columns}
          data={complaints}
          loading={loading}
          searchPlaceholder="Search my complaints..."
        />
      </div>

      {/* 1. SUBMIT COMPLAINT MODAL */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Confidential Employee Complaint"
      >
        <form onSubmit={handleSubmit}>
          {errorMsg && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
              Complaint Title <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Discrepancy in monthly overtime payment"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
              Category <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              className="form-control"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
              Detailed Description <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              className="form-control"
              rows={5}
              placeholder="Provide complete facts, dates, affected periods, or relevant context for HR..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={4000}
              required
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
              {form.description.length} / 4000 characters
            </div>
          </div>

          <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#1e40af', display: 'flex', gap: '8px' }}>
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <span>Complaints are strictly confidential and accessible only to authorized HR Management.</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. COMPLAINT DETAILS MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedComplaint ? `Complaint Details: ${selectedComplaint.complaintCode || `#CMP-${selectedComplaint.id}`}` : 'Complaint Details'}
      >
        {selectedComplaint && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</span>
                <div style={{ marginTop: '2px' }}><StatusBadge status={selectedComplaint.status} /></div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedComplaint.category}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Submitted On</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedComplaint.createdAt ? new Date(selectedComplaint.createdAt).toLocaleString() : '—'}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>TITLE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e3a8a' }}>
                {selectedComplaint.title}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>DESCRIPTION</div>
              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#334155', fontSize: '0.9rem' }}>
                {selectedComplaint.description}
              </div>
            </div>

            {/* Official HR Response Section */}
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="#2563eb" />
                <span>OFFICIAL HR RESPONSE</span>
              </div>

              {selectedComplaint.adminResponse ? (
                <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#14532d' }}>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.9rem' }}>
                    {selectedComplaint.adminResponse}
                  </div>
                  {selectedComplaint.resolvedAt && (
                    <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '8px', fontWeight: 500 }}>
                      Resolved at: {new Date(selectedComplaint.resolvedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '0.875rem' }}>
                  No official response recorded yet. HR Management is currently reviewing your ticket.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
