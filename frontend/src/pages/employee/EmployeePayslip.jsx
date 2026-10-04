import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { DollarSign, Printer, Eye, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const EmployeePayslip = () => {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);

  useEffect(() => {
    const fetchMyPayslips = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/payroll/payslips');
        const all = res.data || [];
        const empId = user?.employeeId;
        const mine = empId ? all.filter(p => p.employee?.id === empId) : all;
        setPayslips(mine);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyPayslips();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const columns = [
    {
      header: 'Payslip Ref #',
      accessor: 'payslipNumber',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{row.payslipNumber}</span>
      )
    },
    {
      header: 'Period',
      accessor: 'periodName'
    },
    {
      header: 'Basic Salary',
      accessor: 'base',
      render: (row) => (
        <span>LKR {(row.payrollDetail?.baseSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      )
    },
    {
      header: 'Overtime + Allowances',
      accessor: 'additions',
      render: (row) => (
        <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
          + LKR {((row.payrollDetail?.overtimePay || 0) + (row.payrollDetail?.allowances || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'EPF Deduction (8%)',
      accessor: 'epf',
      render: (row) => (
        <span style={{ color: 'var(--danger)', fontWeight: 500 }}>
          - LKR {(row.payrollDetail?.epfEmployee || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Net Take-Home Disbursed',
      accessor: 'net',
      render: (row) => (
        <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.95rem' }}>
          LKR {(row.payrollDetail?.netSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <StatusBadge status={row.status || 'GENERATED'} />
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setSelectedSlip(row)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.6rem' }}
        >
          <Eye size={14} />
          <span>View</span>
        </button>
      )
    }
  ];

  const latestSlip = payslips[0];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            My Monthly Payslips & Salary Advice
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Official electronic pay slips, statutory Sri Lanka EPF/ETF contributions, and bank remittance advice
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Latest Net Take-Home"
          value={latestSlip ? `LKR ${(latestSlip.payrollDetail?.netSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'LKR 0.00'}
          subtitle={latestSlip ? `Period: ${latestSlip.periodName}` : 'No payslips generated yet'}
          icon={DollarSign}
          color="#10b981"
        />
        <StatCard
          title="Employee EPF (8%) Saved"
          value={latestSlip ? `LKR ${(latestSlip.payrollDetail?.epfEmployee || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'LKR 0.00'}
          subtitle="Central Bank of Sri Lanka EPF Board"
          icon={ShieldCheck}
          color="#3b82f6"
        />
        <StatCard
          title="Employer EPF (12%) + ETF (3%)"
          value={latestSlip ? `LKR ${(Number(latestSlip.payrollDetail?.epfEmployer || 0) + Number(latestSlip.payrollDetail?.etfEmployer || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'LKR 0.00'}
          subtitle="Company funded retirement security"
          icon={CheckCircle2}
          color="#8b5cf6"
        />
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={payslips}
          loading={loading}
          searchPlaceholder="Search..."
        />
      </div>

      {/* Payslip View Modal */}
      {selectedSlip && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSlip(null)}
          title={`My Payslip — ${selectedSlip.periodName}`}
        >
          <div style={{ padding: '1.25rem', background: '#fff', color: '#1e293b', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                  Lanka Workforce Solutions (Pvt) Ltd
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  No. 124 Port Access Road, Colombo 13, Sri Lanka
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563eb' }}>PAYSLIP ADVICE</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ref: {selectedSlip.payslipNumber}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Status: <strong>{selectedSlip.status}</strong></div>
              </div>
            </div>

            {/* Employee Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.82rem' }}>
              <div><span style={{ color: '#64748b' }}>Employee Name:</span> <strong>{selectedSlip.employee?.firstName} {selectedSlip.employee?.lastName}</strong></div>
              <div><span style={{ color: '#64748b' }}>Employee ID:</span> <strong>{selectedSlip.employee?.employeeId || '—'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Department:</span> <strong>{selectedSlip.employee?.department?.name || '—'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Position:</span> <strong>{selectedSlip.employee?.position?.title || '—'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Pay Period:</span> <strong>{selectedSlip.periodName}</strong></div>
              <div><span style={{ color: '#64748b' }}>Issue Date:</span> <strong>{selectedSlip.issueDate || '—'}</strong></div>
            </div>

            {/* Main Sections: Earnings & Attendance & Deductions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
              {/* EARNINGS */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                  EARNINGS
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Basic Salary</span>
                  <span>LKR {(selectedSlip.payrollDetail?.baseSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>OT Hours</span>
                  <span>{selectedSlip.payrollDetail?.overtimeHours || 0} hrs</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>OT Rate</span>
                  <span>LKR {(selectedSlip.payrollDetail?.otRate || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}/hr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>OT Pay</span>
                  <span>LKR {(selectedSlip.payrollDetail?.overtimePay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Allowances / Benefits</span>
                  <span>LKR {(selectedSlip.payrollDetail?.allowances || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* DEDUCTIONS */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                  DEDUCTIONS
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginBottom: '0.25rem' }}>
                  <span>Employee EPF (8%)</span>
                  <span>- LKR {(selectedSlip.payrollDetail?.epfEmployee || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginBottom: '0.25rem' }}>
                  <span>Other Deductions</span>
                  <span>- LKR {(selectedSlip.payrollDetail?.otherDeductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(selectedSlip.payrollDetail?.attendanceDeduction || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginBottom: '0.25rem' }}>
                    <span>Attendance Deduction</span>
                    <span>- LKR {Number(selectedSlip.payrollDetail.attendanceDeduction).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', fontWeight: 700, color: '#dc2626' }}>
                  <span>Total Deductions</span>
                  <span>- LKR {(selectedSlip.payrollDetail?.totalDeductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* ATTENDANCE BREAKDOWN */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem', background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
                ATTENDANCE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                <div><span style={{ color: '#64748b' }}>Working Days:</span> <strong>{selectedSlip.payrollDetail?.expectedWorkingDays || 22}</strong></div>
                <div><span style={{ color: '#64748b' }}>Present:</span> <strong style={{ color: '#16a34a' }}>{selectedSlip.payrollDetail?.presentDays || 0}</strong></div>
                <div><span style={{ color: '#64748b' }}>Paid Leave:</span> <strong>{selectedSlip.payrollDetail?.paidLeaveDays || 0}</strong></div>
                <div><span style={{ color: '#64748b' }}>Unpaid Leave:</span> <strong style={{ color: '#dc2626' }}>{selectedSlip.payrollDetail?.unpaidLeaveDays || 0}</strong></div>
                <div><span style={{ color: '#64748b' }}>Absent:</span> <strong style={{ color: '#dc2626' }}>{selectedSlip.payrollDetail?.absentDays || 0}</strong></div>
                <div><span style={{ color: '#64748b' }}>Half Days:</span> <strong>{selectedSlip.payrollDetail?.halfDays || 0}</strong></div>
                <div><span style={{ color: '#64748b' }}>Attn Deduction:</span> <strong style={{ color: '#dc2626' }}>LKR {(selectedSlip.payrollDetail?.attendanceDeduction || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
              </div>
            </div>

            {/* SUMMARY */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', background: '#f1f5f9', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>SUMMARY</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Gross Salary</span>
                <strong>LKR {(selectedSlip.payrollDetail?.grossSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginBottom: '0.25rem' }}>
                <span>Total Deductions</span>
                <strong>- LKR {(selectedSlip.payrollDetail?.totalDeductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #cbd5e1', paddingTop: '0.5rem', marginTop: '0.25rem', fontSize: '1.05rem', color: '#059669' }}>
                <span style={{ fontWeight: 800 }}>NET SALARY</span>
                <span style={{ fontWeight: 800 }}>LKR {(selectedSlip.payrollDetail?.netSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* EMPLOYER CONTRIBUTION */}
            <div style={{ border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '0.75rem', fontSize: '0.82rem', background: '#fff' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: '#475569' }}>EMPLOYER CONTRIBUTION</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Employer EPF (12%)</span>
                <span>LKR {(selectedSlip.payrollDetail?.epfEmployer || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Employer ETF (3%)</span>
                <span>LKR {(selectedSlip.payrollDetail?.etfEmployer || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedSlip(null)}>
              Close
            </button>
            <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={16} />
              <span>Print Official Copy</span>
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
