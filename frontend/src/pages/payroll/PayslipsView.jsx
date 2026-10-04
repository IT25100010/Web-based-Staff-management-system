import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { FileSpreadsheet, Eye, Printer, DollarSign, Building2, CheckCircle2, Send } from 'lucide-react';

export const PayslipsView = () => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/payroll/payslips');
      setPayslips(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleUpdateStatus = async (payslipId, newStatus) => {
    try {
      setStatusUpdating(true);
      await apiClient.put(`/payroll/payslips/${payslipId}/status`, { status: newStatus });
      if (selectedPayslip && selectedPayslip.id === payslipId) {
        setSelectedPayslip({ ...selectedPayslip, status: newStatus });
      }
      fetchPayslips();
    } catch (err) {
      alert('Error updating status: ' + (err.response?.data?.message || err.message));
    } finally {
      setStatusUpdating(false);
    }
  };

  const filteredPayslips = payslips.filter((p) => {
    const matchesStatus = !filterStatus || p.status === filterStatus;
    const matchesSearch = !searchQuery.trim() ||
      (p.payslipNumber && p.payslipNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.periodName && p.periodName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.employee?.firstName && p.employee.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.employee?.lastName && p.employee.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.employee?.employeeId && p.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const columns = [
    {
      header: 'Payslip Ref #',
      accessor: 'payslipNumber',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
          {row.payslipNumber}
        </span>
      )
    },
    {
      header: 'Staff Member',
      accessor: 'employee',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.employee?.firstName} {row.employee?.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            NIC: {row.employee?.nic || '—'} • {row.employee?.employeeId}
          </div>
        </div>
      )
    },
    {
      header: 'Period',
      accessor: 'periodName'
    },
    {
      header: 'Gross Salary',
      accessor: 'payrollDetail',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          LKR {(row.payrollDetail?.grossSalary || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'EPF (8%)',
      accessor: 'epf',
      render: (row) => (
        <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>
          - LKR {(row.payrollDetail?.epfEmployee || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Net Take-Home',
      accessor: 'net',
      render: (row) => (
        <strong style={{ color: '#059669' }}>
          LKR {(row.payrollDetail?.netSalary || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </strong>
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
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedPayslip(row)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.6rem' }}
          >
            <Eye size={14} />
            <span>View Slip</span>
          </button>
        </div>
      )
    }
  ];

  const avgNet = payslips.length > 0
    ? (payslips.reduce((acc, p) => acc + (parseFloat(p.payrollDetail?.netSalary) || 0), 0) / payslips.length)
    : 0;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Generated Employee Payslips
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Official digital payslips containing full earnings, EPF/ETF statutory schedules, and net disbursals
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Generated Payslips"
          value={payslips.length}
          subtitle="Ready for staff download"
          icon={FileSpreadsheet}
          color="#3b82f6"
        />
        <StatCard
          title="Avg Net Disbursal"
          value={`LKR ${avgNet.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`}
          subtitle="Workforce net average"
          icon={DollarSign}
          color="#10b981"
        />
        <StatCard
          title="Delivery Mode"
          value="Digital Self-Service"
          subtitle="Accessible via Employee Portal"
          icon={Building2}
          color="#8b5cf6"
        />
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1rem', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '170px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="GENERATED">Generated</option>
            <option value="DISTRIBUTED">Distributed</option>
            <option value="PAID">Paid</option>
          </select>

          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '220px' }}
            placeholder="Search payslips by employee, ref number, period..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredPayslips}
          loading={loading}
          searchPlaceholder="Filter payslips..."
        />
      </div>

      {/* Official Payslip Printable Modal */}
      {selectedPayslip && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPayslip(null)}
          title={`Official Payslip — ${selectedPayslip.payslipNumber}`}
        >
          <div id="printable-payslip" style={{ padding: '1rem', background: '#fff', color: '#1e293b', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                  Lanka Workforce Solutions (Pvt) Ltd
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  No. 124 Port Access Road, Colombo 13, Sri Lanka
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  EPF Reg No: EPF/COL/88219 • ETF Reg No: ETF/COL/55120
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  PAYSLIP REFERENCE
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e3a8a' }}>
                  {selectedPayslip.payslipNumber}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Date: {selectedPayslip.issueDate}
                </div>
              </div>
            </div>

            {/* Employee Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <div><strong>Employee:</strong> {selectedPayslip.employee?.firstName} {selectedPayslip.employee?.lastName}</div>
                <div><strong>Employee ID:</strong> {selectedPayslip.employee?.employeeId}</div>
                <div><strong>NIC Number:</strong> {selectedPayslip.employee?.nic || '—'}</div>
              </div>
              <div>
                <div><strong>Pay Period:</strong> {selectedPayslip.periodName}</div>
                <div><strong>Department:</strong> {selectedPayslip.employee?.department?.name || 'General Operations'}</div>
                <div><strong>Designation:</strong> {selectedPayslip.employee?.position?.title || 'Associate'}</div>
              </div>
            </div>

            {/* Working Days & Attendance Summary Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '8px', background: '#f1f5f9', padding: '0.6rem 0.8rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.78rem' }}>
              <div><span style={{ color: '#64748b' }}>Working Days:</span> <strong>{selectedPayslip.payrollDetail?.expectedWorkingDays || 22}</strong></div>
              <div><span style={{ color: '#64748b' }}>Present:</span> <strong style={{ color: '#16a34a' }}>{selectedPayslip.payrollDetail?.presentDays || 0}</strong></div>
              <div><span style={{ color: '#64748b' }}>Late:</span> <strong>{selectedPayslip.payrollDetail?.lateDays || 0}</strong></div>
              <div><span style={{ color: '#64748b' }}>Half-Day:</span> <strong>{selectedPayslip.payrollDetail?.halfDays || 0}</strong></div>
              <div><span style={{ color: '#64748b' }}>Paid Leave:</span> <strong>{selectedPayslip.payrollDetail?.paidLeaveDays || 0}</strong></div>
              <div><span style={{ color: '#64748b' }}>Unpaid Leave:</span> <strong style={{ color: '#dc2626' }}>{selectedPayslip.payrollDetail?.unpaidLeaveDays || 0}</strong></div>
              <div><span style={{ color: '#64748b' }}>Absent:</span> <strong style={{ color: '#dc2626' }}>{selectedPayslip.payrollDetail?.absentDays || 0}</strong></div>
            </div>

            {/* Earnings and Deductions Two-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* Earnings */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ background: '#f1f5f9', padding: '0.5rem 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                  EARNINGS & ALLOWANCES
                </div>
                <div style={{ padding: '0.75rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Basic Salary</span>
                    <span style={{ fontWeight: 600 }}>
                      LKR {(selectedPayslip.payrollDetail?.baseSalary || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Overtime ({selectedPayslip.payrollDetail?.overtimeHours || 0} hrs)</span>
                    <span style={{ fontWeight: 600 }}>
                      LKR {(selectedPayslip.payrollDetail?.overtimePay || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fixed / Site Allowances</span>
                    <span style={{ fontWeight: 600 }}>
                      LKR {(selectedPayslip.payrollDetail?.allowances || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', fontWeight: 700 }}>
                    <span>GROSS EARNINGS</span>
                    <span>
                      LKR {(selectedPayslip.payrollDetail?.grossSalary || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ background: '#f1f5f9', padding: '0.5rem 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                  STATUTORY & ATTENDANCE DEDUCTIONS
                </div>
                <div style={{ padding: '0.75rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                    <span>Employee EPF (8%)</span>
                    <span style={{ fontWeight: 600 }}>
                      - LKR {(selectedPayslip.payrollDetail?.epfEmployee || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {Number(selectedPayslip.payrollDetail?.attendanceDeduction || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                      <span>Attendance & Leave Deduction</span>
                      <span style={{ fontWeight: 600 }}>
                        - LKR {Number(selectedPayslip.payrollDetail.attendanceDeduction).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', fontWeight: 700, color: '#dc2626' }}>
                    <span>TOTAL DEDUCTIONS</span>
                    <span>
                      - LKR {(selectedPayslip.payrollDetail?.totalDeductions || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Employer Contributions Box */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '0.25rem' }}>
                🇱🇰 Statutory Employer Contributions (Not deducted from employee salary)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Employer EPF (12%): <strong>LKR {(selectedPayslip.payrollDetail?.epfEmployer || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></span>
                <span>Employer ETF (3%): <strong>LKR {(selectedPayslip.payrollDetail?.etfEmployer || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></span>
              </div>
            </div>

            {/* Net Salary Highlight */}
            <div style={{ background: '#10b981', color: '#ffffff', padding: '0.75rem 1rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Salary Credited to Bank Account</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  {selectedPayslip.employee?.bankName ? `${selectedPayslip.employee.bankName} • A/C: ${selectedPayslip.employee.bankAccount}` : 'Direct Bank Transfer'}
                </div>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                LKR {(selectedPayslip.payrollDetail?.netSalary || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {selectedPayslip.status !== 'DISTRIBUTED' && (
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={statusUpdating}
                  onClick={() => handleUpdateStatus(selectedPayslip.id, 'DISTRIBUTED')}
                >
                  <Send size={14} /> Mark Distributed
                </button>
              )}
              {selectedPayslip.status !== 'PAID' && (
                <button
                  className="btn btn-success btn-sm"
                  disabled={statusUpdating}
                  onClick={() => handleUpdateStatus(selectedPayslip.id, 'PAID')}
                >
                  <CheckCircle2 size={14} /> Mark Paid
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedPayslip(null)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={16} />
                <span>Print Official Payslip</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
