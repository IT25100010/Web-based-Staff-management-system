package com.lws.staff_management.attendance;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.exception.BadRequestException;
import com.lws.staff_management.exception.ResourceNotFoundException;
import com.lws.staff_management.security.UserPrincipal;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.lws.staff_management.workforce.Shift;
import com.lws.staff_management.workforce.ShiftRepository;
import com.lws.staff_management.workforce.WorkforceAssignment;
import com.lws.staff_management.workforce.WorkforceAssignmentRepository;
import com.lws.staff_management.notification.event.NotificationEvent;
import com.lws.staff_management.notification.publisher.NotificationPublisher;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final OvertimeRepository overtimeRepository;
    private final TimesheetRepository timesheetRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final ShiftRepository shiftRepository;
    private final WorkforceAssignmentRepository workforceAssignmentRepository;
    private final NotificationPublisher notificationPublisher;

    public AttendanceController(AttendanceRepository attendanceRepository,
                                LeaveRequestRepository leaveRequestRepository,
                                OvertimeRepository overtimeRepository,
                                TimesheetRepository timesheetRepository,
                                EmployeeRepository employeeRepository,
                                UserRepository userRepository,
                                ShiftRepository shiftRepository,
                                WorkforceAssignmentRepository workforceAssignmentRepository,
                                NotificationPublisher notificationPublisher) {
        this.attendanceRepository = attendanceRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.overtimeRepository = overtimeRepository;
        this.timesheetRepository = timesheetRepository;
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.shiftRepository = shiftRepository;
        this.workforceAssignmentRepository = workforceAssignmentRepository;
        this.notificationPublisher = notificationPublisher;
    }

    // Check-in (Restricted to authorized administrators/terminal integrations - manual employee self-service disabled)
    @PostMapping("/check-in")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> checkIn(@RequestBody Map<String, Object> payload,
                                     @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            throw new org.springframework.security.access.AccessDeniedException("Manual clock-in is disabled for employee self-service. Attendance must be logged via authorized biometric terminals or HR administrators.");
        }
        Long employeeId = getTargetEmployeeId(payload, currentUser);
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));

        LocalDate today = LocalDate.now();
        Optional<Attendance> existing = attendanceRepository.findByEmployeeIdAndAttendanceDate(employeeId, today);
        if (existing.isPresent()) {
            throw new BadRequestException("Attendance already checked in for today (" + today + ")");
        }

        Attendance attendance = new Attendance();
        attendance.setEmployee(employee);
        attendance.setAttendanceDate(today);
        attendance.setCheckInTime(LocalTime.now());
        attendance.setStatus(LocalTime.now().isAfter(LocalTime.of(8, 30)) ? "LATE" : "PRESENT");
        attendance.setNotes((String) payload.getOrDefault("notes", "Terminal/Admin check-in"));

        return ResponseEntity.ok(attendanceRepository.save(attendance));
    }

    // Check-out (Restricted to authorized administrators/terminal integrations - manual employee self-service disabled)
    @PostMapping("/check-out")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> checkOut(@RequestBody Map<String, Object> payload,
                                      @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            throw new org.springframework.security.access.AccessDeniedException("Manual clock-out is disabled for employee self-service. Attendance must be logged via authorized biometric terminals or HR administrators.");
        }
        Long employeeId = getTargetEmployeeId(payload, currentUser);
        LocalDate today = LocalDate.now();

        Attendance attendance = attendanceRepository.findByEmployeeIdAndAttendanceDate(employeeId, today)
                .orElseThrow(() -> new BadRequestException("No check-in record found for today to check out."));

        if (attendance.getCheckOutTime() != null) {
            throw new BadRequestException("Already checked out today at " + attendance.getCheckOutTime());
        }

        LocalTime checkOutTime = LocalTime.now();
        attendance.setCheckOutTime(checkOutTime);

        if (attendance.getCheckInTime() != null) {
            long minutes = Duration.between(attendance.getCheckInTime(), checkOutTime).toMinutes();
            if (minutes < 0) {
                minutes += 24 * 60; // shift crossed midnight
            }
            BigDecimal hours = BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
            attendance.setWorkingHours(hours);

            Employee emp = attendance.getEmployee();
            Double regHoursLimitDouble = (emp != null && emp.getPosition() != null && emp.getPosition().getRegularWorkingHoursPerDay() != null)
                    ? emp.getPosition().getRegularWorkingHoursPerDay() : 8.0;
            BigDecimal regLimit = BigDecimal.valueOf(regHoursLimitDouble).setScale(2, RoundingMode.HALF_UP);

            BigDecimal regularHours = hours.min(regLimit);
            BigDecimal otHours = hours.subtract(regLimit).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

            attendance.setRegularHours(regularHours);
            attendance.setOtHours(otHours);

            if (hours.compareTo(new BigDecimal("4.0")) < 0) {
                attendance.setStatus("HALF_DAY");
            }

            syncOvertimeRecord(emp, today, otHours);
        }

        return ResponseEntity.ok(attendanceRepository.save(attendance));
    }

    // Today's record for logged-in user
    @GetMapping("/today")
    public ResponseEntity<?> getTodayAttendance(@AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) return ResponseEntity.badRequest().body("Not authenticated");
        Optional<Employee> empOpt = employeeRepository.findByUserId(currentUser.getId());
        if (empOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("hasRecord", false));
        }
        Optional<Attendance> record = attendanceRepository.findByEmployeeIdAndAttendanceDate(empOpt.get().getId(), LocalDate.now());
        return ResponseEntity.ok(record.orElse(null));
    }

    // Lookup employee and today's attendance status for Clock In / Clock Out flows
    @GetMapping("/employee-today-status")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> getEmployeeTodayStatus(@RequestParam String employeeQuery) {
        if (employeeQuery == null || employeeQuery.trim().isEmpty()) {
            throw new BadRequestException("Employee ID or code is required.");
        }
        String q = employeeQuery.trim();
        Employee emp = employeeRepository.findByEmployeeId(q)
                .or(() -> {
                    try {
                        return employeeRepository.findById(Long.valueOf(q));
                    } catch (NumberFormatException e) {
                        return Optional.empty();
                    }
                })
                .or(() -> employeeRepository.findByEmailIgnoreCase(q))
                .or(() -> employeeRepository.findByNic(q))
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with ID/Code: " + q));

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        Optional<Attendance> todayRecord = attendanceRepository.findByEmployeeIdAndAttendanceDate(emp.getId(), today);

        Map<String, Object> resp = new HashMap<>();
        resp.put("employeeId", emp.getId());
        resp.put("employeeCode", emp.getEmployeeId());
        resp.put("employeeName", emp.getFullName());
        resp.put("department", emp.getDepartment() != null ? emp.getDepartment().getName() : "—");
        resp.put("position", emp.getPosition() != null ? emp.getPosition().getTitle() : "—");
        resp.put("regularWorkingHoursPerDay", (emp.getPosition() != null && emp.getPosition().getRegularWorkingHoursPerDay() != null)
                ? emp.getPosition().getRegularWorkingHoursPerDay() : 8.0);
        resp.put("otRatePerHour", (emp.getPosition() != null && emp.getPosition().getOtRatePerHour() != null)
                ? emp.getPosition().getOtRatePerHour() : BigDecimal.ZERO);
        resp.put("currentDate", today.toString());
        resp.put("currentTime", now.toString().substring(0, Math.min(8, now.toString().length())));

        if (todayRecord.isPresent()) {
            Attendance att = todayRecord.get();
            resp.put("hasRecord", true);
            resp.put("attendanceId", att.getId());
            resp.put("checkInTime", att.getCheckInTime() != null ? att.getCheckInTime().toString().substring(0, Math.min(8, att.getCheckInTime().toString().length())) : null);
            resp.put("checkOutTime", att.getCheckOutTime() != null ? att.getCheckOutTime().toString().substring(0, Math.min(8, att.getCheckOutTime().toString().length())) : null);
            resp.put("status", att.getStatus());

            boolean isOpen = att.getCheckInTime() != null && att.getCheckOutTime() == null;
            boolean isCompleted = att.getCheckOutTime() != null;
            resp.put("isOpen", isOpen);
            resp.put("isCompleted", isCompleted);

            if (isOpen && att.getCheckInTime() != null) {
                long minutes = Duration.between(att.getCheckInTime(), now).toMinutes();
                if (minutes < 0) minutes += 24 * 60;
                long h = minutes / 60;
                long m = minutes % 60;
                resp.put("currentWorkedDurationMinutes", minutes);
                resp.put("currentWorkedDuration", h + "h " + (m < 10 ? "0" + m : m) + "m");
            }

            if (isCompleted) {
                resp.put("workingHours", att.getWorkingHours());
                resp.put("regularHours", att.getRegularHours());
                resp.put("otHours", att.getOtHours());
                resp.put("totalWorkedFormatted", att.getTotalWorkedFormatted());
                resp.put("regularHoursFormatted", att.getRegularHoursFormatted());
                resp.put("otHoursFormatted", att.getOtHoursFormatted());
            }
        } else {
            resp.put("hasRecord", false);
            resp.put("isOpen", false);
            resp.put("isCompleted", false);
        }

        return ResponseEntity.ok(resp);
    }

    // Record attendance explicitly based on assigned shift and punctuality rules
    @PostMapping("/record")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> recordAttendance(@RequestBody Map<String, Object> payload) {
        // Resolve Employee: by ID or employee code (e.g. "LWS-001")
        Employee employee = null;
        if (payload.get("employeeId") != null) {
            String empParam = payload.get("employeeId").toString().trim();
            try {
                Long id = Long.valueOf(empParam);
                employee = employeeRepository.findById(id).orElse(null);
            } catch (NumberFormatException ignored) {}
            if (employee == null) {
                employee = employeeRepository.findByEmployeeId(empParam).orElse(null);
            }
        }
        if (employee == null) {
            throw new BadRequestException("Employee not found in registered records. Attendance can only be recorded for existing registered employees.");
        }

        // Attendance date
        LocalDate attDate = LocalDate.now();
        if (payload.get("attendanceDate") != null && !payload.get("attendanceDate").toString().trim().isEmpty()) {
            attDate = LocalDate.parse(payload.get("attendanceDate").toString().trim());
        }

        // Resolve Assigned Shift
        Shift assignedShift = null;
        if (payload.get("shiftId") != null && !payload.get("shiftId").toString().trim().isEmpty()) {
            try {
                Long shiftId = Long.valueOf(payload.get("shiftId").toString().trim());
                assignedShift = shiftRepository.findById(shiftId).orElse(null);
            } catch (NumberFormatException ignored) {}
        }
        if (assignedShift == null) {
            List<WorkforceAssignment> assignments = workforceAssignmentRepository.findByEmployeeIdAndAssignmentDate(employee.getId(), attDate);
            if (assignments.isEmpty()) {
                assignments = workforceAssignmentRepository.findByEmployeeId(employee.getId());
            }
            if (!assignments.isEmpty()) {
                assignedShift = assignments.get(0).getShift();
            }
        }
        if (assignedShift == null) {
            throw new BadRequestException("The employee is not assigned to any shift. An employee must have an assigned shift to determine working start and end time.");
        }

        // Check in / Check out times
        LocalTime checkIn = null;
        if (payload.get("checkInTime") != null && !payload.get("checkInTime").toString().trim().isEmpty()) {
            String timeStr = payload.get("checkInTime").toString().trim();
            if (timeStr.length() == 5) timeStr += ":00";
            checkIn = LocalTime.parse(timeStr);
        }

        LocalTime checkOut = null;
        if (payload.get("checkOutTime") != null && !payload.get("checkOutTime").toString().trim().isEmpty()) {
            String timeStr = payload.get("checkOutTime").toString().trim();
            if (timeStr.length() == 5) timeStr += ":00";
            checkOut = LocalTime.parse(timeStr);
        }

        // Calculate working hours
        BigDecimal workingHours = BigDecimal.ZERO;
        BigDecimal regularHours = BigDecimal.ZERO;
        BigDecimal otHours = BigDecimal.ZERO;

        Double regHoursLimitDouble = (employee.getPosition() != null && employee.getPosition().getRegularWorkingHoursPerDay() != null)
                ? employee.getPosition().getRegularWorkingHoursPerDay() : 8.0;
        BigDecimal regLimit = BigDecimal.valueOf(regHoursLimitDouble).setScale(2, RoundingMode.HALF_UP);

        if (checkIn != null && checkOut != null) {
            long minutes = Duration.between(checkIn, checkOut).toMinutes();
            if (minutes < 0) {
                minutes += 24 * 60; // shift crossed midnight
            }
            workingHours = BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
            regularHours = workingHours.min(regLimit);
            otHours = workingHours.subtract(regLimit).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        }

        // Determine status according to rules:
        // Present, Absent, Late, Leave, or Early Leave.
        // If employee checks in after shift start time -> Late.
        // If employee checks out before shift end time -> Early Leave.
        String status = payload.get("status") != null ? payload.get("status").toString().trim().toUpperCase() : "";
        if ("ABSENT".equalsIgnoreCase(status) || "LEAVE".equalsIgnoreCase(status)) {
            workingHours = BigDecimal.ZERO;
            regularHours = BigDecimal.ZERO;
            otHours = BigDecimal.ZERO;
        } else {
            boolean isLate = false;
            boolean isEarlyLeave = false;

            if (checkIn != null && assignedShift.getStartTime() != null) {
                if (checkIn.isAfter(assignedShift.getStartTime())) {
                    isLate = true;
                }
            }

            if (checkOut != null && assignedShift.getEndTime() != null) {
                if (checkOut.isBefore(assignedShift.getEndTime())) {
                    isEarlyLeave = true;
                }
            }

            if (isLate && !isEarlyLeave) {
                status = "LATE";
            } else if (isEarlyLeave && !isLate) {
                status = "EARLY_LEAVE";
            } else if (isLate && isEarlyLeave) {
                status = "LATE";
                if ("EARLY_LEAVE".equalsIgnoreCase(status)) {
                    status = "EARLY_LEAVE";
                }
            } else {
                status = "PRESENT";
            }
        }

        Optional<Attendance> existingOpt = attendanceRepository.findByEmployeeIdAndAttendanceDate(employee.getId(), attDate);
        Attendance attendance = existingOpt.orElseGet(Attendance::new);
        attendance.setEmployee(employee);
        attendance.setShift(assignedShift);
        attendance.setAttendanceDate(attDate);
        attendance.setCheckInTime(checkIn);
        attendance.setCheckOutTime(checkOut);
        attendance.setWorkingHours(workingHours);
        attendance.setRegularHours(regularHours);
        attendance.setOtHours(otHours);
        attendance.setStatus(status);
        attendance.setNotes((String) payload.getOrDefault("notes", "Shift attendance recorded"));

        Attendance saved = attendanceRepository.save(attendance);

        if (!"ABSENT".equalsIgnoreCase(status) && !"LEAVE".equalsIgnoreCase(status)) {
            syncOvertimeRecord(employee, attDate, otHours);
        }

        return ResponseEntity.ok(saved);
    }

    // Resolve assigned shift for employee
    @GetMapping("/employee/{id}/shift")
    public ResponseEntity<?> getEmployeeAssignedShift(@PathVariable Long id,
                                                        @RequestParam(required = false) String date,
                                                        @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long linkedId = getLinkedEmployeeIdOrNull(currentUser);
            if (linkedId == null || !linkedId.equals(id)) {
                throw new SecurityException("Forbidden: Cannot view shift schedule of another employee.");
            }
        }

        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        LocalDate lookupDate = (date != null && !date.isEmpty()) ? LocalDate.parse(date) : LocalDate.now();
        List<WorkforceAssignment> assignments = workforceAssignmentRepository.findByEmployeeIdAndAssignmentDate(employee.getId(), lookupDate);
        if (assignments.isEmpty()) {
            assignments = workforceAssignmentRepository.findByEmployeeId(employee.getId());
        }
        if (!assignments.isEmpty() && assignments.get(0).getShift() != null) {
            Shift shift = assignments.get(0).getShift();
            return ResponseEntity.ok(Map.of(
                "hasShift", true,
                "shiftId", shift.getId(),
                "shiftName", shift.getShiftName(),
                "shiftCode", shift.getShiftCode(),
                "startTime", shift.getStartTime().toString(),
                "endTime", shift.getEndTime().toString(),
                "workLocation", assignments.get(0).getWorkLocation() != null ? assignments.get(0).getWorkLocation().getLocationName() : "Operational Hub"
            ));
        }

        return ResponseEntity.ok(Map.of(
            "hasShift", false,
            "message", "No active shift assigned to this employee. Please assign a shift in Workforce Management first."
        ));
    }

    // Historical attendance records for a specific employee
    @GetMapping("/employee/{id}/history")
    public ResponseEntity<List<Attendance>> getEmployeeAttendanceHistory(@PathVariable Long id,
                                                                         @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long linkedId = getLinkedEmployeeIdOrNull(currentUser);
            if (linkedId == null || !linkedId.equals(id)) {
                throw new SecurityException("Forbidden: Cannot view attendance history of another employee.");
            }
        }
        return ResponseEntity.ok(attendanceRepository.findByEmployeeId(id));
    }

    // Attendance records with search and multi-filtering
    @GetMapping("/records")
    public ResponseEntity<List<Attendance>> getRecords(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        if (isEmployeeUser(currentUser)) {
            Long linkedId = getLinkedEmployeeIdOrNull(currentUser);
            if (linkedId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            employeeId = linkedId;
        }

        List<Attendance> allRecords;
        if (employeeId != null) {
            allRecords = attendanceRepository.findByEmployeeId(employeeId);
        } else if (date != null && !date.equalsIgnoreCase("ALL") && !date.trim().isEmpty()) {
            allRecords = attendanceRepository.findByAttendanceDate(LocalDate.parse(date.trim()));
        } else {
            allRecords = attendanceRepository.findAll();
        }

        List<Attendance> filtered = allRecords.stream().filter(r -> {
            if (departmentId != null && (r.getEmployee() == null || r.getEmployee().getDepartment() == null || !r.getEmployee().getDepartment().getId().equals(departmentId))) {
                return false;
            }
            if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL") && !r.getStatus().equalsIgnoreCase(status.trim())) {
                return false;
            }
            if (search != null && !search.trim().isEmpty()) {
                String q = search.trim().toLowerCase();
                String empId = r.getEmployee() != null && r.getEmployee().getEmployeeId() != null ? r.getEmployee().getEmployeeId().toLowerCase() : "";
                String name = r.getEmployee() != null ? (r.getEmployee().getFirstName() + " " + r.getEmployee().getLastName()).toLowerCase() : "";
                if (!empId.contains(q) && !name.contains(q)) {
                    return false;
                }
            }
            return true;
        }).toList();

        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/records/{id}")
    public ResponseEntity<Attendance> getAttendanceById(@PathVariable Long id,
                                                        @AuthenticationPrincipal UserPrincipal currentUser) {
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found with id: " + id));

        if (isEmployeeUser(currentUser)) {
            Long linkedId = getLinkedEmployeeIdOrNull(currentUser);
            if (linkedId == null || attendance.getEmployee() == null || !attendance.getEmployee().getId().equals(linkedId)) {
                throw new SecurityException("Forbidden: Cannot view attendance record of another employee.");
            }
        }

        return ResponseEntity.ok(attendance);
    }

    @PutMapping("/records/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateAttendanceRecord(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found with id: " + id));

        if (payload.containsKey("checkInTime") && payload.get("checkInTime") != null) {
            String timeStr = payload.get("checkInTime").toString().trim();
            if (!timeStr.isEmpty()) {
                if (timeStr.length() == 5) timeStr += ":00";
                attendance.setCheckInTime(LocalTime.parse(timeStr));
            } else {
                attendance.setCheckInTime(null);
            }
        }

        if (payload.containsKey("checkOutTime") && payload.get("checkOutTime") != null) {
            String timeStr = payload.get("checkOutTime").toString().trim();
            if (!timeStr.isEmpty()) {
                if (timeStr.length() == 5) timeStr += ":00";
                attendance.setCheckOutTime(LocalTime.parse(timeStr));
            } else {
                attendance.setCheckOutTime(null);
            }
        }

        if (payload.containsKey("status") && payload.get("status") != null) {
            attendance.setStatus(payload.get("status").toString().trim().toUpperCase());
        }

        if (payload.containsKey("notes")) {
            attendance.setNotes((String) payload.get("notes"));
        }

        // Recalculate working hours if both checkIn and checkOut are present
        if (attendance.getCheckInTime() != null && attendance.getCheckOutTime() != null) {
            long minutes = Duration.between(attendance.getCheckInTime(), attendance.getCheckOutTime()).toMinutes();
            if (minutes < 0) minutes += 24 * 60;
            attendance.setWorkingHours(BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP));
        }

        return ResponseEntity.ok(attendanceRepository.save(attendance));
    }

    @DeleteMapping("/records/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteAttendanceRecord(@PathVariable Long id) {
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found with id: " + id));
        attendanceRepository.delete(attendance);
        return ResponseEntity.ok(Map.of("message", "Attendance record deleted successfully.", "id", id));
    }

    // Leave Management
    @GetMapping("/leaves")
    public ResponseEntity<List<LeaveRequest>> getLeaveRequests(@RequestParam(required = false) Long employeeId,
                                                               @RequestParam(required = false) String status,
                                                               @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long linkedId = getLinkedEmployeeIdOrNull(currentUser);
            return ResponseEntity.ok(linkedId != null ? leaveRequestRepository.findByEmployeeId(linkedId) : List.of());
        }

        if (employeeId != null) {
            return ResponseEntity.ok(leaveRequestRepository.findByEmployeeId(employeeId));
        }
        if (status != null && !status.isEmpty() && !status.equalsIgnoreCase("ALL")) {
            return ResponseEntity.ok(leaveRequestRepository.findByStatus(status.toUpperCase()));
        }
        return ResponseEntity.ok(leaveRequestRepository.findAll());
    }

    @GetMapping("/leaves/{id}")
    public ResponseEntity<LeaveRequest> getLeaveById(@PathVariable Long id,
                                                     @AuthenticationPrincipal UserPrincipal currentUser) {
        LeaveRequest leave = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found with id: " + id));

        if (isEmployeeUser(currentUser)) {
            Long linkedId = getLinkedEmployeeIdOrNull(currentUser);
            if (linkedId == null || leave.getEmployee() == null || !leave.getEmployee().getId().equals(linkedId)) {
                throw new SecurityException("Forbidden: Cannot view leave request of another employee.");
            }
        }

        return ResponseEntity.ok(leave);
    }

    @PostMapping("/leaves")
    public ResponseEntity<?> applyForLeave(@RequestBody Map<String, Object> payload,
                                           @AuthenticationPrincipal UserPrincipal currentUser) {
        Long employeeId = getTargetEmployeeId(payload, currentUser);
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));

        LeaveRequest leave = new LeaveRequest();
        leave.setEmployee(employee);
        leave.setLeaveType((String) payload.getOrDefault("leaveType", "Annual"));
        leave.setStartDate(LocalDate.parse((String) payload.get("startDate")));
        leave.setEndDate(LocalDate.parse((String) payload.get("endDate")));
        leave.setTotalDays(Integer.parseInt(payload.getOrDefault("totalDays", 1).toString()));
        leave.setReason((String) payload.get("reason"));
        leave.setStatus("PENDING");

        return ResponseEntity.ok(leaveRequestRepository.save(leave));
    }

    @PutMapping("/leaves/{id}")
    public ResponseEntity<?> updateLeave(@PathVariable Long id,
                                        @RequestBody Map<String, Object> payload,
                                        @AuthenticationPrincipal UserPrincipal currentUser) {
        LeaveRequest leave = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found with id: " + id));

        if (isEmployeeUser(currentUser)) {
            Long linkedId = getLinkedEmployeeIdOrNull(currentUser);
            if (linkedId == null || leave.getEmployee() == null || !leave.getEmployee().getId().equals(linkedId)) {
                throw new SecurityException("Forbidden: Cannot edit leave request of another employee.");
            }
        }

        if ("APPROVED".equalsIgnoreCase(leave.getStatus())) {
            throw new BadRequestException("Approved leave requests cannot be edited directly. Please consult HR.");
        }

        if (payload.containsKey("leaveType")) leave.setLeaveType((String) payload.get("leaveType"));
        if (payload.containsKey("startDate")) leave.setStartDate(LocalDate.parse((String) payload.get("startDate")));
        if (payload.containsKey("endDate")) leave.setEndDate(LocalDate.parse((String) payload.get("endDate")));
        if (payload.containsKey("totalDays")) leave.setTotalDays(Integer.parseInt(payload.get("totalDays").toString()));
        if (payload.containsKey("reason")) leave.setReason((String) payload.get("reason"));

        return ResponseEntity.ok(leaveRequestRepository.save(leave));
    }

    @DeleteMapping("/leaves/{id}")
    public ResponseEntity<?> deleteLeave(@PathVariable Long id,
                                        @AuthenticationPrincipal UserPrincipal currentUser) {
        LeaveRequest leave = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found with id: " + id));

        if (isEmployeeUser(currentUser)) {
            Long linkedId = getLinkedEmployeeIdOrNull(currentUser);
            if (linkedId == null || leave.getEmployee() == null || !leave.getEmployee().getId().equals(linkedId)) {
                throw new SecurityException("Forbidden: Cannot cancel/delete leave request of another employee.");
            }
        }

        if ("APPROVED".equalsIgnoreCase(leave.getStatus())) {
            throw new BadRequestException("Approved historical leave requests cannot be deleted to preserve compliance records.");
        }

        leaveRequestRepository.delete(leave);
        return ResponseEntity.ok(Map.of("message", "Leave request cancelled/deleted successfully.", "id", id));
    }

    @PutMapping("/leaves/{id}/approve")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> approveLeave(@PathVariable Long id,
                                         @RequestBody(required = false) Map<String, String> payload,
                                         @AuthenticationPrincipal UserPrincipal currentUser) {
        LeaveRequest leave = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found with id: " + id));

        leave.setStatus("APPROVED");
        leave.setActionDate(LocalDateTime.now());
        if (payload != null && payload.containsKey("remarks")) {
            leave.setAdminRemarks(payload.get("remarks"));
        }
        if (currentUser != null) {
            userRepository.findById(currentUser.getId()).ifPresent(leave::setReviewedBy);
        }
        LeaveRequest saved = leaveRequestRepository.save(leave);
        if (saved.getEmployee() != null) {
            notificationPublisher.publish(NotificationEvent.targeted(
                    saved.getEmployee(),
                    "Leave Request Approved",
                    "Your leave request from " + saved.getStartDate() + " to " + saved.getEndDate() + " has been approved.",
                    "SUCCESS",
                    "/employee/leave"
            ));
        }
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/leaves/{id}/reject")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> rejectLeave(@PathVariable Long id,
                                        @RequestBody(required = false) Map<String, String> payload,
                                        @AuthenticationPrincipal UserPrincipal currentUser) {
        LeaveRequest leave = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found with id: " + id));

        leave.setStatus("REJECTED");
        leave.setActionDate(LocalDateTime.now());
        if (payload != null && payload.containsKey("remarks")) {
            leave.setAdminRemarks(payload.get("remarks"));
        }
        if (currentUser != null) {
            userRepository.findById(currentUser.getId()).ifPresent(leave::setReviewedBy);
        }
        LeaveRequest saved = leaveRequestRepository.save(leave);
        if (saved.getEmployee() != null) {
            notificationPublisher.publish(NotificationEvent.targeted(
                    saved.getEmployee(),
                    "Leave Request Rejected",
                    "Your leave request from " + saved.getStartDate() + " to " + saved.getEndDate() + " has been rejected.",
                    "WARNING",
                    "/employee/leave"
            ));
        }
        return ResponseEntity.ok(saved);
    }

    // Overtime
    @GetMapping("/overtime")
    public ResponseEntity<List<OvertimeRecord>> getOvertime(@RequestParam(required = false) Long employeeId,
                                                           @RequestParam(required = false) String search,
                                                           @RequestParam(required = false) String status,
                                                           @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long linkedId = getLinkedEmployeeIdOrNull(currentUser);
            if (linkedId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            employeeId = linkedId;
        }

        List<OvertimeRecord> list = (employeeId != null) ? overtimeRepository.findByEmployeeId(employeeId) : overtimeRepository.findAll();
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            list = list.stream().filter(o -> status.equalsIgnoreCase(o.getStatus())).toList();
        }
        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim().toLowerCase();
            list = list.stream().filter(o -> {
                String empId = o.getEmployee() != null ? o.getEmployee().getEmployeeId().toLowerCase() : "";
                String name = o.getEmployee() != null ? o.getEmployee().getFullName().toLowerCase() : "";
                return empId.contains(q) || name.contains(q);
            }).toList();
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/overtime/{id}")
    public ResponseEntity<OvertimeRecord> getOvertimeById(@PathVariable Long id,
                                                         @AuthenticationPrincipal UserPrincipal currentUser) {
        OvertimeRecord ot = overtimeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Overtime record not found with id: " + id));

        if (isEmployeeUser(currentUser)) {
            Long linkedId = getLinkedEmployeeIdOrNull(currentUser);
            if (linkedId == null || ot.getEmployee() == null || !ot.getEmployee().getId().equals(linkedId)) {
                throw new SecurityException("Forbidden: Cannot view overtime record of another employee.");
            }
        }

        return ResponseEntity.ok(ot);
    }

    @PostMapping("/overtime")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> recordOvertime(@RequestBody Map<String, Object> payload) {
        Long employeeId = Long.valueOf(payload.get("employeeId").toString());
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        BigDecimal hours = new BigDecimal(payload.get("hours").toString());
        BigDecimal rate = payload.containsKey("hourlyRate") && payload.get("hourlyRate") != null && !payload.get("hourlyRate").toString().trim().isEmpty()
                ? new BigDecimal(payload.get("hourlyRate").toString().trim())
                : (employee.getPosition() != null && employee.getPosition().getOtRatePerHour() != null
                    ? employee.getPosition().getOtRatePerHour() : BigDecimal.ZERO);
        BigDecimal multiplier = payload.containsKey("multiplier") && payload.get("multiplier") != null && !payload.get("multiplier").toString().trim().isEmpty()
                ? new BigDecimal(payload.get("multiplier").toString().trim()) : BigDecimal.ONE;
        BigDecimal total = hours.multiply(rate).multiply(multiplier).setScale(2, RoundingMode.HALF_UP);

        OvertimeRecord ot = new OvertimeRecord();
        ot.setEmployee(employee);
        ot.setOvertimeDate(LocalDate.parse(payload.get("overtimeDate").toString()));
        ot.setHours(hours);
        ot.setHourlyRate(rate);
        ot.setMultiplier(multiplier);
        ot.setTotalAmount(total);
        ot.setReason((String) payload.getOrDefault("reason", "Shift overtime logged"));
        ot.setStatus((String) payload.getOrDefault("status", "PENDING"));

        return ResponseEntity.ok(overtimeRepository.save(ot));
    }

    @PutMapping("/overtime/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateOvertime(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        OvertimeRecord ot = overtimeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Overtime record not found: " + id));

        if (payload.containsKey("hours")) {
            ot.setHours(new BigDecimal(payload.get("hours").toString()));
        }
        if (payload.containsKey("hourlyRate")) {
            ot.setHourlyRate(new BigDecimal(payload.get("hourlyRate").toString()));
        }
        if (payload.containsKey("multiplier")) {
            ot.setMultiplier(new BigDecimal(payload.get("multiplier").toString()));
        }
        if (payload.containsKey("reason")) {
            ot.setReason((String) payload.get("reason"));
        }
        String previousStatus = ot.getStatus() != null ? ot.getStatus() : "PENDING";
        if (payload.containsKey("status")) {
            ot.setStatus((String) payload.get("status"));
        }

        BigDecimal mult = ot.getMultiplier() != null ? ot.getMultiplier() : BigDecimal.ONE;
        BigDecimal total = ot.getHours().multiply(ot.getHourlyRate()).multiply(mult).setScale(2, RoundingMode.HALF_UP);
        ot.setTotalAmount(total);

        OvertimeRecord saved = overtimeRepository.save(ot);

        // Targeted OT notification
        if (saved.getEmployee() != null && !saved.getStatus().equalsIgnoreCase(previousStatus)) {
            if ("APPROVED".equalsIgnoreCase(saved.getStatus())) {
                notificationPublisher.publish(NotificationEvent.targeted(
                        saved.getEmployee(),
                        "Overtime Approved",
                        "Your " + saved.getHours() + " overtime hours for " + saved.getOvertimeDate() + " have been approved.",
                        "SUCCESS",
                        "/employee/attendance"
                ));
            } else if ("REJECTED".equalsIgnoreCase(saved.getStatus())) {
                notificationPublisher.publish(NotificationEvent.targeted(
                        saved.getEmployee(),
                        "Overtime Rejected",
                        "Your " + saved.getHours() + " overtime hours for " + saved.getOvertimeDate() + " have been rejected.",
                        "WARNING",
                        "/employee/attendance"
                ));
            }
        }

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/overtime/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteOvertime(@PathVariable Long id) {
        OvertimeRecord ot = overtimeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Overtime record not found: " + id));
        overtimeRepository.delete(ot);
        return ResponseEntity.ok(Map.of("message", "Overtime record deleted successfully.", "id", id));
    }

    private void syncOvertimeRecord(Employee employee, LocalDate date, BigDecimal otHours) {
        if (employee == null || date == null) return;
        BigDecimal otRate = BigDecimal.ZERO;
        if (employee.getPosition() != null && employee.getPosition().getOtRatePerHour() != null) {
            otRate = employee.getPosition().getOtRatePerHour();
        }

        Optional<OvertimeRecord> existingOpt = overtimeRepository.findByEmployeeIdAndOvertimeDate(employee.getId(), date);

        if (otHours != null && otHours.compareTo(BigDecimal.ZERO) > 0) {
            OvertimeRecord ot = existingOpt.orElseGet(OvertimeRecord::new);
            ot.setEmployee(employee);
            ot.setOvertimeDate(date);
            ot.setHours(otHours);
            ot.setHourlyRate(otRate);
            ot.setMultiplier(BigDecimal.ONE);
            ot.setTotalAmount(otHours.multiply(otRate).setScale(2, RoundingMode.HALF_UP));
            if (ot.getId() == null) {
                ot.setStatus("PENDING");
                ot.setReason("Automatic OT from Attendance (" + otHours + " hrs)");
            }
            overtimeRepository.save(ot);
        } else if (existingOpt.isPresent()) {
            OvertimeRecord ot = existingOpt.get();
            if ("PENDING".equalsIgnoreCase(ot.getStatus())) {
                ot.setHours(BigDecimal.ZERO);
                ot.setTotalAmount(BigDecimal.ZERO);
                overtimeRepository.save(ot);
            }
        }
    }

    // Timesheets
    @GetMapping("/timesheets")
    public ResponseEntity<List<Timesheet>> getTimesheets(@RequestParam(required = false) Long employeeId,
                                                        @RequestParam(required = false) String status,
                                                        @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long linkedId = getLinkedEmployeeIdOrNull(currentUser);
            if (linkedId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            employeeId = linkedId;
        }

        List<Timesheet> list = (employeeId != null) ? timesheetRepository.findByEmployeeId(employeeId) : timesheetRepository.findAll();
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            list = list.stream().filter(t -> status.equalsIgnoreCase(t.getStatus())).toList();
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/timesheets/{id}")
    public ResponseEntity<Timesheet> getTimesheetById(@PathVariable Long id,
                                                     @AuthenticationPrincipal UserPrincipal currentUser) {
        Timesheet ts = timesheetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found with id: " + id));

        if (isEmployeeUser(currentUser)) {
            Long linkedId = getLinkedEmployeeIdOrNull(currentUser);
            if (linkedId == null || ts.getEmployee() == null || !ts.getEmployee().getId().equals(linkedId)) {
                throw new SecurityException("Forbidden: Cannot view timesheet of another employee.");
            }
        }

        return ResponseEntity.ok(ts);
    }

    @PostMapping("/timesheets")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createTimesheet(@RequestBody Map<String, Object> payload,
                                            @AuthenticationPrincipal UserPrincipal currentUser) {
        Long employeeId = Long.valueOf(payload.get("employeeId").toString());
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        Timesheet ts = new Timesheet();
        ts.setEmployee(employee);
        ts.setPeriodStart(LocalDate.parse(payload.get("periodStart").toString()));
        ts.setPeriodEnd(LocalDate.parse(payload.get("periodEnd").toString()));
        ts.setRegularHours(new BigDecimal(payload.getOrDefault("regularHours", "160").toString()));
        ts.setOvertimeHours(new BigDecimal(payload.getOrDefault("overtimeHours", "0").toString()));
        ts.setTotalHours(ts.getRegularHours().add(ts.getOvertimeHours()));
        ts.setStatus((String) payload.getOrDefault("status", "DRAFT"));

        return ResponseEntity.ok(timesheetRepository.save(ts));
    }

    @PutMapping("/timesheets/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateTimesheet(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Timesheet ts = timesheetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found: " + id));

        if ("FINALIZED".equalsIgnoreCase(ts.getStatus())) {
            throw new BadRequestException("Finalized timesheets cannot be edited. It has already been approved for payroll.");
        }

        if (payload.containsKey("regularHours")) {
            ts.setRegularHours(new BigDecimal(payload.get("regularHours").toString()));
        }
        if (payload.containsKey("overtimeHours")) {
            ts.setOvertimeHours(new BigDecimal(payload.get("overtimeHours").toString()));
        }
        ts.setTotalHours(ts.getRegularHours().add(ts.getOvertimeHours()));

        if (payload.containsKey("status")) {
            ts.setStatus((String) payload.get("status"));
        }

        return ResponseEntity.ok(timesheetRepository.save(ts));
    }

    @DeleteMapping("/timesheets/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteTimesheet(@PathVariable Long id) {
        Timesheet ts = timesheetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found: " + id));

        if ("FINALIZED".equalsIgnoreCase(ts.getStatus())) {
            throw new BadRequestException("Cannot delete finalized timesheets: this record is tied to payroll audit.");
        }

        timesheetRepository.delete(ts);
        return ResponseEntity.ok(Map.of("message", "Draft timesheet deleted successfully.", "id", id));
    }

    @PostMapping("/timesheets/finalize")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> finalizeTimesheet(@RequestBody Map<String, Object> payload,
                                               @AuthenticationPrincipal UserPrincipal currentUser) {
        Long employeeId = Long.valueOf(payload.get("employeeId").toString());
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        Timesheet ts = new Timesheet();
        ts.setEmployee(employee);
        ts.setPeriodStart(LocalDate.parse(payload.get("periodStart").toString()));
        ts.setPeriodEnd(LocalDate.parse(payload.get("periodEnd").toString()));
        ts.setRegularHours(new BigDecimal(payload.getOrDefault("regularHours", "160").toString()));
        ts.setOvertimeHours(new BigDecimal(payload.getOrDefault("overtimeHours", "12").toString()));
        ts.setTotalHours(ts.getRegularHours().add(ts.getOvertimeHours()));
        ts.setStatus("FINALIZED");
        ts.setFinalizedAt(LocalDateTime.now());
        if (currentUser != null) {
            userRepository.findById(currentUser.getId()).ifPresent(ts::setApprovedBy);
        }

        return ResponseEntity.ok(timesheetRepository.save(ts));
    }

    // Helpers
    private boolean isEmployeeUser(UserPrincipal currentUser) {
        if (currentUser != null) {
            return "EMPLOYEE".equalsIgnoreCase(currentUser.getRole());
        }
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_EMPLOYEE"));
        }
        return false;
    }

    private Long getTargetEmployeeId(Map<String, Object> payload, UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long linked = getLinkedEmployeeIdOrNull(currentUser);
            if (linked != null) return linked;
            throw new BadRequestException("Current user is not linked to an employee profile.");
        }
        if (payload.containsKey("employeeId") && payload.get("employeeId") != null && !payload.get("employeeId").toString().trim().isEmpty()) {
            String empStr = payload.get("employeeId").toString().trim();
            try {
                return Long.valueOf(empStr);
            } catch (NumberFormatException e) {
                return employeeRepository.findByEmployeeId(empStr)
                        .map(Employee::getId)
                        .orElseThrow(() -> new ResourceNotFoundException("Employee not found with ID/Code: " + empStr));
            }
        }
        if (payload.containsKey("employeeCode") && payload.get("employeeCode") != null && !payload.get("employeeCode").toString().trim().isEmpty()) {
            String code = payload.get("employeeCode").toString().trim();
            return employeeRepository.findByEmployeeId(code)
                    .map(Employee::getId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found with code: " + code));
        }
        Long linked = getLinkedEmployeeIdOrNull(currentUser);
        if (linked != null) return linked;
        throw new BadRequestException("Employee ID is required.");
    }

    private Long getLinkedEmployeeIdOrNull(UserPrincipal currentUser) {
        if (currentUser != null) {
            return employeeRepository.findByUserId(currentUser.getId())
                    .or(() -> employeeRepository.findByEmailIgnoreCase(currentUser.getEmail()))
                    .map(Employee::getId)
                    .orElse(null);
        }
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null && !"anonymousUser".equals(auth.getName())) {
            String name = auth.getName();
            Optional<Employee> emp = employeeRepository.findByEmailIgnoreCase(name);
            if (emp.isPresent()) return emp.get().getId();
            Optional<User> u = userRepository.findByUsername(name).or(() -> userRepository.findByEmail(name));
            if (u.isPresent()) {
                return employeeRepository.findByUserId(u.get().getId()).map(Employee::getId).orElse(null);
            }
        }
        return null;
    }
}
