package com.lws.staff_management.admin;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.exception.BadRequestException;
import com.lws.staff_management.exception.ResourceNotFoundException;
import com.lws.staff_management.security.UserPrincipal;
import com.lws.staff_management.user.Role;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditLogRepository auditLogRepository;
    private final BackupRecordRepository backupRecordRepository;
    private final TechnicalTicketRepository ticketRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminController(UserRepository userRepository,
                           EmployeeRepository employeeRepository,
                           AuditLogRepository auditLogRepository,
                           BackupRecordRepository backupRecordRepository,
                           TechnicalTicketRepository ticketRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.auditLogRepository = auditLogRepository;
        this.backupRecordRepository = backupRecordRepository;
        this.ticketRepository = ticketRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // 1. Users Management
    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (User u : users) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", u.getId());
            map.put("username", u.getUsername());
            map.put("email", u.getEmail());
            map.put("fullName", u.getFullName());
            map.put("role", u.getRole() != null ? u.getRole().name() : null);
            map.put("active", u.isActive());
            map.put("createdAt", u.getCreatedAt());

            Optional<Employee> empOpt = employeeRepository.findByUserId(u.getId());
            if (empOpt.isEmpty() && u.getEmail() != null) {
                empOpt = employeeRepository.findByEmailIgnoreCase(u.getEmail().trim());
            }
            if (empOpt.isEmpty() && u.getUsername() != null && u.getUsername().endsWith("@lk.com")) {
                String possibleEmpId = u.getUsername().substring(0, u.getUsername().indexOf('@'));
                empOpt = employeeRepository.findByEmployeeId(possibleEmpId);
            }

            if (empOpt.isPresent()) {
                Employee emp = empOpt.get();
                map.put("employeeId", emp.getEmployeeId());
                map.put("employeeDbId", emp.getId());
                map.put("employeeName", emp.getFullName());
                map.put("department", emp.getDepartment() != null ? emp.getDepartment().getName() : null);
                map.put("position", emp.getPosition() != null ? emp.getPosition().getTitle() : null);
                map.put("employmentStatus", emp.getEmploymentStatus());
                map.put("hasLinkedEmployee", true);
            } else {
                map.put("hasLinkedEmployee", false);
            }
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String email = payload.get("email");
        String password = payload.get("password");
        String fullName = payload.get("fullName");
        String roleStr = payload.get("role");

        if (username == null || email == null || password == null || roleStr == null) {
            throw new BadRequestException("All user fields are required.");
        }

        if (userRepository.existsByUsername(username)) {
            throw new BadRequestException("Username already exists: " + username);
        }
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already exists: " + email);
        }

        Role role = Role.valueOf(roleStr);
        User user = new User(username, email, passwordEncoder.encode(password), fullName, role);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PatchMapping("/users/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        user.setActive(!user.isActive());
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PostMapping("/users/{id}/reset-initial-password")
    public ResponseEntity<?> resetInitialPassword(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        Optional<Employee> empOpt = employeeRepository.findByUserId(user.getId());
        if (empOpt.isEmpty() && user.getEmail() != null) {
            empOpt = employeeRepository.findByEmailIgnoreCase(user.getEmail().trim());
        }
        if (empOpt.isEmpty() && user.getUsername() != null && user.getUsername().endsWith("@lk.com")) {
            String possibleEmpId = user.getUsername().substring(0, user.getUsername().indexOf('@'));
            empOpt = employeeRepository.findByEmployeeId(possibleEmpId);
        }

        if (empOpt.isEmpty() || empOpt.get().getNic() == null || empOpt.get().getNic().trim().isEmpty()) {
            throw new BadRequestException("No linked employee record with NIC found to reset initial password.");
        }

        String initialNic = empOpt.get().getNic().trim();
        user.setPassword(passwordEncoder.encode(initialNic));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Password successfully reset to initial NIC password for employee " + empOpt.get().getEmployeeId() + "."
        ));
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> payload) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        boolean useInitialNic = payload != null && Boolean.TRUE.equals(payload.get("useInitialNic"));
        String newPassword = payload != null ? (String) payload.get("newPassword") : null;

        if (useInitialNic || (newPassword == null || newPassword.trim().isEmpty())) {
            Optional<Employee> empOpt = employeeRepository.findByUserId(user.getId());
            if (empOpt.isEmpty() && user.getEmail() != null) {
                empOpt = employeeRepository.findByEmailIgnoreCase(user.getEmail().trim());
            }
            if (empOpt.isEmpty() && user.getUsername() != null && user.getUsername().endsWith("@lk.com")) {
                String possibleEmpId = user.getUsername().substring(0, user.getUsername().indexOf('@'));
                empOpt = employeeRepository.findByEmployeeId(possibleEmpId);
            }
            if (empOpt.isPresent() && empOpt.get().getNic() != null && !empOpt.get().getNic().trim().isEmpty()) {
                String nic = empOpt.get().getNic().trim();
                user.setPassword(passwordEncoder.encode(nic));
                userRepository.save(user);
                return ResponseEntity.ok(Map.of("message", "Password reset successfully to initial NIC credentials for " + user.getUsername()));
            }
        }

        String passToSet = (newPassword != null && !newPassword.trim().isEmpty()) ? newPassword.trim() : "Password@123";
        user.setPassword(passwordEncoder.encode(passToSet));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully for user: " + user.getUsername()));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        return ResponseEntity.ok(user);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        if (payload.containsKey("fullName") && payload.get("fullName") != null) {
            user.setFullName((String) payload.get("fullName"));
        }
        if (payload.containsKey("email") && payload.get("email") != null) {
            String newEmail = (String) payload.get("email");
            if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                throw new BadRequestException("Email already taken by another user: " + newEmail);
            }
            user.setEmail(newEmail);
        }
        if (payload.containsKey("role") && payload.get("role") != null) {
            user.setRole(Role.valueOf(payload.get("role").toString()));
        }
        if (payload.containsKey("active") && payload.get("active") != null) {
            user.setActive(Boolean.parseBoolean(payload.get("active").toString()));
        }
        if (payload.containsKey("password") && payload.get("password") != null && !payload.get("password").toString().isBlank()) {
            user.setPassword(passwordEncoder.encode(payload.get("password").toString()));
        }

        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        if (employeeRepository.existsByUserId(id)) {
            user.setActive(false);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "User account is linked to an employee profile. The account was deactivated rather than deleted to preserve employee history."));
        }

        userRepository.delete(user);
        return ResponseEntity.ok(Map.of("message", "User account deleted successfully."));
    }

    // 2. Roles & Permissions List
    @GetMapping("/roles")
    public ResponseEntity<?> getRoles() {
        List<Map<String, Object>> roles = new ArrayList<>();
        for (Role r : Role.values()) {
            Map<String, Object> item = new HashMap<>();
            item.put("name", r.name());
            item.put("displayName", formatRoleName(r.name()));
            item.put("userCount", userRepository.findByRole(r).size());
            roles.add(item);
        }
        return ResponseEntity.ok(roles);
    }

    private String formatRoleName(String name) {
        return switch (name) {
            case "HR_MANAGER" -> "HR Manager";
            case "OPERATIONS_MANAGER" -> "Operations Manager";
            case "SENIOR_ADMIN" -> "Senior Administrative Officer";
            case "FINANCE_EXECUTIVE" -> "Finance Executive";
            case "EMPLOYEE" -> "Staff Employee";
            case "IT_COORDINATOR" -> "IT Coordinator";
            default -> name;
        };
    }

    // 3. Security & Audit Logs
    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepository.findTop50ByOrderByTimestampDesc());
    }

    // 4. Backups
    @GetMapping("/backups")
    public ResponseEntity<List<BackupRecord>> getBackups() {
        return ResponseEntity.ok(backupRecordRepository.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping("/backups/trigger")
    public ResponseEntity<?> triggerBackup(@RequestParam(defaultValue = "FULL_DATABASE") String backupType,
                                          @AuthenticationPrincipal UserPrincipal currentUser) {
        String adminName = currentUser != null ? currentUser.getUsername() : "it_admin";
        String backupName = "LWS_BACKUP_" + System.currentTimeMillis() + ".sql";
        BackupRecord record = new BackupRecord(backupName, backupType, "4.8 MB", "SUCCESS", adminName);
        BackupRecord saved = backupRecordRepository.save(record);

        auditLogRepository.save(new AuditLog(adminName, "BACKUP_TRIGGERED", "127.0.0.1", "Triggered manual backup: " + backupName));
        return ResponseEntity.ok(saved);
    }

    // 5. Technical Support Tickets
    @GetMapping("/tickets")
    public ResponseEntity<List<TechnicalTicket>> getTickets() {
        return ResponseEntity.ok(ticketRepository.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping("/tickets")
    public ResponseEntity<?> createTicket(@RequestBody Map<String, String> payload,
                                         @AuthenticationPrincipal UserPrincipal currentUser) {
        String reporter = currentUser != null ? currentUser.getFullName() : payload.getOrDefault("reportedBy", "System User");
        String ticketNumber = "TKT-" + (1000 + ticketRepository.count());

        TechnicalTicket ticket = new TechnicalTicket(
                ticketNumber,
                payload.get("subject"),
                payload.get("description"),
                payload.getOrDefault("category", "HRIS_SYSTEM"),
                payload.getOrDefault("priority", "MEDIUM"),
                reporter
        );
        return ResponseEntity.ok(ticketRepository.save(ticket));
    }

    @PatchMapping("/tickets/{id}/status")
    public ResponseEntity<?> updateTicketStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        TechnicalTicket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + id));

        ticket.setStatus(payload.get("status"));
        if (payload.containsKey("resolutionNotes")) {
            ticket.setResolutionNotes(payload.get("resolutionNotes"));
        }
        return ResponseEntity.ok(ticketRepository.save(ticket));
    }

    @GetMapping("/tickets/{id}")
    public ResponseEntity<TechnicalTicket> getTicketById(@PathVariable Long id) {
        TechnicalTicket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + id));
        return ResponseEntity.ok(ticket);
    }

    @PutMapping("/tickets/{id}")
    public ResponseEntity<?> updateTicket(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        TechnicalTicket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + id));

        if (payload.containsKey("subject")) ticket.setSubject(payload.get("subject"));
        if (payload.containsKey("description")) ticket.setDescription(payload.get("description"));
        if (payload.containsKey("category")) ticket.setCategory(payload.get("category"));
        if (payload.containsKey("priority")) ticket.setPriority(payload.get("priority"));
        if (payload.containsKey("status")) ticket.setStatus(payload.get("status"));
        if (payload.containsKey("resolutionNotes")) ticket.setResolutionNotes(payload.get("resolutionNotes"));
        if (payload.containsKey("reportedBy")) ticket.setReportedBy(payload.get("reportedBy"));

        return ResponseEntity.ok(ticketRepository.save(ticket));
    }

    @DeleteMapping("/tickets/{id}")
    public ResponseEntity<?> deleteTicket(@PathVariable Long id) {
        TechnicalTicket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + id));
        ticketRepository.delete(ticket);
        return ResponseEntity.ok(Map.of("message", "Ticket deleted successfully."));
    }

    // 6. IT Coordinator Dashboard Aggregator
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getITDashboard() {
        Map<String, Object> data = new HashMap<>();
        data.put("totalUsers", userRepository.count());
        data.put("activeUsers", userRepository.countByActive(true));
        data.put("inactiveUsers", userRepository.countByActive(false));
        data.put("totalTickets", ticketRepository.count());
        data.put("openTickets", ticketRepository.countByStatus("OPEN"));
        data.put("recentBackups", backupRecordRepository.findAllByOrderByCreatedAtDesc());
        data.put("systemHealth", "OPTIMAL");
        data.put("lastBackupTime", LocalDateTime.now().minusHours(4));
        return ResponseEntity.ok(data);
    }
}
