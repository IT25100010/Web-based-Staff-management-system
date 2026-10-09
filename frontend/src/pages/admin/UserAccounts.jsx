import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  Plus,
  Shield,
  Key,
  UserCheck,
  Eye,
  Pencil,
  Trash2,
  Filter,
  RotateCcw,
  Building2,
  Briefcase,
  Mail,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const UserAccounts = () => {
  const { role } = useAuth();
  const isHrManager = role === 'HR_MANAGER';
  const canManage = role === 'SENIOR_ADMIN' || role === 'IT_COORDINATOR';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Password reset state
  const [resetPasswordVal, setResetPasswordVal] = useState('Password@123');
  const [resetUseNic, setResetUseNic] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    role: 'EMPLOYEE',
    password: ''
  });

  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
    role: 'EMPLOYEE',
    active: true,
    password: ''
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/users', formData);
      setModalOpen(false);
      setFormData({
        username: '',
        email: '',
        fullName: '',
        role: 'EMPLOYEE',
        password: ''
      });
      fetchUsers();
    } catch (err) {
      alert('Error creating user account: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/toggle-status`);
      fetchUsers();
    } catch (err) {
      alert('Error changing user status: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleResetInitialPassword = async (u) => {
    const targetLabel = u.employeeId ? `${u.fullName} (${u.employeeId})` : u.fullName;
    if (!window.confirm(`Are you sure you want to reset the login password for ${targetLabel} to their initial NIC password?`)) {
      return;
    }
    try {
      const res = await apiClient.post(`/admin/users/${u.id}/reset-initial-password`);
      alert(res.data?.message || `Password successfully reset to initial NIC password for ${targetLabel}.`);
      fetchUsers();
    } catch (err) {
      alert('Error resetting password: ' + (err.response?.data?.message || err.message));
    }
  };

  const openEditModal = (u) => {
    setSelectedUser(u);
    setEditFormData({
      fullName: u.fullName || '',
      email: u.email || '',
      role: u.role || 'EMPLOYEE',
      active: u.active !== false,
      password: ''
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        fullName: editFormData.fullName,
        email: editFormData.email,
        role: editFormData.role,
        active: editFormData.active
      };
      if (editFormData.password) {
        payload.password = editFormData.password;
      }
      await apiClient.put(`/admin/users/${selectedUser.id}`, payload);
      setEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      alert('Error updating user account: ' + (err.response?.data?.message || err.message));
    }
  };

  const openResetModal = (u) => {
    setSelectedUser(u);
    setResetPasswordVal('Password@123');
    setResetUseNic(false);
    setResetModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const payload = resetUseNic
        ? { useInitialNic: true }
        : { newPassword: resetPasswordVal };

      const res = await apiClient.post(`/admin/users/${selectedUser.id}/reset-password`, payload);
      alert(res.data?.message || `Password reset successfully for ${selectedUser.username}`);
      setResetModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      alert('Error resetting password: ' + (err.response?.data?.message || err.message));
    }
  };

  const openDeleteModal = (u) => {
    setSelectedUser(u);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      const res = await apiClient.delete(`/admin/users/${selectedUser.id}`);
      if (res.data?.message) {
        alert(res.data.message);
      }
      setDeleteModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      alert('Error removing user: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredUsers = users.filter((u) => {
    // If HR Manager, by default they inspect staff/employee accounts, but can filter as well
    const matchesRole = !roleFilter || u.role === roleFilter;
    const matchesStatus = !statusFilter || (statusFilter === 'ACTIVE' ? u.active !== false : u.active === false);
    return matchesRole && matchesStatus;
  });

  const columns = [
    {
      header: 'Employee ID',
      accessor: 'employeeId',
      render: (row) =>
        row.employeeId ? (
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: '0.82rem',
              color: '#1e3a8a',
              background: '#eff6ff',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid #bfdbfe'
            }}
          >
            {row.employeeId}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.78rem', fontStyle: 'italic' }}>
            System Account
          </span>
        )
    },
    {
      header: 'Staff Member / Full Name',
      accessor: 'fullName',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{row.fullName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
            @{row.username}
            {row.department && ` • ${row.department}`}
            {row.position && ` (${row.position})`}
          </div>
        </div>
      )
    },
    {
      header: 'Login Email',
      accessor: 'email',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-primary, #1e293b)' }}>
          {row.email}
        </span>
      )
    },
    {
      header: 'Assigned Role',
      accessor: 'role',
      render: (row) => {
        const isEmp = row.role === 'EMPLOYEE';
        return (
          <span
            style={{
              padding: '0.25rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: isEmp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)',
              color: isEmp ? '#059669' : '#2563eb',
              border: `1px solid ${isEmp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(37, 99, 235, 0.2)'}`
            }}
          >
            {isEmp ? 'Staff Member' : row.role}
          </span>
        );
      }
    },
    {
      header: 'Account Status',
      accessor: 'active',
      render: (row) => (
        <span
          style={{
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: row.active !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: row.active !== false ? '#10b981' : '#ef4444'
          }}
        >
          {row.active !== false ? 'ACTIVE' : 'LOCKED'}
        </span>
      )
    },
    {
      header: 'Created Date',
      accessor: 'createdAt',
      render: (row) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'System Baseline'}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setViewUser(row)}
            title="View Details"
            style={{ display: 'flex', alignItems: 'center', padding: '0.25rem 0.45rem' }}
          >
            <Eye size={13} />
          </button>

          {/* Toggle status: available to both HR Manager and IT Coordinator */}
          {(canManage || isHrManager) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleToggleActive(row.id)}
              title={row.active !== false ? 'Lock / Deactivate Account' : 'Unlock / Activate Account'}
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                color: row.active !== false ? '#dc2626' : '#16a34a'
              }}
            >
              {row.active !== false ? 'Lock' : 'Unlock'}
            </button>
          )}

          {/* HR Manager: Safe reset to initial NIC password */}
          {isHrManager && row.hasLinkedEmployee && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleResetInitialPassword(row)}
              title="Reset to Initial NIC Password"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            >
              <RotateCcw size={12} /> Reset NIC
            </button>
          )}

          {/* IT Coordinator / Senior Admin advanced controls */}
          {canManage && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => openEditModal(row)}
                title="Edit User"
                style={{ display: 'flex', alignItems: 'center', padding: '0.25rem 0.45rem' }}
              >
                <Pencil size={13} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => openResetModal(row)}
                title="Reset Password"
                style={{ display: 'flex', alignItems: 'center', padding: '0.25rem 0.45rem' }}
              >
                <Key size={13} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => openDeleteModal(row)}
                title="Delete User"
                style={{ display: 'flex', alignItems: 'center', padding: '0.25rem 0.45rem', color: 'var(--danger)' }}
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
            {isHrManager ? 'Staff Member Accounts' : 'User Accounts & Role Permissions'}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {isHrManager
              ? 'View automatically provisioned employee login accounts, access status, and reset initial credentials'
              : 'IT Coordinator control panel for authentication credentials, RBAC isolation, and access status'}
          </p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} />
            <span>Provision User Account</span>
          </button>
        )}
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title={isHrManager ? 'Total Accounts' : 'System Users'}
          value={users.length}
          subtitle={isHrManager ? 'All employee & system accounts' : 'Provisioned across all 6 roles'}
          icon={Users}
          color="#3b82f6"
        />
        <StatCard
          title="Active Accounts"
          value={users.filter((u) => u.active !== false).length}
          subtitle="Authorized for JWT login"
          icon={UserCheck}
          color="#10b981"
        />
        <StatCard
          title="Locked / Suspended"
          value={users.filter((u) => u.active === false).length}
          subtitle="Access disabled accounts"
          icon={Shield}
          color="#ef4444"
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
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role:</label>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '180px' }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="EMPLOYEE">Staff Member (EMPLOYEE)</option>
              <option value="HR_MANAGER">HR Manager</option>
              <option value="OPERATIONS_MANAGER">Operations Manager</option>
              <option value="SENIOR_ADMIN">Senior Admin</option>
              <option value="FINANCE_EXECUTIVE">Finance Executive</option>
              <option value="IT_COORDINATOR">IT Coordinator</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</label>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '140px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="LOCKED">LOCKED</option>
            </select>
          </div>
          {(roleFilter || statusFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setRoleFilter('');
                setStatusFilter('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredUsers}
          loading={loading}
          searchPlaceholder="Search by Employee ID, Name, Username, or Login Email..."
        />
      </div>

      {/* Modal: Provision User (IT Coordinator only) */}
      {modalOpen && canManage && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Provision New User Account">
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Ruwan Jayasinghe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. ruwan_ops"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  placeholder="ruwan@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">System Role</label>
                <select
                  className="form-control"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="HR_MANAGER">HR Manager</option>
                  <option value="OPERATIONS_MANAGER">Operations Manager</option>
                  <option value="SENIOR_ADMIN">Senior Admin</option>
                  <option value="FINANCE_EXECUTIVE">Finance Executive</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="IT_COORDINATOR">IT Coordinator</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Initial Password</label>
              <input
                type="password"
                required
                className="form-control"
                placeholder="Initial secure password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Password will be securely hashed with BCrypt before storing in database.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Provision Account
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Edit User (IT Coordinator only) */}
      {editModalOpen && selectedUser && canManage && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedUser(null);
          }}
          title={`Edit User Account — @${selectedUser.username}`}
        >
          <form onSubmit={handleUpdate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">System Role</label>
                <select
                  className="form-control"
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                >
                  <option value="HR_MANAGER">HR Manager</option>
                  <option value="OPERATIONS_MANAGER">Operations Manager</option>
                  <option value="SENIOR_ADMIN">Senior Admin</option>
                  <option value="FINANCE_EXECUTIVE">Finance Executive</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="IT_COORDINATOR">IT Coordinator</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Account Access Status</label>
                <select
                  className="form-control"
                  value={editFormData.active ? 'true' : 'false'}
                  onChange={(e) => setEditFormData({ ...editFormData, active: e.target.value === 'true' })}
                >
                  <option value="true">ACTIVE (Authorized)</option>
                  <option value="false">LOCKED (Deactivated)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">New Password (leave blank to keep current)</label>
              <input
                type="password"
                className="form-control"
                placeholder="Optional new password"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditModalOpen(false);
                  setSelectedUser(null);
                }}
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

      {/* Modal: Reset Password (IT Coordinator) */}
      {resetModalOpen && selectedUser && (
        <Modal
          isOpen={resetModalOpen}
          onClose={() => {
            setResetModalOpen(false);
            setSelectedUser(null);
          }}
          title={`Reset Password — ${selectedUser.fullName}`}
        >
          <form onSubmit={handleResetPassword}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Reset authentication password for user <strong>{selectedUser.fullName}</strong> (@{selectedUser.username}).
            </p>

            {selectedUser.hasLinkedEmployee && (
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  borderRadius: '6px',
                  marginBottom: '1rem'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={resetUseNic}
                    onChange={(e) => setResetUseNic(e.target.checked)}
                  />
                  <span>Reset to Employee Initial NIC Credentials</span>
                </label>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px', marginLeft: '24px' }}>
                  Restores default password using the linked employee's NIC number (BCrypt hashed).
                </span>
              </div>
            )}

            {!resetUseNic && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">New Password</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Password will be hashed with BCrypt.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setResetModalOpen(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Confirm Reset
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: View Details */}
      {viewUser && (
        <Modal
          isOpen={true}
          onClose={() => setViewUser(null)}
          title={`User Profile — ${viewUser.fullName}`}
          maxWidth="640px"
        >
          <div style={{ background: 'var(--bg-page, #f8fafc)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff Member Name</label>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                  {viewUser.fullName}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Username: @{viewUser.username}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Login Email</label>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                  {viewUser.email}
                </div>
              </div>
            </div>

            {viewUser.hasLinkedEmployee && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Linked Employee ID</label>
                  <div style={{ fontWeight: 700, color: '#1e3a8a', fontFamily: 'monospace' }}>
                    {viewUser.employeeId}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department & Position</label>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {viewUser.department || 'Unassigned'} {viewUser.position ? `— ${viewUser.position}` : ''}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role Access Tier</label>
                <div style={{ marginTop: '0.25rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: viewUser.role === 'EMPLOYEE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                      color: viewUser.role === 'EMPLOYEE' ? '#059669' : 'var(--primary, #2563eb)',
                      border: `1px solid ${viewUser.role === 'EMPLOYEE' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(37, 99, 235, 0.2)'}`
                    }}
                  >
                    {viewUser.role === 'EMPLOYEE' ? 'Staff Member (EMPLOYEE)' : viewUser.role}
                  </span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Access State</label>
                <div style={{ marginTop: '0.25rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: viewUser.active !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: viewUser.active !== false ? '#10b981' : '#ef4444'
                    }}
                  >
                    {viewUser.active !== false ? 'ACTIVE (Authorized)' : 'LOCKED (Suspended)'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Provisioned At</label>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleString() : 'System Baseline'}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} />
                <span>Password BCrypt Encrypted</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={() => setViewUser(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Delete User (IT Coordinator only) */}
      {deleteModalOpen && selectedUser && canManage && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedUser(null);
          }}
          title="Confirm User Account Deletion"
        >
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Are you sure you want to delete user account <strong>@{selectedUser.username} ({selectedUser.fullName})</strong>?
            </p>
            <div
              style={{
                padding: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: 'var(--danger)',
                marginBottom: '1.5rem'
              }}
            >
              <strong>Relational Safety Policy:</strong> If this account is linked to an active staff employee profile, the system will automatically <strong>DEACTIVATE</strong> the login instead of deleting it, preventing cascading data corruption of attendance, payroll, and leave records.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDelete}
              >
                Confirm Delete / Deactivate
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
