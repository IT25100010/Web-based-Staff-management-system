package com.lws.staff_management.compliance;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.exception.BadRequestException;
import com.lws.staff_management.exception.ResourceNotFoundException;
import com.lws.staff_management.notification.Notification;
import com.lws.staff_management.notification.NotificationRepository;
import com.lws.staff_management.security.UserPrincipal;
import com.lws.staff_management.user.UserRepository;
import com.lws.staff_management.notification.event.NotificationEvent;
import com.lws.staff_management.notification.publisher.NotificationPublisher;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/compliance")
public class ComplianceController {

    private final CompanyPolicyRepository policyRepository;
    private final PolicyAcknowledgementRepository acknowledgementRepository;
    private final WarningNoticeRepository warningRepository;
    private final DisciplinaryActionRepository disciplinaryRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationPublisher notificationPublisher;

    public ComplianceController(CompanyPolicyRepository policyRepository,
                                PolicyAcknowledgementRepository acknowledgementRepository,
                                WarningNoticeRepository warningRepository,
                                DisciplinaryActionRepository disciplinaryRepository,
                                EmployeeRepository employeeRepository,
                                UserRepository userRepository,
                                NotificationRepository notificationRepository,
                                NotificationPublisher notificationPublisher) {
        this.policyRepository = policyRepository;
        this.acknowledgementRepository = acknowledgementRepository;
        this.warningRepository = warningRepository;
        this.disciplinaryRepository = disciplinaryRepository;
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.notificationPublisher = notificationPublisher;
    }

    // 1. Company Policies
    @GetMapping("/policies")
    public ResponseEntity<List<CompanyPolicy>> getPolicies(@RequestParam(required = false) String status,
                                                           @RequestParam(required = false) String category) {
        if (status != null && !status.isEmpty()) {
            return ResponseEntity.ok(policyRepository.findByStatus(status.toUpperCase()));
        }
        if (category != null && !category.isEmpty()) {
            return ResponseEntity.ok(policyRepository.findByCategory(category));
        }
        return ResponseEntity.ok(policyRepository.findAll());
    }

    @PostMapping("/policies")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createPolicy(@RequestBody Map<String, Object> payload) {
        CompanyPolicy policy = new CompanyPolicy();
        policy.setPolicyCode("POL-" + System.currentTimeMillis() % 10000);
        policy.setTitle((String) payload.get("title"));
        policy.setCategory((String) payload.get("category"));
        policy.setContent((String) payload.get("content"));
        policy.setVersion((String) payload.getOrDefault("version", "1.0"));
        policy.setEffectiveDate(LocalDate.parse(payload.get("effectiveDate").toString()));
        policy.setStatus("ACTIVE");

        CompanyPolicy saved = policyRepository.save(policy);

        // Policy notifications: company policies are company-wide in visibility, so publish an intentional company-wide broadcast
        notificationPublisher.publish(NotificationEvent.broadcast(
                "New Company Policy",
                "A new company policy (" + saved.getTitle() + ") is available for review.",
                "INFO",
                "/employee/policies"
        ));

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/policies/{id}")
    public ResponseEntity<CompanyPolicy> getPolicyById(@PathVariable Long id) {
        CompanyPolicy policy = policyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Policy not found with id: " + id));
        return ResponseEntity.ok(policy);
    }

    @PutMapping("/policies/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updatePolicy(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        CompanyPolicy policy = policyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Policy not found with id: " + id));
        if (payload.containsKey("title")) policy.setTitle((String) payload.get("title"));
        if (payload.containsKey("category")) policy.setCategory((String) payload.get("category"));
        if (payload.containsKey("content")) policy.setContent((String) payload.get("content"));
        if (payload.containsKey("version")) policy.setVersion((String) payload.getOrDefault("version", "1.0"));
        if (payload.containsKey("effectiveDate") && payload.get("effectiveDate") != null) {
            policy.setEffectiveDate(LocalDate.parse(payload.get("effectiveDate").toString()));
        }
        if (payload.containsKey("status")) policy.setStatus((String) payload.get("status"));

        return ResponseEntity.ok(policyRepository.save(policy));
    }

    @DeleteMapping("/policies/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deletePolicy(@PathVariable Long id) {
        CompanyPolicy policy = policyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Policy not found with id: " + id));
        List<PolicyAcknowledgement> acks = acknowledgementRepository.findByPolicyId(id);
        if (!acks.isEmpty()) {
            policy.setStatus("ARCHIVED");
            policyRepository.save(policy);
            return ResponseEntity.ok(Map.of("message", "Policy has been acknowledged by staff and was ARCHIVED rather than permanently deleted."));
        }
        policyRepository.delete(policy);
        return ResponseEntity.ok(Map.of("message", "Policy deleted successfully."));
    }

    // 2. Policy Acknowledgements
    @GetMapping("/acknowledgements")
    public ResponseEntity<List<PolicyAcknowledgement>> getAcknowledgements(@RequestParam(required = false) Long employeeId,
                                                                           @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(acknowledgementRepository.findByEmployeeId(myEmpId));
        }

        if (employeeId != null) {
            return ResponseEntity.ok(acknowledgementRepository.findByEmployeeId(employeeId));
        }
        return ResponseEntity.ok(acknowledgementRepository.findAll());
    }

    @GetMapping("/my-acknowledgements")
    public ResponseEntity<List<PolicyAcknowledgement>> getMyAcknowledgements(@AuthenticationPrincipal UserPrincipal currentUser) {
        Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
        if (myEmpId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(acknowledgementRepository.findByEmployeeId(myEmpId));
    }

    @GetMapping("/acknowledgements/{id}")
    public ResponseEntity<PolicyAcknowledgement> getAcknowledgementById(@PathVariable Long id,
                                                                        @AuthenticationPrincipal UserPrincipal currentUser) {
        PolicyAcknowledgement ack = acknowledgementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Policy acknowledgement not found with id: " + id));

        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null || ack.getEmployee() == null || !myEmpId.equals(ack.getEmployee().getId())) {
                throw new AccessDeniedException("Access denied: You may only view your own acknowledgements.");
            }
        }

        return ResponseEntity.ok(ack);
    }

    @PostMapping("/acknowledgements")
    public ResponseEntity<?> acknowledgePolicy(@RequestBody Map<String, Object> payload,
                                               @AuthenticationPrincipal UserPrincipal currentUser) {
        if (payload.get("policyId") == null) {
            throw new BadRequestException("Policy ID is required.");
        }
        Long policyId = Long.valueOf(payload.get("policyId").toString());
        CompanyPolicy pol = policyRepository.findById(policyId)
                .orElseThrow(() -> new ResourceNotFoundException("Policy not found with id: " + policyId));

        if (pol.getStatus() == null || !pol.getStatus().equalsIgnoreCase("ACTIVE")) {
            throw new BadRequestException("Cannot acknowledge an inactive or archived company policy.");
        }

        Long employeeId;
        Long linkedEmpId = getLinkedEmployeeIdOrNull(currentUser);
        if (linkedEmpId != null) {
            employeeId = linkedEmpId;
        } else if (payload.containsKey("employeeId") && payload.get("employeeId") != null) {
            employeeId = Long.valueOf(payload.get("employeeId").toString());
        } else {
            throw new BadRequestException("Employee ID is required.");
        }

        if (acknowledgementRepository.existsByEmployeeIdAndPolicyId(employeeId, policyId)) {
            throw new BadRequestException("You have already acknowledged this company policy.");
        }

        Employee emp = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));

        PolicyAcknowledgement ack = new PolicyAcknowledgement(emp, pol);
        return ResponseEntity.ok(acknowledgementRepository.save(ack));
    }

    @DeleteMapping("/acknowledgements/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteAcknowledgement(@PathVariable Long id) {
        PolicyAcknowledgement ack = acknowledgementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Policy acknowledgement not found with id: " + id));
        acknowledgementRepository.delete(ack);
        return ResponseEntity.ok(Map.of("message", "Policy acknowledgement removed successfully."));
    }

    // 3. Warning Notices
    @GetMapping("/warnings")
    public ResponseEntity<List<WarningNotice>> getWarnings(@RequestParam(required = false) Long employeeId,
                                                           @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(warningRepository.findByEmployeeId(myEmpId));
        }

        if (employeeId != null) {
            return ResponseEntity.ok(warningRepository.findByEmployeeId(employeeId));
        }
        return ResponseEntity.ok(warningRepository.findAll());
    }

    @GetMapping("/my-warnings")
    public ResponseEntity<List<WarningNotice>> getMyWarnings(@AuthenticationPrincipal UserPrincipal currentUser) {
        Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
        if (myEmpId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(warningRepository.findByEmployeeId(myEmpId));
    }

    @GetMapping("/warnings/{id}")
    public ResponseEntity<WarningNotice> getWarningById(@PathVariable Long id,
                                                        @AuthenticationPrincipal UserPrincipal currentUser) {
        WarningNotice warning = warningRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warning notice not found with id: " + id));

        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null || warning.getEmployee() == null || !myEmpId.equals(warning.getEmployee().getId())) {
                throw new AccessDeniedException("Access denied: You may only view your own warnings.");
            }
        }

        return ResponseEntity.ok(warning);
    }

    @PostMapping("/warnings")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> issueWarning(@RequestBody Map<String, Object> payload,
                                          @AuthenticationPrincipal UserPrincipal currentUser) {
        Long employeeId = Long.valueOf(payload.get("employeeId").toString());
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        WarningNotice warning = new WarningNotice();
        warning.setEmployee(employee);
        warning.setWarningLevel((String) payload.get("warningLevel"));
        warning.setWarningDate(LocalDate.parse(payload.get("warningDate").toString()));
        warning.setReason((String) payload.get("reason"));
        warning.setActionRequired((String) payload.get("actionRequired"));
        warning.setStatus("ACTIVE");

        if (currentUser != null) {
            userRepository.findById(currentUser.getId()).ifPresent(warning::setIssuedBy);
        }

        WarningNotice saved = warningRepository.save(warning);

        // Targeted notification to the employee via Observer publisher
        notificationPublisher.publish(NotificationEvent.targeted(
                employee,
                employee.getUser(),
                "Official Warning Notice Issued",
                "A " + saved.getWarningLevel() + " warning notice has been issued: " + saved.getReason(),
                "WARNING",
                "/employee/policies"
        ));

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/warnings/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateWarning(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        WarningNotice warning = warningRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warning notice not found with id: " + id));
        if (payload.containsKey("warningLevel")) warning.setWarningLevel((String) payload.get("warningLevel"));
        if (payload.containsKey("warningDate") && payload.get("warningDate") != null) {
            warning.setWarningDate(LocalDate.parse(payload.get("warningDate").toString()));
        }
        if (payload.containsKey("reason")) warning.setReason((String) payload.get("reason"));
        if (payload.containsKey("actionRequired")) warning.setActionRequired((String) payload.get("actionRequired"));
        if (payload.containsKey("status")) warning.setStatus((String) payload.get("status"));

        return ResponseEntity.ok(warningRepository.save(warning));
    }

    @DeleteMapping("/warnings/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteWarning(@PathVariable Long id) {
        WarningNotice warning = warningRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warning notice not found with id: " + id));
        warningRepository.delete(warning);
        return ResponseEntity.ok(Map.of("message", "Warning notice deleted successfully."));
    }

    // 4. Disciplinary Actions
    @GetMapping("/disciplinary")
    public ResponseEntity<List<DisciplinaryAction>> getDisciplinaryActions(@RequestParam(required = false) Long employeeId,
                                                                           @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(disciplinaryRepository.findByEmployeeId(myEmpId));
        }

        if (employeeId != null) {
            return ResponseEntity.ok(disciplinaryRepository.findByEmployeeId(employeeId));
        }
        return ResponseEntity.ok(disciplinaryRepository.findAll());
    }

    @GetMapping("/my-disciplinary-actions")
    public ResponseEntity<List<DisciplinaryAction>> getMyDisciplinaryActions(@AuthenticationPrincipal UserPrincipal currentUser) {
        Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
        if (myEmpId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(disciplinaryRepository.findByEmployeeId(myEmpId));
    }

    @GetMapping("/disciplinary/{id}")
    public ResponseEntity<DisciplinaryAction> getDisciplinaryById(@PathVariable Long id,
                                                                  @AuthenticationPrincipal UserPrincipal currentUser) {
        DisciplinaryAction action = disciplinaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Disciplinary action not found with id: " + id));

        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null || action.getEmployee() == null || !myEmpId.equals(action.getEmployee().getId())) {
                throw new AccessDeniedException("Access denied: You may only view your own disciplinary records.");
            }
        }

        return ResponseEntity.ok(action);
    }

    @PostMapping("/disciplinary")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> recordDisciplinaryAction(@RequestBody Map<String, Object> payload,
                                                      @AuthenticationPrincipal UserPrincipal currentUser) {
        Long employeeId = Long.valueOf(payload.get("employeeId").toString());
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        DisciplinaryAction action = new DisciplinaryAction();
        action.setEmployee(employee);
        action.setActionType((String) payload.get("actionType"));
        action.setActionDate(LocalDate.parse(payload.get("actionDate").toString()));
        action.setDescription((String) payload.get("description"));
        action.setDocumentation((String) payload.get("documentation"));
        String status = (String) payload.getOrDefault("status", "OPEN");
        action.setStatus(status != null && !status.trim().isEmpty() ? status.trim().toUpperCase() : "OPEN");

        if (currentUser != null) {
            userRepository.findById(currentUser.getId()).ifPresent(action::setRecordedBy);
        }

        DisciplinaryAction saved = disciplinaryRepository.save(action);

        // Targeted notification to the employee via Observer publisher
        notificationPublisher.publish(NotificationEvent.targeted(
                employee,
                employee.getUser(),
                "Disciplinary Action Recorded",
                "A disciplinary action (" + saved.getActionType() + ") has been recorded. Please check your compliance dashboard.",
                "URGENT",
                "/employee/policies"
        ));

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/disciplinary/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateDisciplinary(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        DisciplinaryAction action = disciplinaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Disciplinary action not found with id: " + id));
        if (payload.containsKey("actionType")) action.setActionType((String) payload.get("actionType"));
        if (payload.containsKey("actionDate") && payload.get("actionDate") != null) {
            action.setActionDate(LocalDate.parse(payload.get("actionDate").toString()));
        }
        if (payload.containsKey("description")) action.setDescription((String) payload.get("description"));
        if (payload.containsKey("documentation")) action.setDocumentation((String) payload.get("documentation"));
        String previousStatus = action.getStatus() != null ? action.getStatus() : "OPEN";
        if (payload.containsKey("status")) {
            String status = (String) payload.get("status");
            if (status != null && !status.trim().isEmpty()) {
                action.setStatus(status.trim().toUpperCase());
            }
        }

        DisciplinaryAction saved = disciplinaryRepository.save(action);
        if (saved.getEmployee() != null && !saved.getStatus().equalsIgnoreCase(previousStatus)) {
            notificationPublisher.publish(NotificationEvent.targeted(
                    saved.getEmployee(),
                    "Disciplinary Action Updated",
                    "Your disciplinary action status has been updated to: " + saved.getStatus() + ".",
                    "WARNING",
                    "/employee/policies"
            ));
        }

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/disciplinary/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteDisciplinary(@PathVariable Long id) {
        DisciplinaryAction action = disciplinaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Disciplinary action not found with id: " + id));
        disciplinaryRepository.delete(action);
        return ResponseEntity.ok(Map.of("message", "Disciplinary action deleted successfully."));
    }

    // 5. Compliance Summary Metrics
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getComplianceSummary() {
        Map<String, Object> summary = new HashMap<>();
        long totalEmployees = employeeRepository.count();
        long totalPolicies = policyRepository.count();
        long activePolicies = policyRepository.findByStatus("ACTIVE").size();
        long totalAcks = acknowledgementRepository.count();
        long activeWarnings = warningRepository.countByStatus("ACTIVE");
        long openDisciplinary = disciplinaryRepository.findAll().stream()
                .filter(d -> "OPEN".equalsIgnoreCase(d.getStatus()) || "RECORDED".equalsIgnoreCase(d.getStatus()))
                .count();

        double complianceRate = 0.0;
        if (totalEmployees > 0 && activePolicies > 0) {
            complianceRate = ((double) totalAcks / (totalEmployees * activePolicies)) * 100.0;
        }

        long pendingAcks = Math.max(0, (totalEmployees * activePolicies) - totalAcks);

        summary.put("totalEmployees", totalEmployees);
        summary.put("totalPolicies", totalPolicies);
        summary.put("activePolicies", activePolicies);
        summary.put("totalAcknowledgements", totalAcks);
        summary.put("pendingAcknowledgements", pendingAcks);
        summary.put("activeWarnings", activeWarnings);
        summary.put("openDisciplinaryCases", openDisciplinary);
        summary.put("overallComplianceRate", Math.min(100.0, Math.round(complianceRate * 10.0) / 10.0));

        return ResponseEntity.ok(summary);
    }

    // Security Helper
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

    private Long getLinkedEmployeeIdOrNull(UserPrincipal currentUser) {
        if (currentUser == null) {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null && !"anonymousUser".equals(auth.getName())) {
                String name = auth.getName();
                Optional<Employee> emp = employeeRepository.findByEmailIgnoreCase(name);
                if (emp.isPresent()) {
                    return emp.get().getId();
                }
                Optional<com.lws.staff_management.user.User> u = userRepository.findByUsername(name)
                        .or(() -> userRepository.findByEmail(name));
                if (u.isPresent()) {
                    return employeeRepository.findByUserId(u.get().getId()).map(Employee::getId).orElse(null);
                }
            }
            return null;
        }
        return employeeRepository.findByUserId(currentUser.getId())
                .or(() -> employeeRepository.findByEmailIgnoreCase(currentUser.getEmail()))
                .map(Employee::getId)
                .orElse(null);
    }
}
