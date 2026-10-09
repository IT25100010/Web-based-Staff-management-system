import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Briefcase, Plus, Eye, Edit3, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const VacanciesList = () => {
  const [vacancies, setVacancies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedVac, setSelectedVac] = useState(null);

  const [form, setForm] = useState({
    jobTitle: '',
    departmentId: '',
    positionsCount: '1',
    description: '',
    requirements: '',
    openingDate: '',
    closingDate: '',
    status: 'OPEN'
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadVacancies();
  }, [selectedDept, selectedStatus, searchQuery]);

  const loadDepartments = async () => {
    try {
      const res = await apiClient.get('/employees/departments');
      setDepartments(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadVacancies = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedDept) params.append('departmentId', selectedDept);
      if (selectedStatus) params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const url = `/recruitment/vacancies${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await apiClient.get(url);
      setVacancies(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load vacancies from MySQL.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setForm({
      jobTitle: '',
      departmentId: departments[0]?.id || '',
      positionsCount: '1',
      description: '',
      requirements: '',
      openingDate: new Date().toISOString().split('T')[0],
      closingDate: '',
      status: 'OPEN'
    });
    setError('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (vac) => {
    setSelectedVac(vac);
    setForm({
      jobTitle: vac.jobTitle || '',
      departmentId: vac.department?.id || '',
      positionsCount: String(vac.positionsCount || '1'),
      description: vac.description || '',
      requirements: vac.requirements || '',
      openingDate: vac.openingDate || '',
      closingDate: vac.closingDate || '',
      status: vac.status || 'OPEN'
    });
    setError('');
    setIsEditOpen(true);
  };

  const handleOpenView = (vac) => {
    setSelectedVac(vac);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (vac) => {
    setSelectedVac(vac);
    setError('');
    setIsDeleteOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/recruitment/vacancies', form);
      setActionMessage('Job vacancy created and published successfully!');
      setIsAddOpen(false);
      loadVacancies();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating vacancy');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.put(`/recruitment/vacancies/${selectedVac.id}`, form);
      setActionMessage('Job vacancy updated successfully!');
      setIsEditOpen(false);
      loadVacancies();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating vacancy');
    }
  };

  const handleClose = async (id) => {
    try {
      await apiClient.patch(`/recruitment/vacancies/${id}/close`);
      setActionMessage('Vacancy marked as CLOSED.');
      loadVacancies();
    } catch (err) {
      setError(err.response?.data?.message || 'Error closing vacancy');
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/recruitment/vacancies/${selectedVac.id}`);
      setActionMessage('Vacancy deleted successfully.');
      setIsDeleteOpen(false);
      loadVacancies();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting vacancy');
    }
  };

  const columns = [
    {
      header: 'Vacancy Code',
      accessor: 'vacancyCode',
      render: (r) => <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{r.vacancyCode}</span>
    },
    {
      header: 'Job Title',
      accessor: 'jobTitle',
      render: (r) => <span style={{ fontWeight: 600 }}>{r.jobTitle}</span>
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (r) => r.department?.name || '-'
    },
    {
      header: 'Quota',
      accessor: 'positionsCount',
      render: (r) => `${r.positionsCount} Positions`
    },
    { header: 'Opening Date', accessor: 'openingDate' },
    { header: 'Closing Date', accessor: 'closingDate' },
    {
      header: 'Status',
      accessor: 'status',
      render: (r) => <StatusBadge status={r.status} />
    },
    {
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => handleOpenView(r)}
            className="btn btn-secondary btn-sm"
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleOpenEdit(r)}
            className="btn btn-secondary btn-sm"
            title="Edit Vacancy"
          >
            <Edit3 size={14} />
          </button>
          {r.status === 'OPEN' && (
            <button
              onClick={() => handleClose(r.id)}
              className="btn btn-secondary btn-sm"
              style={{ color: '#d97706' }}
              title="Close Vacancy"
            >
              Close
            </button>
          )}
          <button
            onClick={() => handleOpenDelete(r)}
            className="btn btn-secondary btn-sm"
            style={{ color: '#ef4444' }}
            title="Delete Vacancy"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Job Vacancies Management</h1>
          <p className="page-description">
            Recruitment pipelines, vacancy creation, quotas, and deadline management.
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={16} /> Post New Vacancy
        </button>
      </div>

      {actionMessage && (
        <div style={{ padding: '12px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#166534', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
          <CheckCircle size={18} />
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Multi-Filters & Search Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '18px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Search Title or Code:</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Filter by Department:</label>
            <select
              className="form-control"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Filter by Status:</label>
            <select
              className="form-control"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={vacancies} searchPlaceholder="Search vacancies..." />
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Job Vacancy">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Job Title *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Warehouse Operations Associate"
              value={form.jobTitle}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select
                className="form-control"
                required
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="">Select department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quota (Positions) *</label>
              <input
                type="number"
                min="1"
                className="form-control"
                required
                value={form.positionsCount}
                onChange={(e) => setForm({ ...form, positionsCount: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Opening Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={form.openingDate}
                onChange={(e) => setForm({ ...form, openingDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Closing Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={form.closingDate}
                onChange={(e) => setForm({ ...form, closingDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Job Description</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Key responsibilities and duties..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Qualifications & Requirements</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Candidate skills, physical requirements, certifications..."
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Publish Vacancy
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Vacancy - ${selectedVac?.vacancyCode}`}>
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label className="form-label">Job Title *</label>
            <input
              type="text"
              className="form-control"
              required
              value={form.jobTitle}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quota (Positions) *</label>
              <input
                type="number"
                min="1"
                className="form-control"
                required
                value={form.positionsCount}
                onChange={(e) => setForm({ ...form, positionsCount: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Closing Date *</label>
            <input
              type="date"
              className="form-control"
              required
              value={form.closingDate}
              onChange={(e) => setForm({ ...form, closingDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Job Description</label>
            <textarea
              className="form-control"
              rows="3"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Requirements</label>
            <textarea
              className="form-control"
              rows="2"
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsEditOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Vacancy Details">
        {selectedVac && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Vacancy Code</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e3a8a' }}>{selectedVac.vacancyCode}</div>
              </div>
              <StatusBadge status={selectedVac.status} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Job Title</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{selectedVac.jobTitle}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Department</span>
              <div style={{ color: '#334155', fontWeight: 600 }}>{selectedVac.department?.name || 'General'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Opening Date</span>
                <div style={{ color: '#334155' }}>{selectedVac.openingDate}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Closing Date</span>
                <div style={{ color: '#334155' }}>{selectedVac.closingDate}</div>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Description</span>
              <div style={{ color: '#334155' }}>{selectedVac.description || 'No description.'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Requirements</span>
              <div style={{ color: '#334155' }}>{selectedVac.requirements || 'No specific requirements.'}</div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsViewOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Delete Vacancy">
        <div>
          <p style={{ color: '#334155', marginBottom: '16px' }}>
            Are you sure you want to delete job vacancy <strong>{selectedVac?.jobTitle} ({selectedVac?.vacancyCode})</strong>?
          </p>
          <div className="modal-footer">
            <button onClick={() => setIsDeleteOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleDelete} className="btn btn-danger" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
              Delete Vacancy
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
