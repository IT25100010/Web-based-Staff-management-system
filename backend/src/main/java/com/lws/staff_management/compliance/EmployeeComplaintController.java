package com.lws.staff_management.compliance;

import com.lws.staff_management.compliance.dto.ComplaintResponseRequest;
import com.lws.staff_management.compliance.dto.CreateComplaintRequest;
import com.lws.staff_management.compliance.dto.UpdateComplaintStatusRequest;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.exception.ResourceNotFoundException;
import com.lws.staff_management.security.UserPrincipal;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/compliance/complaints")
public class EmployeeComplaintController {

    private final EmployeeComplaintService complaintService;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;

    public EmployeeComplaintController(EmployeeComplaintService complaintService,
                                       EmployeeRepository employeeRepository,
                                       UserRepository userRepository) {
        this.complaintService = complaintService;
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
    }

    // ==========================================
    // 1. EMPLOYEE SELF-SERVICE ENDPOINTS
    // ==========================================

    @PostMapping
    public ResponseEntity<EmployeeComplaint> submitComplaint(@RequestBody CreateComplaintRequest request,
                                                             @AuthenticationPrincipal UserPrincipal currentUser) {
        Employee employee = resolveCurrentEmployee(currentUser);
        EmployeeComplaint created = complaintService.createComplaint(employee, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/my")
    public ResponseEntity<List<EmployeeComplaint>> getMyComplaints(@AuthenticationPrincipal UserPrincipal currentUser) {
        Long empId = getLinkedEmployeeIdOrNull(currentUser);
        if (empId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(complaintService.getMyComplaints(empId));
    }

    @GetMapping("/my/{id}")
    public ResponseEntity<EmployeeComplaint> getMyComplaintById(@PathVariable Long id,
                                                                @AuthenticationPrincipal UserPrincipal currentUser) {
        Long empId = getLinkedEmployeeIdOrNull(currentUser);
        if (empId == null) {
            throw new AccessDeniedException("Not authenticated or no employee record found.");
        }
        return ResponseEntity.ok(complaintService.getMyComplaintById(id, empId));
    }

    // ==========================================
    // 2. HR MANAGEMENT ENDPOINTS
    // ==========================================

    @GetMapping
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN')")
    public ResponseEntity<List<EmployeeComplaint>> getAllComplaints(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(complaintService.getAllComplaints(status, category, search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeComplaint> getComplaintById(@PathVariable Long id,
                                                              @AuthenticationPrincipal UserPrincipal currentUser) {
        EmployeeComplaint complaint = complaintService.getComplaintById(id);

        if (isEmployeeUser(currentUser)) {
            Long empId = getLinkedEmployeeIdOrNull(currentUser);
            if (empId == null || complaint.getEmployee() == null || !empId.equals(complaint.getEmployee().getId())) {
                throw new AccessDeniedException("Access denied: You may only view your own complaints.");
            }
            return ResponseEntity.ok(complaint);
        }

        // Restrict management view strictly to HR_MANAGER and SENIOR_ADMIN
        boolean isAuthorized = isManagementUser(currentUser);
        if (!isAuthorized) {
            throw new AccessDeniedException("Access denied: Unauthorized to manage confidential employee complaints.");
        }

        return ResponseEntity.ok(complaint);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN')")
    public ResponseEntity<EmployeeComplaint> updateStatus(@PathVariable Long id,
                                                          @RequestBody UpdateComplaintStatusRequest request,
                                                          @AuthenticationPrincipal UserPrincipal currentUser) {
        User adminUser = resolveCurrentUser(currentUser);
        return ResponseEntity.ok(complaintService.updateStatus(id, request, adminUser));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN')")
    public ResponseEntity<EmployeeComplaint> updateStatusPut(@PathVariable Long id,
                                                             @RequestBody UpdateComplaintStatusRequest request,
                                                             @AuthenticationPrincipal UserPrincipal currentUser) {
        User adminUser = resolveCurrentUser(currentUser);
        return ResponseEntity.ok(complaintService.updateStatus(id, request, adminUser));
    }

    @PatchMapping("/{id}/response")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN')")
    public ResponseEntity<EmployeeComplaint> submitResponse(@PathVariable Long id,
                                                            @RequestBody ComplaintResponseRequest request,
                                                            @AuthenticationPrincipal UserPrincipal currentUser) {
        User adminUser = resolveCurrentUser(currentUser);
        return ResponseEntity.ok(complaintService.submitAdminResponse(id, request, adminUser));
    }

    @PutMapping("/{id}/response")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN')")
    public ResponseEntity<EmployeeComplaint> submitResponsePut(@PathVariable Long id,
                                                               @RequestBody ComplaintResponseRequest request,
                                                               @AuthenticationPrincipal UserPrincipal currentUser) {
        User adminUser = resolveCurrentUser(currentUser);
        return ResponseEntity.ok(complaintService.submitAdminResponse(id, request, adminUser));
    }

    // ==========================================
    // 3. SECURITY & PRINCIPAL HELPERS
    // ==========================================

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

    private boolean isManagementUser(UserPrincipal currentUser) {
        if (currentUser != null) {
            return "HR_MANAGER".equalsIgnoreCase(currentUser.getRole()) ||
                   "SENIOR_ADMIN".equalsIgnoreCase(currentUser.getRole());
        }
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            return auth.getAuthorities().stream().anyMatch(a ->
                    a.getAuthority().equals("ROLE_HR_MANAGER") || a.getAuthority().equals("ROLE_SENIOR_ADMIN"));
        }
        return false;
    }

    private Employee resolveCurrentEmployee(UserPrincipal currentUser) {
        if (currentUser != null) {
            return employeeRepository.findByUserId(currentUser.getId())
                    .or(() -> employeeRepository.findByEmailIgnoreCase(currentUser.getEmail()))
                    .orElseThrow(() -> new ResourceNotFoundException("No employee record linked to user: " + currentUser.getUsername()));
        }
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null) {
            String name = auth.getName();
            return employeeRepository.findByEmailIgnoreCase(name)
                    .or(() -> userRepository.findByUsernameOrEmailIgnoreCase(name, name)
                            .flatMap(u -> employeeRepository.findByUserId(u.getId())))
                    .orElseThrow(() -> new ResourceNotFoundException("No employee record linked to user: " + name));
        }
        throw new AccessDeniedException("Not authenticated");
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
            if (emp.isPresent()) {
                return emp.get().getId();
            }
            Optional<User> u = userRepository.findByUsername(name)
                    .or(() -> userRepository.findByEmail(name));
            if (u.isPresent()) {
                return employeeRepository.findByUserId(u.get().getId()).map(Employee::getId).orElse(null);
            }
        }
        return null;
    }

    private User resolveCurrentUser(UserPrincipal currentUser) {
        if (currentUser != null) {
            return userRepository.findById(currentUser.getId()).orElse(null);
        }
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null) {
            String name = auth.getName();
            return userRepository.findByUsername(name)
                    .or(() -> userRepository.findByEmail(name))
                    .orElse(null);
        }
        return null;
    }
}
