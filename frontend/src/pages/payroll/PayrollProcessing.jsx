import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { DollarSign, Play, Layers, ShieldCheck, Eye, Trash2, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export const PayrollProcessing = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Month & Year controls
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Preview & Processing state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // View Calculation Modal
  const [calcModalItem, setCalcModalItem] = useState(null);

  // View Saved Cycle Modal
  const [viewPayroll, setViewPayroll] = useState(null);
  const [payrollDetails, setPayrollDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Delete Modal
  const [deletePayrollRecord, setDeletePayrollRecord] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filter
  const [filterYear, setFilterYear] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/payroll/payrolls');
      setPayrolls(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const handleGeneratePreview = async (e) => {
    if (e) e.preventDefault();
    setPreviewLoading(true);
    setPreviewError('');
    setSuccessMessage('');
    try {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const periodName = `${monthNames[selectedMonth - 1]} ${selectedYear}`;
      const res = await apiClient.post('/payroll/preview', {
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        periodName
      });
      setPreviewData(res.data);
    } catch (err) {
      setPreviewError(err.response?.data?.message || 'Error generating payroll calculation preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setFinalizeLoading(true);
    setPreviewError('');
    try {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const periodName = `${monthNames[selectedMonth - 1]} ${selectedYear}`;
      await apiClient.post('/payroll/process', {
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        periodName
      });
      setSuccessMessage(`Draft payroll generated successfully for ${periodName}.`);
      setPreviewData(null);
      fetchPayrolls();
    } catch (err) {
      setPreviewError(err.response?.data?.message || 'Error creating draft payroll.');
    } finally {
      setFinalizeLoading(false);
    }
  };

  const handleFinalizeCycle = async (payrollId) => {
    if (!window.confirm('Are you sure you want to finalize this payroll cycle? Once finalized, payslips will become official and locked.')) {
      return;
    }
    try {
      await apiClient.put(`/payroll/payrolls/${payrollId}/finalize`);
      setSuccessMessage('Payroll cycle successfully finalized.');
      fetchPayrolls();
      if (isViewModalOpen) {
        setIsViewModalOpen(false);
      }
    } catch (err) {
      alert('Error finalizing payroll: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenView = async (p) => {
    setViewPayroll(p);
    setIsViewModalOpen(true);
    setDetailsLoading(true);
    try {
      const res = await apiClient.get(`/payroll/payrolls/${p.id}/details`);
      setPayrollDetails(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenDelete = (p) => {
    setDeletePayrollRecord(p);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/payroll/payrolls/${deletePayrollRecord.id}`);
      setIsDeleteModalOpen(false);
      setDeletePayrollRecord(null);
      setSuccessMessage('Payroll cycle deleted.');
      fetchPayrolls();
    } catch (err) {
      alert('Error deleting payroll cycle: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredPayrolls = payrolls.filter((p) => {
    const matchesYear = !filterYear || p.payrollYear?.toString() === filterYear;
    const matchesSearch = !searchQuery.trim() ||
      (p.periodName && p.periodName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesYear && matchesSearch;
  });

  const grandGross = payrolls.reduce((sum, p) => sum + (parseFloat(p.totalGross) || 0), 0);
  const grandNet = payrolls.reduce((sum, p) => sum + (parseFloat(p.totalNet) || 0), 0);

  // Table columns for readable preview table:
  // Employee, Position, Base, Attendance Deduction, OT, Benefits, Gross, Net, Status, Actions
  const previewColumns = [
    {
      header: 'Employee',
      accessor: 'employeeName',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.employeeName}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{row.employeeCode} · {row.department}</div>
        </div>
      )
    },
    {
      header: 'Position',
      accessor: 'position'
    },
    {
      header: 'Base',
      accessor: 'baseSalary',
      render: (row) => <span>LKR {Number(row.baseSalary || 0).toLocaleString()}</span>
    },
    {
      header: 'Attendance Deduction',
      accessor: 'attendanceDeduction',
      render: (row) => (
        <span style={{ color: Number(row.attendanceDeduction || 0) > 0 ? '#ef4444' : '#64748b' }}>
          {Number(row.attendanceDeduction || 0) > 0 ? `- LKR ${Number(row.attendanceDeduction).toLocaleString()}` : 'LKR 0'}
        </span>
      )
    },
    {
      header: 'OT',
      accessor: 'overtimePay',
      render: (row) => (
        <span style={{ color: '#0369a1', fontWeight: 500 }}>
          LKR {Number(row.overtimePay || 0).toLocaleString()}
          {Number(row.overtimeHours || 0) > 0 && (
            <span style={{ fontSize: '0.72rem', display: 'block', color: '#64748b' }}>({row.overtimeHours}h)</span>
          )}
        </span>
      )
    },
    {
      header: 'Benefits',
      accessor: 'allowances',
      render: (row) => <span>LKR {Number(row.allowances || 0).toLocaleString()}</span>
    },
    {
      header: 'Gross',
      accessor: 'grossSalary',
      render: (row) => <strong>LKR {Number(row.grossSalary || 0).toLocaleString()}</strong>
    },
    {
      header: 'Net',
      accessor: 'netSalary',
      render: (row) => <strong style={{ color: '#059669' }}>LKR {Number(row.netSalary || 0).toLocaleString()}</strong>
    },
    {
      header: 'Status',
      render: () => <StatusBadge status="PREVIEW" />
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
          onClick={() => setCalcModalItem(row)}
        >
          View Calculation
        </button>
      )
    }
  ];

  // Saved cycles table
  const cycleColumns = [
    {
      header: 'Payroll Period',
      accessor: 'periodName',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.periodName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Processed on {row.processedDate ? row.processedDate.substring(0, 10) : '—'}
          </div>
        </div>
      )
    },
    {
      header: 'Headcount',
      accessor: 'employeeCount',
      render: (row) => <strong>{row.employeeCount || 0} Staff</strong>
    },
    {
      header: 'Gross Total',
      accessor: 'totalGross',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          LKR {(parseFloat(row.totalGross) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Overtime Paid',
      accessor: 'totalOvertime',
      render: (row) => (
        <span style={{ color: '#0369a1', fontWeight: 500 }}>
          LKR {(parseFloat(row.totalOvertime) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Deductions (EPF/Attn)',
      accessor: 'totalDeductions',
      render: (row) => (
        <span style={{ color: '#ef4444', fontWeight: 500 }}>
          - LKR {(parseFloat(row.totalDeductions) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Net Disbursed',
      accessor: 'totalNet',
      render: (row) => (
        <strong style={{ color: '#059669', fontSize: '0.95rem' }}>
          LKR {(parseFloat(row.totalNet) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </strong>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'DRAFT'} />
    },
    {
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="View Calculation Breakdown"
            onClick={() => handleOpenView(row)}
          >
            <Eye size={13} style={{ marginRight: '3px' }} /> View
          </button>
          {row.status === 'DRAFT' && (
            <button
              className="btn btn-primary"
              style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#059669', borderColor: '#059669' }}
              title="Finalize Payroll Cycle"
              onClick={() => handleFinalizeCycle(row.id)}
            >
              <CheckCircle2 size={13} style={{ marginRight: '3px' }} /> Finalize
            </button>
          )}
          {row.status === 'DRAFT' && (
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
              title="Delete Draft"
              onClick={() => handleOpenDelete(row)}
            >
              <Trash2 size={13} />
            </button>
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
            Payroll Management
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Position salary, attendance, approved overtime, approved leave, and active benefits statutory disbursement engine
          </p>
        </div>
      </div>

      {successMessage && (
        <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TOP GENERATE PREVIEW SECTION */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
          Generate Payroll Period
        </h3>

        <form onSubmit={handleGeneratePreview} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Month *</label>
            <select
              className="form-control"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {[
                { val: 1, name: 'January' },
                { val: 2, name: 'February' },
                { val: 3, name: 'March' },
                { val: 4, name: 'April' },
                { val: 5, name: 'May' },
                { val: 6, name: 'June' },
                { val: 7, name: 'July' },
                { val: 8, name: 'August' },
                { val: 9, name: 'September' },
                { val: 10, name: 'October' },
                { val: 11, name: 'November' },
                { val: 12, name: 'December' },
              ].map((m) => (
                <option key={m.val} value={m.val}>{m.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1', minWidth: '140px' }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Year *</label>
            <input
              type="number"
              className="form-control"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              min="2020"
              max="2035"
              required
            />
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={previewLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '40px' }}
            >
              <Play size={15} />
              <span>{previewLoading ? 'Calculating Preview...' : 'Generate Payroll Preview'}</span>
            </button>
          </div>
        </form>

        {previewError && (
          <div style={{ marginTop: '1rem', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.875rem' }}>
            {previewError}
          </div>
        )}
      </div>

      {/* ACTIVE PREVIEW SECTION (WHEN GENERATED) */}
      {previewData && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid #3b82f6', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  Payroll Preview: {previewData.periodName}
                </h2>
                <StatusBadge status="PREVIEW" />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                {previewData.employeeCount} Active Staff • {previewData.expectedWorkingDays} Expected Working Days • Calculations derived from Position/Employee salary, attendance, and approved records.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setPreviewData(null)}
                disabled={finalizeLoading}
              >
                Clear Preview
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveDraft}
                disabled={finalizeLoading}
                style={{ background: '#059669', borderColor: '#059669' }}
              >
                {finalizeLoading ? 'Processing...' : 'Save Draft Payroll'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Total Gross:</span>
              <div><strong>LKR {Number(previewData.totalGross || 0).toLocaleString()}</strong></div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Overtime Total:</span>
              <div style={{ color: '#0369a1' }}><strong>LKR {Number(previewData.totalOvertime || 0).toLocaleString()}</strong></div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Attn Deductions:</span>
              <div style={{ color: '#ef4444' }}><strong>- LKR {Number(previewData.totalAttendanceDeductions || 0).toLocaleString()}</strong></div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>EPF Deductions:</span>
              <div style={{ color: '#ef4444' }}><strong>- LKR {Number(previewData.totalDeductions || 0).toLocaleString()}</strong></div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Net Disbursed:</span>
              <div style={{ color: '#059669', fontSize: '1rem' }}><strong>LKR {Number(previewData.totalNet || 0).toLocaleString()}</strong></div>
            </div>
          </div>

          <DataTable
            columns={previewColumns}
            data={previewData.details || []}
            searchPlaceholder="Filter employees in preview..."
          />
        </div>
      )}

      {/* STATS OVERVIEW */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Total Payroll Cycles"
          value={`${payrolls.length} Cycles`}
          subtitle="Processed & Draft Records"
          icon={Layers}
          color="#3b82f6"
        />
        <StatCard
          title="Cumulative Net Disbursed"
          value={`LKR ${(grandNet / 1000000).toFixed(2)}M`}
          subtitle="Net salaries across cycles"
          icon={DollarSign}
          color="#10b981"
        />
        <StatCard
          title="Statutory EPF/ETF"
          value="100% Compliant"
          subtitle="Sri Lanka Labor Standards"
          icon={ShieldCheck}
          color="#8b5cf6"
        />
      </div>

      {/* FILTER BAR & CYCLES TABLE */}
      <div className="card" style={{ marginBottom: '1rem', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '150px' }}
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>

          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="Search payroll cycles by period name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={cycleColumns}
          data={filteredPayrolls}
          loading={loading}
          searchPlaceholder="Filter cycles..."
        />
      </div>

      {/* VIEW CALCULATION MODAL */}
      {calcModalItem && (
        <Modal
          isOpen={true}
          onClose={() => setCalcModalItem(null)}
          title={`Calculation Breakdown: ${calcModalItem.employeeName}`}
        >
          <div style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
              <div><span style={{ color: '#64748b' }}>Staff Code:</span> <strong>{calcModalItem.employeeCode}</strong></div>
              <div><span style={{ color: '#64748b' }}>Department:</span> <strong>{calcModalItem.department}</strong></div>
              <div><span style={{ color: '#64748b' }}>Position:</span> <strong>{calcModalItem.position}</strong></div>
              <div><span style={{ color: '#64748b' }}>Working Days:</span> <strong>{calcModalItem.expectedWorkingDays} Days</strong></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* Earnings Breakdown */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                  EARNINGS & ATTENDANCE
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Basic Salary</span>
                  <strong>LKR {Number(calcModalItem.baseSalary || 0).toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Daily Rate (Basic / Days)</span>
                  <span>LKR {Number(calcModalItem.dailyRate || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: calcModalItem.attendanceDeduction > 0 ? '#ef4444' : 'inherit', marginBottom: '4px' }}>
                  <span>Attendance Deduction</span>
                  <span>- LKR {Number(calcModalItem.attendanceDeduction || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                  <span>Adjusted Basic</span>
                  <strong>LKR {Number(calcModalItem.adjustedBasic || (calcModalItem.baseSalary - (calcModalItem.attendanceDeduction || 0))).toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Approved OT ({calcModalItem.overtimeHours || 0} hrs @ LKR {calcModalItem.otRate || 0}/hr)</span>
                  <span>LKR {Number(calcModalItem.overtimePay || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Active Benefits / Allowances</span>
                  <span>LKR {Number(calcModalItem.allowances || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px', fontWeight: 700 }}>
                  <span>GROSS SALARY</span>
                  <span>LKR {Number(calcModalItem.grossSalary || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                  STATUTORY DEDUCTIONS
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginBottom: '4px' }}>
                  <span>Employee EPF (8%)</span>
                  <span>- LKR {Number(calcModalItem.epfEmployee || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginBottom: '4px' }}>
                  <span>Other Deductions</span>
                  <span>- LKR {Number(calcModalItem.otherDeductions || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px', fontWeight: 700, color: '#dc2626' }}>
                  <span>Total Deductions</span>
                  <span>- LKR {Number(calcModalItem.totalDeductions || 0).toLocaleString()}</span>
                </div>

                <div style={{ marginTop: '14px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                  <div style={{ fontWeight: 600, color: '#475569', marginBottom: '4px', fontSize: '0.78rem' }}>EMPLOYER STATUTORY:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' }}>
                    <span>Employer EPF (12%)</span>
                    <span>LKR {Number(calcModalItem.epfEmployer || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>Employer ETF (3%)</span>
                    <span>LKR {Number(calcModalItem.etfEmployer || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Details */}
            <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Attendance Detail Log:</div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span>Present: <strong>{calcModalItem.presentDays || 0}</strong></span>
                <span>Late: <strong>{calcModalItem.lateDays || 0}</strong></span>
                <span>Half-Day: <strong>{calcModalItem.halfDays || 0}</strong></span>
                <span>Paid Leave: <strong>{calcModalItem.paidLeaveDays || 0}</strong></span>
                <span style={{ color: calcModalItem.unpaidLeaveDays > 0 ? '#dc2626' : 'inherit' }}>Unpaid Leave: <strong>{calcModalItem.unpaidLeaveDays || 0}</strong></span>
                <span style={{ color: calcModalItem.absentDays > 0 ? '#dc2626' : 'inherit' }}>Absent: <strong>{calcModalItem.absentDays || 0}</strong></span>
              </div>
            </div>

            {/* Net Salary banner */}
            <div style={{ background: '#059669', color: '#fff', padding: '10px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>NET SALARY PAYABLE</span>
              <span style={{ fontWeight: 800, fontSize: '1.25rem' }}>LKR {Number(calcModalItem.netSalary || 0).toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setCalcModalItem(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* VIEW SAVED CYCLE BREAKDOWN MODAL */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Payroll Cycle: ${viewPayroll?.periodName || ''} (${viewPayroll?.status || 'DRAFT'})`}
      >
        {viewPayroll && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>Total Gross:</span>
                <div><strong>LKR {Number(viewPayroll.totalGross || 0).toLocaleString()}</strong></div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Total Deductions:</span>
                <div style={{ color: '#ef4444' }}><strong>- LKR {Number(viewPayroll.totalDeductions || 0).toLocaleString()}</strong></div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Total Net Paid:</span>
                <div style={{ color: '#059669' }}><strong>LKR {Number(viewPayroll.totalNet || 0).toLocaleString()}</strong></div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Status:</span>
                <div><StatusBadge status={viewPayroll.status || 'DRAFT'} /></div>
              </div>
            </div>

            {detailsLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Loading breakdown...</div>
            ) : (
              <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#334155' }}>
                      <th style={{ padding: '6px 8px' }}>Staff</th>
                      <th style={{ padding: '6px 8px' }}>Position</th>
                      <th style={{ padding: '6px 8px' }}>Basic Salary</th>
                      <th style={{ padding: '6px 8px' }}>Days</th>
                      <th style={{ padding: '6px 8px' }}>Attn Ded</th>
                      <th style={{ padding: '6px 8px' }}>OT Pay</th>
                      <th style={{ padding: '6px 8px' }}>Allowances</th>
                      <th style={{ padding: '6px 8px' }}>EPF (8%)</th>
                      <th style={{ padding: '6px 8px' }}>Net Pay</th>
                      <th style={{ padding: '6px 8px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollDetails.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                          {d.employee?.firstName} {d.employee?.lastName}
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{d.employee?.employeeId}</div>
                        </td>
                        <td style={{ padding: '6px 8px' }}>{d.employee?.position?.title || '—'}</td>
                        <td style={{ padding: '6px 8px' }}>LKR {Number(d.baseSalary || 0).toLocaleString()}</td>
                        <td style={{ padding: '6px 8px' }}>{d.presentDays || 0}P / {d.expectedWorkingDays || 22}D</td>
                        <td style={{ padding: '6px 8px', color: d.attendanceDeduction > 0 ? '#ef4444' : '#64748b' }}>
                          {d.attendanceDeduction > 0 ? `- LKR ${Number(d.attendanceDeduction).toLocaleString()}` : '-'}
                        </td>
                        <td style={{ padding: '6px 8px' }}>LKR {Number(d.overtimePay || 0).toLocaleString()}</td>
                        <td style={{ padding: '6px 8px' }}>LKR {Number(d.allowances || 0).toLocaleString()}</td>
                        <td style={{ padding: '6px 8px', color: '#ef4444' }}>- LKR {Number(d.epfEmployee || 0).toLocaleString()}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 700, color: '#059669' }}>
                          LKR {Number(d.netSalary || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                            onClick={() => setCalcModalItem({
                              employeeName: `${d.employee?.firstName} ${d.employee?.lastName}`,
                              employeeCode: d.employee?.employeeId,
                              department: d.employee?.department?.name || '—',
                              position: d.employee?.position?.title || '—',
                              expectedWorkingDays: d.expectedWorkingDays,
                              baseSalary: d.baseSalary,
                              dailyRate: d.dailyRate,
                              attendanceDeduction: d.attendanceDeduction,
                              adjustedBasic: d.baseSalary - (d.attendanceDeduction || 0),
                              overtimeHours: d.overtimeHours,
                              otRate: d.otRate,
                              overtimePay: d.overtimePay,
                              allowances: d.allowances,
                              grossSalary: d.grossSalary,
                              epfEmployee: d.epfEmployee,
                              epfEmployer: d.epfEmployer,
                              etfEmployer: d.etfEmployer,
                              otherDeductions: d.otherDeductions,
                              totalDeductions: d.totalDeductions,
                              presentDays: d.presentDays,
                              lateDays: d.lateDays,
                              halfDays: d.halfDays,
                              paidLeaveDays: d.paidLeaveDays,
                              unpaidLeaveDays: d.unpaidLeaveDays,
                              absentDays: d.absentDays,
                              netSalary: d.netSalary
                            })}
                          >
                            Breakdown
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <div>
                {viewPayroll.status === 'DRAFT' && (
                  <button
                    className="btn btn-primary"
                    style={{ background: '#059669', borderColor: '#059669' }}
                    onClick={() => handleFinalizeCycle(viewPayroll.id)}
                  >
                    <CheckCircle2 size={15} style={{ marginRight: '5px' }} />
                    Finalize This Cycle
                  </button>
                )}
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Draft Payroll Cycle">
        {deletePayrollRecord && (
          <div>
            <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '14px' }}>
              Are you sure you want to delete the draft payroll run <strong>{deletePayrollRecord.periodName}</strong>?
            </p>
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.85rem', color: '#991b1b', marginBottom: '18px' }}>
              ⚠️ Deleting this draft will remove generated draft payslips. You can regenerate it whenever needed.
            </div>
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
                {deleteLoading ? 'Deleting...' : 'Confirm Delete Cycle'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
