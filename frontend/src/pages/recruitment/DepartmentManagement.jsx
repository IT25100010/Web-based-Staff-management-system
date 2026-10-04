import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { Building2, Plus, Eye, Edit3, Trash2, AlertCircle } from 'lucide-react';

export const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedDept, setSelectedDept] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: ''
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/employees/departments');
      setDepartments(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load departments from MySQL.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({ code: '', name: '', description: '' });
    setError('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setSelectedDept(dept);
    setFormData({
      code: dept.code || '',
      name: dept.name || '',
      description: dept.description || ''
    });
    setError('');
    setIsEditOpen(true);
  };

  const handleOpenView = (dept) => {
    setSelectedDept(dept);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (dept) => {
    setSelectedDept(dept);
    setError('');
    setIsDeleteOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/employees/departments', formData);
      setIsAddOpen(false);
      loadDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create department.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.put(`/employees/departments/${selectedDept.id}`, formData);
      setIsEditOpen(false);
      loadDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update department.');
    }
  };

  const handleDelete = async () => {
    setError('');
    try {
      await apiClient.delete(`/employees/departments/${selectedDept.id}`);
      setIsDeleteOpen(false);
      loadDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete department.');
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id', width: '60px' },
    {
      header: 'Department Code',
      accessor: 'code',
      render: (r) => <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{r.code}</span>
    },
    {
      header: 'Department Name',
      accessor: 'name',
      render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span>
    },
    { header: 'Description', accessor: 'description' },
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
            title="Edit Department"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => handleOpenDelete(r)}
            className="btn btn-secondary btn-sm"
            style={{ color: '#ef4444' }}
            title="Delete Department"
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
          <h1 className="page-title">Department Management</h1>
          <p className="page-description">
            Define and manage organizational departments, operational divisions, and cost centers.
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={16} /> Add Department
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        <DataTable
          columns={columns}
          data={departments}
          searchPlaceholder="Search departments by code or name..."
        />
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Department">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Department Code *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. HR, FIN, OPS, IT"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Human Resources Management"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Primary responsibilities and operational scope..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Department
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Department - ${selectedDept?.name}`}>
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label className="form-label">Department Code *</label>
            <input
              type="text"
              className="form-control"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input
              type="text"
              className="form-control"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => setIsEditOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Update Department
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Department Details">
        {selectedDept && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
                Department Code
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a' }}>{selectedDept.code}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
                Department Name
              </span>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>{selectedDept.name}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
                Description
              </span>
              <div style={{ color: '#334155' }}>{selectedDept.description || 'No description provided.'}</div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsViewOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Delete Department">
        <div>
          <p style={{ color: '#334155', marginBottom: '16px' }}>
            Are you sure you want to delete department <strong>{selectedDept?.name} ({selectedDept?.code})</strong>?
          </p>
          <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', color: '#b45309', fontSize: '0.85rem', marginBottom: '20px' }}>
            Note: Departments currently assigned to active employees or positions cannot be deleted.
          </div>
          <div className="modal-footer">
            <button onClick={() => setIsDeleteOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleDelete} className="btn btn-danger" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
              Delete Department
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
