import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { Briefcase, Plus, Eye, Edit3, Trash2, AlertCircle } from 'lucide-react';

export const PositionManagement = () => {
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedPos, setSelectedPos] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    departmentId: '',
    level: 'Intermediate',
    description: '',
    defaultMonthlySalary: '',
    otRatePerHour: '',
    regularWorkingHoursPerDay: '8'
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadPositions();
  }, [selectedDeptFilter]);

  const loadDepartments = async () => {
    try {
      const res = await apiClient.get('/employees/departments');
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Error loading departments', err);
    }
  };

  const loadPositions = async () => {
    setLoading(true);
    setError('');
    try {
      const url = selectedDeptFilter ? `/employees/positions?departmentId=${selectedDeptFilter}` : '/employees/positions';
      const res = await apiClient.get(url);
      setPositions(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load positions from MySQL.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      departmentId: departments[0]?.id || '',
      level: 'Intermediate',
      description: '',
      defaultMonthlySalary: '',
      otRatePerHour: '',
      regularWorkingHoursPerDay: '8'
    });
    setError('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (pos) => {
    setSelectedPos(pos);
    setFormData({
      title: pos.title || '',
      departmentId: pos.department?.id || '',
      level: pos.level || 'Intermediate',
      description: pos.description || '',
      defaultMonthlySalary: pos.defaultMonthlySalary != null ? pos.defaultMonthlySalary.toString() : '',
      otRatePerHour: pos.otRatePerHour != null ? pos.otRatePerHour.toString() : '',
      regularWorkingHoursPerDay: pos.regularWorkingHoursPerDay != null ? pos.regularWorkingHoursPerDay.toString() : '8'
    });
    setError('');
    setIsEditOpen(true);
  };

  const handleOpenView = (pos) => {
    setSelectedPos(pos);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (pos) => {
    setSelectedPos(pos);
    setError('');
    setIsDeleteOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/employees/positions', formData);
      setIsAddOpen(false);
      loadPositions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create position.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.put(`/employees/positions/${selectedPos.id}`, formData);
      setIsEditOpen(false);
      loadPositions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update position.');
    }
  };

  const handleDelete = async () => {
    setError('');
    try {
      await apiClient.delete(`/employees/positions/${selectedPos.id}`);
      setIsDeleteOpen(false);
      loadPositions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete position.');
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id', width: '60px' },
    {
      header: 'Position Title',
      accessor: 'title',
      render: (r) => <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{r.title}</span>
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (r) => r.department?.name || <span style={{ color: '#94a3b8' }}>Unassigned</span>
    },
    { header: 'Seniority Level', accessor: 'level' },
    {
      header: 'Default Salary (LKR)',
      accessor: 'defaultMonthlySalary',
      render: (r) => (r.defaultMonthlySalary ? `LKR ${Number(r.defaultMonthlySalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span style={{ color: '#94a3b8' }}>Not Set</span>)
    },
    {
      header: 'Regular Hrs/Day',
      render: (r) => `${r.regularWorkingHoursPerDay ?? 8} hrs`
    },
    {
      header: 'OT Rate / Hr',
      render: (r) => (r.otRatePerHour ? `LKR ${Number(r.otRatePerHour).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span style={{ color: '#94a3b8' }}>LKR 0.00</span>)
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
            title="Edit Position"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => handleOpenDelete(r)}
            className="btn btn-secondary btn-sm"
            style={{ color: '#ef4444' }}
            title="Delete Position"
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
          <h1 className="page-title">Position & Job Role Management</h1>
          <p className="page-description">
            Maintain organizational designations, seniority levels, and department job descriptions.
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={16} /> Add Position
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Filter by Department:</span>
          <select
            className="form-control"
            style={{ width: '280px' }}
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={positions}
          searchPlaceholder="Search positions by title..."
        />
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Position">
        <form onSubmit={handleCreate}>
          {/* Section 1: Position Information */}
          <div style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '12px' }}>
              Position Information
            </h4>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Position Title *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. Senior Software Engineer"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Department *</label>
                <select
                  className="form-control"
                  required
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Level / Hierarchy Tier</label>
                <select
                  className="form-control"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                >
                  <option value="Entry">Entry Level / Trainee</option>
                  <option value="Junior">Junior Associate</option>
                  <option value="Intermediate">Intermediate Professional</option>
                  <option value="Senior">Senior Specialist</option>
                  <option value="Lead">Lead / Supervisor</option>
                  <option value="Executive">Executive / Management</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Key responsibilities and duties..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          {/* Section 2: Payroll Configuration */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '12px' }}>
              Payroll Configuration
            </h4>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Default Monthly Salary (LKR) *</label>
              <input
                type="number"
                step="100"
                min="0"
                required
                className="form-control"
                placeholder="e.g. 100000.00"
                value={formData.defaultMonthlySalary}
                onChange={(e) => setFormData({ ...formData, defaultMonthlySalary: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Regular Hours / Day</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  required
                  className="form-control"
                  placeholder="8"
                  value={formData.regularWorkingHoursPerDay}
                  onChange={(e) => setFormData({ ...formData, regularWorkingHoursPerDay: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">OT Rate / Hour (LKR)</label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 750.00"
                  value={formData.otRatePerHour}
                  onChange={(e) => setFormData({ ...formData, otRatePerHour: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Position
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Position - ${selectedPos?.title}`}>
        <form onSubmit={handleUpdate}>
          {/* Section 1: Position Information */}
          <div style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '12px' }}>
              Position Information
            </h4>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Position Title *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Department *</label>
                <select
                  className="form-control"
                  required
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Level / Hierarchy Tier</label>
                <select
                  className="form-control"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                >
                  <option value="Entry">Entry Level / Trainee</option>
                  <option value="Junior">Junior Associate</option>
                  <option value="Intermediate">Intermediate Professional</option>
                  <option value="Senior">Senior Specialist</option>
                  <option value="Lead">Lead / Supervisor</option>
                  <option value="Executive">Executive / Management</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows="2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          {/* Section 2: Payroll Configuration */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '12px' }}>
              Payroll Configuration
            </h4>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Default Monthly Salary (LKR) *</label>
              <input
                type="number"
                step="100"
                min="0"
                required
                className="form-control"
                placeholder="e.g. 100000.00"
                value={formData.defaultMonthlySalary}
                onChange={(e) => setFormData({ ...formData, defaultMonthlySalary: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Regular Hours / Day</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  required
                  className="form-control"
                  value={formData.regularWorkingHoursPerDay}
                  onChange={(e) => setFormData({ ...formData, regularWorkingHoursPerDay: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">OT Rate / Hour (LKR)</label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 750.00"
                  value={formData.otRatePerHour}
                  onChange={(e) => setFormData({ ...formData, otRatePerHour: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsEditOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Update Position
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Position Details">
        {selectedPos && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '10px' }}>
                Position Information
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
                    Position Title
                  </span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{selectedPos.title}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
                    Department
                  </span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                    {selectedPos.department?.name || 'Unassigned'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
                    Hierarchy Level
                  </span>
                  <div style={{ color: '#334155', fontWeight: 500 }}>{selectedPos.level || 'Intermediate'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
                    Description
                  </span>
                  <div style={{ color: '#334155', fontSize: '0.9rem' }}>{selectedPos.description || 'None'}</div>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '10px' }}>
                Payroll Configuration
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
                    Default Monthly Salary
                  </span>
                  <div style={{ color: '#0f172a', fontWeight: 700 }}>
                    {selectedPos.defaultMonthlySalary ? `LKR ${Number(selectedPos.defaultMonthlySalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not Configured'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
                    Regular Hours / Day
                  </span>
                  <div style={{ color: '#0f172a', fontWeight: 600 }}>
                    {selectedPos.regularWorkingHoursPerDay ?? 8} hours
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
                    OT Rate / Hour
                  </span>
                  <div style={{ color: '#0f172a', fontWeight: 700 }}>
                    {selectedPos.otRatePerHour ? `LKR ${Number(selectedPos.otRatePerHour).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'LKR 0.00'}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: '8px' }}>
              <button onClick={() => setIsViewOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Delete Position">
        <div>
          <p style={{ color: '#334155', marginBottom: '16px' }}>
            Are you sure you want to delete position <strong>{selectedPos?.title}</strong>?
          </p>
          <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', color: '#b45309', fontSize: '0.85rem', marginBottom: '20px' }}>
            Note: Positions currently assigned to active employees cannot be deleted.
          </div>
          <div className="modal-footer">
            <button onClick={() => setIsDeleteOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleDelete} className="btn btn-danger" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
              Delete Position
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
