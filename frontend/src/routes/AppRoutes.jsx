import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RoleRoute } from './RoleRoute';
import { DashboardLayout } from '../components/common/DashboardLayout';

// Auth & Error Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { UnauthorizedPage } from '../pages/error/UnauthorizedPage';
import { NotFoundPage } from '../pages/error/NotFoundPage';

// Role Dashboards
import { HRManagerDashboard } from '../pages/dashboards/HRManagerDashboard';
import { OperationsManagerDashboard } from '../pages/dashboards/OperationsManagerDashboard';
import { SeniorAdminDashboard } from '../pages/dashboards/SeniorAdminDashboard';
import { FinanceExecutiveDashboard } from '../pages/dashboards/FinanceExecutiveDashboard';
import { EmployeeDashboard } from '../pages/dashboards/EmployeeDashboard';
import { ITCoordinatorDashboard } from '../pages/dashboards/ITCoordinatorDashboard';

// HR Modules
import { VacanciesList } from '../pages/recruitment/VacanciesList';
import { EmployeeRegistration } from '../pages/recruitment/EmployeeRegistration';
import { EmployeeList } from '../pages/recruitment/EmployeeList';
import { DepartmentManagement } from '../pages/recruitment/DepartmentManagement';
import { PositionManagement } from '../pages/recruitment/PositionManagement';
import { LeaveManagement } from '../pages/attendance/LeaveManagement';
import { AttendanceRecord } from '../pages/attendance/AttendanceRecord';
import { OvertimeManagement } from '../pages/attendance/OvertimeManagement';
import { Timesheets } from '../pages/attendance/Timesheets';
import { KPIManagement } from '../pages/performance/KPIManagement';
import { PerformanceEvaluations } from '../pages/performance/PerformanceEvaluations';
import { EmployeeGoals } from '../pages/performance/EmployeeGoals';
import { WarningNotices } from '../pages/compliance/WarningNotices';
import { DisciplinaryActions } from '../pages/compliance/DisciplinaryActions';
import { ComplaintManagement } from '../pages/compliance/ComplaintManagement';

// Operations Modules
import { DailyWorkforceMonitor } from '../pages/workforce/DailyWorkforceMonitor';
import { WorkforcePlans } from '../pages/workforce/WorkforcePlans';
import { ShiftManagement } from '../pages/workforce/ShiftManagement';
import { WorkLocations } from '../pages/workforce/WorkLocations';
import { WorkforceAssignments } from '../pages/workforce/WorkforceAssignments';
import { TransfersAndReplacements } from '../pages/workforce/TransfersAndReplacements';
import { OfficeMeetings } from '../pages/workforce/OfficeMeetings';
import { StaffRecalls } from '../pages/workforce/StaffRecalls';
import { SupervisorFeedback } from '../pages/performance/SupervisorFeedback';

// Senior Admin Modules
import { AdminEmployeeRecords } from '../pages/admin/AdminEmployeeRecords';
import { AdminDocumentVerification } from '../pages/admin/AdminDocumentVerification';

// Shared Compliance Policies (HR & Senior Admin)
import { CompanyPolicies } from '../pages/compliance/CompanyPolicies';
import { PolicyAcknowledgements } from '../pages/compliance/PolicyAcknowledgements';

// Finance Modules
import { PayrollProcessing } from '../pages/payroll/PayrollProcessing';
import { EmployeeBenefits } from '../pages/payroll/EmployeeBenefits';
import { PayslipsView } from '../pages/payroll/PayslipsView';
import { ReportsView } from '../pages/payroll/ReportsView';

// Employee Portal Modules
import { EmployeeAttendance } from '../pages/employee/EmployeeAttendance';
import { EmployeeLeave } from '../pages/employee/EmployeeLeave';
import { EmployeeSchedule } from '../pages/employee/EmployeeSchedule';
import { EmployeePayslip } from '../pages/employee/EmployeePayslip';
import { EmployeePolicies } from '../pages/employee/EmployeePolicies';
import { EmployeeComplaints } from '../pages/employee/EmployeeComplaints';
import { MyKPIActivities } from '../pages/employee/MyKPIActivities';

// IT Coordinator Modules
import { UserAccounts } from '../pages/admin/UserAccounts';
import { AuditLogsView } from '../pages/admin/AuditLogsView';
import { BackupsView } from '../pages/admin/BackupsView';
import { TechSupportView } from '../pages/admin/TechSupportView';

// Helper Root Redirect based on authenticated user's role
const RootRedirect = () => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  switch (role) {
    case 'HR_MANAGER': return <Navigate to="/hr/dashboard" replace />;
    case 'OPERATIONS_MANAGER': return <Navigate to="/operations/dashboard" replace />;
    case 'SENIOR_ADMIN': return <Navigate to="/admin-officer/dashboard" replace />;
    case 'FINANCE_EXECUTIVE': return <Navigate to="/finance/dashboard" replace />;
    case 'EMPLOYEE': return <Navigate to="/employee/dashboard" replace />;
    case 'IT_COORDINATOR': return <Navigate to="/it/dashboard" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Root path */}
      <Route path="/" element={<RootRedirect />} />

      {/* Authenticated routes inside DashboardLayout */}
      <Route element={<DashboardLayout />}>
        {/* 1. HR Manager Routes */}
        <Route element={<RoleRoute allowedRoles={['HR_MANAGER']} />}>
          <Route path="/hr/dashboard" element={<HRManagerDashboard />} />
          <Route path="/recruitment/vacancies" element={<VacanciesList />} />
          <Route path="/recruitment/departments" element={<DepartmentManagement />} />
          <Route path="/recruitment/positions" element={<PositionManagement />} />
          <Route path="/recruitment/register-employee" element={<EmployeeRegistration />} />
          <Route path="/recruitment/employees" element={<EmployeeList />} />
          <Route path="/recruitment/staff-accounts" element={<UserAccounts />} />
          <Route path="/attendance/leaves" element={<LeaveManagement />} />
          <Route path="/attendance/records" element={<AttendanceRecord />} />
          <Route path="/attendance/overtime" element={<OvertimeManagement />} />
          <Route path="/attendance/timesheets" element={<Timesheets />} />
          <Route path="/performance/kpis" element={<KPIManagement />} />
          <Route path="/performance/evaluations" element={<PerformanceEvaluations />} />
          <Route path="/performance/goals" element={<EmployeeGoals />} />
          <Route path="/compliance/warnings" element={<WarningNotices />} />
          <Route path="/compliance/disciplinary" element={<DisciplinaryActions />} />
          <Route path="/compliance/complaints" element={<ComplaintManagement />} />
        </Route>

        {/* 2. Operations Manager Routes */}
        <Route element={<RoleRoute allowedRoles={['OPERATIONS_MANAGER']} />}>
          <Route path="/operations/dashboard" element={<OperationsManagerDashboard />} />
          <Route path="/operations/daily-monitor" element={<DailyWorkforceMonitor />} />
          <Route path="/workforce/plans" element={<WorkforcePlans />} />
          <Route path="/operations/shifts" element={<ShiftManagement />} />
          <Route path="/workforce/locations" element={<WorkLocations />} />
          <Route path="/workforce/assignments" element={<WorkforceAssignments />} />
          <Route path="/workforce/transfers" element={<TransfersAndReplacements />} />
          <Route path="/workforce/meetings" element={<OfficeMeetings />} />
          <Route path="/workforce/recalls" element={<StaffRecalls />} />
          <Route path="/performance/feedback" element={<SupervisorFeedback />} />
          <Route path="/performance/kpis" element={<KPIManagement />} />
        </Route>

        {/* 3. Senior Admin Routes */}
        <Route element={<RoleRoute allowedRoles={['SENIOR_ADMIN']} />}>
          <Route path="/admin-officer/dashboard" element={<SeniorAdminDashboard />} />
          <Route path="/admin-officer/records" element={<AdminEmployeeRecords />} />
          <Route path="/admin-officer/documents" element={<AdminDocumentVerification />} />
        </Route>

        {/* Shared Compliance Policies (HR & Senior Admin) */}
        <Route element={<RoleRoute allowedRoles={['HR_MANAGER', 'SENIOR_ADMIN']} />}>
          <Route path="/compliance/policies" element={<CompanyPolicies />} />
          <Route path="/compliance/acknowledgements" element={<PolicyAcknowledgements />} />
        </Route>

        {/* 4. Finance Executive Routes */}
        <Route element={<RoleRoute allowedRoles={['FINANCE_EXECUTIVE']} />}>
          <Route path="/finance/dashboard" element={<FinanceExecutiveDashboard />} />
          <Route path="/finance/payroll-processing" element={<PayrollProcessing />} />
          <Route path="/finance/benefits" element={<EmployeeBenefits />} />
          <Route path="/finance/payslips" element={<PayslipsView />} />
          <Route path="/finance/reports" element={<ReportsView />} />
        </Route>

        {/* 5. Employee Portal Routes */}
        <Route element={<RoleRoute allowedRoles={['EMPLOYEE']} />}>
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee/attendance" element={<EmployeeAttendance />} />
          <Route path="/employee/leave" element={<EmployeeLeave />} />
          <Route path="/employee/schedule" element={<EmployeeSchedule />} />
          <Route path="/employee/payslip" element={<EmployeePayslip />} />
          <Route path="/employee/policies" element={<EmployeePolicies />} />
          <Route path="/employee/complaints" element={<EmployeeComplaints />} />
          <Route path="/employee/kpi-activities" element={<MyKPIActivities />} />
        </Route>

        {/* 6. IT Coordinator Routes */}
        <Route element={<RoleRoute allowedRoles={['IT_COORDINATOR']} />}>
          <Route path="/it/dashboard" element={<ITCoordinatorDashboard />} />
          <Route path="/it/users" element={<UserAccounts />} />
          <Route path="/it/security-logs" element={<AuditLogsView />} />
          <Route path="/it/backups" element={<BackupsView />} />
          <Route path="/it/support" element={<TechSupportView />} />
        </Route>
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
