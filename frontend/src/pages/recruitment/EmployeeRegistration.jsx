import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { UserPlus, ArrowLeft, CheckCircle2, ShieldCheck, Mail, Key, Users } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const EmployeeRegistration = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredAccount, setRegisteredAccount] = useState(null);

  const initialForm = {
    firstName: '',
    lastName: '',
    nic: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    departmentId: '',
    positionId: '',
    employmentDate: '',
    employmentType: '',
    employmentStatus: '',
    baseSalary: ''
  };

  const [form, setForm] = useState(initialForm);
  const [isSalaryManuallyEdited, setIsSalaryManuallyEdited] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (form.departmentId) {
      loadPositionsForDepartment(form.departmentId);
    } else {
      setPositions([]);
      setForm(prev => ({ ...prev, positionId: '' }));
      setIsSalaryManuallyEdited(false);
    }
  }, [form.departmentId]);

  const loadDepartments = async () => {
    try {
      const dRes = await apiClient.get('/employees/departments');
      setDepartments(dRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPositionsForDepartment = async (deptId) => {
    try {
      const pRes = await apiClient.get(`/employees/positions?departmentId=${deptId}`);
      setPositions(pRes.data || []);
    } catch (e) {
      console.error(e);
      setPositions([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.departmentId) {
      setError('Please select a department.');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form };
      delete payload.employeeId;
      if (!payload.positionId) delete payload.positionId;
      if (!payload.baseSalary) delete payload.baseSalary;
      if (!payload.dateOfBirth) delete payload.dateOfBirth;
      if (!payload.employmentDate) delete payload.employmentDate;

      const res = await apiClient.post('/employees', payload);
      const generatedEmployeeId = res.data?.employeeId;
      const registeredEmail = res.data?.email || res.data?.loginEmail || form.email.trim();

      setRegisteredAccount({
        employeeId: generatedEmployeeId,
        fullName: `${form.firstName} ${form.lastName}`.trim(),
        nic: form.nic.trim(),
        loginEmail: registeredEmail,
        message: res.data?.message || 'Employee registered successfully. Staff Member login account has been created.'
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register employee. Check for duplicate NIC or Email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Register New Employee</h1>
          <p className="page-description">
            Add a new workforce member to Lanka Workforce Solutions centralized database.
          </p>
        </div>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', marginBottom: '20px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '900px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '18px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
          1. Personal Information
        </h2>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Enter first name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Enter last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">NIC / National ID Number *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Enter NIC or National ID number"
              value={form.nic}
              onChange={(e) => setForm({ ...form, nic: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input
              type="date"
              className="form-control"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-control"
              required
              placeholder="Enter email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Enter phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Permanent Residential Address</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter residential address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e3a8a', marginTop: '28px', marginBottom: '18px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
          2. Employment & Compensation Details
        </h2>

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
            <label className="form-label">Position / Job Role *</label>
            <select
              className="form-control"
              required
              disabled={!form.departmentId}
              value={form.positionId}
              onChange={(e) => {
                const newPosId = e.target.value;
                const pos = positions.find((p) => p.id?.toString() === newPosId?.toString());
                setForm((prev) => {
                  const updated = { ...prev, positionId: newPosId };
                  if (!isSalaryManuallyEdited && pos?.defaultMonthlySalary) {
                    updated.baseSalary = pos.defaultMonthlySalary.toString();
                  }
                  return updated;
                });
              }}
            >
              <option value="">
                {form.departmentId
                  ? (positions.length > 0 ? 'Select position' : 'No positions defined for this department')
                  : 'Select Department first'}
              </option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>{p.title} ({p.level || 'Standard'})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Employment Date *</label>
            <input
              type="date"
              className="form-control"
              required
              value={form.employmentDate}
              onChange={(e) => setForm({ ...form, employmentDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Monthly Base Salary (LKR) *</label>
            <input
              type="number"
              step="1000"
              className="form-control"
              required
              placeholder="Enter base salary"
              value={form.baseSalary}
              onChange={(e) => {
                setIsSalaryManuallyEdited(true);
                setForm({ ...form, baseSalary: e.target.value });
              }}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Employment Type</label>
            <select
              className="form-control"
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
            >
              <option value="">Select employment type</option>
              <option value="Full-time">Full-time Permanent</option>
              <option value="Contract">Fixed Term Contract</option>
              <option value="Part-time">Part-time Associate</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Employment Status</label>
            <select
              className="form-control"
              value={form.employmentStatus}
              onChange={(e) => setForm({ ...form, employmentStatus: e.target.value })}
            >
              <option value="">Select employment status</option>
              <option value="Active">Active Duty</option>
              <option value="Probation">Probationary Period</option>
              <option value="On Leave">On Extended Leave</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <UserPlus size={16} /> {loading ? 'Registering...' : 'Register Employee'}
          </button>
        </div>
      </form>

      {/* Account Creation Success Modal */}
      {registeredAccount && (
        <Modal
          isOpen={true}
          onClose={() => {
            setRegisteredAccount(null);
            navigate('/recruitment/employees');
          }}
          title="Employee Registered & Staff Account Created"
          maxWidth="640px"
        >
          <div style={{ padding: '0.5rem 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                color: '#065f46',
                marginBottom: '20px'
              }}
            >
              <CheckCircle2 size={24} style={{ color: '#10b981', flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', fontSize: '1rem', color: '#047857' }}>
                  {registeredAccount.message}
                </strong>
                <span style={{ fontSize: '0.85rem', color: '#065f46' }}>
                  A login account has been automatically provisioned with Staff Member privileges.
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-page, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Account Access Information
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Staff Member</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>
                    {registeredAccount.fullName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    ID: <strong>{registeredAccount.employeeId}</strong>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Assigned System Role</div>
                  <div style={{ marginTop: '4px' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: '#2563eb',
                        border: '1px solid rgba(37, 99, 235, 0.2)'
                      }}
                    >
                      EMPLOYEE (Staff Member)
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Mail size={16} style={{ color: '#2563eb' }} />
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Login Email:</span>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontFamily: 'monospace' }}>
                    {registeredAccount.loginEmail}
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key size={16} style={{ color: '#059669' }} />
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Initial Password:</span>
                  <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
                    Employee's NIC Number (BCrypt Encrypted)
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} style={{ color: '#10b981' }} />
                <span>The employee can immediately log in to access the Staff Member self-service portal.</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setRegisteredAccount(null);
                  setForm(initialForm);
                }}
              >
                Register Another Employee
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setRegisteredAccount(null);
                  navigate('/recruitment/staff-accounts');
                }}
              >
                <Users size={16} /> View Staff Accounts
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setRegisteredAccount(null);
                  navigate('/recruitment/employees');
                }}
              >
                Go to Employee Directory
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
