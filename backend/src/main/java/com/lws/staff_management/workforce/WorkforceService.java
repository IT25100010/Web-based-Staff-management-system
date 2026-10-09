package com.lws.staff_management.workforce;

import com.lws.staff_management.admin.AuditLog;
import com.lws.staff_management.admin.AuditLogRepository;
import com.lws.staff_management.attendance.Attendance;
import com.lws.staff_management.attendance.AttendanceRepository;
import com.lws.staff_management.attendance.LeaveRequest;
import com.lws.staff_management.attendance.LeaveRequestRepository;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.exception.BadRequestException;
import com.lws.staff_management.exception.ResourceNotFoundException;
import com.lws.staff_management.notification.Notification;
import com.lws.staff_management.notification.NotificationRepository;
import com.lws.staff_management.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

import com.lws.staff_management.notification.event.NotificationEvent;
import com.lws.staff_management.notification.publisher.NotificationPublisher;

@Service
public class WorkforceService {

    private static final double MAX_WEEKLY_HOURS = 48.0;
    private static final int DEFAULT_LATE_GRACE_MINUTES = 15;

    private final ShiftRepository shiftRepository;
    private final WorkforceAssignmentRepository assignmentRepository;
    private final WorkLocationRepository locationRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeTransferRepository transferRepository;
    private final EmployeeReplacementRepository replacementRepository;
    private final NotificationPublisher notificationPublisher;
    private final AuditLogRepository auditLogRepository;

    @Autowired
    public WorkforceService(ShiftRepository shiftRepository,
                            WorkforceAssignmentRepository assignmentRepository,
                            WorkLocationRepository locationRepository,
                            EmployeeRepository employeeRepository,
                            LeaveRequestRepository leaveRequestRepository,
                            AttendanceRepository attendanceRepository,
                            EmployeeTransferRepository transferRepository,
                            EmployeeReplacementRepository replacementRepository,
                            NotificationPublisher notificationPublisher,
                            AuditLogRepository auditLogRepository) {
        this.shiftRepository = shiftRepository;
        this.assignmentRepository = assignmentRepository;
        this.locationRepository = locationRepository;
        this.employeeRepository = employeeRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.attendanceRepository = attendanceRepository;
        this.transferRepository = transferRepository;
        this.replacementRepository = replacementRepository;
        this.notificationPublisher = notificationPublisher;
        this.auditLogRepository = auditLogRepository;
    }

    public WorkforceService(ShiftRepository shiftRepository,
                            WorkforceAssignmentRepository assignmentRepository,
                            WorkLocationRepository locationRepository,
                            EmployeeRepository employeeRepository,
                            LeaveRequestRepository leaveRequestRepository,
                            AttendanceRepository attendanceRepository,
                            EmployeeTransferRepository transferRepository,
                            EmployeeReplacementRepository replacementRepository,
                            com.lws.staff_management.notification.NotificationRepository notificationRepository,
                            AuditLogRepository auditLogRepository) {
        this(shiftRepository, assignmentRepository, locationRepository, employeeRepository,
             leaveRequestRepository, attendanceRepository, transferRepository, replacementRepository,
             new NotificationPublisher(List.of()), auditLogRepository);
    }

    public record AssignmentValidationResult(Employee employee, Shift shift, WorkLocation location, LocalDate targetDate) {}

    /**
     * Reusable business validation for creating and updating workforce assignments.
     */
    public AssignmentValidationResult validateAssignment(Long shiftId, Long employeeId, LocalDate assignmentDate, Long excludeAssignmentId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));

        if (employee.getEmploymentStatus() == null || !"ACTIVE".equalsIgnoreCase(employee.getEmploymentStatus().trim())) {
            throw new BadRequestException("Cannot assign employee: Employee status is not ACTIVE.");
        }

        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found with id: " + shiftId));

        if ("CANCELLED".equalsIgnoreCase(shift.getStatus())) {
            throw new BadRequestException("Cannot assign employee: Shift is CANCELLED.");
        }

        WorkLocation loc = shift.getWorkLocation();
        if (loc == null) {
            throw new BadRequestException("Shift is not assigned to a valid Work Location.");
        }

        LocalDate targetDate = (assignmentDate != null) ? assignmentDate : shift.getShiftDate();

        // 1. Check duplicate assignment to the same shift
        if (excludeAssignmentId == null) {
            if (assignmentRepository.existsByEmployeeIdAndAssignmentDateAndShiftId(employeeId, targetDate, shiftId)) {
                throw new BadRequestException("Duplicate Assignment: Employee is already assigned to this shift on " + targetDate + ".");
            }
        } else {
            List<WorkforceAssignment> dayAssignments = assignmentRepository.findByEmployeeIdAndAssignmentDate(employeeId, targetDate);
            boolean isDuplicate = dayAssignments.stream().anyMatch(a ->
                    !a.getId().equals(excludeAssignmentId) &&
                    a.getShift() != null && a.getShift().getId().equals(shiftId) &&
                    !"CANCELLED".equalsIgnoreCase(a.getStatus()) && !"REPLACED".equalsIgnoreCase(a.getStatus())
            );
            if (isDuplicate) {
                throw new BadRequestException("Duplicate Assignment: Employee is already assigned to this shift on " + targetDate + ".");
            }
        }

        // 2. Check approved leave on target date
        if (leaveRequestRepository.isEmployeeOnApprovedLeave(employeeId, targetDate)) {
            throw new BadRequestException("Employee is on approved leave for the selected shift date.");
        }

        // 3. Check overlapping shift conflicts
        List<WorkforceAssignment> existingAssignments = assignmentRepository.findActiveAssignmentsForEmployeeOnDate(employeeId, targetDate);
        for (WorkforceAssignment existing : existingAssignments) {
            if (excludeAssignmentId != null && existing.getId().equals(excludeAssignmentId)) {
                continue;
            }
            Shift existingShift = existing.getShift();
            if (existingShift != null) {
                boolean overlaps = isTimeOverlapping(shift.getStartTime(), shift.getEndTime(),
                        existingShift.getStartTime(), existingShift.getEndTime());
                if (overlaps) {
                    throw new BadRequestException("Employee already has an overlapping shift from "
                            + existingShift.getStartTime() + " to " + existingShift.getEndTime()
                            + " (" + existingShift.getShiftName() + ").");
                }
            }
        }

        // 4. Check weekly working-hour limits (Max 48 hours)
        double currentWeeklyHours = calculateWeeklyScheduledHours(employeeId, targetDate);
        if (excludeAssignmentId != null) {
            WorkforceAssignment existingAsg = assignmentRepository.findById(excludeAssignmentId).orElse(null);
            if (existingAsg != null && "ASSIGNED".equalsIgnoreCase(existingAsg.getStatus()) && existingAsg.getShift() != null && isSameWeek(existingAsg.getAssignmentDate(), targetDate)) {
                currentWeeklyHours -= calculateShiftDurationHours(existingAsg.getShift().getStartTime(), existingAsg.getShift().getEndTime());
            }
        }
        double newShiftHours = calculateShiftDurationHours(shift.getStartTime(), shift.getEndTime());
        if (currentWeeklyHours + newShiftHours > MAX_WEEKLY_HOURS) {
            throw new BadRequestException("Weekly limit exceeded: Employee already has "
                    + String.format("%.1f", Math.max(0, currentWeeklyHours)) + " scheduled hours this week. Adding this "
                    + String.format("%.1f", newShiftHours) + "h shift would exceed the maximum allowed limit of "
                    + MAX_WEEKLY_HOURS + " hours.");
        }

        // 5. Check Shift Capacity (if shift has staffing limit)
        if (shift.getRequiredEmployees() > 0) {
            long activeOnShift = assignmentRepository.findByShiftIdAndStatus(shift.getId(), "ASSIGNED")
                    .stream()
                    .filter(a -> excludeAssignmentId == null || !a.getId().equals(excludeAssignmentId))
                    .count();
            if (activeOnShift >= shift.getRequiredEmployees()) {
                throw new BadRequestException("Shift capacity reached: Shift '" + shift.getShiftName() + "' requires " + shift.getRequiredEmployees() + " employees and is already fully staffed.");
            }
        }

        // 6. Check Location Concurrent Capacity (only count assignments overlapping in time)
        int capacity = loc.getCapacity();
        List<WorkforceAssignment> locAssignments = assignmentRepository.findByWorkLocationIdAndAssignmentDateAndStatus(loc.getId(), targetDate, "ASSIGNED");
        long overlappingAtLocation = locAssignments.stream()
                .filter(a -> excludeAssignmentId == null || !a.getId().equals(excludeAssignmentId))
                .filter(a -> a.getShift() != null && isTimeOverlapping(shift.getStartTime(), shift.getEndTime(), a.getShift().getStartTime(), a.getShift().getEndTime()))
                .count();
        if (overlappingAtLocation >= capacity) {
            throw new BadRequestException("Location Capacity Exceeded: " + loc.getLocationName() + " capacity is " + capacity);
        }

        return new AssignmentValidationResult(employee, shift, loc, targetDate);
    }

    /**
     * FEATURE A - Smart Shift Assignment Creation
     */
    @Transactional
    public WorkforceAssignment validateAndAssignEmployee(Long shiftId, Long employeeId, LocalDate assignmentDate, String assignedBy) {
        AssignmentValidationResult validated = validateAssignment(shiftId, employeeId, assignmentDate, null);
        Employee employee = validated.employee();
        Shift shift = validated.shift();
        WorkLocation loc = validated.location();
        LocalDate targetDate = validated.targetDate();

        // Create assignment
        WorkforceAssignment assignment = new WorkforceAssignment(employee, loc, shift, targetDate, "ASSIGNED");
        assignment.setAssignedAt(LocalDateTime.now());
        WorkforceAssignment saved = assignmentRepository.save(assignment);

        // Notification via Observer publisher
        String notifMsg = "You have been assigned to shift '" + shift.getShiftName() + "' at "
                + loc.getLocationName() + " on " + targetDate + " (" + shift.getStartTime() + " - " + shift.getEndTime() + ").";
        notificationPublisher.publish(NotificationEvent.targeted(employee, employee.getUser(), "New Shift Assignment", notifMsg, "INFO", "/employee/schedule"));

        // Audit Log
        auditLogRepository.save(new AuditLog(assignedBy != null ? assignedBy : "OPERATIONS_MANAGER",
                "SHIFT_ASSIGNMENT_CREATED", "INTERNAL",
                "Assigned employee " + employee.getEmployeeId() + " (" + employee.getFullName() + ") to shift " + shift.getShiftName()));

        return saved;
    }

    /**
     * Revalidated Workforce Assignment Update Flow
     */
    @Transactional
    public WorkforceAssignment validateAndUpdateAssignment(Long assignmentId, Long newShiftId, LocalDate newAssignmentDate, String newStatus, String updatedBy) {
        WorkforceAssignment asg = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found with id: " + assignmentId));

        String targetStatus = (newStatus != null && !newStatus.trim().isEmpty()) ? newStatus.toUpperCase().trim() : asg.getStatus();

        // If explicitly cancelling or replacing, allow status change without capacity/overlap checks
        if ("CANCELLED".equals(targetStatus) || "REPLACED".equals(targetStatus)) {
            asg.setStatus(targetStatus);
            return assignmentRepository.save(asg);
        }

        Long targetShiftId = (newShiftId != null) ? newShiftId : asg.getShift().getId();
        LocalDate targetDate = (newAssignmentDate != null) ? newAssignmentDate : asg.getAssignmentDate();

        // Revalidate employee, shift, leave, overlap, weekly hours, and capacity
        AssignmentValidationResult validated = validateAssignment(targetShiftId, asg.getEmployee().getId(), targetDate, assignmentId);

        asg.setShift(validated.shift());
        asg.setWorkLocation(validated.location());
        asg.setAssignmentDate(validated.targetDate());
        asg.setStatus(targetStatus);

        WorkforceAssignment saved = assignmentRepository.save(asg);

        auditLogRepository.save(new AuditLog(updatedBy != null ? updatedBy : "OPERATIONS_MANAGER",
                "SHIFT_ASSIGNMENT_UPDATED", "INTERNAL",
                "Updated assignment id " + assignmentId + " for employee " + asg.getEmployee().getEmployeeId() + " to shift " + validated.shift().getShiftName()));

        return saved;
    }

    /**
     * FEATURE B & C - Available Employee Suggestions & Workload Fairness
     */
    public List<Map<String, Object>> getAvailableEmployeesForShift(Long shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + shiftId));

        LocalDate shiftDate = shift.getShiftDate();
        List<Employee> allEmployees = employeeRepository.findAll();

        List<Map<String, Object>> candidates = new ArrayList<>();

        for (Employee emp : allEmployees) {
            // Must be active
            if (emp.getEmploymentStatus() == null || !"ACTIVE".equalsIgnoreCase(emp.getEmploymentStatus().trim())) {
                continue;
            }

            // Exclude if already assigned to this exact shift
            if (assignmentRepository.existsByEmployeeIdAndAssignmentDateAndShiftId(emp.getId(), shiftDate, shiftId)) {
                continue;
            }

            // Exclude if on approved leave
            if (leaveRequestRepository.isEmployeeOnApprovedLeave(emp.getId(), shiftDate)) {
                continue;
            }

            // Exclude if has overlapping shift on that date
            List<WorkforceAssignment> dayAssignments = assignmentRepository.findActiveAssignmentsForEmployeeOnDate(emp.getId(), shiftDate);
            boolean hasOverlap = false;
            for (WorkforceAssignment asg : dayAssignments) {
                if (asg.getShift() != null && isTimeOverlapping(shift.getStartTime(), shift.getEndTime(),
                        asg.getShift().getStartTime(), asg.getShift().getEndTime())) {
                    hasOverlap = true;
                    break;
                }
            }
            if (hasOverlap) {
                continue;
            }

            // Calculate workload indicators for the current week
            double weeklyHours = calculateWeeklyScheduledHours(emp.getId(), shiftDate);
            int shiftsThisWeek = calculateShiftsThisWeek(emp.getId(), shiftDate);

            // Calculate fair recommendation score (lower workload -> higher score)
            double score = 100.0 - (weeklyHours * 1.5);
            List<String> reasons = new ArrayList<>();
            reasons.add("No shift conflicts");
            reasons.add("Not on leave");
            reasons.add("Active employee");

            if (weeklyHours <= 30.0) {
                reasons.add("Lower weekly workload (" + String.format("%.1f", weeklyHours) + "h scheduled)");
            } else {
                reasons.add("Scheduled for " + String.format("%.1f", weeklyHours) + "h this week");
            }

            // Bonus score for same department if shift location has workforce plan / department affinity
            if (emp.getDepartment() != null) {
                score += 10.0;
                reasons.add("Department: " + emp.getDepartment().getName());
            }

            Map<String, Object> candidate = new HashMap<>();
            candidate.put("employeeId", emp.getId());
            candidate.put("employeeCode", emp.getEmployeeId());
            candidate.put("employeeName", emp.getFullName());
            candidate.put("department", emp.getDepartment() != null ? emp.getDepartment().getName() : "General");
            candidate.put("position", emp.getPosition() != null ? emp.getPosition().getTitle() : "Staff Member");
            candidate.put("weeklyHours", weeklyHours);
            candidate.put("currentWeeklyHours", weeklyHours);
            candidate.put("shiftsThisWeek", shiftsThisWeek);
            candidate.put("score", Math.max(10.0, Math.round(score * 10.0) / 10.0));
            candidate.put("reasons", reasons);
            candidate.put("availabilityStatus", "AVAILABLE");

            candidates.add(candidate);
        }

        // Sort descending by score (fair assignment: lower workload candidates rank first)
        candidates.sort((a, b) -> Double.compare((Double) b.get("score"), (Double) a.get("score")));
        return candidates;
    }

    /**
     * FEATURE D - Shift Capacity / Staffing Status Calculation
     */
    public Map<String, Object> calculateStaffingStatus(Shift shift) {
        int requiredStaff = shift.getRequiredEmployees();
        long assignedStaff = assignmentRepository.countByShiftIdAndStatus(shift.getId(), "ASSIGNED");
        int remainingStaff = Math.max(0, requiredStaff - (int) assignedStaff);

        String status;
        if (assignedStaff < requiredStaff) {
            status = "UNDERSTAFFED";
        } else if (assignedStaff == requiredStaff) {
            status = "FULLY_STAFFED";
        } else {
            status = "OVERSTAFFED";
        }

        Map<String, Object> result = new HashMap<>();
        result.put("shiftId", shift.getId());
        result.put("shiftName", shift.getShiftName());
        result.put("shiftDate", shift.getShiftDate());
        result.put("requiredStaff", requiredStaff);
        result.put("assignedStaff", assignedStaff);
        result.put("remainingStaff", remainingStaff);
        result.put("status", status);
        return result;
    }

    /**
     * FEATURE E - Automatic Replacement Suggestions & Confirmation
     */
    public List<Map<String, Object>> getReplacementSuggestions(Long shiftId, Long originalEmployeeId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + shiftId));

        Employee originalEmp = employeeRepository.findById(originalEmployeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Original employee not found: " + originalEmployeeId));

        // Get available employees and exclude original employee
        List<Map<String, Object>> available = getAvailableEmployeesForShift(shiftId);
        List<Map<String, Object>> replacements = new ArrayList<>();

        for (Map<String, Object> cand : available) {
            Long candidateEmpId = (Long) cand.get("employeeId");
            if (candidateEmpId.equals(originalEmployeeId)) {
                continue; // Exclude original employee
            }

            double baseScore = (Double) cand.get("score");
            @SuppressWarnings("unchecked")
            List<String> reasons = new ArrayList<>((List<String>) cand.get("reasons"));

            // Check department match with original employee
            if (originalEmp.getDepartment() != null && cand.get("department") != null &&
                    cand.get("department").toString().equalsIgnoreCase(originalEmp.getDepartment().getName())) {
                baseScore += 15.0;
                reasons.add("Same department as replaced employee (" + originalEmp.getDepartment().getName() + ")");
            }

            // Check position match
            if (originalEmp.getPosition() != null && cand.get("position") != null &&
                    cand.get("position").toString().equalsIgnoreCase(originalEmp.getPosition().getTitle())) {
                baseScore += 15.0;
                reasons.add("Matching job role (" + originalEmp.getPosition().getTitle() + ")");
            }

            Map<String, Object> rep = new HashMap<>(cand);
            rep.put("score", Math.round(baseScore * 10.0) / 10.0);
            rep.put("reasons", reasons);
            replacements.add(rep);
        }

        replacements.sort((a, b) -> Double.compare((Double) b.get("score"), (Double) a.get("score")));
        return replacements;
    }

    @Transactional
    public Map<String, Object> confirmReplacement(Long shiftId, Long originalEmployeeId, Long replacementEmployeeId, String reason, String confirmedBy) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + shiftId));

        Employee origEmp = employeeRepository.findById(originalEmployeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Original employee not found: " + originalEmployeeId));

        Employee repEmp = employeeRepository.findById(replacementEmployeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Replacement employee not found: " + replacementEmployeeId));

        // 1. Prevent duplicate replacement for the same shift and original employee
        if (replacementRepository.existsByShiftIdAndOriginalEmployeeId(shiftId, originalEmployeeId)) {
            throw new BadRequestException("Replacement already confirmed for this shift and original employee.");
        }

        // 2. Prevent self-replacement
        if (origEmp.getId().equals(repEmp.getId())) {
            throw new BadRequestException("Replacement employee cannot be the same as original employee.");
        }

        // 3. Check shift status
        if (shift.getStatus() != null && ("CANCELLED".equalsIgnoreCase(shift.getStatus()) || "COMPLETED".equalsIgnoreCase(shift.getStatus()))) {
            throw new BadRequestException("Cannot assign replacement to a " + shift.getStatus() + " shift.");
        }

        // 4. Validate replacement employee active status
        if (repEmp.getEmploymentStatus() == null || !"ACTIVE".equalsIgnoreCase(repEmp.getEmploymentStatus().trim())) {
            throw new BadRequestException("Replacement employee is inactive.");
        }

        // 5. Validate replacement employee is not on approved leave on shift date
        if (leaveRequestRepository.isEmployeeOnApprovedLeave(repEmp.getId(), shift.getShiftDate())) {
            throw new BadRequestException("Replacement employee is on approved leave on " + shift.getShiftDate());
        }

        // 6. Validate replacement employee does not already have an assignment to this shift
        if (assignmentRepository.existsByEmployeeIdAndAssignmentDateAndShiftId(repEmp.getId(), shift.getShiftDate(), shift.getId())) {
            throw new BadRequestException("Replacement employee is already assigned to this shift.");
        }

        // 7. Validate replacement employee does not have overlapping shifts on that date
        List<WorkforceAssignment> repAssignments = assignmentRepository.findActiveAssignmentsForEmployeeOnDate(repEmp.getId(), shift.getShiftDate());
        for (WorkforceAssignment asg : repAssignments) {
            if (asg.getShift() != null && isTimeOverlapping(shift.getStartTime(), shift.getEndTime(), asg.getShift().getStartTime(), asg.getShift().getEndTime())) {
                throw new BadRequestException("Replacement employee already has an overlapping shift on " + shift.getShiftDate() + " (" + asg.getShift().getStartTime() + " - " + asg.getShift().getEndTime() + ").");
            }
        }

        // 8. Validate weekly working-hour limit (Max 48h)
        double repWeeklyHours = calculateWeeklyScheduledHours(repEmp.getId(), shift.getShiftDate());
        double shiftDuration = calculateShiftDurationHours(shift.getStartTime(), shift.getEndTime());
        if (repWeeklyHours + shiftDuration > MAX_WEEKLY_HOURS) {
            throw new BadRequestException("Weekly limit exceeded: Replacement employee already has "
                    + String.format("%.1f", Math.max(0, repWeeklyHours)) + " scheduled hours this week. Adding this "
                    + String.format("%.1f", shiftDuration) + "h shift would exceed the maximum limit of "
                    + MAX_WEEKLY_HOURS + " hours.");
        }

        // Find existing assignment for original employee
        List<WorkforceAssignment> origAssignments = assignmentRepository.findByShiftIdAndStatus(shiftId, "ASSIGNED")
                .stream().filter(a -> a.getEmployee().getId().equals(originalEmployeeId)).toList();

        if (origAssignments.isEmpty()) {
            throw new BadRequestException("Original employee has no active assignment for this shift.");
        }

        // Close old assignment as REPLACED
        WorkforceAssignment oldAsg = origAssignments.get(0);
        oldAsg.setStatus("REPLACED");
        assignmentRepository.save(oldAsg);

        // Create new assignment for replacement employee
        WorkforceAssignment newAsg = new WorkforceAssignment(repEmp, shift.getWorkLocation(), shift, shift.getShiftDate(), "ASSIGNED");
        newAsg.setAssignedAt(LocalDateTime.now());
        assignmentRepository.save(newAsg);

        // Record EmployeeReplacement for audit/history
        EmployeeReplacement repRecord = new EmployeeReplacement();
        repRecord.setShift(shift);
        repRecord.setWorkLocation(shift.getWorkLocation());
        repRecord.setOriginalEmployee(origEmp);
        repRecord.setReplacementEmployee(repEmp);
        repRecord.setReplacementDate(shift.getShiftDate());
        repRecord.setReason(reason != null ? reason : "Operational replacement confirmed by manager");
        repRecord.setStatus("COMPLETED");
        replacementRepository.save(repRecord);

        // Notifications via Observer publisher
        notificationPublisher.publish(NotificationEvent.targeted(origEmp, origEmp.getUser(), "Shift Replacement Notice",
                "You have been replaced by " + repEmp.getFullName() + " for shift '" + shift.getShiftName() + "' on " + shift.getShiftDate() + ". Reason: " + reason,
                "WARNING", "/employee/schedule"));

        notificationPublisher.publish(NotificationEvent.targeted(repEmp, repEmp.getUser(), "Replacement Shift Assigned",
                "You have been assigned as replacement for shift '" + shift.getShiftName() + "' on " + shift.getShiftDate() + " at " + shift.getWorkLocation().getLocationName() + ".",
                "INFO", "/employee/schedule"));

        // Audit Log
        auditLogRepository.save(new AuditLog(confirmedBy != null ? confirmedBy : "OPERATIONS_MANAGER",
                "SHIFT_REPLACEMENT_CONFIRMED", "INTERNAL",
                "Replaced employee " + origEmp.getEmployeeId() + " with " + repEmp.getEmployeeId() + " for shift " + shift.getShiftName()));

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Replacement confirmed successfully.");
        response.put("shiftId", shiftId);
        response.put("originalEmployee", origEmp.getFullName());
        response.put("replacementEmployee", repEmp.getFullName());
        response.put("status", "COMPLETED");
        return response;
    }

    /**
     * FEATURE F - Transfer Workflow
     */
    @Transactional
    public EmployeeTransfer processTransferAction(Long transferId, String newStatus, String adminRemarks, String reviewedBy) {
        EmployeeTransfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer record not found: " + transferId));

        transfer.setStatus(newStatus.toUpperCase().trim());
        transfer.setAdminRemarks(adminRemarks);
        transfer.setReviewedBy(reviewedBy);

        if ("APPROVED".equalsIgnoreCase(newStatus) || "EFFECTIVE".equalsIgnoreCase(newStatus)) {
            // Check future assignments after effective date to warn/handle scheduling conflicts
            LocalDate effDate = transfer.getEffectiveDate();
            List<WorkforceAssignment> futureAssignments = assignmentRepository.findByEmployeeId(transfer.getEmployee().getId())
                    .stream()
                    .filter(a -> "ASSIGNED".equalsIgnoreCase(a.getStatus()) && !a.getAssignmentDate().isBefore(effDate))
                    .toList();

            // Notify employee of approval via Observer publisher
            notificationPublisher.publish(NotificationEvent.targeted(transfer.getEmployee(), transfer.getEmployee().getUser(),
                    "Transfer Request " + newStatus,
                    "Your transfer to " + transfer.getToLocation().getLocationName() + " has been " + newStatus
                            + " effective from " + effDate + ". Remarks: " + adminRemarks,
                    "SUCCESS", "/employee/schedule"));
        } else if ("REJECTED".equalsIgnoreCase(newStatus)) {
            notificationPublisher.publish(NotificationEvent.targeted(transfer.getEmployee(), transfer.getEmployee().getUser(),
                    "Transfer Request Rejected",
                    "Your transfer to " + transfer.getToLocation().getLocationName() + " was rejected. Reason: " + adminRemarks,
                    "WARNING", "/employee/schedule"));
        }

        auditLogRepository.save(new AuditLog(reviewedBy != null ? reviewedBy : "HR_MANAGER",
                "TRANSFER_WORKFLOW_" + newStatus.toUpperCase(), "INTERNAL",
                "Transfer #" + transferId + " for employee " + transfer.getEmployee().getEmployeeId() + " updated to " + newStatus));

        return transferRepository.save(transfer);
    }

    /**
     * FEATURE G - Attendance vs Shift Monitoring Reconciliation
     */
    public Map<String, Object> getAttendanceShiftReconciliation(LocalDate date, Integer graceMinutes) {
        int grace = (graceMinutes != null && graceMinutes >= 0) ? graceMinutes : DEFAULT_LATE_GRACE_MINUTES;
        List<Shift> shiftsOnDate = shiftRepository.findByShiftDate(date);
        List<Attendance> attendancesOnDate = attendanceRepository.findByAttendanceDate(date);

        Map<Long, Attendance> attendanceByEmpId = attendancesOnDate.stream()
                .collect(Collectors.toMap(a -> a.getEmployee().getId(), a -> a, (e1, e2) -> e1));

        Set<Long> scheduledEmpIds = new HashSet<>();
        List<Map<String, Object>> scheduledReconciliation = new ArrayList<>();

        int presentCount = 0;
        int lateCount = 0;
        int notMarkedCount = 0;
        int absentCount = 0;

        LocalTime nowTime = LocalTime.now();
        boolean isToday = date.isEqual(LocalDate.now());
        boolean isPast = date.isBefore(LocalDate.now());

        for (Shift s : shiftsOnDate) {
            List<WorkforceAssignment> asgs = assignmentRepository.findByShiftIdAndStatus(s.getId(), "ASSIGNED");
            for (WorkforceAssignment asg : asgs) {
                Employee emp = asg.getEmployee();
                scheduledEmpIds.add(emp.getId());

                Attendance att = attendanceByEmpId.get(emp.getId());
                String reconciledStatus;
                String note = "";

                if (att != null && att.getCheckInTime() != null) {
                    LocalTime lateThreshold = s.getStartTime().plusMinutes(grace);
                    if (att.getCheckInTime().isAfter(lateThreshold)) {
                        reconciledStatus = "LATE";
                        long minutesLate = Duration.between(s.getStartTime(), att.getCheckInTime()).toMinutes();
                        note = "Checked in " + minutesLate + "m after shift start";
                        lateCount++;
                    } else {
                        reconciledStatus = "PRESENT";
                        note = "On time (Check-in: " + att.getCheckInTime() + ")";
                        presentCount++;
                    }
                } else {
                    if (isToday && nowTime.isBefore(s.getEndTime())) {
                        reconciledStatus = "NOT_MARKED";
                        note = "Shift in progress / check-in pending";
                        notMarkedCount++;
                    } else {
                        reconciledStatus = "ABSENT";
                        note = "No attendance recorded for scheduled shift";
                        absentCount++;
                    }
                }

                Map<String, Object> item = new HashMap<>();
                item.put("shiftId", s.getId());
                item.put("shiftName", s.getShiftName());
                item.put("shiftHours", s.getStartTime() + " - " + s.getEndTime());
                item.put("location", s.getWorkLocation() != null ? s.getWorkLocation().getLocationName() : "General");
                item.put("employeeId", emp.getId());
                item.put("employeeCode", emp.getEmployeeId());
                item.put("employeeName", emp.getFullName());
                item.put("department", emp.getDepartment() != null ? emp.getDepartment().getName() : "General");
                item.put("checkInTime", att != null ? att.getCheckInTime() : null);
                item.put("reconciledStatus", reconciledStatus);
                item.put("note", note);
                scheduledReconciliation.add(item);
            }
        }

        // Detect NOT_SCHEDULED attendance (attended but not scheduled for any shift)
        List<Map<String, Object>> unscheduledAttendances = new ArrayList<>();
        for (Attendance att : attendancesOnDate) {
            if (!scheduledEmpIds.contains(att.getEmployee().getId())) {
                Map<String, Object> item = new HashMap<>();
                item.put("employeeId", att.getEmployee().getId());
                item.put("employeeCode", att.getEmployee().getEmployeeId());
                item.put("employeeName", att.getEmployee().getFullName());
                item.put("checkInTime", att.getCheckInTime());
                item.put("reconciledStatus", "NOT_SCHEDULED");
                item.put("note", "Attended without scheduled roster shift");
                unscheduledAttendances.add(item);
            }
        }

        Map<String, Object> report = new HashMap<>();
        report.put("date", date);
        report.put("graceMinutes", grace);
        report.put("summary", Map.of(
                "totalScheduled", scheduledEmpIds.size(),
                "present", presentCount,
                "late", lateCount,
                "notMarked", notMarkedCount,
                "absent", absentCount,
                "notScheduledAlerts", unscheduledAttendances.size()
        ));
        report.put("scheduledRoster", scheduledReconciliation);
        report.put("unscheduledAlerts", unscheduledAttendances);
        return report;
    }

    /**
     * FEATURE H - Operational Workforce Monitoring Dashboard Aggregator
     */
    public Map<String, Object> getOperationalDashboard(LocalDate date) {
        LocalDate queryDate = (date != null) ? date : LocalDate.now();
        List<Shift> shifts = shiftRepository.findByShiftDate(queryDate);

        int totalRequired = 0;
        int totalAssigned = 0;
        int understaffedShifts = 0;
        int fullyStaffedShifts = 0;
        int overstaffedShifts = 0;

        List<Map<String, Object>> shiftStatusList = new ArrayList<>();
        for (Shift s : shifts) {
            Map<String, Object> st = calculateStaffingStatus(s);
            st.put("locationName", s.getWorkLocation() != null ? s.getWorkLocation().getLocationName() : "General");
            st.put("startTime", s.getStartTime());
            st.put("endTime", s.getEndTime());
            shiftStatusList.add(st);

            int req = (Integer) st.get("requiredStaff");
            long asg = (Long) st.get("assignedStaff");
            totalRequired += req;
            totalAssigned += (int) asg;

            String status = (String) st.get("status");
            if ("UNDERSTAFFED".equals(status)) understaffedShifts++;
            else if ("FULLY_STAFFED".equals(status)) fullyStaffedShifts++;
            else if ("OVERSTAFFED".equals(status)) overstaffedShifts++;
        }

        long employeesOnLeave = leaveRequestRepository.findApprovedLeavesOnDate(queryDate).size();
        long pendingTransfers = transferRepository.findAll().stream()
                .filter(t -> "REQUESTED".equalsIgnoreCase(t.getStatus()) || "PENDING".equalsIgnoreCase(t.getStatus())).count();

        Map<String, Object> reconciliation = getAttendanceShiftReconciliation(queryDate, DEFAULT_LATE_GRACE_MINUTES);

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("date", queryDate);
        dashboard.put("metrics", Map.of(
                "totalShifts", shifts.size(),
                "totalRequiredStaff", totalRequired,
                "totalAssignedStaff", totalAssigned,
                "remainingStaffNeeded", Math.max(0, totalRequired - totalAssigned),
                "understaffedShifts", understaffedShifts,
                "fullyStaffedShifts", fullyStaffedShifts,
                "overstaffedShifts", overstaffedShifts,
                "employeesOnLeave", employeesOnLeave,
                "pendingTransfers", pendingTransfers
        ));
        dashboard.put("shifts", shiftStatusList);
        dashboard.put("attendanceSummary", reconciliation.get("summary"));
        dashboard.put("unscheduledAlerts", reconciliation.get("unscheduledAlerts"));
        return dashboard;
    }

    /**
     * FEATURE K - Employee Self-Service Schedule Security
     */
    public List<Map<String, Object>> getEmployeeOwnSchedule(UserPrincipal userPrincipal) {
        if (userPrincipal == null) {
            throw new BadRequestException("Unauthenticated access.");
        }

        Employee employee = employeeRepository.findByUserId(userPrincipal.getId())
                .orElseGet(() -> employeeRepository.findByEmail(userPrincipal.getEmail())
                        .orElseThrow(() -> new ResourceNotFoundException("No employee profile linked to current user account.")));

        List<WorkforceAssignment> assignments = assignmentRepository.findByEmployeeId(employee.getId());

        List<Map<String, Object>> scheduleList = new ArrayList<>();
        for (WorkforceAssignment asg : assignments) {
            Shift s = asg.getShift();
            Map<String, Object> item = new HashMap<>();
            item.put("assignmentId", asg.getId());
            item.put("assignmentDate", asg.getAssignmentDate());
            item.put("status", asg.getStatus());
            item.put("shiftId", s != null ? s.getId() : null);
            item.put("shiftName", s != null ? s.getShiftName() : "General Duty");
            item.put("shiftCode", s != null ? s.getShiftCode() : "GEN");
            item.put("startTime", s != null ? s.getStartTime() : "08:00");
            item.put("endTime", s != null ? s.getEndTime() : "17:00");
            item.put("workLocation", asg.getWorkLocation() != null ? asg.getWorkLocation().getLocationName() : "Main Office");
            item.put("address", asg.getWorkLocation() != null ? asg.getWorkLocation().getAddress() : "Colombo");
            scheduleList.add(item);
        }

        // Sort chronologically by assignmentDate then startTime
        scheduleList.sort((a, b) -> {
            LocalDate d1 = (LocalDate) a.get("assignmentDate");
            LocalDate d2 = (LocalDate) b.get("assignmentDate");
            int c = d1.compareTo(d2);
            if (c != 0) return c;
            Object t1 = a.get("startTime");
            Object t2 = b.get("startTime");
            String s1 = t1 != null ? t1.toString() : "";
            String s2 = t2 != null ? t2.toString() : "";
            return s1.compareTo(s2);
        });
        return scheduleList;
    }

    // Helper functions
    private boolean isTimeOverlapping(LocalTime startA, LocalTime endA, LocalTime startB, LocalTime endB) {
        return startA.isBefore(endB) && endA.isAfter(startB);
    }

    private double calculateShiftDurationHours(LocalTime start, LocalTime end) {
        Duration duration = Duration.between(start, end);
        if (duration.isNegative()) {
            duration = duration.plusHours(24);
        }
        return duration.toMinutes() / 60.0;
    }

    private double calculateWeeklyScheduledHours(Long employeeId, LocalDate date) {
        LocalDate startOfWeek = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endOfWeek = date.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        List<WorkforceAssignment> weekAssignments = assignmentRepository.findByEmployeeIdAndAssignmentDateBetween(employeeId, startOfWeek, endOfWeek);

        double totalHours = 0.0;
        for (WorkforceAssignment asg : weekAssignments) {
            if ("ASSIGNED".equalsIgnoreCase(asg.getStatus()) && asg.getShift() != null) {
                totalHours += calculateShiftDurationHours(asg.getShift().getStartTime(), asg.getShift().getEndTime());
            }
        }
        return totalHours;
    }

    private int calculateShiftsThisWeek(Long employeeId, LocalDate date) {
        LocalDate startOfWeek = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endOfWeek = date.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        List<WorkforceAssignment> weekAssignments = assignmentRepository.findByEmployeeIdAndAssignmentDateBetween(employeeId, startOfWeek, endOfWeek);
        return (int) weekAssignments.stream().filter(a -> "ASSIGNED".equalsIgnoreCase(a.getStatus())).count();
    }

    private boolean isSameWeek(LocalDate d1, LocalDate d2) {
        if (d1 == null || d2 == null) return false;
        LocalDate start1 = d1.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate start2 = d2.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return start1.isEqual(start2);
    }
}
