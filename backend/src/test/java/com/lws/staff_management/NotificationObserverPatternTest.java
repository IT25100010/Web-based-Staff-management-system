package com.lws.staff_management;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lws.staff_management.attendance.Attendance;
import com.lws.staff_management.attendance.LeaveRequest;
import com.lws.staff_management.attendance.LeaveRequestRepository;
import com.lws.staff_management.attendance.OvertimeRecord;
import com.lws.staff_management.attendance.OvertimeRepository;
import com.lws.staff_management.compliance.CompanyPolicyRepository;
import com.lws.staff_management.compliance.WarningNoticeRepository;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.notification.Notification;
import com.lws.staff_management.notification.NotificationRepository;
import com.lws.staff_management.notification.event.NotificationEvent;
import com.lws.staff_management.notification.observer.DatabaseNotificationObserver;
import com.lws.staff_management.notification.observer.NotificationObserver;
import com.lws.staff_management.notification.publisher.NotificationPublisher;
import com.lws.staff_management.payroll.Payroll;
import com.lws.staff_management.payroll.PayrollDetail;
import com.lws.staff_management.payroll.PayrollDetailRepository;
import com.lws.staff_management.payroll.PayrollRepository;
import com.lws.staff_management.payroll.Payslip;
import com.lws.staff_management.payroll.PayslipRepository;
import com.lws.staff_management.user.Role;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
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
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class NotificationObserverPatternTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NotificationPublisher notificationPublisher;

    @Autowired
    private DatabaseNotificationObserver databaseObserver;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

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

        if (userRepository.findByEmail("observer_a@lws.lk").isEmpty()) {
            userA = userRepository.save(new User("observer_a@lws.lk", "observer_a@lws.lk", passwordEncoder.encode("Pass123"), "Observer User A", Role.EMPLOYEE));
            employeeA = new Employee();
            employeeA.setEmployeeId("OBS_EMP_A");
            employeeA.setFirstName("Alice");
            employeeA.setLastName("Observer");
            employeeA.setNic("199300000001");
            employeeA.setPhone("0773300111");
            employeeA.setEmail("observer_a@lws.lk");
            employeeA.setEmploymentStatus("Active");
            employeeA.setUser(userA);
            employeeA = employeeRepository.save(employeeA);
        } else {
            userA = userRepository.findByEmail("observer_a@lws.lk").get();
            employeeA = employeeRepository.findByEmail("observer_a@lws.lk").get();
        }

        if (userRepository.findByEmail("observer_b@lws.lk").isEmpty()) {
            userB = userRepository.save(new User("observer_b@lws.lk", "observer_b@lws.lk", passwordEncoder.encode("Pass123"), "Observer User B", Role.EMPLOYEE));
            employeeB = new Employee();
            employeeB.setEmployeeId("OBS_EMP_B");
            employeeB.setFirstName("Bob");
            employeeB.setLastName("Observer");
            employeeB.setNic("199400000002");
            employeeB.setPhone("0774400222");
            employeeB.setEmail("observer_b@lws.lk");
            employeeB.setEmploymentStatus("Active");
            employeeB.setUser(userB);
            employeeB = employeeRepository.save(employeeB);
        } else {
            userB = userRepository.findByEmail("observer_b@lws.lk").get();
            employeeB = employeeRepository.findByEmail("observer_b@lws.lk").get();
        }
    }

    @Test
    @DisplayName("Observer Pattern: Custom observer registers, receives update on publish, and can unregister")
    void testObserverRegistrationAndNotification() {
        AtomicInteger eventCount = new AtomicInteger(0);
        NotificationObserver customObserver = event -> eventCount.incrementAndGet();

        // Register custom observer with publisher
        notificationPublisher.registerObserver(customObserver);

        // Publish event
        NotificationEvent event = NotificationEvent.targeted(employeeA, "Observer Test", "Testing pattern", "INFO", "/test");
        notificationPublisher.publish(event);

        assertEquals(1, eventCount.get(), "Custom observer should receive exactly 1 event invocation");

        // Unregister observer
        notificationPublisher.removeObserver(customObserver);
        notificationPublisher.publish(event);

        assertEquals(1, eventCount.get(), "Unregistered observer should not receive subsequent events");
    }

    @Test
    @DisplayName("1. Leave Approved: published via Observer -> exactly 1 notification to leave owner only")
    void testLeaveApprovedObserverFlow() throws Exception {
        LeaveRequest leave = new LeaveRequest();
        leave.setEmployee(employeeA);
        leave.setLeaveType("CASUAL");
        leave.setReason("Medical appointment");
        leave.setStartDate(LocalDate.now().plusDays(2));
        leave.setEndDate(LocalDate.now().plusDays(3));
        leave.setStatus("PENDING");
        leave = leaveRequestRepository.save(leave);

        // Manager approves leave
        mockMvc.perform(put("/api/attendance/leaves/" + leave.getId() + "/approve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("remarks", "Approved")))
                .with(user("hr@lws.lk").roles("HR_MANAGER")))
                .andExpect(status().isOk());

        // Employee A sees exactly 1 notification
        mockMvc.perform(get("/api/notifications")
                .with(user("observer_a@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Leave Request Approved"));

        // Employee B does NOT see it
        mockMvc.perform(get("/api/notifications")
                .with(user("observer_b@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("2. OT Rejected: published via Observer -> exactly 1 notification to OT owner only")
    void testOvertimeRejectedObserverFlow() throws Exception {
        OvertimeRecord ot = new OvertimeRecord();
        ot.setEmployee(employeeB);
        ot.setOvertimeDate(LocalDate.now());
        ot.setHours(BigDecimal.valueOf(3.0));
        ot.setHourlyRate(BigDecimal.valueOf(400));
        ot.setMultiplier(BigDecimal.valueOf(1.5));
        ot.setStatus("PENDING");
        ot = overtimeRepository.save(ot);

        // Manager rejects OT
        Map<String, Object> updatePayload = Map.of("status", "REJECTED");
        mockMvc.perform(put("/api/attendance/overtime/" + ot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updatePayload))
                .with(user("hr@lws.lk").roles("HR_MANAGER")))
                .andExpect(status().isOk());

        // Employee B sees exactly 1 notification
        mockMvc.perform(get("/api/notifications")
                .with(user("observer_b@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Overtime Rejected"));

        // Employee A does NOT see it
        mockMvc.perform(get("/api/notifications")
                .with(user("observer_a@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("3. Payslip Available: published via Observer -> exactly 1 notification to payslip owner only")
    void testPayslipAvailableObserverFlow() throws Exception {
        Payroll payroll = new Payroll();
        payroll.setPeriodName("November 2026");
        payroll.setPayrollMonth(11);
        payroll.setPayrollYear(2026);
        payroll.setStatus("DRAFT");
        payroll = payrollRepository.save(payroll);

        PayrollDetail detail = new PayrollDetail();
        detail.setPayroll(payroll);
        detail.setEmployee(employeeA);
        detail.setGrossSalary(BigDecimal.valueOf(80000));
        detail.setNetSalary(BigDecimal.valueOf(75000));
        detail = payrollDetailRepository.save(detail);

        Payslip payslip = new Payslip();
        payslip.setPayrollDetail(detail);
        payslip.setEmployee(employeeA);
        payslip.setPeriodName("November 2026");
        payslip.setPayslipNumber("PS-202611-001");
        payslip.setStatus("DRAFT");
        payslipRepository.save(payslip);

        // Finalize payroll
        mockMvc.perform(put("/api/payroll/payrolls/" + payroll.getId() + "/finalize")
                .with(user("hr@lws.lk").roles("HR_MANAGER")))
                .andExpect(status().isOk());

        // Employee A sees exactly 1 notification
        mockMvc.perform(get("/api/notifications")
                .with(user("observer_a@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Payslip Available"));

        // Employee B does NOT see it
        mockMvc.perform(get("/api/notifications")
                .with(user("observer_b@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("4. Warning Issued: published via Observer -> exactly 1 notification to warned employee only")
    void testWarningIssuedObserverFlow() throws Exception {
        Map<String, Object> warningPayload = Map.of(
                "employeeId", employeeB.getId(),
                "warningLevel", "FIRST",
                "warningDate", LocalDate.now().toString(),
                "reason", "Unauthorized Absence",
                "actionRequired", "Submit medical report"
        );

        mockMvc.perform(post("/api/compliance/warnings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(warningPayload))
                .with(user("hr@lws.lk").roles("HR_MANAGER")))
                .andExpect(status().isOk());

        // Employee B sees warning
        mockMvc.perform(get("/api/notifications")
                .with(user("observer_b@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Official Warning Notice Issued')]").exists());

        // Employee A does NOT see it
        mockMvc.perform(get("/api/notifications")
                .with(user("observer_a@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Official Warning Notice Issued')]").doesNotExist());
    }

    @Test
    @DisplayName("5. Targeted Recall: published via Observer -> selected employee only")
    void testTargetedRecallObserverFlow() throws Exception {
        Map<String, Object> recallPayload = Map.of(
                "recallTitle", "Special Security Protocol",
                "recallDate", LocalDate.now().toString(),
                "recallTime", "14:00",
                "location", "Headquarters",
                "priority", "HIGH",
                "reason", "Audit inspection",
                "isBroadcast", false,
                "recipientIds", List.of(employeeA.getId())
        );

        mockMvc.perform(post("/api/workforce/recalls")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(recallPayload))
                .with(user("ops@lws.lk").roles("OPERATIONS_MANAGER")))
                .andExpect(status().isOk());

        // Employee A sees recall
        mockMvc.perform(get("/api/notifications")
                .with(user("observer_a@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title", containsString("Special Security Protocol")));

        // Employee B does NOT see it
        mockMvc.perform(get("/api/notifications")
                .with(user("observer_b@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("6. Broadcast Announcement/Policy: published via Observer -> visible to all eligible employees")
    void testBroadcastPolicyObserverFlow() throws Exception {
        Map<String, Object> policyPayload = Map.of(
                "title", "Remote Work Guidelines 2026",
                "category", "OPERATIONS",
                "content", "Remote work policies for 2026.",
                "effectiveDate", LocalDate.now().toString()
        );

        mockMvc.perform(post("/api/compliance/policies")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(policyPayload))
                .with(user("hr@lws.lk").roles("HR_MANAGER")))
                .andExpect(status().isOk());

        // Both Employee A and B see it
        mockMvc.perform(get("/api/notifications")
                .with(user("observer_a@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'New Company Policy')]").exists());

        mockMvc.perform(get("/api/notifications")
                .with(user("observer_b@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'New Company Policy')]").exists());
    }

    @Test
    @DisplayName("7. Security: Employee A cannot view, mark-as-read, or delete Employee B's notification ID (403 Forbidden)")
    void testSecurityOwnershipEnforced() throws Exception {
        Notification notifB = new Notification(employeeB, userB, "Private Notice", "Confidential", "INFO", "/private");
        notifB = notificationRepository.save(notifB);

        // Employee A tries GET -> 403 Forbidden
        mockMvc.perform(get("/api/notifications/" + notifB.getId())
                .with(user("observer_a@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());

        // Employee A tries PATCH /read -> 403 Forbidden
        mockMvc.perform(patch("/api/notifications/" + notifB.getId() + "/read")
                .with(user("observer_a@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());

        // Employee A tries DELETE -> 403 Forbidden
        mockMvc.perform(delete("/api/notifications/" + notifB.getId())
                .with(user("observer_a@lws.lk").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("8. Duplicate Prevention: Repeating the same notification event within 5 minutes does not create duplicate entries")
    void testDuplicateNotificationSuppressedByObserver() {
        NotificationEvent event = NotificationEvent.targeted(
                employeeA,
                "Duplicate Test Notice",
                "This message is sent twice",
                "INFO",
                "/test/dup"
        );

        // First publication
        notificationPublisher.publish(event);

        // Second publication immediately afterwards
        notificationPublisher.publish(event);

        // Verify only 1 notification is saved in the repository
        List<Notification> found = notificationRepository.findAll().stream()
                .filter(n -> "Duplicate Test Notice".equals(n.getTitle()))
                .toList();

        assertEquals(1, found.size(), "Observer must suppress duplicate notifications for the same employee and link within 5 minutes");
    }
}
