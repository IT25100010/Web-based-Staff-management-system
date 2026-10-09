package com.lws.staff_management;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lws.staff_management.attendance.Attendance;
import com.lws.staff_management.attendance.AttendanceRepository;
import com.lws.staff_management.attendance.LeaveRequest;
import com.lws.staff_management.attendance.LeaveRequestRepository;
import com.lws.staff_management.attendance.OvertimeRecord;
import com.lws.staff_management.attendance.OvertimeRepository;
import com.lws.staff_management.compliance.CompanyPolicy;
import com.lws.staff_management.compliance.CompanyPolicyRepository;
import com.lws.staff_management.compliance.WarningNotice;
import com.lws.staff_management.compliance.WarningNoticeRepository;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.notification.Notification;
import com.lws.staff_management.notification.NotificationRepository;
import com.lws.staff_management.payroll.Payroll;
import com.lws.staff_management.payroll.PayrollDetail;
import com.lws.staff_management.payroll.PayrollDetailRepository;
import com.lws.staff_management.payroll.PayrollRepository;
import com.lws.staff_management.payroll.Payslip;
import com.lws.staff_management.payroll.PayslipRepository;
import com.lws.staff_management.performance.KPI;
import com.lws.staff_management.performance.KPIRepository;
import com.lws.staff_management.performance.KPIService;
import com.lws.staff_management.performance.KPIType;
import com.lws.staff_management.user.Role;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import com.lws.staff_management.workforce.StaffRecall;
import com.lws.staff_management.workforce.StaffRecallRepository;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class TargetedNotificationsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private KPIRepository kpiRepository;

    @Autowired
    private KPIService kpiService;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private OvertimeRepository overtimeRepository;

    @Autowired
    private PayrollRepository payrollRepository;

    @Autowired
    private PayrollDetailRepository payrollDetailRepository;

    @Autowired
    private PayslipRepository payslipRepository;

    @Autowired
    private WarningNoticeRepository warningRepository;

    @Autowired
    private StaffRecallRepository staffRecallRepository;

    @Autowired
    private CompanyPolicyRepository policyRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private JavaMailSender mailSender;

    private User userA;
    private User userB;
    private Employee employeeA;
    private Employee employeeB;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();

        // Ensure User & Employee A
        if (userRepository.findByEmail("empA_test@lws.lk").isEmpty()) {
            userA = userRepository.save(new User("empA_test@lws.lk", "empA_test@lws.lk", passwordEncoder.encode("Pass123"), "Emp A", Role.EMPLOYEE));
            employeeA = new Employee();
            employeeA.setEmployeeId("EMP_TEST_A");
            employeeA.setFirstName("Alice");
            employeeA.setLastName("Silva");
            employeeA.setNic("199100000011");
            employeeA.setPhone("0771122331");
            employeeA.setEmail("empA_test@lws.lk");
            employeeA.setEmploymentStatus("Active");
            employeeA.setUser(userA);
            employeeA = employeeRepository.save(employeeA);
        } else {
            userA = userRepository.findByEmail("empA_test@lws.lk").get();
            employeeA = employeeRepository.findByEmail("empA_test@lws.lk").get();
        }

        // Ensure User & Employee B
        if (userRepository.findByEmail("empB_test@lws.lk").isEmpty()) {
            userB = userRepository.save(new User("empB_test@lws.lk", "empB_test@lws.lk", passwordEncoder.encode("Pass123"), "Emp B", Role.EMPLOYEE));
            employeeB = new Employee();
            employeeB.setEmployeeId("EMP_TEST_B");
            employeeB.setFirstName("Bob");
            employeeB.setLastName("Perera");
            employeeB.setNic("199200000022");
            employeeB.setPhone("0779988772");
            employeeB.setEmail("empB_test@lws.lk");
            employeeB.setEmploymentStatus("Active");
            employeeB.setUser(userB);
            employeeB = employeeRepository.save(employeeB);
        } else {
            userB = userRepository.findByEmail("empB_test@lws.lk").get();
            employeeB = employeeRepository.findByEmail("empB_test@lws.lk").get();
        }
    }

    @Test
    @DisplayName("1. Unauthenticated notification list access returns 401 Unauthorized (never leaks notifications)")
    void testUnauthenticatedAccessReturns401() throws Exception {
        // Save a private notification
        Notification notif = new Notification(employeeA, userA, "Secret Salary Notice", "Private details", "INFO", "/payroll");
        notificationRepository.save(notif);

        // Anonymous request must return 401 Unauthorized
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("2. Direct notification access security (Employee A cannot read, mark-read, or delete Employee B's notification)")
    void testDirectNotificationAccessForbiddenForNonOwner() throws Exception {
        Notification notifB = new Notification(employeeB, userB, "Confidential Disciplinary", "Private matter", "WARNING", "/discipline");
        notifB = notificationRepository.save(notifB);

        // Employee A tries GET -> 403 Forbidden
        mockMvc.perform(get("/api/notifications/" + notifB.getId())
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());

        // Employee A tries PATCH /read -> 403 Forbidden
        mockMvc.perform(patch("/api/notifications/" + notifB.getId() + "/read")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());

        // Employee A tries PUT /read -> 403 Forbidden
        mockMvc.perform(put("/api/notifications/" + notifB.getId() + "/read")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());

        // Employee A tries DELETE -> 403 Forbidden
        mockMvc.perform(delete("/api/notifications/" + notifB.getId())
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());

        // Employee B (owner) can GET -> 200 OK
        mockMvc.perform(get("/api/notifications/" + notifB.getId())
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Confidential Disciplinary"));

        // Employee B can mark as read -> 200 OK
        mockMvc.perform(patch("/api/notifications/" + notifB.getId() + "/read")
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk());

        // Verified through GET that read is true
        mockMvc.perform(get("/api/notifications/" + notifB.getId())
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));

        // Employee B can delete -> 200 OK
        mockMvc.perform(delete("/api/notifications/" + notifB.getId())
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("3. KPI MCQ assignment notification is targeted only to Employee A")
    void testKpiMcqAssignmentNotificationIsolation() throws Exception {
        KPI kpi = new KPI();
        kpi.setName("Q4 Health & Safety MCQ");
        kpi.setKpiType(KPIType.MCQ_ASSESSMENT);
        kpi.setTargetValue("Pass 50%");
        kpi.setEvaluationCriteria("Safety Assessment");
        kpi.setStatus("ACTIVE");
        kpi.setEndDate(LocalDate.now().plusDays(7));
        kpi.setMaxScore(BigDecimal.valueOf(100));
        kpi = kpiRepository.save(kpi);

        // Assign only to Employee A
        kpiService.assignEmployees(kpi.getId(), List.of(employeeA.getId()));

        // Employee A sees "New KPI Assessment Assigned"
        mockMvc.perform(get("/api/notifications")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'New KPI Assessment Assigned')]").exists());

        // Employee B does NOT see it
        mockMvc.perform(get("/api/notifications")
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'New KPI Assessment Assigned')]").doesNotExist());
    }

    @Test
    @DisplayName("4. Workshop assignment notification is targeted only to Employee B")
    void testWorkshopAssignmentNotificationIsolation() throws Exception {
        KPI workshop = new KPI();
        workshop.setName("Advanced Machine Handling Workshop");
        workshop.setKpiType(KPIType.WORKSHOP);
        workshop.setTargetValue("Attendance");
        workshop.setEvaluationCriteria("Practical Workshop");
        workshop.setStatus("ACTIVE");
        workshop.setStartDate(LocalDate.now().plusDays(3));
        workshop.setMaxScore(BigDecimal.valueOf(100));
        workshop = kpiRepository.save(workshop);

        // Assign only to Employee B
        kpiService.assignEmployees(workshop.getId(), List.of(employeeB.getId()));

        // Employee B sees "New Workshop Assigned"
        mockMvc.perform(get("/api/notifications")
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'New Workshop Assigned')]").exists());

        // Employee A does NOT see it
        mockMvc.perform(get("/api/notifications")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'New Workshop Assigned')]").doesNotExist());
    }

    @Test
    @DisplayName("5. Leave approval for A notifies A only, Leave rejection for B notifies B only")
    void testLeaveApprovalAndRejectionNotificationIsolation() throws Exception {
        // Leave request for Employee A
        LeaveRequest leaveA = new LeaveRequest();
        leaveA.setEmployee(employeeA);
        leaveA.setLeaveType("ANNUAL");
        leaveA.setStartDate(LocalDate.now().plusDays(10));
        leaveA.setEndDate(LocalDate.now().plusDays(12));
        leaveA.setStatus("PENDING");
        leaveA.setReason("Vacation");
        leaveA = leaveRequestRepository.save(leaveA);

        // HR Manager approves Employee A's leave
        mockMvc.perform(put("/api/attendance/leaves/" + leaveA.getId() + "/approve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("remarks", "Approved by HR")))
                .with(user("hr@lws.lk").roles("HR_MANAGER")))
                .andExpect(status().isOk());

        // Employee A sees "Leave Request Approved"
        mockMvc.perform(get("/api/notifications")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Leave Request Approved')]").exists());

        // Employee B does NOT see Employee A's approval
        mockMvc.perform(get("/api/notifications")
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Leave Request Approved')]").doesNotExist());

        // Leave request for Employee B
        LeaveRequest leaveB = new LeaveRequest();
        leaveB.setEmployee(employeeB);
        leaveB.setLeaveType("CASUAL");
        leaveB.setStartDate(LocalDate.now().plusDays(15));
        leaveB.setEndDate(LocalDate.now().plusDays(16));
        leaveB.setStatus("PENDING");
        leaveB.setReason("Personal");
        leaveB = leaveRequestRepository.save(leaveB);

        // HR Manager rejects Employee B's leave
        mockMvc.perform(put("/api/attendance/leaves/" + leaveB.getId() + "/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("remarks", "Peak period conflict")))
                .with(user("hr@lws.lk").roles("HR_MANAGER")))
                .andExpect(status().isOk());

        // Employee B sees "Leave Request Rejected"
        mockMvc.perform(get("/api/notifications")
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Leave Request Rejected')]").exists());

        // Employee A does NOT see Employee B's rejection
        mockMvc.perform(get("/api/notifications")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Leave Request Rejected')]").doesNotExist());
    }

    @Test
    @DisplayName("6. Overtime approval for B notifies B only")
    void testOvertimeApprovalNotificationIsolation() throws Exception {
        OvertimeRecord otB = new OvertimeRecord();
        otB.setEmployee(employeeB);
        otB.setOvertimeDate(LocalDate.now());
        otB.setHours(BigDecimal.valueOf(2.5));
        otB.setHourlyRate(BigDecimal.valueOf(500));
        otB.setMultiplier(BigDecimal.valueOf(1.5));
        otB.setStatus("PENDING");
        otB = overtimeRepository.save(otB);

        // HR Manager approves Overtime for Employee B
        Map<String, Object> updatePayload = Map.of("status", "APPROVED");
        mockMvc.perform(put("/api/attendance/overtime/" + otB.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updatePayload))
                .with(user("hr@lws.lk").roles("HR_MANAGER")))
                .andExpect(status().isOk());

        // Employee B sees "Overtime Approved"
        mockMvc.perform(get("/api/notifications")
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Overtime Approved')]").exists());

        // Employee A does NOT see it
        mockMvc.perform(get("/api/notifications")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Overtime Approved')]").doesNotExist());
    }

    @Test
    @DisplayName("7. Finalized Payroll / Payslip notifies Employee A only")
    void testPayslipAvailableNotificationIsolation() throws Exception {
        Payroll payroll = new Payroll();
        payroll.setPeriodName("October 2026");
        payroll.setPayrollMonth(10);
        payroll.setPayrollYear(2026);
        payroll.setStatus("DRAFT");
        payroll = payrollRepository.save(payroll);

        PayrollDetail detailA = new PayrollDetail();
        detailA.setPayroll(payroll);
        detailA.setEmployee(employeeA);
        detailA.setGrossSalary(BigDecimal.valueOf(100000));
        detailA.setNetSalary(BigDecimal.valueOf(90000));
        detailA = payrollDetailRepository.save(detailA);

        Payslip payslipA = new Payslip();
        payslipA.setPayrollDetail(detailA);
        payslipA.setEmployee(employeeA);
        payslipA.setPeriodName("October 2026");
        payslipA.setPayslipNumber("PS-202610-001");
        payslipA.setStatus("DRAFT");
        payslipRepository.save(payslipA);

        // HR Manager finalizes payroll
        mockMvc.perform(put("/api/payroll/payrolls/" + payroll.getId() + "/finalize")
                .with(user("hr@lws.lk").roles("HR_MANAGER")))
                .andExpect(status().isOk());

        // Employee A sees "Payslip Available"
        mockMvc.perform(get("/api/notifications")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Payslip Available')]").exists());

        // Employee B does NOT see it
        mockMvc.perform(get("/api/notifications")
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Payslip Available')]").doesNotExist());
    }

    @Test
    @DisplayName("8. Warning notice notifies Employee B only")
    void testWarningNoticeNotificationIsolation() throws Exception {
        Map<String, Object> warningPayload = new HashMap<>();
        warningPayload.put("employeeId", employeeB.getId());
        warningPayload.put("warningLevel", "FIRST");
        warningPayload.put("warningDate", LocalDate.now().toString());
        warningPayload.put("reason", "Tardiness");
        warningPayload.put("actionRequired", "Arrive on time");

        // HR Manager issues warning to Employee B
        mockMvc.perform(post("/api/compliance/warnings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(warningPayload))
                .with(user("hr@lws.lk").roles("HR_MANAGER")))
                .andExpect(status().isOk());

        // Employee B sees "Official Warning Notice Issued"
        mockMvc.perform(get("/api/notifications")
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Official Warning Notice Issued')]").exists());

        // Employee A does NOT see Employee B's warning
        mockMvc.perform(get("/api/notifications")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Official Warning Notice Issued')]").doesNotExist());
    }

    @Test
    @DisplayName("9. Targeted staff recall notifies Employee A only")
    void testTargetedRecallNotificationIsolation() throws Exception {
        Map<String, Object> recallPayload = new HashMap<>();
        recallPayload.put("recallTitle", "Urgent Warehouse Shift");
        recallPayload.put("recallDate", LocalDate.now().toString());
        recallPayload.put("recallTime", "15:00");
        recallPayload.put("location", "Sector 3");
        recallPayload.put("priority", "HIGH");
        recallPayload.put("reason", "Unexpected shipment");
        recallPayload.put("isBroadcast", false);
        recallPayload.put("recipientIds", List.of(employeeA.getId()));

        mockMvc.perform(post("/api/workforce/recalls")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(recallPayload))
                .with(user("ops@lws.lk").roles("OPERATIONS_MANAGER")))
                .andExpect(status().isOk());

        // Employee A sees recall notification
        mockMvc.perform(get("/api/notifications")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == '🚨 Emergency Staff Recall: Urgent Warehouse Shift')]").exists());

        // Employee B does NOT see it
        mockMvc.perform(get("/api/notifications")
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == '🚨 Emergency Staff Recall: Urgent Warehouse Shift')]").doesNotExist());
    }

    @Test
    @DisplayName("10. Broadcast policy notification is visible to both Employee A and Employee B, with independent read status")
    void testBroadcastPolicyNotificationVisibleToBoth() throws Exception {
        Map<String, Object> policyPayload = new HashMap<>();
        policyPayload.put("title", "Updated IT Security Standard 2026");
        policyPayload.put("category", "SECURITY");
        policyPayload.put("content", "All staff must lock workstations.");
        policyPayload.put("effectiveDate", LocalDate.now().toString());

        // Post company-wide policy (no departmentId specified)
        mockMvc.perform(post("/api/compliance/policies")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(policyPayload))
                .with(user("hr@lws.lk").roles("HR_MANAGER")))
                .andExpect(status().isOk());

        // Both Employee A and Employee B see the broadcast notification
        mockMvc.perform(get("/api/notifications")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'New Company Policy')]").exists());

        mockMvc.perform(get("/api/notifications")
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'New Company Policy')]").exists());

        // Get the broadcast notification ID
        Notification broadcastNotif = notificationRepository.findAll().stream()
                .filter(n -> "New Company Policy".equals(n.getTitle()))
                .findFirst().orElseThrow();

        // Employee A marks broadcast notification as read
        mockMvc.perform(patch("/api/notifications/" + broadcastNotif.getId() + "/read")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk());

        // Employee A sees it as read
        mockMvc.perform(get("/api/notifications")
                .with(user("empA_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'New Company Policy')].read", hasItem(true)));

        // Employee B still sees it as unread
        mockMvc.perform(get("/api/notifications")
                .with(user("empB_test@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'New Company Policy')].read", hasItem(false)));
    }
}
