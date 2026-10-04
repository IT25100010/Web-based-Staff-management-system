import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Users, UserPlus, KeyRound, FileText, Eye, Edit3, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  // Multi-filters
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Modals
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const [selectedEmp, setSelectedEmp] = useState(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    nic: '',
    email: '',
    phone: '',
    address: '',
    departmentId: '',
    positionId: '',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    baseSalary: '',
    employmentDate: '',
    dateOfBirth: ''
  });

  // Account provisioning form
  const [accountForm, setAccountForm] = useState({
    username: '',
    password: '',
    role: 'EMPLOYEE'
  });

  // Load master data on mount
  useEffect(() => {
    loadMasterData();
  }, []);

  // Load employees when filters change
  useEffect(() => {
    loadEmployees();
  }, [selectedDept, selectedPos, selectedStatus, searchQuery]);

  // Load positions dynamically for the edit modal when department changes
  const [editModalPositions, setEditModalPositions] = useState([]);
  useEffect(() => {
    if (editForm.departmentId) {
      loadEditPositions(editForm.departmentId);
    } else {
      setEditModalPositions([]);
    }
  }, [editForm.departmentId]);

  const loadMasterData = async () => {
    try {
      const [deptRes, posRes] = await Promise.all([
        apiClient.get('/employees/departments'),
        apiClient.get('/employees/positions')
      ]);
      setDepartments(deptRes.data || []);
      setPositions(posRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadEditPositions = async (deptId) => {
    try {
      const res = await apiClient.get(`/employees/positions?departmentId=${deptId}`);
      setEditModalPositions(res.data || []);
    } catch (e) {
      console.error(e);
      setEditModalPositions([]);
    }
  };

  const loadEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedDept) params.append('departmentId', selectedDept);
      if (selectedPos) params.append('positionId', selectedPos);
      if (selectedStatus) params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const url = `/employees${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await apiClient.get(url);
      setEmployees(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employees from MySQL database.');
    } finally {
      setLoading(false);
    }
  };

  // View Details
  const handleOpenView = (emp) => {
    setSelectedEmp(emp);
    setIsViewModalOpen(true);
  };

  // Edit Employee
  const handleOpenEdit = (emp) => {
    setSelectedEmp(emp);
    setEditForm({
      employeeId: emp.employeeId || '',
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      nic: emp.nic || '',
      email: emp.email || '',
      phone: emp.phone || '',
      address: emp.address || '',
      departmentId: emp.department?.id || '',
      positionId: emp.position?.id || '',
      employmentType: emp.employmentType || 'Full-time',
      employmentStatus: emp.employmentStatus || 'Active',
      baseSalary: emp.baseSalary || '',
      employmentDate: emp.employmentDate || '',
      dateOfBirth: emp.dateOfBirth || ''
    });
    setError('');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await apiClient.put(`/employees/${selectedEmp.id}`, {
        ...editForm,
        employeeId: editForm.employeeId ? editForm.employeeId.trim() : undefined
      });
      setActionMessage(`Employee ${editForm.firstName} ${editForm.lastName} updated successfully!`);
      setIsEditModalOpen(false);
      loadEmployees();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update employee details.');
    }
  };

  // Delete Employee (Relationship Safe)
  const handleOpenDelete = (emp) => {
    setSelectedEmp(emp);
    setError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setError('');
    try {
      const res = await apiClient.delete(`/employees/${selectedEmp.id}`);
      setActionMessage(res.data?.message || 'Employee deletion processed successfully.');
      setIsDeleteModalOpen(false);
      loadEmployees();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete employee.');
    }
  };

  // Assign System Account
  const handleOpenAccountModal = (emp) => {
    setSelectedEmp(emp);
    setAccountForm({
      username: (emp.firstName.toLowerCase() + '_' + emp.lastName.toLowerCase()).replace(/\s+/g, ''),
      password: '',
      role: 'EMPLOYEE'
    });
    setError('');
    setIsAccountModalOpen(true);
  };

  const handleAssignAccount = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post(`/employees/${selectedEmp.id}/assign-account`, accountForm);
      setActionMessage(`User account successfully provisioned and linked to ${selectedEmp.fullName || selectedEmp.firstName}!`);
      setIsAccountModalOpen(false);
      loadEmployees();
    } catch (err) {
      setError(err.response?.data?.message || 'Error assigning user account.');
    }
  };

  const columns = [
    {
      header: 'Employee ID',
      accessor: 'employeeId',
      render: (r) => <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{r.employeeId}</span>
    },
    {
      header: 'Full Name',
      accessor: 'fullName',
      render: (r) => <span style={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</span>
    },
    { header: 'NIC', accessor: 'nic' },
    { header: 'Email', accessor: 'email' },
    {
      header: 'Department',
      accessor: 'department',
      render: (r) => r.department?.name || <span style={{ color: '#94a3b8' }}>Unassigned</span>
    },
    {
      header: 'Position',
      accessor: 'position',
      render: (r) => r.position?.title || <span style={{ color: '#94a3b8' }}>Unassigned</span>
    },
    { header: 'Type', accessor: 'employmentType' },
    {
      header: 'Status',
      accessor: 'employmentStatus',
      render: (r) => <StatusBadge status={r.employmentStatus} />
    },
    {
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => handleOpenView(r)}
            className="btn btn-secondary btn-sm"
            title="View Full Profile"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleOpenEdit(r)}
            className="btn btn-secondary btn-sm"
            title="Edit Employee"
          >
            <Edit3 size={14} />
          </button>
          <Link
            to={`/admin-officer/documents?employeeId=${r.id}`}
            className="btn btn-secondary btn-sm"
            title="Manage Documents"
          >
            <FileText size={14} />
          </Link>
          <button
            onClick={() => handleOpenAccountModal(r)}
            className="btn btn-primary btn-sm"
            title="Provision System User Login"
          >
            <KeyRound size={14} />
          </button>
          <button
            onClick={() => handleOpenDelete(r)}
            className="btn btn-secondary btn-sm"
            style={{ color: '#ef4444' }}
            title="Delete / Deactivate Employee"
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
          <h1 className="page-title">Employee Directory</h1>
          <p className="page-description">
            Complete staff roster, departmental profiles, role allocations, and lifecycle management.
          </p>
        </div>
        <Link to="/recruitment/register-employee" className="btn btn-primary">
          <UserPlus size={16} /> Register New Employee
        </Link>
      </div>

      {actionMessage && (
        <div style={{ padding: '12px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#166534', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
          <CheckCircle2 size={18} />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Search (ID, Name, NIC, Email):</label>
            <input
              type="text"
              className="form-control"
              placeholder="Type keyword..."
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
            <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Filter by Position:</label>
            <select
              className="form-control"
              value={selectedPos}
              onChange={(e) => setSelectedPos(e.target.value)}
            >
              <option value="">All Positions</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
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
              <option value="Active">Active</option>
              <option value="Probation">Probation</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive / Deactivated</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={employees}
          searchPlaceholder="Search employees..."
        />
      </div>

      {/* 1. VIEW PROFILE MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`Employee Profile - ${selectedEmp?.fullName || selectedEmp?.firstName}`} maxWidth="750px">
        {selectedEmp && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {selectedEmp.firstName} {selectedEmp.lastName}
                </h3>
                <span style={{ fontSize: '0.9rem', color: '#1e3a8a', fontWeight: 600 }}>
                  {selectedEmp.employeeId} &bull; {selectedEmp.position?.title || 'No Position'}
                </span>
              </div>
              <StatusBadge status={selectedEmp.employmentStatus} />
            </div>

            {/* Profile Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>NIC / National ID</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedEmp.nic}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Date of Birth</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedEmp.dateOfBirth || 'Not specified'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Email Address</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedEmp.email}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Phone Number</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedEmp.phone || 'Not specified'}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Residential Address</span>
                <div style={{ color: '#334155' }}>{selectedEmp.address || 'Not specified'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Department</span>
                <div style={{ fontWeight: 600, color: '#1e3a8a' }}>{selectedEmp.department?.name || 'Unassigned'} ({selectedEmp.department?.code || '-'})</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Employment Type</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedEmp.employmentType || 'Full-time'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Base Salary (LKR)</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                  {selectedEmp.baseSalary ? `LKR ${Number(selectedEmp.baseSalary).toLocaleString()}` : 'Not configured'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Employment Start Date</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedEmp.employmentDate || 'Not recorded'}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Linked System Account</span>
                <div style={{ color: '#334155' }}>
                  {selectedEmp.user ? (
                    <span style={{ color: '#15803d', fontWeight: 600 }}>
                      Provisioned: @{selectedEmp.user.username} ({selectedEmp.user.role})
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>No user account linked. Use "Account" action to provision.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setIsViewModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 2. EDIT EMPLOYEE MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit Employee - ${selectedEmp?.firstName} ${selectedEmp?.lastName}`} maxWidth="750px">
        <form onSubmit={handleSaveEdit}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Employee ID (System Generated)</label>
            <input
              type="text"
              className="form-control"
              disabled
              value={editForm.employeeId}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">NIC *</label>
              <input
                type="text"
                className="form-control"
                required
                value={editForm.nic}
                onChange={(e) => setEditForm({ ...editForm, nic: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-control"
                required
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                value={editForm.dateOfBirth}
                onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              type="text"
              className="form-control"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-control"
                value={editForm.departmentId}
                onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value, positionId: '' })}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Position</label>
              <select
                className="form-control"
                disabled={!editForm.departmentId}
                value={editForm.positionId}
                onChange={(e) => setEditForm({ ...editForm, positionId: e.target.value })}
              >
                <option value="">
                  {editForm.departmentId
                    ? (editModalPositions.length > 0 ? 'Select Position' : 'No positions in this department')
                    : 'Select Department first'}
                </option>
                {editModalPositions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Employment Status</label>
              <select
                className="form-control"
                value={editForm.employmentStatus}
                onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Probation">Probation</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Employment Type</label>
              <select
                className="form-control"
                value={editForm.employmentType}
                onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
              >
                <option value="Full-time">Full-time Permanent</option>
                <option value="Contract">Fixed Term Contract</option>
                <option value="Part-time">Part-time Associate</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Base Monthly Salary (LKR)</label>
            <input
              type="number"
              step="500"
              className="form-control"
              value={editForm.baseSalary}
              onChange={(e) => setEditForm({ ...editForm, baseSalary: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. DELETE / DEACTIVATE CONFIRMATION MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Delete / Deactivate">
        <div>
          <p style={{ color: '#334155', marginBottom: '14px' }}>
            Are you sure you want to remove or deactivate employee <strong>{selectedEmp?.firstName} {selectedEmp?.lastName} ({selectedEmp?.employeeId})</strong>?
          </p>
          <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', color: '#b45309', fontSize: '0.85rem', marginBottom: '18px' }}>
            <strong>Historical Integrity Protection:</strong> If this employee has active operational or audit records (attendance logs, payroll details, shift assignments, or disciplinary notices), the system will automatically deactivate their status instead of deleting historical data.
          </div>
          <div className="modal-footer">
            <button onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleConfirmDelete} className="btn btn-danger" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
              Confirm Delete / Deactivate
            </button>
          </div>
        </div>
      </Modal>

      {/* 4. ASSIGN SYSTEM USER ACCOUNT MODAL */}
      <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} title={`Provision System Account - ${selectedEmp?.firstName} ${selectedEmp?.lastName}`}>
        <form onSubmit={handleAssignAccount}>
          <div className="form-group">
            <label className="form-label">Username *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Enter username"
              value={accountForm.username}
              onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Initial Password *</label>
            <input
              type="password"
              className="form-control"
              required
              placeholder="Enter initial password"
              value={accountForm.password}
              onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">System Access Role *</label>
            <select
              className="form-control"
              value={accountForm.role}
              onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value })}
            >
              <option value="HR_MANAGER">HR Manager</option>
              <option value="OPERATIONS_MANAGER">Operations Manager</option>
              <option value="SENIOR_ADMIN">Senior Administrative Officer</option>
              <option value="FINANCE_EXECUTIVE">Finance Executive</option>
              <option value="EMPLOYEE">Staff Employee</option>
              <option value="IT_COORDINATOR">IT Coordinator</option>
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsAccountModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Assign Account & Permissions
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
