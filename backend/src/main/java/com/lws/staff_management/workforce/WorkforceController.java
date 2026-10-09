package com.lws.staff_management.workforce;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.exception.BadRequestException;
import com.lws.staff_management.exception.ResourceNotFoundException;
import com.lws.staff_management.notification.Notification;
import com.lws.staff_management.notification.NotificationRepository;
import com.lws.staff_management.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import com.lws.staff_management.notification.event.NotificationEvent;
import com.lws.staff_management.notification.publisher.NotificationPublisher;

@RestController
@RequestMapping("/api/workforce")
public class WorkforceController {

    private final WorkforcePlanRepository planRepository;
    private final WorkLocationRepository locationRepository;
    private final ShiftRepository shiftRepository;
    private final WorkforceAssignmentRepository assignmentRepository;
    private final EmployeeTransferRepository transferRepository;
    private final EmployeeReplacementRepository replacementRepository;
    private final OfficeMeetingRepository meetingRepository;
    private final StaffRecallRepository recallRepository;
    private final EmployeeRepository employeeRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationPublisher notificationPublisher;
    private final WorkforceService workforceService;

    public WorkforceController(WorkforcePlanRepository planRepository,
                               WorkLocationRepository locationRepository,
                               ShiftRepository shiftRepository,
                               WorkforceAssignmentRepository assignmentRepository,
                               EmployeeTransferRepository transferRepository,
                               EmployeeReplacementRepository replacementRepository,
                               OfficeMeetingRepository meetingRepository,
                               StaffRecallRepository recallRepository,
                               EmployeeRepository employeeRepository,
                               NotificationRepository notificationRepository,
                               NotificationPublisher notificationPublisher,
                               WorkforceService workforceService) {
        this.planRepository = planRepository;
        this.locationRepository = locationRepository;
        this.shiftRepository = shiftRepository;
        this.assignmentRepository = assignmentRepository;
        this.transferRepository = transferRepository;
        this.replacementRepository = replacementRepository;
        this.meetingRepository = meetingRepository;
        this.recallRepository = recallRepository;
        this.employeeRepository = employeeRepository;
        this.notificationRepository = notificationRepository;
        this.notificationPublisher = notificationPublisher;
        this.workforceService = workforceService;
    }

    // Workforce Plans
    @GetMapping("/plans")
    public ResponseEntity<List<WorkforcePlan>> getPlans() {
        return ResponseEntity.ok(planRepository.findAll());
    }

    @GetMapping("/plans/{id}")
    public ResponseEntity<WorkforcePlan> getPlanById(@PathVariable Long id) {
        WorkforcePlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workforce plan not found: " + id));
        return ResponseEntity.ok(plan);
    }

    @PostMapping("/plans")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createPlan(@RequestBody Map<String, Object> payload) {
        WorkforcePlan plan = new WorkforcePlan();
        plan.setPlanName((String) payload.get("planName"));
        plan.setStartDate(LocalDate.parse(payload.get("startDate").toString()));
        plan.setEndDate(LocalDate.parse(payload.get("endDate").toString()));
        plan.setRequiredHeadcount(Integer.parseInt(payload.get("requiredHeadcount").toString()));
        plan.setDescription((String) payload.get("description"));
        plan.setStatus((String) payload.getOrDefault("status", "ACTIVE"));
        return ResponseEntity.ok(planRepository.save(plan));
    }

    @PutMapping("/plans/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updatePlan(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        WorkforcePlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workforce plan not found: " + id));

        if (payload.containsKey("planName")) plan.setPlanName((String) payload.get("planName"));
        if (payload.containsKey("startDate")) plan.setStartDate(LocalDate.parse(payload.get("startDate").toString()));
        if (payload.containsKey("endDate")) plan.setEndDate(LocalDate.parse(payload.get("endDate").toString()));
        if (payload.containsKey("requiredHeadcount")) plan.setRequiredHeadcount(Integer.parseInt(payload.get("requiredHeadcount").toString()));
        if (payload.containsKey("description")) plan.setDescription((String) payload.get("description"));
        if (payload.containsKey("status")) plan.setStatus((String) payload.get("status"));

        return ResponseEntity.ok(planRepository.save(plan));
    }

    @DeleteMapping("/plans/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deletePlan(@PathVariable Long id) {
        WorkforcePlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workforce plan not found: " + id));
        if (locationRepository.existsByWorkforcePlanId(id)) {
            throw new BadRequestException("Cannot delete this workforce plan because active locations are linked to it.");
        }
        planRepository.delete(plan);
        return ResponseEntity.ok(Map.of("message", "Workforce plan deleted successfully."));
    }

    // Work Locations
    @GetMapping("/locations")
    public ResponseEntity<List<WorkLocation>> getLocations() {
        return ResponseEntity.ok(locationRepository.findAll());
    }

    @GetMapping("/locations/{id}")
    public ResponseEntity<WorkLocation> getLocationById(@PathVariable Long id) {
        WorkLocation loc = locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + id));
        return ResponseEntity.ok(loc);
    }

    @PostMapping("/locations")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createLocation(@RequestBody Map<String, Object> payload) {
        if (payload.get("workforcePlanId") == null || payload.get("workforcePlanId").toString().trim().isEmpty()) {
            throw new BadRequestException("Please select an existing Workforce Plan.");
        }

        Long planId = Long.valueOf(payload.get("workforcePlanId").toString().trim());
        WorkforcePlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("Workforce plan not found with id: " + planId));

        WorkLocation loc = new WorkLocation();
        String locCode = (String) payload.get("locationCode");
        if (locCode == null || locCode.trim().isEmpty()) {
            locCode = "LOC-" + System.currentTimeMillis() % 100000;
        }
        loc.setLocationCode(locCode);
        loc.setLocationName((String) payload.get("locationName"));
        loc.setAddress((String) payload.get("address"));
        loc.setContactPerson((String) payload.get("contactPerson"));
        loc.setContactPhone((String) payload.get("contactPhone"));
        loc.setWorkforcePlan(plan);
        loc.setCapacity(plan.getRequiredHeadcount());
        loc.setStatus((String) payload.getOrDefault("status", "ACTIVE"));
        return ResponseEntity.ok(locationRepository.save(loc));
    }

    @PutMapping("/locations/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateLocation(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        WorkLocation loc = locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + id));

        WorkforcePlan plan = loc.getWorkforcePlan();
        if (payload.containsKey("workforcePlanId") && payload.get("workforcePlanId") != null && !payload.get("workforcePlanId").toString().trim().isEmpty()) {
            Long planId = Long.valueOf(payload.get("workforcePlanId").toString().trim());
            plan = planRepository.findById(planId)
                    .orElseThrow(() -> new ResourceNotFoundException("Workforce plan not found with id: " + planId));
            loc.setWorkforcePlan(plan);
            loc.setCapacity(plan.getRequiredHeadcount());
        }

        if (payload.containsKey("locationCode")) loc.setLocationCode((String) payload.get("locationCode"));
        if (payload.containsKey("locationName")) loc.setLocationName((String) payload.get("locationName"));
        if (payload.containsKey("address")) loc.setAddress((String) payload.get("address"));
        if (payload.containsKey("contactPerson")) loc.setContactPerson((String) payload.get("contactPerson"));
        if (payload.containsKey("contactPhone")) loc.setContactPhone((String) payload.get("contactPhone"));
        if (payload.containsKey("status")) loc.setStatus((String) payload.get("status"));

        if (plan != null) {
            loc.setCapacity(plan.getRequiredHeadcount());
        }

        return ResponseEntity.ok(locationRepository.save(loc));
    }

    @DeleteMapping("/locations/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteLocation(@PathVariable Long id) {
        WorkLocation loc = locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + id));

        boolean hasShifts = shiftRepository.existsByWorkLocationId(id);
        boolean hasAssignments = assignmentRepository.existsByWorkLocationId(id);

        if (hasShifts || hasAssignments) {
            loc.setStatus("INACTIVE");
            locationRepository.save(loc);
            return ResponseEntity.ok(Map.of("message", "Location has linked shifts/assignments and was deactivated (set to INACTIVE) instead of deleted to protect historical schedules.", "status", "DEACTIVATED"));
        }

        locationRepository.delete(loc);
        return ResponseEntity.ok(Map.of("message", "Location deleted successfully.", "status", "DELETED"));
    }

    // Shifts
    @GetMapping("/shifts")
    public ResponseEntity<List<Shift>> getShifts(@RequestParam(required = false) String date) {
        if (date != null && !date.isEmpty()) {
            return ResponseEntity.ok(shiftRepository.findByShiftDate(LocalDate.parse(date)));
        }
        return ResponseEntity.ok(shiftRepository.findAll());
    }

    @GetMapping("/shifts/{id}")
    public ResponseEntity<Shift> getShiftById(@PathVariable Long id) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + id));
        return ResponseEntity.ok(shift);
    }

    @PostMapping("/shifts")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createShift(@RequestBody Map<String, Object> payload) {
        if (payload.get("workLocationId") == null || payload.get("workLocationId").toString().trim().isEmpty()) {
            throw new BadRequestException("Please select a work location.");
        }
        if (payload.get("shiftDate") == null || payload.get("shiftDate").toString().trim().isEmpty()) {
            throw new BadRequestException("Please select a shift date.");
        }
        if (payload.get("startTime") == null || payload.get("endTime") == null) {
            throw new BadRequestException("Start time and end time are required.");
        }

        LocalTime startTime = LocalTime.parse(payload.get("startTime").toString());
        LocalTime endTime = LocalTime.parse(payload.get("endTime").toString());
        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException("Shift end time must be after start time.");
        }

        Long locationId = Long.valueOf(payload.get("workLocationId").toString().trim());
        WorkLocation loc = locationRepository.findById(locationId)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + locationId));

        LocalDate shiftDate = LocalDate.parse(payload.get("shiftDate").toString().trim());

        WorkforcePlan plan = loc.getWorkforcePlan();
        if (plan != null) {
            if (shiftDate.isBefore(plan.getStartDate()) || shiftDate.isAfter(plan.getEndDate())) {
                throw new BadRequestException("Shift date must be within the selected Workforce Plan date range.");
            }
        }

        Shift shift = new Shift();
        shift.setShiftCode("SHF-" + System.currentTimeMillis() % 100000);
        shift.setShiftName((String) payload.get("shiftName"));
        shift.setShiftDate(shiftDate);
        shift.setStartTime(startTime);
        shift.setEndTime(endTime);
        shift.setWorkLocation(loc);
        shift.setRequiredEmployees(loc.getCapacity());
        shift.setStatus((String) payload.getOrDefault("status", "SCHEDULED"));
        return ResponseEntity.ok(shiftRepository.save(shift));
    }

    @PutMapping("/shifts/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateShift(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + id));

        WorkLocation loc = shift.getWorkLocation();
        if (payload.containsKey("workLocationId") && payload.get("workLocationId") != null && !payload.get("workLocationId").toString().trim().isEmpty()) {
            Long locId = Long.valueOf(payload.get("workLocationId").toString().trim());
            loc = locationRepository.findById(locId)
                    .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + locId));
            shift.setWorkLocation(loc);
        }

        if (payload.containsKey("shiftDate") && payload.get("shiftDate") != null && !payload.get("shiftDate").toString().trim().isEmpty()) {
            LocalDate shiftDate = LocalDate.parse(payload.get("shiftDate").toString().trim());
            if (loc != null && loc.getWorkforcePlan() != null) {
                WorkforcePlan planInLoc = loc.getWorkforcePlan();
                if (shiftDate.isBefore(planInLoc.getStartDate()) || shiftDate.isAfter(planInLoc.getEndDate())) {
                    throw new BadRequestException("Shift date must be within the selected Workforce Plan date range.");
                }
            }
            shift.setShiftDate(shiftDate);
        }

        LocalTime startTime = shift.getStartTime();
        LocalTime endTime = shift.getEndTime();
        if (payload.containsKey("startTime")) startTime = LocalTime.parse(payload.get("startTime").toString());
        if (payload.containsKey("endTime")) endTime = LocalTime.parse(payload.get("endTime").toString());
        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException("Shift end time must be after start time.");
        }
        shift.setStartTime(startTime);
        shift.setEndTime(endTime);

        if (payload.containsKey("shiftName")) shift.setShiftName((String) payload.get("shiftName"));
        if (payload.containsKey("status")) shift.setStatus((String) payload.get("status"));

        if (loc != null) {
            shift.setRequiredEmployees(loc.getCapacity());
        }

        return ResponseEntity.ok(shiftRepository.save(shift));
    }

    @DeleteMapping("/shifts/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteShift(@PathVariable Long id) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + id));

        if (assignmentRepository.existsByShiftId(id)) {
            shift.setStatus("CANCELLED");
            shiftRepository.save(shift);
            return ResponseEntity.ok(Map.of("message", "Shift has assigned employees and was set to CANCELLED instead of deleted to protect workforce assignment records.", "status", "CANCELLED"));
        }

        shiftRepository.delete(shift);
        return ResponseEntity.ok(Map.of("message", "Shift deleted successfully.", "status", "DELETED"));
    }

    // FEATURE D - Shift Staffing Status
    @GetMapping("/shifts/{shiftId}/staffing-status")
    public ResponseEntity<?> getShiftStaffingStatus(@PathVariable Long shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + shiftId));
        return ResponseEntity.ok(workforceService.calculateStaffingStatus(shift));
    }

    // FEATURE B & C - Available Employee Suggestions with Workload Fairness
    @GetMapping("/shifts/{shiftId}/available-employees")
    public ResponseEntity<?> getAvailableEmployeesForShift(@PathVariable Long shiftId) {
        return ResponseEntity.ok(workforceService.getAvailableEmployeesForShift(shiftId));
    }

    // FEATURE E - Automatic Replacement Suggestions & Confirmation
    @GetMapping("/shifts/{shiftId}/replacement-suggestions")
    public ResponseEntity<?> getReplacementSuggestions(@PathVariable Long shiftId, @RequestParam Long employeeId) {
        return ResponseEntity.ok(workforceService.getReplacementSuggestions(shiftId, employeeId));
    }

    @PostMapping("/shifts/{shiftId}/confirm-replacement")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> confirmReplacement(@PathVariable Long shiftId,
                                                @RequestBody Map<String, Object> payload,
                                                @AuthenticationPrincipal UserPrincipal principal) {
        if (payload.get("originalEmployeeId") == null || payload.get("replacementEmployeeId") == null) {
            throw new BadRequestException("Original and Replacement Employee IDs are required.");
        }
        Long origId = Long.valueOf(payload.get("originalEmployeeId").toString().trim());
        Long repId = Long.valueOf(payload.get("replacementEmployeeId").toString().trim());
        String reason = (String) payload.getOrDefault("reason", "Operational replacement");
        String confirmedBy = principal != null ? principal.getUsername() : "OPERATIONS_MANAGER";

        return ResponseEntity.ok(workforceService.confirmReplacement(shiftId, origId, repId, reason, confirmedBy));
    }

    // Employee Assignments with FEATURE A Smart Validations
    @GetMapping("/assignments")
    public ResponseEntity<List<WorkforceAssignment>> getAssignments(@RequestParam(required = false) String date) {
        if (date != null && !date.isEmpty()) {
            return ResponseEntity.ok(assignmentRepository.findByAssignmentDate(LocalDate.parse(date)));
        }
        return ResponseEntity.ok(assignmentRepository.findAll());
    }

    @GetMapping("/assignments/{id}")
    public ResponseEntity<WorkforceAssignment> getAssignmentById(@PathVariable Long id,
                                                                 @AuthenticationPrincipal UserPrincipal principal) {
        WorkforceAssignment asg = assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + id));

        // If employee role, ensure ownership
        if (principal != null && principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_EMPLOYEE"))) {
            Employee emp = employeeRepository.findByUserId(principal.getId())
                    .orElseGet(() -> employeeRepository.findByEmail(principal.getEmail()).orElse(null));
            if (emp == null || !asg.getEmployee().getId().equals(emp.getId())) {
                throw new BadRequestException("Access denied: You can only view your own assignments.");
            }
        }
        return ResponseEntity.ok(asg);
    }

    @PostMapping("/assignments")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> assignEmployee(@RequestBody Map<String, Object> payload,
                                            @AuthenticationPrincipal UserPrincipal principal) {
        if (payload.get("employeeId") == null || payload.get("employeeId").toString().trim().isEmpty()) {
            throw new BadRequestException("Please select an employee.");
        }
        if (payload.get("shiftId") == null || payload.get("shiftId").toString().trim().isEmpty()) {
            throw new BadRequestException("Please select a shift.");
        }

        Long employeeId = Long.valueOf(payload.get("employeeId").toString().trim());
        Long shiftId = Long.valueOf(payload.get("shiftId").toString().trim());
        LocalDate assignmentDate = (payload.get("assignmentDate") != null && !payload.get("assignmentDate").toString().trim().isEmpty())
                ? LocalDate.parse(payload.get("assignmentDate").toString().trim())
                : null;

        String assignedBy = (principal != null) ? principal.getUsername() : "OPERATIONS_MANAGER";

        // Delegate to WorkforceService for smart validations
        WorkforceAssignment saved = workforceService.validateAndAssignEmployee(shiftId, employeeId, assignmentDate, assignedBy);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/assignments/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateAssignment(@PathVariable Long id, @RequestBody Map<String, Object> payload,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        Long shiftId = (payload.containsKey("shiftId") && payload.get("shiftId") != null && !payload.get("shiftId").toString().trim().isEmpty())
                ? Long.valueOf(payload.get("shiftId").toString().trim()) : null;
        LocalDate assignmentDate = (payload.containsKey("assignmentDate") && payload.get("assignmentDate") != null && !payload.get("assignmentDate").toString().trim().isEmpty())
                ? LocalDate.parse(payload.get("assignmentDate").toString().trim()) : null;
        String status = (String) payload.get("status");
        String updatedBy = (principal != null) ? principal.getUsername() : "OPERATIONS_MANAGER";

        WorkforceAssignment updated = workforceService.validateAndUpdateAssignment(id, shiftId, assignmentDate, status, updatedBy);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/assignments/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteAssignment(@PathVariable Long id) {
        WorkforceAssignment asg = assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + id));
        assignmentRepository.delete(asg);
        return ResponseEntity.ok(Map.of("message", "Workforce assignment deleted successfully."));
    }

    // FEATURE F - Employee Transfer Workflow
    @GetMapping("/transfers")
    public ResponseEntity<List<EmployeeTransfer>> getTransfers() {
        return ResponseEntity.ok(transferRepository.findAll());
    }

    @GetMapping("/transfers/{id}")
    public ResponseEntity<EmployeeTransfer> getTransferById(@PathVariable Long id) {
        EmployeeTransfer transfer = transferRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer not found: " + id));
        return ResponseEntity.ok(transfer);
    }

    @PostMapping("/transfers")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createTransfer(@RequestBody Map<String, Object> payload,
                                            @AuthenticationPrincipal UserPrincipal principal) {
        if (payload.get("employeeId") == null || payload.get("employeeId").toString().trim().isEmpty()) {
            throw new BadRequestException("Please select an employee.");
        }
        if (payload.get("fromLocationId") == null || payload.get("fromLocationId").toString().trim().isEmpty()) {
            throw new BadRequestException("Please select the origin location.");
        }
        if (payload.get("toLocationId") == null || payload.get("toLocationId").toString().trim().isEmpty()) {
            throw new BadRequestException("Please select the destination location.");
        }
        if (payload.get("transferDate") == null || payload.get("transferDate").toString().trim().isEmpty()) {
            throw new BadRequestException("Please enter transfer date.");
        }

        Long employeeId = Long.valueOf(payload.get("employeeId").toString().trim());
        Long fromLocId = Long.valueOf(payload.get("fromLocationId").toString().trim());
        Long toLocId = Long.valueOf(payload.get("toLocationId").toString().trim());
        LocalDate transferDate = LocalDate.parse(payload.get("transferDate").toString().trim());
        LocalDate effectiveDate = payload.get("effectiveDate") != null ? LocalDate.parse(payload.get("effectiveDate").toString().trim()) : transferDate;
        String reason = (String) payload.getOrDefault("reason", "");

        if (fromLocId.equals(toLocId)) {
            throw new BadRequestException("Origin location and destination location cannot be the same.");
        }

        Employee emp = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        if (emp.getEmploymentStatus() == null || !"ACTIVE".equalsIgnoreCase(emp.getEmploymentStatus().trim())) {
            throw new BadRequestException("Cannot transfer an inactive employee.");
        }

        boolean hasPending = transferRepository.findByEmployeeId(employeeId).stream()
                .anyMatch(t -> "REQUESTED".equalsIgnoreCase(t.getStatus()) || "PENDING".equalsIgnoreCase(t.getStatus()));
        if (hasPending) {
            throw new BadRequestException("A pending transfer request already exists for this employee.");
        }

        WorkLocation fromLoc = locationRepository.findById(fromLocId)
                .orElseThrow(() -> new ResourceNotFoundException("Origin location not found: " + fromLocId));
        WorkLocation toLoc = locationRepository.findById(toLocId)
                .orElseThrow(() -> new ResourceNotFoundException("Target location not found: " + toLocId));

        String requester = principal != null ? principal.getUsername() : "OPERATIONS_MANAGER";

        EmployeeTransfer transfer = new EmployeeTransfer();
        transfer.setEmployee(emp);
        transfer.setFromLocation(fromLoc);
        transfer.setToLocation(toLoc);
        transfer.setTransferDate(transferDate);
        transfer.setEffectiveDate(effectiveDate);
        transfer.setReason(reason);
        transfer.setRequestedBy(requester);
        transfer.setStatus("REQUESTED");

        EmployeeTransfer savedTransfer = transferRepository.save(transfer);

        // Notify employee via Observer publisher with employee-accessible route
        notificationPublisher.publish(NotificationEvent.targeted(emp, emp.getUser(),
                "Transfer Request Submitted",
                "A transfer request to " + toLoc.getLocationName() + " has been initiated for effective date: " + effectiveDate,
                "INFO", "/employee/schedule"));

        return ResponseEntity.ok(savedTransfer);
    }

    @PostMapping("/transfers/{id}/approve")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> approveTransfer(@PathVariable Long id,
                                            @RequestBody(required = false) Map<String, Object> payload,
                                            @AuthenticationPrincipal UserPrincipal principal) {
        String remarks = (payload != null && payload.containsKey("adminRemarks")) ? payload.get("adminRemarks").toString() : "Approved by Manager";
        String reviewer = (principal != null) ? principal.getUsername() : "OPERATIONS_MANAGER";
        return ResponseEntity.ok(workforceService.processTransferAction(id, "APPROVED", remarks, reviewer));
    }

    @PostMapping("/transfers/{id}/reject")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> rejectTransfer(@PathVariable Long id,
                                           @RequestBody(required = false) Map<String, Object> payload,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        String remarks = (payload != null && payload.containsKey("adminRemarks")) ? payload.get("adminRemarks").toString() : "Rejected by Manager";
        String reviewer = (principal != null) ? principal.getUsername() : "OPERATIONS_MANAGER";
        return ResponseEntity.ok(workforceService.processTransferAction(id, "REJECTED", remarks, reviewer));
    }

    @PutMapping("/transfers/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateTransfer(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        EmployeeTransfer transfer = transferRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer not found: " + id));

        if (payload.containsKey("transferDate")) transfer.setTransferDate(LocalDate.parse(payload.get("transferDate").toString()));
        if (payload.containsKey("effectiveDate")) transfer.setEffectiveDate(LocalDate.parse(payload.get("effectiveDate").toString()));
        if (payload.containsKey("reason")) transfer.setReason((String) payload.get("reason"));
        if (payload.containsKey("status")) transfer.setStatus((String) payload.get("status"));
        if (payload.containsKey("adminRemarks")) transfer.setAdminRemarks((String) payload.get("adminRemarks"));

        if (payload.containsKey("fromLocationId") && payload.get("fromLocationId") != null) {
            WorkLocation fromLoc = locationRepository.findById(Long.valueOf(payload.get("fromLocationId").toString()))
                    .orElseThrow(() -> new ResourceNotFoundException("Origin location not found"));
            transfer.setFromLocation(fromLoc);
        }
        if (payload.containsKey("toLocationId") && payload.get("toLocationId") != null) {
            WorkLocation toLoc = locationRepository.findById(Long.valueOf(payload.get("toLocationId").toString()))
                    .orElseThrow(() -> new ResourceNotFoundException("Target location not found"));
            transfer.setToLocation(toLoc);
        }

        return ResponseEntity.ok(transferRepository.save(transfer));
    }

    @DeleteMapping("/transfers/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteTransfer(@PathVariable Long id) {
        EmployeeTransfer transfer = transferRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer not found: " + id));
        transferRepository.delete(transfer);
        return ResponseEntity.ok(Map.of("message", "Transfer record deleted successfully."));
    }

    // Replacements
    @GetMapping("/replacements")
    public ResponseEntity<List<EmployeeReplacement>> getReplacements() {
        return ResponseEntity.ok(replacementRepository.findAll());
    }

    @GetMapping("/replacements/{id}")
    public ResponseEntity<EmployeeReplacement> getReplacementById(@PathVariable Long id) {
        EmployeeReplacement rep = replacementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Replacement not found: " + id));
        return ResponseEntity.ok(rep);
    }

    @DeleteMapping("/replacements/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteReplacement(@PathVariable Long id) {
        EmployeeReplacement rep = replacementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Replacement not found: " + id));
        replacementRepository.delete(rep);
        return ResponseEntity.ok(Map.of("message", "Replacement record deleted successfully."));
    }

    // Office Meetings
    @GetMapping("/meetings")
    public ResponseEntity<List<OfficeMeeting>> getMeetings() {
        return ResponseEntity.ok(meetingRepository.findAll());
    }

    @GetMapping("/meetings/{id}")
    public ResponseEntity<OfficeMeeting> getMeetingById(@PathVariable Long id) {
        OfficeMeeting meeting = meetingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting not found: " + id));
        return ResponseEntity.ok(meeting);
    }

    @PostMapping("/meetings")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createMeeting(@RequestBody Map<String, Object> payload) {
        if (payload.get("title") == null || payload.get("title").toString().trim().isEmpty()) {
            throw new BadRequestException("Meeting title is required.");
        }
        if (payload.get("meetingDate") == null || payload.get("meetingDate").toString().trim().isEmpty()) {
            throw new BadRequestException("Meeting date is required.");
        }
        if (payload.get("startTime") == null || payload.get("endTime") == null) {
            throw new BadRequestException("Start time and end time are required.");
        }
        LocalTime startTime = LocalTime.parse(payload.get("startTime").toString());
        LocalTime endTime = LocalTime.parse(payload.get("endTime").toString());
        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException("Meeting end time must be after start time.");
        }

        OfficeMeeting meeting = new OfficeMeeting();
        meeting.setTitle((String) payload.get("title"));
        meeting.setMeetingDate(LocalDate.parse(payload.get("meetingDate").toString()));
        meeting.setStartTime(startTime);
        meeting.setEndTime(endTime);
        meeting.setLocation((String) payload.get("location"));
        meeting.setRequiredEmployees((String) payload.get("requiredEmployees"));
        meeting.setDescription((String) payload.get("description"));
        meeting.setStatus("SCHEDULED");
        return ResponseEntity.ok(meetingRepository.save(meeting));
    }

    @PutMapping("/meetings/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateMeeting(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        OfficeMeeting meeting = meetingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting not found: " + id));

        LocalTime startTime = meeting.getStartTime();
        LocalTime endTime = meeting.getEndTime();
        if (payload.containsKey("startTime")) startTime = LocalTime.parse(payload.get("startTime").toString());
        if (payload.containsKey("endTime")) endTime = LocalTime.parse(payload.get("endTime").toString());
        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException("Meeting end time must be after start time.");
        }
        meeting.setStartTime(startTime);
        meeting.setEndTime(endTime);

        if (payload.containsKey("title")) meeting.setTitle((String) payload.get("title"));
        if (payload.containsKey("meetingDate")) meeting.setMeetingDate(LocalDate.parse(payload.get("meetingDate").toString()));
        if (payload.containsKey("location")) meeting.setLocation((String) payload.get("location"));
        if (payload.containsKey("requiredEmployees")) meeting.setRequiredEmployees((String) payload.get("requiredEmployees"));
        if (payload.containsKey("description")) meeting.setDescription((String) payload.get("description"));
        if (payload.containsKey("status")) meeting.setStatus((String) payload.get("status"));

        return ResponseEntity.ok(meetingRepository.save(meeting));
    }

    @DeleteMapping("/meetings/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteMeeting(@PathVariable Long id) {
        OfficeMeeting meeting = meetingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting not found: " + id));
        meetingRepository.delete(meeting);
        return ResponseEntity.ok(Map.of("message", "Office meeting deleted successfully."));
    }

    // Emergency Staff Recalls
    @GetMapping("/recalls")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<List<StaffRecall>> getRecalls() {
        return ResponseEntity.ok(recallRepository.findAll());
    }

    @GetMapping("/my-recalls")
    public ResponseEntity<List<StaffRecall>> getMyRecalls(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long myEmpId = null;
        if (userPrincipal != null) {
            myEmpId = employeeRepository.findByUserId(userPrincipal.getId())
                    .or(() -> employeeRepository.findByEmailIgnoreCase(userPrincipal.getEmail()))
                    .map(Employee::getId)
                    .orElse(null);
        } else {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null && !"anonymousUser".equals(auth.getName())) {
                String name = auth.getName();
                myEmpId = employeeRepository.findByEmailIgnoreCase(name)
                        .map(Employee::getId)
                        .orElse(null);
            }
        }

        if (myEmpId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        return ResponseEntity.ok(recallRepository.findRecallsForEmployee(myEmpId));
    }

    @GetMapping("/recalls/{id}")
    public ResponseEntity<StaffRecall> getRecallById(@PathVariable Long id,
                                                     @AuthenticationPrincipal UserPrincipal userPrincipal) {
        StaffRecall recall = recallRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recall not found: " + id));

        if (userPrincipal != null && "EMPLOYEE".equalsIgnoreCase(userPrincipal.getRole())) {
            Long myEmpId = employeeRepository.findByUserId(userPrincipal.getId())
                    .or(() -> employeeRepository.findByEmailIgnoreCase(userPrincipal.getEmail()))
                    .map(Employee::getId)
                    .orElse(null);

            boolean isRecipient = myEmpId != null && recall.getRecipients() != null &&
                    recall.getRecipients().stream().anyMatch(e -> e.getId().equals(myEmpId));
            boolean isBroadcast = Boolean.TRUE.equals(recall.getIsBroadcast());

            if (!isRecipient && !isBroadcast) {
                throw new org.springframework.security.access.AccessDeniedException("Access denied: You may only view recalls targeted to you or company-wide broadcasts.");
            }
        }

        return ResponseEntity.ok(recall);
    }

    @PostMapping("/recalls")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<?> createRecall(@RequestBody Map<String, Object> payload) {
        StaffRecall recall = new StaffRecall();
        recall.setRecallTitle((String) payload.get("recallTitle"));
        recall.setRecallDate(LocalDate.parse(payload.get("recallDate").toString()));
        recall.setRecallTime(LocalTime.parse(payload.get("recallTime").toString()));
        recall.setLocation((String) payload.get("location"));
        recall.setPriority((String) payload.getOrDefault("priority", "URGENT"));
        recall.setReason((String) payload.get("reason"));
        recall.setStatus("ACTIVE");

        boolean isBroadcast = false;
        if (payload.containsKey("isBroadcast") && payload.get("isBroadcast") != null) {
            isBroadcast = Boolean.parseBoolean(payload.get("isBroadcast").toString());
        }

        List<Long> recipientIds = new ArrayList<>();
        if (payload.containsKey("recipientIds") && payload.get("recipientIds") instanceof List<?> list) {
            for (Object item : list) {
                if (item != null && !item.toString().trim().isEmpty()) {
                    recipientIds.add(Long.valueOf(item.toString().trim()));
                }
            }
        }

        if (recipientIds.isEmpty()) {
            isBroadcast = true;
        }

        recall.setIsBroadcast(isBroadcast);

        Set<Employee> recipients = new HashSet<>();
        if (!isBroadcast && !recipientIds.isEmpty()) {
            recipients.addAll(employeeRepository.findAllById(recipientIds));
            recall.setRecipients(recipients);
            String targetNames = recipients.stream().map(Employee::getFullName).collect(java.util.stream.Collectors.joining(", "));
            recall.setTargetEmployees(targetNames);
        } else {
            recall.setTargetEmployees((String) payload.getOrDefault("targetEmployees", "All Staff"));
        }

        StaffRecall saved = recallRepository.save(recall);

        if (isBroadcast) {
            notificationPublisher.publish(NotificationEvent.broadcast(
                    "🚨 Emergency Staff Recall: " + saved.getRecallTitle(),
                    "Priority: " + saved.getPriority() + " at " + saved.getLocation() + " on " + saved.getRecallDate() + " " + saved.getRecallTime() + ". Reason: " + saved.getReason(),
                    "RECALL",
                    "/employee/schedule"
            ));
        } else {
            for (Employee recipient : recipients) {
                notificationPublisher.publish(NotificationEvent.targeted(
                        recipient,
                        recipient.getUser(),
                        "🚨 Emergency Staff Recall: " + saved.getRecallTitle(),
                        "You have been recalled! Priority: " + saved.getPriority() + " at " + saved.getLocation() + " on " + saved.getRecallDate() + " " + saved.getRecallTime() + ". Reason: " + saved.getReason(),
                        "RECALL",
                        "/employee/schedule"
                ));
            }
        }

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/recalls/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateRecall(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        StaffRecall recall = recallRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recall not found: " + id));

        if (payload.containsKey("recallTitle")) recall.setRecallTitle((String) payload.get("recallTitle"));
        if (payload.containsKey("recallDate")) recall.setRecallDate(LocalDate.parse(payload.get("recallDate").toString()));
        if (payload.containsKey("recallTime")) recall.setRecallTime(LocalTime.parse(payload.get("recallTime").toString()));
        if (payload.containsKey("location")) recall.setLocation((String) payload.get("location"));
        if (payload.containsKey("priority")) recall.setPriority((String) payload.get("priority"));
        if (payload.containsKey("reason")) recall.setReason((String) payload.get("reason"));
        if (payload.containsKey("status")) recall.setStatus((String) payload.get("status"));

        if (payload.containsKey("isBroadcast")) {
            recall.setIsBroadcast(Boolean.parseBoolean(payload.get("isBroadcast").toString()));
        }

        if (payload.containsKey("recipientIds") && payload.get("recipientIds") instanceof List<?> list) {
            List<Long> recipientIds = new ArrayList<>();
            for (Object item : list) {
                if (item != null && !item.toString().trim().isEmpty()) {
                    recipientIds.add(Long.valueOf(item.toString().trim()));
                }
            }
            if (!recipientIds.isEmpty()) {
                Set<Employee> recipients = new HashSet<>(employeeRepository.findAllById(recipientIds));
                recall.setRecipients(recipients);
                recall.setIsBroadcast(false);
                recall.setTargetEmployees(recipients.stream().map(Employee::getFullName).collect(java.util.stream.Collectors.joining(", ")));
            } else {
                recall.setRecipients(new HashSet<>());
                recall.setIsBroadcast(true);
            }
        }

        if (payload.containsKey("targetEmployees")) {
            recall.setTargetEmployees((String) payload.get("targetEmployees"));
        }

        return ResponseEntity.ok(recallRepository.save(recall));
    }

    @DeleteMapping("/recalls/{id}")
    @PreAuthorize("hasAnyRole('OPERATIONS_MANAGER', 'HR_MANAGER', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteRecall(@PathVariable Long id) {
        StaffRecall recall = recallRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recall not found: " + id));
        recallRepository.delete(recall);
        return ResponseEntity.ok(Map.of("message", "Staff recall deleted successfully."));
    }

    // FEATURE G - Attendance vs Shift Monitoring Reconciliation
    @GetMapping("/attendance-monitoring")
    public ResponseEntity<?> getAttendanceMonitoring(@RequestParam(required = false) String date,
                                                     @RequestParam(required = false) Integer graceMinutes) {
        LocalDate queryDate = (date != null && !date.trim().isEmpty()) ? LocalDate.parse(date.trim()) : LocalDate.now();
        return ResponseEntity.ok(workforceService.getAttendanceShiftReconciliation(queryDate, graceMinutes));
    }

    // FEATURE H - Operational Workforce Monitoring Dashboard Aggregator
    @GetMapping("/operational-dashboard")
    public ResponseEntity<?> getOperationalDashboard(@RequestParam(required = false) String date) {
        LocalDate queryDate = (date != null && !date.trim().isEmpty()) ? LocalDate.parse(date.trim()) : LocalDate.now();
        return ResponseEntity.ok(workforceService.getOperationalDashboard(queryDate));
    }

    // Preserving compatibility for existing daily-monitoring endpoint
    @GetMapping("/daily-monitoring")
    public ResponseEntity<Map<String, Object>> getDailyMonitoring() {
        return ResponseEntity.ok(workforceService.getOperationalDashboard(LocalDate.now()));
    }

    // FEATURE K - Employee Self-Service Schedule
    @GetMapping("/my-schedule")
    public ResponseEntity<?> getMySchedule(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(workforceService.getEmployeeOwnSchedule(userPrincipal));
    }
}
