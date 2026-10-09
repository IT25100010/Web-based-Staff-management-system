import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Briefcase,
  FileText,
  CalendarCheck,
  Clock,
  CalendarDays,
  MapPin,
  Repeat,
  AlertTriangle,
  TrendingUp,
  Target,
  DollarSign,
  Gift,
  ShieldAlert,
  FileCheck,
  Shield,
  Server,
  LifeBuoy,
  LogOut,
  Layers,
  FileSpreadsheet,
  Building2,
  MessageSquareWarning,
  X
} from 'lucide-react';

export const Sidebar = ({ isOpen = false, onClose }) => {
  const { user, role, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [location.pathname]);

  const getRoleDisplayName = (r) => {
    switch (r) {
      case 'HR_MANAGER': return 'HR Manager';
      case 'OPERATIONS_MANAGER': return 'Operations Manager';
      case 'SENIOR_ADMIN': return 'Senior Admin';
      case 'FINANCE_EXECUTIVE': return 'Finance Executive';
      case 'EMPLOYEE': return 'Employee Portal';
      case 'IT_COORDINATOR': return 'IT Coordinator';
      default: return 'User';
    }
  };

  const getDashboardPath = (r) => {
    switch (r) {
      case 'HR_MANAGER': return '/hr/dashboard';
      case 'OPERATIONS_MANAGER': return '/operations/dashboard';
      case 'SENIOR_ADMIN': return '/admin-officer/dashboard';
      case 'FINANCE_EXECUTIVE': return '/finance/dashboard';
      case 'EMPLOYEE': return '/employee/dashboard';
      case 'IT_COORDINATOR': return '/it/dashboard';
      default: return '/login';
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-icon">LWS</div>
        <div className="brand-info">
          <h2>Lanka Workforce</h2>
          <span>Solutions (Pvt) Ltd</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close Navigation"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="sidebar-role-badge">
        <div>
          <div className="role-title">{getRoleDisplayName(role)}</div>
          <div className="role-desc">{user?.fullName || 'Staff Member'}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* Universal Dashboard Link for active role */}
        <NavLink
          to={getDashboardPath(role)}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Overview Dashboard</span>
        </NavLink>

        {/* 1. HR MANAGER MENU */}
        {role === 'HR_MANAGER' && (
          <>
            <div className="nav-section-title">Recruitment & Staff</div>
            <NavLink to="/recruitment/departments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Building2 size={18} />
              <span>Departments</span>
            </NavLink>
            <NavLink to="/recruitment/positions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Briefcase size={18} />
              <span>Positions & Roles</span>
            </NavLink>
            <NavLink to="/recruitment/vacancies" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileText size={18} />
              <span>Job Vacancies</span>
            </NavLink>
            <NavLink to="/recruitment/register-employee" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <UserPlus size={18} />
              <span>Register Employee</span>
            </NavLink>
            <NavLink to="/recruitment/employees" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Employee Directory</span>
            </NavLink>
            <NavLink to="/recruitment/staff-accounts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Shield size={18} />
              <span>Staff Accounts</span>
            </NavLink>

            <div className="nav-section-title">Attendance & Time</div>
            <NavLink to="/attendance/leaves" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <CalendarCheck size={18} />
              <span>Leave Approvals</span>
            </NavLink>
            <NavLink to="/attendance/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Clock size={18} />
              <span>Attendance Monitor</span>
            </NavLink>
            <NavLink to="/attendance/overtime" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <CalendarDays size={18} />
              <span>Overtime Records</span>
            </NavLink>
            <NavLink to="/attendance/timesheets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileSpreadsheet size={18} />
              <span>Timesheet Approvals</span>
            </NavLink>

            <div className="nav-section-title">Performance & Goals</div>
            <NavLink to="/performance/kpis" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <TrendingUp size={18} />
              <span>KPI Management</span>
            </NavLink>
            <NavLink to="/performance/evaluations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileText size={18} />
              <span>Performance Reviews</span>
            </NavLink>
            <NavLink to="/performance/goals" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Target size={18} />
              <span>Employee Goals</span>
            </NavLink>

            <div className="nav-section-title">Policy & Compliance</div>
            <NavLink to="/compliance/policies" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileCheck size={18} />
              <span>Company Policies</span>
            </NavLink>
            <NavLink to="/compliance/complaints" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <MessageSquareWarning size={18} />
              <span>Complaint Management</span>
            </NavLink>
            <NavLink to="/compliance/warnings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <ShieldAlert size={18} />
              <span>Warning Notices</span>
            </NavLink>
            <NavLink to="/compliance/disciplinary" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Shield size={18} />
              <span>Disciplinary Actions</span>
            </NavLink>
          </>
        )}

        {/* 2. OPERATIONS MANAGER MENU */}
        {role === 'OPERATIONS_MANAGER' && (
          <>
            <div className="nav-section-title">Daily Operations</div>
            <NavLink to="/operations/daily-monitor" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Daily Workforce Status</span>
            </NavLink>
            <NavLink to="/workforce/plans" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Layers size={18} />
              <span>Workforce Plans</span>
            </NavLink>

            <div className="nav-section-title">Shifts & Locations</div>
            <NavLink to="/operations/shifts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Clock size={18} />
              <span>Shift Scheduling</span>
            </NavLink>
            <NavLink to="/workforce/locations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <MapPin size={18} />
              <span>Work Locations</span>
            </NavLink>
            <NavLink to="/workforce/assignments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Location Assignments</span>
            </NavLink>

            <div className="nav-section-title">Movements & Alerts</div>
            <NavLink to="/workforce/transfers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Repeat size={18} />
              <span>Transfers & Swaps</span>
            </NavLink>
            <NavLink to="/workforce/meetings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <CalendarDays size={18} />
              <span>Site & Office Meetings</span>
            </NavLink>
            <NavLink to="/workforce/recalls" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <AlertTriangle size={18} />
              <span>Emergency Staff Recalls</span>
            </NavLink>
            <NavLink to="/performance/feedback" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <TrendingUp size={18} />
              <span>Supervisor Feedback</span>
            </NavLink>
            <NavLink to="/performance/kpis" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Target size={18} />
              <span>KPI Management</span>
            </NavLink>
          </>
        )}

        {/* 3. SENIOR ADMINISTRATIVE OFFICER MENU */}
        {role === 'SENIOR_ADMIN' && (
          <>
            <div className="nav-section-title">Records & Documents</div>
            <NavLink to="/admin-officer/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Employee Records</span>
            </NavLink>
            <NavLink to="/admin-officer/documents" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileText size={18} />
              <span>Document Verification</span>
            </NavLink>
            <NavLink to="/compliance/policies" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileCheck size={18} />
              <span>Company Policies</span>
            </NavLink>
          </>
        )}

        {/* 4. FINANCE EXECUTIVE MENU */}
        {role === 'FINANCE_EXECUTIVE' && (
          <>
            <div className="nav-section-title">Payroll & Calculations</div>
            <NavLink to="/finance/payroll-processing" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <DollarSign size={18} />
              <span>Payroll Processing</span>
            </NavLink>
            <NavLink to="/finance/benefits" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Gift size={18} />
              <span>Employee Benefits</span>
            </NavLink>
            <NavLink to="/finance/payslips" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileSpreadsheet size={18} />
              <span>Generated Payslips</span>
            </NavLink>
            <NavLink to="/finance/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <TrendingUp size={18} />
              <span>Payroll & Cost Reports</span>
            </NavLink>
          </>
        )}

        {/* 5. EMPLOYEE PORTAL MENU */}
        {role === 'EMPLOYEE' && (
          <>
            <div className="nav-section-title">My Workspace</div>
            <NavLink to="/employee/attendance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Clock size={18} />
              <span>My Attendance</span>
            </NavLink>
            <NavLink to="/employee/leave" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <CalendarCheck size={18} />
              <span>Apply for Leave</span>
            </NavLink>
            <NavLink to="/employee/schedule" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <CalendarDays size={18} />
              <span>My Work Schedule</span>
            </NavLink>
            <NavLink to="/employee/payslip" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <DollarSign size={18} />
              <span>My Payslips</span>
            </NavLink>
            <NavLink to="/employee/policies" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileCheck size={18} />
              <span>Company Policies</span>
            </NavLink>
            <NavLink to="/employee/complaints" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <MessageSquareWarning size={18} />
              <span>My Complaints</span>
            </NavLink>
            <NavLink to="/employee/kpi-activities" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <TrendingUp size={18} />
              <span>My KPI Activities</span>
            </NavLink>
          </>
        )}

        {/* 6. IT COORDINATOR MENU */}
        {role === 'IT_COORDINATOR' && (
          <>
            <div className="nav-section-title">System & Security</div>
            <NavLink to="/it/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>User Accounts & Roles</span>
            </NavLink>
            <NavLink to="/it/security-logs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Shield size={18} />
              <span>Security & Audit Logs</span>
            </NavLink>
            <NavLink to="/it/backups" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Server size={18} />
              <span>System Backups</span>
            </NavLink>
            <NavLink to="/it/support" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <LifeBuoy size={18} />
              <span>Technical Support</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'flex-start', background: 'transparent', color: '#cbd5e1', border: 'none' }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
