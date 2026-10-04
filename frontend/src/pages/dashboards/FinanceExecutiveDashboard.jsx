import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/common/DataTable';
import { DollarSign, Gift, FileSpreadsheet, TrendingUp, CheckCircle, ArrowRight, Play } from 'lucide-react';

export const FinanceExecutiveDashboard = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [reportSummary, setReportSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const [prRes, repRes] = await Promise.all([
        apiClient.get('/payroll/payrolls'),
        apiClient.get('/payroll/reports/summary')
      ]);
      setPayrolls(prRes.data || []);
      setReportSummary(repRes.data || {});
    } catch (e) {
      console.error('Error loading finance data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayroll = async () => {
    try {
      await apiClient.post('/payroll/process', { month: 3, year: 2026, periodName: 'March 2026' });
      alert('Payroll processed successfully for March 2026!');
      loadFinanceData();
    } catch (e) {
      alert(e.response?.data?.message || 'Payroll processing completed or already run.');
    }
  };

  const columns = [
    { header: 'Period', accessor: 'periodName', render: (r) => <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{r.periodName}</span> },
    { header: 'Employees', accessor: 'employeeCount', render: (r) => `${r.employeeCount} Staff` },
    { header: 'Gross Salary', accessor: 'totalGross', render: (r) => `LKR ${Number(r.totalGross).toLocaleString('en-LK', { minimumFractionDigits: 2 })}` },
    { header: 'Overtime Paid', accessor: 'totalOvertime', render: (r) => `LKR ${Number(r.totalOvertime).toLocaleString('en-LK', { minimumFractionDigits: 2 })}` },
    { header: 'EPF/ETF Deductions', accessor: 'totalDeductions', render: (r) => `LKR ${Number(r.totalDeductions).toLocaleString('en-LK', { minimumFractionDigits: 2 })}` },
    { header: 'Net Disbursed', accessor: 'totalNet', render: (r) => <strong style={{ color: '#059669' }}>LKR {Number(r.totalNet).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong> },
    { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance Executive Dashboard</h1>
          <p className="page-description">
            Salary calculations, shift overtime expenses, statutory EPF/ETF deductions, and payroll disbursement.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/finance/payroll-processing" className="btn btn-primary">
            <Play size={16} /> Run Payroll Cycle
          </Link>
          <Link to="/finance/reports" className="btn btn-secondary">
            <TrendingUp size={16} /> Cost Reports
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard title="Current Period" value={payrolls[0]?.periodName || 'None Processed'} icon={FileSpreadsheet} color="blue" subtext={payrolls.length > 0 ? 'Active cycle' : 'No payrolls run yet'} />
        <StatCard title="Total Employees" value={`${payrolls[0]?.employeeCount || 0} Included`} icon={DollarSign} color="purple" subtext="Staff in latest run" />
        <StatCard title="Total Gross Disbursed" value={`LKR ${(reportSummary.cumulativeGrossDisbursed || 0).toLocaleString()}`} icon={DollarSign} color="green" subtext="Fiscal year to date" />
        <StatCard title="Total Overtime Paid" value={`LKR ${(reportSummary.cumulativeOvertimeDisbursed || 0).toLocaleString()}`} icon={TrendingUp} color="amber" subtext="Night & weekend shifts" />
        <StatCard title="Active Benefits" value={`${payrolls.length > 0 ? payrolls.length : 0} Cycles`} icon={Gift} color="blue" subtext="Processed cycles" />
        <StatCard title="Generated Payslips" value={`${payrolls.reduce((sum, p) => sum + (p.employeeCount || 0), 0)} Payslips`} icon={CheckCircle} color="green" subtext="Available for staff" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Sri Lanka Statutory Payroll Breakdown Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Sri Lanka Statutory Compliance Summary</h2>
              <p className="card-subtitle">EPF / ETF automated statutory deductions formula</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>Employee EPF Contribution</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Deducted from employee gross base salary</div>
              </div>
              <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '1.05rem' }}>8.0%</span>
            </div>

            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>Employer EPF Contribution</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Company statutory contribution to Central Bank</div>
              </div>
              <span style={{ fontWeight: 800, color: '#059669', fontSize: '1.05rem' }}>12.0%</span>
            </div>

            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>Employer ETF Contribution</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Employees' Trust Fund statutory remittance</div>
              </div>
              <span style={{ fontWeight: 800, color: '#d97706', fontSize: '1.05rem' }}>3.0%</span>
            </div>
          </div>
        </div>

        {/* Quick Finance Links */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Finance Navigation</h2>
              <p className="card-subtitle">Direct access to accounting and payslip tools</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to="/finance/payroll-processing" className="quick-action-btn">
              <DollarSign size={18} color="#2563eb" />
              <div>
                <div>Run Monthly Payroll Cycle</div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>Calculate salaries, overtime multipliers, and deductions</span>
              </div>
            </Link>

            <Link to="/finance/benefits" className="quick-action-btn">
              <Gift size={18} color="#7c3aed" />
              <div>
                <div>Manage Employee Benefits & Allowances</div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>Configure transport, meal, and performance bonuses</span>
              </div>
            </Link>

            <Link to="/finance/payslips" className="quick-action-btn">
              <FileSpreadsheet size={18} color="#059669" />
              <div>
                <div>View & Issue Official Payslips</div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>Print or export detailed employee compensation slips</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Processed Payroll Cycles Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Processed Payroll Periods</h2>
            <p className="card-subtitle">Historical and current payroll processing records</p>
          </div>
        </div>
        <DataTable columns={columns} data={payrolls} searchPlaceholder="Search..." />
      </div>
    </div>
  );
};
