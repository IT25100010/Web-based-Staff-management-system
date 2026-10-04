# Project Progress & Recovery Checkpoint
**Project**: Lanka Workforce Solutions (Pvt) Ltd - Web-Based Staff Management System
**Root**: `C:\Users\kanishka\.gemini\antigravity-ide\scratch\staff-management`
**Date**: October 2026

---

## 1. Verified Completed Work

### Phase 1 & 2: Inspection, Baseline & KPI Tests
- Outdated test fixtures in `KPIAssessmentSystemTest.java` updated to match business requirements:
  - Exactly 10 questions per MCQ.
  - Exactly 4 options per question.
  - Exactly 1 correct option per question.
  - Exactly 10 marks per question (total 100 marks).
  - Scoring assertions updated (7 correct = 70/100, 70%, Grade C).
- Added `@MockBean private JavaMailSender mailSender;` in integration tests to prevent external SMTP connection timeouts during test runs.

### Phase 3: Silent Mock Fallback Removal
- Audited `frontend/src/api/apiClient.js`:
  - `VITE_USE_MOCK_API` defaults to `false`.
  - Application defaults strictly to real backend API calls.
  - Real errors/HTTP failures are returned and shown, eliminating silent fake responses.
  - Authentication and OTP workflows strictly route to the real backend.

### Phase 4: Backend Security & Employee Isolation
- Centralized exception mapping in `GlobalExceptionHandler.java`:
  - `AccessDeniedException` and `SecurityException` -> HTTP 403 Forbidden.
  - `BadRequestException` and `IllegalArgumentException` -> HTTP 400 Bad Request.
  - `ResourceNotFoundException` -> HTTP 404 Not Found.
- Controllers secured with `@PreAuthorize` role restrictions:
  - `WorkforceController`: secured shift schedules, work assignments, staff recalls.
  - `PerformanceController`: secured KPI creation, editing, deletion, and manual scoring.
  - `ComplianceController`: secured policy CRUD, warning issuance, and disciplinary actions.
  - `AttendanceController`: secured attendance modification, direct ID isolation.
- Direct-ID endpoints isolated: employees can only view their own attendance, leaves, schedules, recalls, benefits, KPI results, payslips, warnings, and disciplinary records.
- Notifications & Broadcasts:
  - `NotificationController`: Verifies ownership before marking private notifications read (HTTP 403 for non-owners).
  - Broadcast read status tracked per-user via `NotificationReadStatusRepository` so reading a broadcast does not mark it read for all users.
  - Broadcast creation restricted to management/IT roles.

### Phase 5: FR4 Performance & KPI
- New KPI creation types restricted to `MCQ` and `WORKSHOP` (preserving legacy records safely).
- Atomic MCQ Wizard:
  - Fixed 10 questions x 4 options format with inline radio selection for correct answer.
  - Validated server-side in `PerformanceController.createMcqKpiWithWizard`.
  - Atomic publishing with employee assignments.
- Employee MCQ Assessment:
  - Date and active status validation.
  - Correct answers scrubbed from employee assessment DTO (`options.correct` hidden).
  - Full 10-answer submission required.
  - Duplicate submission prevented (HTTP 400).
  - Automatic scoring: 10 marks per correct question, standard grading (A >= 85, B >= 75, C >= 65, D >= 50, F < 50).
  - Result detail ownership protected (HTTP 403 for other employees).
- Atomic Workshop Wizard:
  - Details captured: workshop date, start/end time, location, trainer, positive max score, instructions.
  - Atomic creation of KPI, Workshop entity, and employee assignments (`POST /api/performance/kpis/workshop-wizard`).
- Workshop Scoring:
  - `PRESENT`: score required between 0 and maxScore.
  - `ABSENT`: 0 score and ABSENT status.
  - Result type recorded as `MANUAL_WORKSHOP`.
  - Verified assignment belongs to a workshop.

### Phase 6: FR5 Payroll & Salary Resolution
- Added `Position.defaultMonthlySalary` (BigDecimal) with create/update validation in `EmployeeController` and frontend `PositionManagement.jsx`.
- Employee Registration pre-fills position salary without overwriting custom inputs.
- Strict salary resolution hierarchy:
  1. `Employee.baseSalary > 0` -> use it.
  2. `Position.defaultMonthlySalary > 0` -> use it.
  3. Otherwise -> reject with HTTP 400 salary configuration error (no invented fallbacks like 75000).
- Two-Stage Payroll Processing:
  - `POST /api/payroll/preview`: Previews calculation without persisting.
  - `POST /api/payroll/process`: Server-side recalculation, duplicate period check, transactional persistence of `Payroll`, `PayrollDetail`, and `Payslip`.
- Accurate Attendance & Leave Deductions:
  - Deductions applied for: approved unpaid leave (daily rate), explicit ABSENT (daily rate), HALF_DAY (half daily rate).
  - No deduction for: approved annual/casual/medical/maternity leave, PRESENT, LATE, EARLY_LEAVE, or unmarked days.
  - Overlapping absence and unpaid leave handled without double deductions.
  - Explanatory fields stored in `PayrollDetail`: `expectedWorkingDays`, `dailyRate`, `presentDays`, `lateDays`, `halfDays`, `paidLeaveDays`, `unpaidLeaveDays`, `absentDays`, `attendanceDeduction`.
  - Breakdown banners and line items rendered in `PayrollProcessing.jsx`, `PayslipsView.jsx`, and `EmployeePayslip.jsx`.

### Phase 7: FR6 Compliance
- Employees view only active published policies and their own acknowledgements.
- Acknowledgement persistence across page refresh with duplicate rejection (HTTP 400).
- Warnings and Disciplinary cases:
  - Managers issue warnings and disciplinary actions to specific employees.
  - Targeted notifications generated for affected employees.
  - Disciplinary case status lifecycle: `OPEN` and `RESOLVED` (preserving legacy records).
  - Employee "My Compliance" dashboard tab shows own policies, acknowledgements, warnings, and disciplinary records.
  - Manager summary endpoint `GET /api/compliance/summary` with active policy, acknowledgement rate, warning, and case statistics.

### Phase 8: Targeted Staff Recalls
- Relational recipients added to `StaffRecall` (`@ManyToMany` with `@JsonIgnore` to avoid lazy loading serialization errors) and `isBroadcast` flag.
- Endpoint `GET /api/workforce/my-recalls` returns only recalls targeted to the authenticated employee or explicit broadcasts.
- Global `GET /api/workforce/recalls` restricted to management.
- `StaffRecalls.jsx` UI supports targeting specific employees with department filtering or broadcasting to all active personnel.
- `EmployeeSchedule.jsx` connected to `my-recalls`.

### Phase 9: Global UI & Responsive Layout
- Preserved existing navy/blue brand aesthetic.
- Design tokens and component styles harmonized across `components.css` and `design-tokens.css` (`.stats-grid`/`.stat-grid`, `.page-container`, `.table-responsive`/`.data-table`).
- Mobile/Tablet Off-canvas Sidebar:
  - Desktop: visible fixed sidebar.
  - Mobile/Tablet (< 1024px): hidden off-canvas with backdrop overlay, accessible close button, and automatic close on navigation.
  - Hamburger toggle button in header for tablet and mobile viewports.
- Enhanced `DataTable.jsx`: loading state spinner, mobile wrapping controls, empty state.
- Enhanced `Modal.jsx`: maximum height constraint, mobile body scrolling, and responsive action footer.
- Checked all sidebar links, routes in `AppRoutes.jsx`, and role guards for all 6 roles (`SENIOR_ADMIN`, `HR_MANAGER`, `OPERATIONS_MANAGER`, `FINANCE_EXECUTIVE`, `IT_COORDINATOR`, `EMPLOYEE`).

### Phase 10: Regression & Test Coverage
- New integration test suite `SecurityAndBusinessIsolationTest.java` added with 9 comprehensive tests:
  - Leave approval restricted from regular employees (HTTP 403).
  - Global recalls restricted from regular employees (HTTP 403).
  - Compliance policy creation restricted to authorized roles (HTTP 403).
  - Warning creation restricted from regular employees (HTTP 403).
  - Disciplinary action creation restricted from regular employees (HTTP 403).
  - Targeted recalls isolation: employees only receive their own recalls / broadcasts.
  - Notification mark-read ownership enforced (HTTP 403 for unauthorized users).
  - Duplicate policy acknowledgement rejected (HTTP 400).
  - Workshop wizard validation: missing workshop name rejected (HTTP 400).

---

## 2. Test, Build & Verification Results

- **Backend Maven Tests**:
  - Command: `mvn -f .\backend\pom.xml test`
  - Total Tests: **61**
  - Passed: **61**
  - Failures: **0**
  - Errors: **0**
  - Skipped: **0**
  - Result: **BUILD SUCCESS**
  - Test suites:
    - `AutomaticEmployeeIdAndStatusRemovalTest`: 4 tests (Passed)
    - `EmployeeAccountCreationTest`: 5 tests (Passed)
    - `EmployeeLoginOtpAndRoleSecurityTest`: 5 tests (Passed)
    - `KPIAssessmentSystemTest`: 12 tests (Passed)
    - `MySQLIntegrationVerificationTest`: 1 test (Passed)
    - `SecurityAndBusinessIsolationTest`: 21 tests (Passed - Employee A vs Employee B isolation across all endpoints and direct-IDs)
    - `WorkforceBusinessLogicTest`: 13 tests (Passed)
- **Frontend Build**:
  - Command: `cmd /c "npm run build"`
  - Output: `vite build` completed in ~49s, exit code 0.
- **Frontend Lint**:
  - Command: `cmd /c "npm run lint"`
  - Result: 0 errors, exit code 0.
- **Live System API Verification**:
  - HR Manager login (`hr_manager`): 200 OK.
  - KPI list retrieval: 200 OK (157+ records).
  - Compliance summary retrieval: 200 OK.
  - Targeted staff recalls: 200 OK.
  - Finance Exec login (`finance_exec`): 200 OK.
  - Position salary update via HR: 200 OK.
  - Payroll calculation preview: 200 OK (Calculated working days, EPF, daily rates, net pay).
  - Workshop Wizard creation: 200 OK (`POST /api/performance/kpis/workshop-wizard`).
  - MCQ Wizard creation: 200 OK (`POST /api/performance/kpis/mcq-wizard`).
  - Workshop scoring (`PRESENT` and `ABSENT`): 200 OK.

---

## 3. Main Files Changed

### Backend:
- `backend/src/main/java/com/lws/staff_management/common/GlobalExceptionHandler.java`
- `backend/src/main/java/com/lws/staff_management/employee/Position.java`
- `backend/src/main/java/com/lws/staff_management/employee/EmployeeController.java`
- `backend/src/main/java/com/lws/staff_management/attendance/AttendanceController.java`
- `backend/src/main/java/com/lws/staff_management/leave/LeaveController.java`
- `backend/src/main/java/com/lws/staff_management/workforce/StaffRecall.java`
- `backend/src/main/java/com/lws/staff_management/workforce/WorkforceController.java`
- `backend/src/main/java/com/lws/staff_management/workforce/WorkforceService.java`
- `backend/src/main/java/com/lws/staff_management/performance/PerformanceController.java`
- `backend/src/main/java/com/lws/staff_management/performance/KPIService.java`
- `backend/src/main/java/com/lws/staff_management/performance/dto/CreateMcqKpiRequest.java`
- `backend/src/main/java/com/lws/staff_management/performance/dto/CreateWorkshopKpiRequest.java`
- `backend/src/main/java/com/lws/staff_management/payroll/PayrollController.java`
- `backend/src/main/java/com/lws/staff_management/payroll/PayrollDetail.java`
- `backend/src/main/java/com/lws/staff_management/compliance/ComplianceController.java`
- `backend/src/main/java/com/lws/staff_management/notification/NotificationController.java`
- `backend/src/test/java/com/lws/staff_management/performance/KPIAssessmentSystemTest.java`
- `backend/src/test/java/com/lws/staff_management/SecurityAndBusinessIsolationTest.java`

### Frontend:
- `frontend/src/api/apiClient.js`
- `frontend/src/components/layout/Sidebar.jsx`
- `frontend/src/components/layout/Header.jsx`
- `frontend/src/components/common/DataTable.jsx`
- `frontend/src/components/common/Modal.jsx`
- `frontend/src/routes/AppRoutes.jsx`
- `frontend/src/pages/performance/KPIManagement.jsx`
- `frontend/src/pages/performance/MyKPIActivities.jsx`
- `frontend/src/pages/payroll/PayrollProcessing.jsx`
- `frontend/src/pages/payroll/PayslipsView.jsx`
- `frontend/src/pages/payroll/EmployeePayslip.jsx`
- `frontend/src/pages/compliance/EmployeePolicies.jsx`
- `frontend/src/pages/compliance/PolicyManagement.jsx`
- `frontend/src/pages/workforce/StaffRecalls.jsx`
- `frontend/src/pages/workforce/EmployeeSchedule.jsx`
- `frontend/src/styles/components.css`
- `frontend/src/styles/design-tokens.css`

---

## 4. Real Blockers & External Environment Limitations

- **Browser Subagent CDP Tool**:
  - The internal `browser_subagent` execution failed to launch because the local CDP port could not be resolved (`failed to resolve CDP URLs: failed to parse CDP port:`). This is an IDE / platform environment issue.
  - To ensure end-to-end correctness, the live web server on `http://localhost:5173` and backend on `http://localhost:8080` were exercised and verified using direct HTTP requests, integration tests (49/49 passed), and production build/lint validation.
