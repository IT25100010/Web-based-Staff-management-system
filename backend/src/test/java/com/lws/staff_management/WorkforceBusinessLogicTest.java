package com.lws.staff_management;

import com.lws.staff_management.employee.Department;
import com.lws.staff_management.exception.BadRequestException;
import com.lws.staff_management.security.UserPrincipal;
import com.lws.staff_management.user.Role;
import com.lws.staff_management.user.User;
import com.lws.staff_management.workforce.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class WorkforceBusinessLogicTest {

    @Mock
    private ShiftRepository shiftRepository;
    @Mock
    private WorkforceAssignmentRepository assignmentRepository;
    @Mock
    private WorkLocationRepository locationRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private LeaveRequestRepository leaveRequestRepository;
    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private EmployeeTransferRepository transferRepository;
    @Mock
    private EmployeeReplacementRepository replacementRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private AuditLogRepository auditLogRepository;

    private WorkforceService workforceService;

    private Employee employeeA;
    private Employee employeeB;
    private Shift shiftMorning;
    private Shift shiftAfternoon;
    private WorkLocation location;
    private Department dept;
    private Position pos;

    private Shift buildShift(Long id, String name, String code, LocalTime start, LocalTime end, LocalDate date, int required, WorkLocation loc) {
        Shift s = new Shift();
        s.setId(id);
        s.setShiftName(name);
        s.setShiftCode(code);
        s.setStartTime(start);
        s.setEndTime(end);
        s.setShiftDate(date);
        s.setRequiredEmployees(required);
        s.setWorkLocation(loc);
        s.setStatus("SCHEDULED");
        return s;
    }

    @BeforeEach
    void setUp() {
        workforceService = new WorkforceService(
                shiftRepository,
                assignmentRepository,
                locationRepository,
                employeeRepository,
                leaveRequestRepository,
                attendanceRepository,
                transferRepository,
                replacementRepository,
                notificationRepository,
                auditLogRepository
        );

        dept = new Department("OPS", "Operations", "Terminal Operations");
        dept.setId(1L);

        pos = new Position("Crane Operator", dept, "Heavy machinery");
        pos.setId(1L);

        location = new WorkLocation("C-01", "Container Terminal 1", "Port Colombo", "Mr. Silva", "0771234567", 20, "ACTIVE");
        location.setId(10L);

        employeeA = new Employee();
        employeeA.setId(101L);
        employeeA.setEmployeeId("LK10000001");
        employeeA.setFirstName("Kamal");
        employeeA.setLastName("Perera");
        employeeA.setEmail("kamal.perera@gmail.com");
        employeeA.setEmploymentStatus("Active");
        employeeA.setDepartment(dept);
        employeeA.setPosition(pos);

        User userA = new User("Kamal Perera", "kamal.perera@gmail.com", "kamal.perera@gmail.com", "hashedpwd", Role.EMPLOYEE);
        userA.setId(201L);
        employeeA.setUser(userA);

        employeeB = new Employee();
        employeeB.setId(102L);
        employeeB.setEmployeeId("LK10000002");
        employeeB.setFirstName("Sunil");
        employeeB.setLastName("Silva");
        employeeB.setEmail("sunil.silva@gmail.com");
        employeeB.setEmploymentStatus("Active");
        employeeB.setDepartment(dept);
        employeeB.setPosition(pos);

        User userB = new User("Sunil Silva", "sunil.silva@gmail.com", "sunil.silva@gmail.com", "hashedpwd", Role.EMPLOYEE);
        userB.setId(202L);
        employeeB.setUser(userB);

        shiftMorning = buildShift(501L, "Morning Shift A", "SHF-M1", LocalTime.of(8, 0), LocalTime.of(16, 0), LocalDate.of(2026, 10, 15), 10, location);
        shiftAfternoon = buildShift(502L, "Afternoon Shift B", "SHF-A1", LocalTime.of(14, 0), LocalTime.of(22, 0), LocalDate.of(2026, 10, 15), 10, location);
    }

    @Test
    @DisplayName("1. Assign available employee -> success")
    void testAssignAvailableEmployee_Success() {
        when(employeeRepository.findById(101L)).thenReturn(Optional.of(employeeA));
        when(shiftRepository.findById(501L)).thenReturn(Optional.of(shiftMorning));
        when(assignmentRepository.findByShiftIdAndStatus(501L, "ASSIGNED")).thenReturn(Collections.emptyList());
        when(leaveRequestRepository.findApprovedLeavesOnDate(shiftMorning.getShiftDate())).thenReturn(Collections.emptyList());
        when(leaveRequestRepository.isEmployeeOnApprovedLeave(101L, shiftMorning.getShiftDate())).thenReturn(false);
        when(assignmentRepository.findByEmployeeIdAndAssignmentDate(101L, shiftMorning.getShiftDate())).thenReturn(Collections.emptyList());
        when(assignmentRepository.save(any(WorkforceAssignment.class))).thenAnswer(i -> i.getArgument(0));

        WorkforceAssignment assignment = workforceService.validateAndAssignEmployee(501L, 101L, shiftMorning.getShiftDate(), "ADMIN_USER");

        assertNotNull(assignment);
        assertEquals("ASSIGNED", assignment.getStatus());
        assertEquals(employeeA, assignment.getEmployee());
        assertEquals(shiftMorning, assignment.getShift());
        verify(assignmentRepository, times(1)).save(any(WorkforceAssignment.class));
    }

    @Test
    @DisplayName("2. Assign employee to overlapping shift -> rejected with clear conflict message")
    void testAssignEmployee_OverlappingShift_Rejected() {
        when(employeeRepository.findById(101L)).thenReturn(Optional.of(employeeA));
        when(shiftRepository.findById(502L)).thenReturn(Optional.of(shiftAfternoon)); // 14:00 - 22:00
        when(assignmentRepository.findByShiftIdAndStatus(502L, "ASSIGNED")).thenReturn(Collections.emptyList());
        when(leaveRequestRepository.findApprovedLeavesOnDate(shiftAfternoon.getShiftDate())).thenReturn(Collections.emptyList());
        when(leaveRequestRepository.isEmployeeOnApprovedLeave(101L, shiftAfternoon.getShiftDate())).thenReturn(false);

        // Existing assignment from 08:00 to 16:00 overlaps with 14:00 to 22:00
        WorkforceAssignment existingAsg = new WorkforceAssignment(employeeA, location, shiftMorning, shiftMorning.getShiftDate(), "ASSIGNED");
        when(assignmentRepository.findActiveAssignmentsForEmployeeOnDate(101L, shiftAfternoon.getShiftDate()))
                .thenReturn(List.of(existingAsg));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                workforceService.validateAndAssignEmployee(502L, 101L, shiftAfternoon.getShiftDate(), "ADMIN_USER"));

        assertTrue(ex.getMessage().contains("overlapping shift"));
        assertTrue(ex.getMessage().contains("08:00 to 16:00"));
    }

    @Test
    @DisplayName("3. Assign employee on approved leave -> rejected")
    void testAssignEmployee_OnApprovedLeave_Rejected() {
        when(employeeRepository.findById(101L)).thenReturn(Optional.of(employeeA));
        when(shiftRepository.findById(501L)).thenReturn(Optional.of(shiftMorning));
        when(assignmentRepository.findByShiftIdAndStatus(501L, "ASSIGNED")).thenReturn(Collections.emptyList());

        // Approved leave on shift date
        LeaveRequest leave = new LeaveRequest();
        leave.setEmployee(employeeA);
        leave.setStatus("APPROVED");
        leave.setStartDate(shiftMorning.getShiftDate());
        leave.setEndDate(shiftMorning.getShiftDate().plusDays(2));
        when(leaveRequestRepository.findApprovedLeavesOnDate(shiftMorning.getShiftDate())).thenReturn(List.of(leave));
        when(leaveRequestRepository.isEmployeeOnApprovedLeave(101L, shiftMorning.getShiftDate())).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                workforceService.validateAndAssignEmployee(501L, 101L, shiftMorning.getShiftDate(), "ADMIN_USER"));

        assertTrue(ex.getMessage().contains("approved leave"));
    }

    @Test
    @DisplayName("4. Duplicate same employee/shift assignment -> rejected")
    void testAssignEmployee_DuplicateAssignment_Rejected() {
        when(employeeRepository.findById(101L)).thenReturn(Optional.of(employeeA));
        when(shiftRepository.findById(501L)).thenReturn(Optional.of(shiftMorning));
        when(assignmentRepository.existsByEmployeeIdAndAssignmentDateAndShiftId(101L, shiftMorning.getShiftDate(), 501L)).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                workforceService.validateAndAssignEmployee(501L, 101L, shiftMorning.getShiftDate(), "ADMIN_USER"));

        assertTrue(ex.getMessage().contains("Duplicate Assignment"));
    }

    @Test
    @DisplayName("5. Available employees endpoint excludes unavailable employees")
    void testAvailableEmployees_ExcludesUnavailable() {
        when(shiftRepository.findById(501L)).thenReturn(Optional.of(shiftMorning));
        when(employeeRepository.findAll()).thenReturn(List.of(employeeA, employeeB));

        // Employee A is on approved leave
        LeaveRequest leaveA = new LeaveRequest();
        leaveA.setEmployee(employeeA);
        leaveA.setStatus("APPROVED");
        when(leaveRequestRepository.findApprovedLeavesOnDate(shiftMorning.getShiftDate())).thenReturn(List.of(leaveA));
        when(leaveRequestRepository.isEmployeeOnApprovedLeave(employeeA.getId(), shiftMorning.getShiftDate())).thenReturn(true);
        when(leaveRequestRepository.isEmployeeOnApprovedLeave(employeeB.getId(), shiftMorning.getShiftDate())).thenReturn(false);

        // Employee B has no leave and no overlapping shifts
        when(assignmentRepository.findByEmployeeIdAndAssignmentDate(employeeB.getId(), shiftMorning.getShiftDate()))
                .thenReturn(Collections.emptyList());
        when(assignmentRepository.findByShiftIdAndStatus(501L, "ASSIGNED")).thenReturn(Collections.emptyList());

        List<Map<String, Object>> available = workforceService.getAvailableEmployeesForShift(501L);

        assertEquals(1, available.size());
        assertEquals(employeeB.getId(), available.get(0).get("employeeId"));
    }

    @Test
    @DisplayName("6. Lower workload candidate ranks appropriately when otherwise equivalent")
    void testFairWorkloadOrdering_LowerWorkloadRanksHigher() {
        when(shiftRepository.findById(501L)).thenReturn(Optional.of(shiftMorning));
        when(employeeRepository.findAll()).thenReturn(List.of(employeeA, employeeB));
        when(leaveRequestRepository.findApprovedLeavesOnDate(any())).thenReturn(Collections.emptyList());
        when(assignmentRepository.findByShiftIdAndStatus(501L, "ASSIGNED")).thenReturn(Collections.emptyList());
        when(assignmentRepository.findByEmployeeIdAndAssignmentDate(anyLong(), any())).thenReturn(Collections.emptyList());

        // Employee A has 24 scheduled hours this week
        Shift pastShiftA = buildShift(601L, "S1", "C1", LocalTime.of(8, 0), LocalTime.of(16, 0), shiftMorning.getShiftDate().minusDays(1), 5, location);
        WorkforceAssignment asgA1 = new WorkforceAssignment(employeeA, location, pastShiftA, shiftMorning.getShiftDate().minusDays(1), "ASSIGNED");
        WorkforceAssignment asgA2 = new WorkforceAssignment(employeeA, location, pastShiftA, shiftMorning.getShiftDate().minusDays(2), "ASSIGNED");
        WorkforceAssignment asgA3 = new WorkforceAssignment(employeeA, location, pastShiftA, shiftMorning.getShiftDate().minusDays(3), "ASSIGNED");
        when(assignmentRepository.findByEmployeeIdAndAssignmentDateBetween(eq(employeeA.getId()), any(), any()))
                .thenReturn(List.of(asgA1, asgA2, asgA3)); // 3 * 8 = 24h

        // Employee B has 40 scheduled hours this week (higher workload)
        List<WorkforceAssignment> asgsB = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            asgsB.add(new WorkforceAssignment(employeeB, location, pastShiftA, shiftMorning.getShiftDate().minusDays(i), "ASSIGNED"));
        }
        when(assignmentRepository.findByEmployeeIdAndAssignmentDateBetween(eq(employeeB.getId()), any(), any()))
                .thenReturn(asgsB); // 5 * 8 = 40h

        List<Map<String, Object>> suggestions = workforceService.getAvailableEmployeesForShift(501L);

        assertEquals(2, suggestions.size());
        // Candidate A (24h) should rank higher than Candidate B (40h)
        Map<String, Object> first = suggestions.get(0);
        Map<String, Object> second = suggestions.get(1);

        assertEquals(employeeA.getId(), first.get("employeeId"), "Candidate A with lower workload should rank 1st");
        assertEquals(employeeB.getId(), second.get("employeeId"), "Candidate B with higher workload should rank 2nd");
        assertTrue((Double) first.get("score") > (Double) second.get("score"), "Lower workload candidate should have higher recommendation score");
    }

    @Test
    @DisplayName("7. Understaffed calculation: required 10, assigned 7 -> remaining 3 -> UNDERSTAFFED")
    void testStaffingStatus_Understaffed() {
        shiftMorning.setRequiredEmployees(10);
        when(assignmentRepository.countByShiftIdAndStatus(shiftMorning.getId(), "ASSIGNED")).thenReturn(7L);

        Map<String, Object> status = workforceService.calculateStaffingStatus(shiftMorning);

        assertEquals(10, status.get("requiredStaff"));
        assertEquals(7L, status.get("assignedStaff"));
        assertEquals(3, status.get("remainingStaff"));
        assertEquals("UNDERSTAFFED", status.get("status"));
    }

    @Test
    @DisplayName("8. Full staffing: required 10, assigned 10 -> remaining 0 -> FULLY_STAFFED")
    void testStaffingStatus_FullyStaffed() {
        shiftMorning.setRequiredEmployees(10);
        when(assignmentRepository.countByShiftIdAndStatus(shiftMorning.getId(), "ASSIGNED")).thenReturn(10L);

        Map<String, Object> status = workforceService.calculateStaffingStatus(shiftMorning);

        assertEquals(10, status.get("requiredStaff"));
        assertEquals(10L, status.get("assignedStaff"));
        assertEquals(0, status.get("remainingStaff"));
        assertEquals("FULLY_STAFFED", status.get("status"));
    }

    @Test
    @DisplayName("9. Overstaffed: required 10, assigned 11 -> remaining 0 -> OVERSTAFFED")
    void testStaffingStatus_Overstaffed() {
        shiftMorning.setRequiredEmployees(10);
        when(assignmentRepository.countByShiftIdAndStatus(shiftMorning.getId(), "ASSIGNED")).thenReturn(11L);

        Map<String, Object> status = workforceService.calculateStaffingStatus(shiftMorning);

        assertEquals(10, status.get("requiredStaff"));
        assertEquals(11L, status.get("assignedStaff"));
        assertEquals(0, status.get("remainingStaff"));
        assertEquals("OVERSTAFFED", status.get("status"));
    }

    @Test
    @DisplayName("10. Replacement suggestions exclude original/unavailable employee")
    void testReplacementSuggestions_ExcludesOriginalEmployee() {
        when(shiftRepository.findById(501L)).thenReturn(Optional.of(shiftMorning));
        when(employeeRepository.findById(employeeA.getId())).thenReturn(Optional.of(employeeA));
        when(employeeRepository.findAll()).thenReturn(List.of(employeeA, employeeB));
        when(leaveRequestRepository.findApprovedLeavesOnDate(any())).thenReturn(Collections.emptyList());
        when(assignmentRepository.findByShiftIdAndStatus(501L, "ASSIGNED")).thenReturn(Collections.emptyList());
        when(assignmentRepository.findByEmployeeIdAndAssignmentDate(anyLong(), any())).thenReturn(Collections.emptyList());
        when(assignmentRepository.findByEmployeeIdAndAssignmentDateBetween(anyLong(), any(), any())).thenReturn(Collections.emptyList());

        List<Map<String, Object>> replacements = workforceService.getReplacementSuggestions(501L, employeeA.getId());

        assertFalse(replacements.stream().anyMatch(r -> r.get("employeeId").equals(employeeA.getId())),
                "Original employee must be strictly excluded from replacement suggestions");
        assertTrue(replacements.stream().anyMatch(r -> r.get("employeeId").equals(employeeB.getId())),
                "Eligible replacement employee B should be included");
    }

    @Test
    @DisplayName("11. Replacement confirmation preserves history and updates assignment statuses")
    void testReplacementConfirmation_PreservesHistory() {
        when(shiftRepository.findById(501L)).thenReturn(Optional.of(shiftMorning));
        when(employeeRepository.findById(employeeA.getId())).thenReturn(Optional.of(employeeA));
        when(employeeRepository.findById(employeeB.getId())).thenReturn(Optional.of(employeeB));

        WorkforceAssignment oldAsg = new WorkforceAssignment(employeeA, location, shiftMorning, shiftMorning.getShiftDate(), "ASSIGNED");
        oldAsg.setId(881L);
        when(assignmentRepository.findByShiftIdAndStatus(501L, "ASSIGNED")).thenReturn(List.of(oldAsg));

        Map<String, Object> result = workforceService.confirmReplacement(501L, employeeA.getId(), employeeB.getId(), "Medical absence", "MANAGER_1");

        // Old assignment marked REPLACED
        assertEquals("REPLACED", oldAsg.getStatus());
        verify(assignmentRepository, times(1)).save(oldAsg);

        // New assignment created for replacement associate
        verify(assignmentRepository, times(1)).save(argThat(asg ->
                asg.getEmployee().getId().equals(employeeB.getId()) && "ASSIGNED".equals(asg.getStatus())
        ));

        // Audit log & replacement record saved
        verify(replacementRepository, times(1)).save(argThat(rep ->
                rep.getOriginalEmployee().getId().equals(employeeA.getId()) &&
                rep.getReplacementEmployee().getId().equals(employeeB.getId()) &&
                "COMPLETED".equals(rep.getStatus())
        ));
        assertEquals("COMPLETED", result.get("status"));
    }

    @Test
    @DisplayName("12. Employee can view own schedule resolved strictly from UserPrincipal")
    void testEmployeeOwnSchedule_ResolvedFromPrincipal() {
        UserPrincipal principal = UserPrincipal.create(employeeA.getUser());
        when(employeeRepository.findByUserId(principal.getId())).thenReturn(Optional.of(employeeA));

        WorkforceAssignment asg = new WorkforceAssignment(employeeA, location, shiftMorning, shiftMorning.getShiftDate(), "ASSIGNED");
        asg.setId(991L);
        when(assignmentRepository.findByEmployeeId(employeeA.getId())).thenReturn(List.of(asg));

        List<Map<String, Object>> schedule = workforceService.getEmployeeOwnSchedule(principal);

        assertEquals(1, schedule.size());
        assertEquals(shiftMorning.getShiftName(), schedule.get(0).get("shiftName"));
        assertEquals("Container Terminal 1", schedule.get(0).get("workLocation"));
    }

    @Test
    @DisplayName("13. Employee cannot access schedule without authentication")
    void testEmployeeOwnSchedule_Unauthenticated_Rejected() {
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                workforceService.getEmployeeOwnSchedule(null));
        assertTrue(ex.getMessage().contains("Unauthenticated access"));
    }
}
