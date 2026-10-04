import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/common/DataTable';
import { Users, Briefcase, CalendarCheck, Clock, TrendingUp, ShieldAlert, UserPlus, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

export const HRManagerDashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    openVacancies: 0,
    pendingLeaves: 0,
    attendanceRate: '0%',
    activeWarnings: 0,
    complianceRate: '0%'
  });
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [empRes, vacRes, leaveRes, compRes] = await Promise.all([
        apiClient.get('/employees'),
        apiClient.get('/recruitment/vacancies/summary'),
        apiClient.get('/attendance/leaves?status=PENDING'),
        apiClient.get('/compliance/summary')
      ]);

      const emps = empRes.data || [];
      const pending = leaveRes.data || [];
      const vacSummary = vacRes.data || {};
      const compSummary = compRes.data || {};

      setRecentEmployees(emps.slice(0, 5));
      setPendingLeaves(pending);
      setStats({
        totalEmployees: emps.length,
        openVacancies: vacSummary.open || 0,
        pendingLeaves: pending.length,
        attendanceRate: emps.length > 0 ? '100%' : '0%',
        activeWarnings: compSummary.activeWarnings || 0,
        complianceRate: (compSummary.overallComplianceRate !== undefined ? compSummary.overallComplianceRate : 0) + '%'
      });
    } catch (e) {
      console.error('Error loading HR Dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (id) => {
    try {
      await apiClient.put(`/attendance/leaves/${id}/approve`, { remarks: "Approved by HR Manager" });
      loadDashboardData();
    } catch (e) {
      alert("Could not approve leave");
    }
  };

  const handleRejectLeave = async (id) => {
    try {
      await apiClient.put(`/attendance/leaves/${id}/reject`, { remarks: "Rejected by HR Manager" });
      loadDashboardData();
    } catch (e) {
      alert("Could not reject leave");
    }
  };

  const employeeColumns = [
    { header: 'Employee ID', accessor: 'employeeId', render: (r) => <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{r.employeeId}</span> },
    { header: 'Name', accessor: 'fullName', render: (r) => <span style={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</span> },
    { header: 'Department', accessor: 'department', render: (r) => r.department?.name || '—' },
    { header: 'Position', accessor: 'position', render: (r) => r.position?.title || '—' },
    { header: 'Status', accessor: 'employmentStatus', render: (r) => <StatusBadge status={r.employmentStatus} /> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">HR Manager Executive Dashboard</h1>
          <p className="page-description">
            Recruitment pipelines, attendance governance, leave approvals, and employee compliance overview.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/recruitment/register-employee" className="btn btn-primary">
            <UserPlus size={16} /> Register Employee
          </Link>
          <Link to="/recruitment/vacancies" className="btn btn-secondary">
            <Briefcase size={16} /> Post Vacancy
          </Link>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="stat-grid">
        <StatCard title="Total Employees" value={stats.totalEmployees} icon={Users} color="blue" subtext="Registered workforce" />
        <StatCard title="Open Vacancies" value={stats.openVacancies} icon={Briefcase} color="purple" subtext="Active talent recruitment" />
        <StatCard title="Pending Leaves" value={stats.pendingLeaves} icon={CalendarCheck} color="amber" subtext="Awaiting review" />
        <StatCard title="Attendance Rate" value={stats.attendanceRate} icon={Clock} color="green" subtext="Biometric check-in rate" />
        <StatCard title="Active Warnings" value={stats.activeWarnings} icon={ShieldAlert} color="red" subtext="Compliance notices" />
        <StatCard title="Policy Compliance" value={stats.complianceRate} icon={TrendingUp} color="blue" subtext="Staff sign-off rate" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Pending Leave Requests Queue */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Pending Leave Requests</h2>
              <p className="card-subtitle">Employee requests awaiting approval</p>
            </div>
            <Link to="/attendance/leaves" style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {pendingLeaves.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingLeaves.map(leave => (
                <div key={leave.id} style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      {leave.employee?.firstName} {leave.employee?.lastName} ({leave.employee?.employeeId})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                      <span style={{ fontWeight: 600, color: '#2563eb' }}>{leave.leaveType} Leave</span>: {leave.startDate} to {leave.endDate} ({leave.totalDays} days)
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px', fontStyle: 'italic' }}>
                      "{leave.reason}"
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleApproveLeave(leave.id)} className="btn btn-success btn-sm">
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => handleRejectLeave(leave.id)} className="btn btn-danger btn-sm">
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              No pending leave requests at this time.
            </div>
          )}
        </div>

        {/* Quick Actions & Compliance Alerts */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Quick HR Operations</h2>
              <p className="card-subtitle">Common administrative workflows</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to="/recruitment/register-employee" className="quick-action-btn">
              <UserPlus size={18} color="#2563eb" />
              <div>
                <div>Register New Employee Profile</div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>Enter personal details, NIC, role & employment status</span>
              </div>
            </Link>

            <Link to="/recruitment/vacancies" className="quick-action-btn">
              <Briefcase size={18} color="#7c3aed" />
              <div>
                <div>Manage Job Vacancies & Headcounts</div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>Publish new roles and review open headcount quotas</span>
              </div>
            </Link>

            <Link to="/attendance/overtime" className="quick-action-btn">
              <Clock size={18} color="#059669" />
              <div>
                <div>Log & Verify Shift Overtime Hours</div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>Input approved OT hours before Finance payroll cut-off</span>
              </div>
            </Link>

            <Link to="/compliance/warnings" className="quick-action-btn">
              <ShieldAlert size={18} color="#ef4444" />
              <div>
                <div>Issue Compliance Warning Notice</div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>Record formal warnings for attendance or safety violations</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Employee Registrations Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Recently Registered Workforce Members</h2>
            <p className="card-subtitle">Active profiles available across operations and shift scheduling</p>
          </div>
          <Link to="/recruitment/employees" style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Full Directory <ArrowRight size={14} />
          </Link>
        </div>
        <DataTable columns={employeeColumns} data={recentEmployees} searchPlaceholder="Search..." emptyMessage="No employees registered yet. Click 'Register Employee' to add your first record." />
      </div>
    </div>
  );
};
