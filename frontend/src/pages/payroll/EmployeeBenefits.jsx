import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Gift, Plus, DollarSign, CheckCircle, Eye, Edit2, Trash2, Calendar } from 'lucide-react';

export const EmployeeBenefits = () => {
  const [benefits, setBenefits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [formData, setFormData] = useState({
    employeeId: '',
    benefitType: 'Transport Allowance',
    amount: '',
    frequency: 'MONTHLY',
    effectiveDate: '',
    status: 'ACTIVE'
  });

  // View Modal
  const [viewBenefit, setViewBenefit] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal
  const [editBenefit, setEditBenefit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    benefitType: 'Transport Allowance',
    amount: '',
    frequency: 'MONTHLY',
    effectiveDate: '',
    status: 'ACTIVE'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal
  const [deleteBenefit, setDeleteBenefit] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bRes, empRes] = await Promise.all([
        apiClient.get('/payroll/benefits'),
        apiClient.get('/employees')
      ]);
      setBenefits(bRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await apiClient.post('/payroll/benefits', {
        ...formData,
        amount: parseFloat(formData.amount) || 0
      });
      setModalOpen(false);
      setFormData({
        employeeId: '',
        benefitType: 'Transport Allowance',
        amount: '',
        frequency: 'MONTHLY',
        effectiveDate: '',
        status: 'ACTIVE'
      });
      fetchData();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error adding benefit');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (b) => {
    setEditBenefit(b);
    setEditError('');
    setEditForm({
      benefitType: b.benefitType || 'Transport Allowance',
      amount: b.amount?.toString() || '',
      frequency: b.frequency || 'MONTHLY',
      effectiveDate: b.effectiveDate || '',
      status: b.status || 'ACTIVE'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await apiClient.put(`/payroll/benefits/${editBenefit.id}`, {
        ...editForm,
        amount: parseFloat(editForm.amount) || 0
      });
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error updating benefit');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDelete = (b) => {
    setDeleteBenefit(b);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/payroll/benefits/${deleteBenefit.id}`);
      setIsDeleteModalOpen(false);
      setDeleteBenefit(null);
      fetchData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error deleting benefit');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredBenefits = benefits.filter((b) => {
    const matchesType = !filterType || b.benefitType === filterType;
    const matchesStatus = !filterStatus || b.status === filterStatus;
    const matchesSearch = !searchQuery.trim() ||
      (b.employee?.firstName && b.employee.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.employee?.lastName && b.employee.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.employee?.employeeId && b.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.benefitType && b.benefitType.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesStatus && matchesSearch;
  });

  const totalDisbursed = benefits
    .filter(b => b.status === 'ACTIVE')
    .reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0);

  const columns = [
    {
      header: 'Staff Member',
      accessor: 'employee',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.employee?.firstName} {row.employee?.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.employee?.employeeId || `EMP-${row.employee?.id}`} • {row.employee?.department?.name || 'Dept'}
          </div>
        </div>
      )
    },
    {
      header: 'Benefit / Allowance',
      accessor: 'benefitType',
      render: (row) => (
        <span style={{ fontWeight: 600, color: '#1e3a8a' }}>{row.benefitType}</span>
      )
    },
    {
      header: 'Amount (LKR)',
      accessor: 'amount',
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#059669' }}>
          LKR {(parseFloat(row.amount) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Frequency',
      accessor: 'frequency',
      render: (row) => <span style={{ fontSize: '0.85rem' }}>{row.frequency}</span>
    },
    {
      header: 'Effective Date',
      accessor: 'effectiveDate'
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
            onClick={() => { setViewBenefit(row); setIsViewModalOpen(true); }}
          >
            <Eye size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Edit Benefit"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
            title="Delete Benefit"
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
            Employee Benefits & Allowance Packages
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Configure fixed allowances, terminal hardship stipends, transport reimbursements, and medical packages
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} />
          <span>Assign Benefit</span>
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Active Benefit Allocations"
          value={`${benefits.filter(b => b.status === 'ACTIVE').length} Benefits`}
          subtitle="Enrolled staff allowances"
          icon={Gift}
          color="#3b82f6"
        />
        <StatCard
          title="Monthly Allowance Outlay"
          value={`LKR ${(totalDisbursed / 1000).toFixed(1)}k`}
          subtitle="Total regular recurring stipends"
          icon={DollarSign}
          color="#10b981"
        />
        <StatCard
          title="Payroll Integration"
          value="EPF/ETF Compliant"
          subtitle="Auto factored in payroll runs"
          icon={CheckCircle}
          color="#8b5cf6"
        />
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1rem', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '200px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Benefit Types</option>
            <option value="Transport Allowance">Transport Allowance</option>
            <option value="Meal & Food Subsidy">Meal & Food Subsidy</option>
            <option value="Terminal Hardship Allowance">Terminal Hardship Allowance</option>
            <option value="Medical & Health Package">Medical & Health Package</option>
            <option value="Night Shift Allowance">Night Shift Allowance</option>
          </select>

          <select
            className="form-control"
            style={{ width: '150px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="Search benefits by employee name, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredBenefits}
          loading={loading}
          searchPlaceholder="Filter benefits..."
        />
      </div>

      {/* MODAL 1: Assign Benefit */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Assign Employee Benefit / Allowance"
      >
        <form onSubmit={handleCreate}>
          {addError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
              {addError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Employee *</label>
            <select
              className="form-control"
              required
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            >
              <option value="">Select registered employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeId || `EMP-${emp.id}`} — {emp.firstName} {emp.lastName} ({emp.department?.name})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Benefit / Allowance Type *</label>
              <select
                className="form-control"
                value={formData.benefitType}
                onChange={(e) => setFormData({ ...formData, benefitType: e.target.value })}
              >
                <option value="Transport Allowance">Transport Allowance</option>
                <option value="Meal & Food Subsidy">Meal & Food Subsidy</option>
                <option value="Terminal Hardship Allowance">Terminal Hardship Allowance</option>
                <option value="Medical & Health Package">Medical & Health Package</option>
                <option value="Night Shift Allowance">Night Shift Allowance</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (LKR) *</label>
              <input
                type="number"
                step="100"
                min="0"
                required
                className="form-control"
                placeholder="e.g. 15000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Disbursement Frequency</label>
              <select
                className="form-control"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="ONE_TIME">One Time</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Effective Date *</label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addLoading}>
              {addLoading ? 'Saving...' : 'Assign Benefit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: View Details */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Benefit Details">
        {viewBenefit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
                  {viewBenefit.employee?.firstName} {viewBenefit.employee?.lastName}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {viewBenefit.employee?.employeeId} • {viewBenefit.employee?.department?.name}
                </span>
              </div>
              <StatusBadge status={viewBenefit.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Benefit Title</span>
                <strong style={{ color: '#1e3a8a' }}>{viewBenefit.benefitType}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Allowance Amount</span>
                <strong style={{ color: '#059669', fontSize: '1.1rem' }}>
                  LKR {(parseFloat(viewBenefit.amount) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Frequency</span>
                <strong>{viewBenefit.frequency}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Effective Date</span>
                <strong>{viewBenefit.effectiveDate}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Edit Benefit */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Employee Benefit">
        {editBenefit && (
          <form onSubmit={handleEditSubmit}>
            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {editError}
              </div>
            )}

            <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '14px', fontSize: '0.85rem' }}>
              <strong>Staff Member:</strong> {editBenefit.employee?.firstName} {editBenefit.employee?.lastName} ({editBenefit.employee?.employeeId})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Benefit Type</label>
                <select
                  className="form-control"
                  value={editForm.benefitType}
                  onChange={(e) => setEditForm({ ...editForm, benefitType: e.target.value })}
                >
                  <option value="Transport Allowance">Transport Allowance</option>
                  <option value="Meal & Food Subsidy">Meal & Food Subsidy</option>
                  <option value="Terminal Hardship Allowance">Terminal Hardship Allowance</option>
                  <option value="Medical & Health Package">Medical & Health Package</option>
                  <option value="Night Shift Allowance">Night Shift Allowance</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (LKR) *</label>
                <input
                  type="number"
                  step="100"
                  required
                  className="form-control"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Effective Date *</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={editForm.effectiveDate}
                  onChange={(e) => setEditForm({ ...editForm, effectiveDate: e.target.value })}
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
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Update Benefit'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: Delete Benefit */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Employee Benefit">
        {deleteBenefit && (
          <div>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '14px', fontSize: '0.875rem' }}>
                {deleteError}
              </div>
            )}
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to remove the <strong>{deleteBenefit.benefitType}</strong> allocation for{' '}
              <strong>{deleteBenefit.employee?.firstName} {deleteBenefit.employee?.lastName}</strong>?
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
