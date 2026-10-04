package com.lws.staff_management;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lws.staff_management.compliance.CompanyPolicy;
import com.lws.staff_management.compliance.CompanyPolicyRepository;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.employee.Position;
import com.lws.staff_management.employee.PositionRepository;
import com.lws.staff_management.notification.Notification;
import com.lws.staff_management.notification.NotificationRepository;
import com.lws.staff_management.performance.KPI;
import com.lws.staff_management.performance.KPIRepository;
import com.lws.staff_management.user.Role;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import com.lws.staff_management.workforce.StaffRecall;
import com.lws.staff_management.workforce.StaffRecallRepository;
import com.lws.staff_management.attendance.Attendance;
import com.lws.staff_management.attendance.AttendanceRepository;
import com.lws.staff_management.attendance.LeaveRequest;
import com.lws.staff_management.attendance.LeaveRequestRepository;
import com.lws.staff_management.payroll.Payroll;
import com.lws.staff_management.payroll.PayrollRepository;
import com.lws.staff_management.payroll.PayrollDetail;
import com.lws.staff_management.payroll.PayrollDetailRepository;
import com.lws.staff_management.payroll.Payslip;
import com.lws.staff_management.payroll.PayslipRepository;
import com.lws.staff_management.payroll.EmployeeBenefit;
import com.lws.staff_management.payroll.EmployeeBenefitRepository;
import com.lws.staff_management.compliance.WarningNotice;
import com.lws.staff_management.compliance.WarningNoticeRepository;
import com.lws.staff_management.compliance.DisciplinaryAction;
import com.lws.staff_management.compliance.DisciplinaryActionRepository;
import com.lws.staff_management.performance.EmployeeGoal;
import com.lws.staff_management.performance.EmployeeGoalRepository;
import com.lws.staff_management.performance.SupervisorFeedback;
import com.lws.staff_management.performance.SupervisorFeedbackRepository;
import com.lws.staff_management.performance.PerformanceEvaluation;
import com.lws.staff_management.performance.PerformanceEvaluationRepository;
import com.lws.staff_management.compliance.EmployeeComplaint;
import com.lws.staff_management.compliance.EmployeeComplaintRepository;
import com.lws.staff_management.compliance.dto.CreateComplaintRequest;
import com.lws.staff_management.compliance.dto.UpdateComplaintStatusRequest;
import com.lws.staff_management.compliance.dto.ComplaintResponseRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class SecurityAndBusinessIsolationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private PositionRepository positionRepository;

    @Autowired
    private StaffRecallRepository staffRecallRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private CompanyPolicyRepository policyRepository;

    @Autowired
    private KPIRepository kpiRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private PayrollRepository payrollRepository;

    @Autowired
    private PayrollDetailRepository payrollDetailRepository;

    @Autowired
    private PayslipRepository payslipRepository;

    @Autowired
    private EmployeeBenefitRepository benefitRepository;

    @Autowired
    private WarningNoticeRepository warningRepository;

    @Autowired
    private DisciplinaryActionRepository disciplinaryRepository;

    @Autowired
    private EmployeeGoalRepository goalRepository;

    @Autowired
    private SupervisorFeedbackRepository feedbackRepository;

    @Autowired
    private PerformanceEvaluationRepository evaluationRepository;

    @Autowired
    private EmployeeComplaintRepository complaintRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private JavaMailSender mailSender;

    private User empUserA;
    private User empUserB;
    private Employee employeeA;
    private Employee employeeB;

    @BeforeEach
    void setup() {
        // Create User A & Employee A
        if (userRepository.findByEmail("empA@lws.lk").isEmpty()) {
            empUserA = userRepository.save(new User("empA@lws.lk", "empA@lws.lk", passwordEncoder.encode("Pass123"), "Emp A", Role.EMPLOYEE));
            employeeA = new Employee();
            employeeA.setEmployeeId("LK_EMP_A_01");
            employeeA.setFirstName("Alice");
            employeeA.setLastName("Silva");
            employeeA.setNic("199100000001");
            employeeA.setPhone("0771122334");
            employeeA.setEmail("empA@lws.lk");
            employeeA.setEmploymentStatus("Active");
            employeeA.setUser(empUserA);
            employeeA = employeeRepository.save(employeeA);
        } else {
            empUserA = userRepository.findByEmail("empA@lws.lk").get();
            employeeA = employeeRepository.findByEmail("empA@lws.lk").orElse(null);
            if (employeeA != null && employeeA.getPhone() == null) {
                employeeA.setPhone("0771122334");
                employeeA = employeeRepository.save(employeeA);
            }
        }

        // Create User B & Employee B
        if (userRepository.findByEmail("empB@lws.lk").isEmpty()) {
            empUserB = userRepository.save(new User("empB@lws.lk", "empB@lws.lk", passwordEncoder.encode("Pass123"), "Emp B", Role.EMPLOYEE));
            employeeB = new Employee();
            employeeB.setEmployeeId("LK_EMP_B_02");
            employeeB.setFirstName("Bob");
            employeeB.setLastName("Perera");
            employeeB.setNic("199200000002");
            employeeB.setPhone("0779988776");
            employeeB.setEmail("empB@lws.lk");
            employeeB.setEmploymentStatus("Active");
            employeeB.setUser(empUserB);
            employeeB = employeeRepository.save(employeeB);
        } else {
            empUserB = userRepository.findByEmail("empB@lws.lk").get();
            employeeB = employeeRepository.findByEmail("empB@lws.lk").orElse(null);
            if (employeeB != null && employeeB.getPhone() == null) {
                employeeB.setPhone("0779988776");
                employeeB = employeeRepository.save(employeeB);
            }
        }
    }

    @Test
    @DisplayName("1. Employee role cannot approve or reject leaves")
    @WithMockUser(username = "empA@lws.lk", roles = {"EMPLOYEE"})
    void testLeaveApprovalForbiddenForEmployee() throws Exception {
        Map<String, String> body = Map.of("remarks", "Denied by peer");
        mockMvc.perform(put("/api/attendance/leaves/1/approve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("2. Employee role cannot view global company-wide recalls endpoint")
    @WithMockUser(username = "empA@lws.lk", roles = {"EMPLOYEE"})
    void testGlobalRecallsForbiddenForEmployee() throws Exception {
        mockMvc.perform(get("/api/workforce/recalls"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("3. Employee role cannot create compliance policies")
    @WithMockUser(username = "empA@lws.lk", roles = {"EMPLOYEE"})
    void testCompliancePolicyCreationForbiddenForEmployee() throws Exception {
        Map<String, Object> body = Map.of("title", "Test Policy", "category", "HR");
        mockMvc.perform(post("/api/compliance/policies")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("4. Employee role cannot issue warnings")
    @WithMockUser(username = "empA@lws.lk", roles = {"EMPLOYEE"})
    void testWarningCreationForbiddenForEmployee() throws Exception {
        Map<String, Object> body = Map.of("employeeId", 1, "warningTitle", "Late Notice");
        mockMvc.perform(post("/api/compliance/warnings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("5. Employee role cannot issue disciplinary actions")
    @WithMockUser(username = "empA@lws.lk", roles = {"EMPLOYEE"})
    void testDisciplinaryCreationForbiddenForEmployee() throws Exception {
        Map<String, Object> body = Map.of("employeeId", 1, "actionTitle", "Suspension");
        mockMvc.perform(post("/api/compliance/disciplinary")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("6. Targeted recall is visible to recipient employee and NOT to other employee")
    void testTargetedStaffRecallsIsolation() throws Exception {
        // Create targeted recall exclusively for employee A
        StaffRecall recall = new StaffRecall();
        recall.setRecallTitle("Targeted Storm Mobilization");
        recall.setRecallDate(LocalDate.now());
        recall.setRecallTime(LocalTime.of(14, 0));
        recall.setLocation("Gate 7");
        recall.setPriority("CRITICAL");
        recall.setReason("High surge");
        recall.setStatus("ACTIVE");
        recall.setIsBroadcast(false);
        Set<Employee> recs = new HashSet<>();
        recs.add(employeeA);
        recall.setRecipients(recs);
        staffRecallRepository.save(recall);

        // Employee A accesses /my-recalls -> should contain this recall
        mockMvc.perform(get("/api/workforce/my-recalls")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empA@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.recallTitle == 'Targeted Storm Mobilization')]").exists());

        // Employee B accesses /my-recalls -> should NOT contain this recall
        mockMvc.perform(get("/api/workforce/my-recalls")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.recallTitle == 'Targeted Storm Mobilization')]").doesNotExist());
    }

    @Test
    @DisplayName("7. Notification mark-read ownership is enforced (forbidden for non-owner)")
    void testNotificationReadOwnershipEnforced() throws Exception {
        Notification notif = new Notification();
        notif.setUser(empUserA);
        notif.setTitle("Confidential Notice");
        notif.setMessage("Personal payroll notice");
        notif.setType("INFO");
        notif = notificationRepository.save(notif);

        // User B tries to mark User A's notification as read -> 403 Forbidden
        mockMvc.perform(patch("/api/notifications/" + notif.getId() + "/read")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("8. Duplicate policy acknowledgement is rejected with 400 Bad Request")
    void testDuplicatePolicyAcknowledgementRejected() throws Exception {
        CompanyPolicy policy = new CompanyPolicy();
        policy.setPolicyCode("POL-SEC-" + System.currentTimeMillis());
        policy.setTitle("Safety Protocols 2026");
        policy.setCategory("SAFETY");
        policy.setContent("Safety first");
        policy.setEffectiveDate(LocalDate.now());
        policy.setStatus("ACTIVE");
        policy = policyRepository.save(policy);

        Map<String, Object> ackPayload = Map.of("policyId", policy.getId());

        // First acknowledgement by Employee A -> 200 OK
        mockMvc.perform(post("/api/compliance/acknowledgements")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(ackPayload))
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empA@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk());

        // Second acknowledgement attempt -> 400 Bad Request
        mockMvc.perform(post("/api/compliance/acknowledgements")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(ackPayload))
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empA@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("9. Workshop Wizard validation: requires positive maxScore, location, trainer and times")
    @WithMockUser(username = "hr@lws.lk", roles = {"HR_MANAGER"})
    void testWorkshopWizardValidation() throws Exception {
        Map<String, Object> invalidPayload = new HashMap<>();
        invalidPayload.put("name", "Workshop Without Details");
        invalidPayload.put("category", "TRAINING");
        invalidPayload.put("maxScore", 0); // Invalid <= 0

        mockMvc.perform(post("/api/performance/kpis/workshop-wizard")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidPayload)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("10. Employee B cannot access Employee A's attendance history")
    void testEmployeeCannotViewOtherEmployeeAttendanceHistory() throws Exception {
        Attendance att = new Attendance();
        att.setEmployee(employeeA);
        att.setAttendanceDate(LocalDate.now());
        att.setCheckInTime(LocalTime.of(8, 0));
        att.setStatus("PRESENT");
        attendanceRepository.save(att);

        mockMvc.perform(get("/api/attendance/employee/" + employeeA.getId() + "/history")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("11. Employee B cannot access or view Employee A's leave request direct ID")
    void testEmployeeCannotViewOtherEmployeeLeaveDirectId() throws Exception {
        LeaveRequest leave = new LeaveRequest();
        leave.setEmployee(employeeA);
        leave.setLeaveType("Annual");
        leave.setStartDate(LocalDate.now());
        leave.setEndDate(LocalDate.now().plusDays(2));
        leave.setTotalDays(2);
        leave.setReason("Personal");
        leave.setStatus("PENDING");
        leave = leaveRequestRepository.save(leave);

        mockMvc.perform(get("/api/attendance/leaves/" + leave.getId())
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("12. Employee B cannot modify or delete Employee A's pending leave")
    void testEmployeeCannotMutateOtherEmployeeLeave() throws Exception {
        LeaveRequest leave = new LeaveRequest();
        leave.setEmployee(employeeA);
        leave.setLeaveType("Casual");
        leave.setStartDate(LocalDate.now());
        leave.setEndDate(LocalDate.now().plusDays(1));
        leave.setTotalDays(1);
        leave.setReason("Urgent errand");
        leave.setStatus("PENDING");
        leave = leaveRequestRepository.save(leave);

        Map<String, Object> updateBody = Map.of("reason", "Malicious modification");
        mockMvc.perform(put("/api/attendance/leaves/" + leave.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateBody))
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/attendance/leaves/" + leave.getId())
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("13. Employee B cannot view Employee A's payslip direct ID")
    void testEmployeeCannotViewOtherEmployeePayslipDirectId() throws Exception {
        Payroll payroll = new Payroll();
        payroll.setPayrollMonth(9);
        payroll.setPayrollYear(2026);
        payroll.setPeriodName("September 2026");
        payroll.setStatus("FINALIZED");
        payroll = payrollRepository.save(payroll);

        PayrollDetail detail = new PayrollDetail();
        detail.setPayroll(payroll);
        detail.setEmployee(employeeA);
        detail.setBaseSalary(new BigDecimal("100000.00"));
        detail.setGrossSalary(new BigDecimal("100000.00"));
        detail.setNetSalary(new BigDecimal("92000.00"));
        detail = payrollDetailRepository.save(detail);

        Payslip payslip = new Payslip();
        payslip.setPayslipNumber("PS-TEST-" + System.currentTimeMillis());
        payslip.setEmployee(employeeA);
        payslip.setPayrollDetail(detail);
        payslip.setPeriodName("September 2026");
        payslip.setIssueDate(LocalDate.now());
        payslip.setStatus("GENERATED");
        payslip = payslipRepository.save(payslip);

        mockMvc.perform(get("/api/payroll/payslips/" + payslip.getId())
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("14. Employee B cannot view Employee A's benefit direct ID")
    void testEmployeeCannotViewOtherEmployeeBenefitDirectId() throws Exception {
        EmployeeBenefit benefit = new EmployeeBenefit();
        benefit.setEmployee(employeeA);
        benefit.setBenefitType("Health Insurance");
        benefit.setAmount(new BigDecimal("12000.00"));
        benefit.setFrequency("MONTHLY");
        benefit.setEffectiveDate(LocalDate.now());
        benefit.setStatus("ACTIVE");
        benefit = benefitRepository.save(benefit);

        mockMvc.perform(get("/api/payroll/benefits/" + benefit.getId())
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("15. Employee B cannot view Employee A's warning notice direct ID")
    void testEmployeeCannotViewOtherEmployeeWarningDirectId() throws Exception {
        WarningNotice warn = new WarningNotice();
        warn.setEmployee(employeeA);
        warn.setWarningLevel("FIRST_WRITTEN");
        warn.setWarningDate(LocalDate.now());
        warn.setReason("Safety breach");
        warn.setStatus("ACTIVE");
        warn = warningRepository.save(warn);

        mockMvc.perform(get("/api/compliance/warnings/" + warn.getId())
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("16. Employee B cannot view Employee A's disciplinary action direct ID")
    void testEmployeeCannotViewOtherEmployeeDisciplinaryDirectId() throws Exception {
        DisciplinaryAction disc = new DisciplinaryAction();
        disc.setEmployee(employeeA);
        disc.setActionType("Investigation");
        disc.setActionDate(LocalDate.now());
        disc.setDescription("Confidential misconduct inquiry");
        disc.setStatus("OPEN");
        disc = disciplinaryRepository.save(disc);

        mockMvc.perform(get("/api/compliance/disciplinary/" + disc.getId())
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("17. Employee B cannot view Employee A's personal goals direct ID")
    void testEmployeeCannotViewOtherEmployeeGoalDirectId() throws Exception {
        EmployeeGoal goal = new EmployeeGoal();
        goal.setEmployee(employeeA);
        goal.setGoalTitle("Leadership Certification");
        goal.setDeadline(LocalDate.now().plusMonths(2));
        goal.setProgressPercentage(30);
        goal.setStatus("IN_PROGRESS");
        goal = goalRepository.save(goal);

        mockMvc.perform(get("/api/performance/goals/" + goal.getId())
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("18. Employee B cannot view Employee A's supervisor feedback direct ID")
    void testEmployeeCannotViewOtherEmployeeFeedbackDirectId() throws Exception {
        SupervisorFeedback fb = new SupervisorFeedback();
        fb.setEmployee(employeeA);
        fb.setFeedbackType("Performance Review");
        fb.setFeedbackNotes("Detailed feedback notes");
        fb.setRating(4);
        fb = feedbackRepository.save(fb);

        mockMvc.perform(get("/api/performance/feedbacks/" + fb.getId())
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("19. Employee B cannot view Employee A's performance evaluation direct ID")
    void testEmployeeCannotViewOtherEmployeeEvaluationDirectId() throws Exception {
        PerformanceEvaluation eval = new PerformanceEvaluation();
        eval.setEmployee(employeeA);
        eval.setEvaluationPeriod("H1 2026");
        eval.setOverallScore(new BigDecimal("92.0"));
        eval.setEvaluationDate(LocalDate.now());
        eval = evaluationRepository.save(eval);

        mockMvc.perform(get("/api/performance/evaluations/" + eval.getId())
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("20. Employee B cannot view Employee A's profile direct ID")
    void testEmployeeCannotViewOtherEmployeeProfileDirectId() throws Exception {
        mockMvc.perform(get("/api/employees/" + employeeA.getId())
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("21. Broadcast notifications are visible to BOTH Employee A and Employee B")
    void testBroadcastNotificationVisibleToBothEmployees() throws Exception {
        Notification broadcast = new Notification();
        broadcast.setTitle("Public Holiday Schedule");
        broadcast.setMessage("Office operations closed this Friday.");
        broadcast.setType("ANNOUNCEMENT");
        broadcast = notificationRepository.save(broadcast);

        // Employee A retrieves it
        mockMvc.perform(get("/api/notifications")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empA@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Public Holiday Schedule')]").exists());

        // Employee B retrieves it
        mockMvc.perform(get("/api/notifications")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Public Holiday Schedule')]").exists());
    }

    @Test
    @DisplayName("22. Employee cannot manual clock in via POST /api/attendance/check-in")
    void testEmployeeCannotManualCheckIn() throws Exception {
        Map<String, Object> payload = Map.of("notes", "Attempting manual self check-in");
        mockMvc.perform(post("/api/attendance/check-in")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empA@lws.lk").roles("EMPLOYEE"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("23. Employee cannot manual clock out via POST /api/attendance/check-out")
    void testEmployeeCannotManualCheckOut() throws Exception {
        Map<String, Object> payload = Map.of("notes", "Attempting manual self check-out");
        mockMvc.perform(post("/api/attendance/check-out")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empA@lws.lk").roles("EMPLOYEE"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("24. Employee A can submit a grievance complaint successfully (PENDING status)")
    void testEmployeeSubmitComplaint() throws Exception {
        CreateComplaintRequest request = new CreateComplaintRequest();
        request.setTitle("Unscheduled Overtime Dispute");
        request.setCategory("Salary / Payroll");
        request.setDescription("Overtime hours worked on Saturday were not captured in the latest timesheet.");

        mockMvc.perform(post("/api/compliance/complaints")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empA@lws.lk").roles("EMPLOYEE"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.complaintCode").exists())
                .andExpect(jsonPath("$.title").value("Unscheduled Overtime Dispute"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.employee.id").value(employeeA.getId()));
    }

    @Test
    @DisplayName("25. Employee A can view their own complaints list via /api/compliance/complaints/my")
    void testEmployeeCanViewOwnComplaints() throws Exception {
        EmployeeComplaint complaint = new EmployeeComplaint();
        complaint.setEmployee(employeeA);
        complaint.setTitle("Workplace Equipment Request");
        complaint.setCategory("Workplace Issues");
        complaint.setDescription("Ergonomic chair requested for health reasons.");
        complaint.setStatus("PENDING");
        complaintRepository.save(complaint);

        mockMvc.perform(get("/api/compliance/complaints/my")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empA@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Workplace Equipment Request')]").exists());
    }

    @Test
    @DisplayName("26. Employee B CANNOT view Employee A's complaint via direct ID (403 Forbidden)")
    void testEmployeeCannotViewOtherEmployeeComplaint() throws Exception {
        EmployeeComplaint complaint = new EmployeeComplaint();
        complaint.setEmployee(employeeA);
        complaint.setTitle("Confidential Workplace Issue");
        complaint.setCategory("Workplace Issues");
        complaint.setDescription("Confidential notes.");
        complaint.setStatus("PENDING");
        complaint = complaintRepository.save(complaint);

        // Attempting via /api/compliance/complaints/my/{id}
        mockMvc.perform(get("/api/compliance/complaints/my/" + complaint.getId())
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());

        // Attempting via /api/compliance/complaints/{id}
        mockMvc.perform(get("/api/compliance/complaints/" + complaint.getId())
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empB@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("27. Unauthorized roles (IT_COORDINATOR, FINANCE_EXECUTIVE, OPERATIONS_MANAGER) cannot view confidential complaints")
    void testUnauthorizedRolesCannotAccessComplaintsManagement() throws Exception {
        mockMvc.perform(get("/api/compliance/complaints")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("it_user").roles("IT_COORDINATOR")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/compliance/complaints")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("fin_user").roles("FINANCE_EXECUTIVE")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/compliance/complaints")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("ops_user").roles("OPERATIONS_MANAGER")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("28. HR Manager can view all complaints, update status and submit HR response")
    void testHrManagerCanManageComplaints() throws Exception {
        EmployeeComplaint complaint = new EmployeeComplaint();
        complaint.setEmployee(employeeA);
        complaint.setTitle("Payroll Discrepancy Inquiry");
        complaint.setCategory("Salary / Payroll");
        complaint.setDescription("Allowance missing from month end payslip.");
        complaint.setStatus("PENDING");
        complaint = complaintRepository.save(complaint);

        // 1. HR Manager can list all complaints
        mockMvc.perform(get("/api/compliance/complaints")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("hr_admin").roles("HR_MANAGER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Payroll Discrepancy Inquiry')]").exists());

        // 2. HR Manager can update status
        UpdateComplaintStatusRequest statusReq = new UpdateComplaintStatusRequest();
        statusReq.setStatus("IN_PROGRESS");
        mockMvc.perform(patch("/api/compliance/complaints/" + complaint.getId() + "/status")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("hr_admin").roles("HR_MANAGER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        // 3. HR Manager can submit official response
        ComplaintResponseRequest responseReq = new ComplaintResponseRequest();
        responseReq.setAdminResponse("HR payroll department confirmed allowance was processed in arrears.");
        responseReq.setStatus("RESOLVED");
        mockMvc.perform(patch("/api/compliance/complaints/" + complaint.getId() + "/response")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("hr_admin").roles("HR_MANAGER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(responseReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.adminResponse").value("HR payroll department confirmed allowance was processed in arrears."))
                .andExpect(jsonPath("$.resolvedAt").isNotEmpty());
    }

    @Test
    @DisplayName("29. Complaint creation fails with 400 Bad Request if title or description is missing")
    void testComplaintValidationMissingFields() throws Exception {
        CreateComplaintRequest emptyTitleReq = new CreateComplaintRequest();
        emptyTitleReq.setTitle("");
        emptyTitleReq.setCategory("Workplace Issues");
        emptyTitleReq.setDescription("Some description");

        mockMvc.perform(post("/api/compliance/complaints")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("empA@lws.lk").roles("EMPLOYEE"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(emptyTitleReq)))
                .andExpect(status().isBadRequest());
    }
}
