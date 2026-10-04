package com.lws.staff_management.employee;

import com.lws.staff_management.attendance.AttendanceRepository;
import com.lws.staff_management.attendance.LeaveRequestRepository;
import com.lws.staff_management.attendance.OvertimeRepository;
import com.lws.staff_management.compliance.DisciplinaryActionRepository;
import com.lws.staff_management.compliance.WarningNoticeRepository;
import com.lws.staff_management.exception.BadRequestException;
import com.lws.staff_management.exception.ResourceNotFoundException;
import com.lws.staff_management.payroll.EmployeeBenefitRepository;
import com.lws.staff_management.payroll.PayrollDetailRepository;
import com.lws.staff_management.performance.PerformanceEvaluationRepository;
import com.lws.staff_management.user.Role;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import com.lws.staff_management.workforce.WorkforceAssignmentRepository;
import com.lws.staff_management.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final EmployeeDocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmployeeIdService employeeIdService;

    // Repositories for referential checks before employee deletion
    private final AttendanceRepository attendanceRepository;
    private final PayrollDetailRepository payrollDetailRepository;
    private final WorkforceAssignmentRepository workforceAssignmentRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final OvertimeRepository overtimeRepository;
    private final PerformanceEvaluationRepository evaluationRepository;
    private final WarningNoticeRepository warningRepository;
    private final DisciplinaryActionRepository disciplinaryRepository;
    private final EmployeeBenefitRepository benefitRepository;

    public EmployeeController(EmployeeRepository employeeRepository,
                              DepartmentRepository departmentRepository,
                              PositionRepository positionRepository,
                              EmployeeDocumentRepository documentRepository,
                              UserRepository userRepository,
                              PasswordEncoder passwordEncoder,
                              EmployeeIdService employeeIdService,
                              AttendanceRepository attendanceRepository,
                              PayrollDetailRepository payrollDetailRepository,
                              WorkforceAssignmentRepository workforceAssignmentRepository,
                              LeaveRequestRepository leaveRequestRepository,
                              OvertimeRepository overtimeRepository,
                              PerformanceEvaluationRepository evaluationRepository,
                              WarningNoticeRepository warningRepository,
                              DisciplinaryActionRepository disciplinaryRepository,
                              EmployeeBenefitRepository benefitRepository) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.positionRepository = positionRepository;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.employeeIdService = employeeIdService;
        this.attendanceRepository = attendanceRepository;
        this.payrollDetailRepository = payrollDetailRepository;
        this.workforceAssignmentRepository = workforceAssignmentRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.overtimeRepository = overtimeRepository;
        this.evaluationRepository = evaluationRepository;
        this.warningRepository = warningRepository;
        this.disciplinaryRepository = disciplinaryRepository;
        this.benefitRepository = benefitRepository;
    }

    // Employee Management

    @GetMapping
    public ResponseEntity<List<Employee>> getAllEmployees(@RequestParam(required = false) String search,
                                                          @RequestParam(required = false) Long departmentId,
                                                          @RequestParam(required = false) Long positionId,
                                                          @RequestParam(required = false) String status,
                                                          @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(employeeRepository.findById(myEmpId).map(List::of).orElse(Collections.emptyList()));
        }

        List<Employee> list;
        if (search != null && !search.trim().isEmpty()) {
            list = employeeRepository.searchEmployees(search.trim());
        } else if (departmentId != null) {
            list = employeeRepository.findByDepartmentId(departmentId);
        } else if (positionId != null) {
            list = employeeRepository.findByPositionId(positionId);
        } else if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            list = employeeRepository.findByEmploymentStatus(status.trim());
        } else {
            list = employeeRepository.findAll();
        }

        // Apply secondary filters in-memory if multiple params provided
        if (departmentId != null && search != null && !search.trim().isEmpty()) {
            list = list.stream().filter(e -> e.getDepartment() != null && e.getDepartment().getId().equals(departmentId)).toList();
        }
        if (positionId != null && (search != null || departmentId != null)) {
            list = list.stream().filter(e -> e.getPosition() != null && e.getPosition().getId().equals(positionId)).toList();
        }
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL") && (search != null || departmentId != null || positionId != null)) {
            list = list.stream().filter(e -> status.equalsIgnoreCase(e.getEmploymentStatus())).toList();
        }

        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id,
                                                    @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null || !myEmpId.equals(id)) {
                throw new AccessDeniedException("Access denied: Employees can only view their own profile.");
            }
        }
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));
        return ResponseEntity.ok(employee);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    @Transactional
    public ResponseEntity<?> registerEmployee(@RequestBody Map<String, Object> payload) {
        // 1. Department is strictly required
        Object deptIdObj = payload.get("departmentId");
        if (deptIdObj == null || deptIdObj.toString().trim().isEmpty()) {
            throw new BadRequestException("Department is required for employee registration.");
        }
        Long deptId;
        try {
            deptId = Long.valueOf(deptIdObj.toString().trim());
        } catch (NumberFormatException e) {
            throw new BadRequestException("Invalid department ID provided.");
        }
        Department department = departmentRepository.findById(deptId)
                .orElseThrow(() -> new BadRequestException("Department not found with id: " + deptId));

        // 2. Validate required employee fields
        String firstName = (String) payload.get("firstName");
        String lastName = (String) payload.get("lastName");
        String nic = (String) payload.get("nic");
        String email = (String) payload.get("email");
        String phone = (String) payload.get("phone");

        if (firstName == null || firstName.trim().isEmpty() ||
            lastName == null || lastName.trim().isEmpty() ||
            nic == null || nic.trim().isEmpty() ||
            email == null || email.trim().isEmpty() ||
            phone == null || phone.trim().isEmpty()) {
            throw new BadRequestException("First Name, Last Name, NIC, Email, and Phone are required fields.");
        }

        String trimmedEmail = email.trim().toLowerCase();
        if (!EMAIL_PATTERN.matcher(trimmedEmail).matches()) {
            throw new BadRequestException("Invalid email format: " + email.trim());
        }

        if (employeeRepository.existsByNic(nic.trim())) {
            throw new BadRequestException("Employee with NIC already exists: " + nic);
        }
        if (employeeRepository.existsByEmailIgnoreCase(trimmedEmail) ||
            userRepository.findByUsernameOrEmailIgnoreCase(trimmedEmail, trimmedEmail).isPresent()) {
            throw new BadRequestException("Email is already registered: " + email.trim());
        }

        // 3. Validate Position belongs to the selected Department
        Position position = null;
        if (payload.get("positionId") != null && !payload.get("positionId").toString().trim().isEmpty()) {
            Long posId;
            try {
                posId = Long.valueOf(payload.get("positionId").toString().trim());
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid position ID provided.");
            }
            position = positionRepository.findById(posId)
                    .orElseThrow(() -> new BadRequestException("Position not found with id: " + posId));
            if (position.getDepartment() == null || !position.getDepartment().getId().equals(department.getId())) {
                throw new BadRequestException("Selected position '" + position.getTitle() + "' does not belong to department '" + department.getName() + "'.");
            }
        }

        // 4. Automatically generate Employee ID: LK + departmentId + 7-digit sequence
        String generatedEmpId = employeeIdService.generateNextEmployeeId(department.getId());

        Employee employee = new Employee();
        employee.setEmployeeId(generatedEmpId);
        employee.setFirstName(firstName.trim());
        employee.setLastName(lastName.trim());
        employee.setNic(nic.trim());
        employee.setEmail(trimmedEmail);
        employee.setPhone(phone.trim());
        employee.setAddress((String) payload.get("address"));
        employee.setEmploymentType((String) payload.getOrDefault("employmentType", "Full-time"));
        employee.setEmploymentStatus((String) payload.getOrDefault("employmentStatus", "Active"));
        employee.setDepartment(department);
        employee.setPosition(position);

        if (payload.get("baseSalary") != null && !payload.get("baseSalary").toString().trim().isEmpty()) {
            try {
                employee.setBaseSalary(new BigDecimal(payload.get("baseSalary").toString().trim()));
            } catch (Exception ignored) {}
        } else if (position != null && position.getDefaultMonthlySalary() != null) {
            employee.setBaseSalary(position.getDefaultMonthlySalary());
        }
        if (payload.get("employmentDate") != null && !payload.get("employmentDate").toString().trim().isEmpty()) {
            try {
                employee.setEmploymentDate(LocalDate.parse(payload.get("employmentDate").toString().trim()));
            } catch (Exception ignored) {}
        }
        if (payload.get("dateOfBirth") != null && !payload.get("dateOfBirth").toString().trim().isEmpty()) {
            try {
                employee.setDateOfBirth(LocalDate.parse(payload.get("dateOfBirth").toString().trim()));
            } catch (Exception ignored) {}
        }

        // 5. Automatically create and save User account for Staff Member using the real email
        String fullName = employee.getFullName().trim();
        if (fullName.isEmpty()) {
            fullName = generatedEmpId;
        }

        User user = new User();
        user.setUsername(trimmedEmail);
        user.setEmail(trimmedEmail);
        user.setFullName(fullName);
        // Initial password is the employee's NIC number, BCrypt hashed
        user.setPassword(passwordEncoder.encode(nic.trim()));
        user.setRole(Role.EMPLOYEE);
        user.setActive(!"Inactive".equalsIgnoreCase(employee.getEmploymentStatus()) && !"Terminated".equalsIgnoreCase(employee.getEmploymentStatus()));
        User savedUser = userRepository.save(user);

        // 6. Link User to Employee and save Employee
        employee.setUser(savedUser);
        Employee saved = employeeRepository.save(employee);

        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("employeeId", saved.getEmployeeId());
        response.put("firstName", saved.getFirstName());
        response.put("lastName", saved.getLastName());
        response.put("fullName", saved.getFullName());
        response.put("email", saved.getEmail());
        response.put("nic", saved.getNic());
        response.put("employmentStatus", saved.getEmploymentStatus());
        response.put("department", saved.getDepartment());
        response.put("position", saved.getPosition());
        response.put("user", savedUser);
        response.put("employee", saved);
        response.put("loginEmail", saved.getEmail());
        response.put("role", Role.EMPLOYEE.name());
        response.put("message", "Employee registered successfully. Staff Member login account has been created.");

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    @Transactional
    public ResponseEntity<?> updateEmployee(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        if (payload.containsKey("employeeId")) {
            String newEmpId = (String) payload.get("employeeId");
            if (newEmpId != null && !newEmpId.trim().isEmpty()) {
                String trimmed = newEmpId.trim().toUpperCase();
                if (!trimmed.equals(employee.getEmployeeId())) {
                    if (employeeRepository.existsByEmployeeId(trimmed)) {
                        throw new BadRequestException("Employee ID already exists: " + trimmed);
                    }
                    employee.setEmployeeId(trimmed);
                }
            }
        }

        if (payload.containsKey("firstName")) employee.setFirstName((String) payload.get("firstName"));
        if (payload.containsKey("lastName")) employee.setLastName((String) payload.get("lastName"));
        if (payload.containsKey("phone")) employee.setPhone((String) payload.get("phone"));
        if (payload.containsKey("address")) employee.setAddress((String) payload.get("address"));
        if (payload.containsKey("employmentType")) employee.setEmploymentType((String) payload.get("employmentType"));
        if (payload.containsKey("employmentStatus")) employee.setEmploymentStatus((String) payload.get("employmentStatus"));

        if (payload.containsKey("nic")) {
            String newNic = (String) payload.get("nic");
            if (newNic != null && !newNic.equals(employee.getNic())) {
                if (employeeRepository.existsByNic(newNic.trim())) {
                    throw new BadRequestException("NIC already in use: " + newNic);
                }
                employee.setNic(newNic.trim());
            }
        }

        if (payload.containsKey("email")) {
            String newEmail = (String) payload.get("email");
            if (newEmail == null || newEmail.trim().isEmpty()) {
                throw new BadRequestException("Email cannot be blank.");
            }
            String trimmedNewEmail = newEmail.trim().toLowerCase();
            if (!EMAIL_PATTERN.matcher(trimmedNewEmail).matches()) {
                throw new BadRequestException("Invalid email format: " + newEmail.trim());
            }
            if (!trimmedNewEmail.equalsIgnoreCase(employee.getEmail())) {
                if (employeeRepository.existsByEmailIgnoreCase(trimmedNewEmail)) {
                    throw new BadRequestException("Email already in use: " + newEmail.trim());
                }
                Optional<User> existingUserWithEmail = userRepository.findByUsernameOrEmailIgnoreCase(trimmedNewEmail, trimmedNewEmail);
                if (existingUserWithEmail.isPresent() &&
                    (employee.getUser() == null || !existingUserWithEmail.get().getId().equals(employee.getUser().getId()))) {
                    throw new BadRequestException("Email is already registered: " + newEmail.trim());
                }
                employee.setEmail(trimmedNewEmail);
            }
        }

        Department targetDept = employee.getDepartment();
        if (payload.containsKey("departmentId")) {
            if (payload.get("departmentId") != null && !payload.get("departmentId").toString().trim().isEmpty()) {
                Long deptId = Long.valueOf(payload.get("departmentId").toString().trim());
                targetDept = departmentRepository.findById(deptId)
                        .orElseThrow(() -> new BadRequestException("Department not found with id: " + deptId));
                employee.setDepartment(targetDept);
            } else {
                targetDept = null;
                employee.setDepartment(null);
            }
        }

        if (payload.containsKey("positionId")) {
            if (payload.get("positionId") != null && !payload.get("positionId").toString().trim().isEmpty()) {
                Long posId = Long.valueOf(payload.get("positionId").toString().trim());
                Position pos = positionRepository.findById(posId)
                        .orElseThrow(() -> new BadRequestException("Position not found with id: " + posId));
                if (targetDept != null && pos.getDepartment() != null && !pos.getDepartment().getId().equals(targetDept.getId())) {
                    throw new BadRequestException("Selected position does not belong to the selected department.");
                }
                employee.setPosition(pos);
            } else {
                employee.setPosition(null);
            }
        } else if (payload.containsKey("departmentId") && employee.getPosition() != null && targetDept != null) {
            if (employee.getPosition().getDepartment() != null && !employee.getPosition().getDepartment().getId().equals(targetDept.getId())) {
                throw new BadRequestException("Current position does not belong to the newly selected department.");
            }
        }

        if (payload.containsKey("baseSalary") && payload.get("baseSalary") != null && !payload.get("baseSalary").toString().trim().isEmpty()) {
            try {
                employee.setBaseSalary(new BigDecimal(payload.get("baseSalary").toString().trim()));
            } catch (Exception ignored) {}
        }

        if (payload.containsKey("employmentDate") && payload.get("employmentDate") != null && !payload.get("employmentDate").toString().trim().isEmpty()) {
            try {
                employee.setEmploymentDate(LocalDate.parse(payload.get("employmentDate").toString().trim()));
            } catch (Exception ignored) {}
        }

        if (payload.containsKey("dateOfBirth") && payload.get("dateOfBirth") != null && !payload.get("dateOfBirth").toString().trim().isEmpty()) {
            try {
                employee.setDateOfBirth(LocalDate.parse(payload.get("dateOfBirth").toString().trim()));
            } catch (Exception ignored) {}
        }

        // Synchronize linked User account without creating duplicate accounts
        User linkedUser = employee.getUser();
        String empEmail = employee.getEmail().trim().toLowerCase();
        if (linkedUser == null) {
            Optional<User> existingUser = userRepository.findByUsernameOrEmailIgnoreCase(empEmail, empEmail);
            if (existingUser.isPresent()) {
                linkedUser = existingUser.get();
                employee.setUser(linkedUser);
            } else {
                linkedUser = new User();
                linkedUser.setUsername(empEmail);
                linkedUser.setEmail(empEmail);
                linkedUser.setFullName(employee.getFullName());
                linkedUser.setPassword(passwordEncoder.encode(employee.getNic().trim()));
                linkedUser.setRole(Role.EMPLOYEE);
                linkedUser = userRepository.save(linkedUser);
                employee.setUser(linkedUser);
            }
        }

        if (linkedUser != null) {
            linkedUser.setFullName(employee.getFullName());
            if (!empEmail.equalsIgnoreCase(linkedUser.getEmail()) || !empEmail.equalsIgnoreCase(linkedUser.getUsername())) {
                linkedUser.setUsername(empEmail);
                linkedUser.setEmail(empEmail);
            }

            // Sync account status: Deactivate user if employee is Inactive or Terminated
            String empStatus = employee.getEmploymentStatus();
            if (empStatus != null) {
                if ("Inactive".equalsIgnoreCase(empStatus) || "Terminated".equalsIgnoreCase(empStatus) || "Deactivated".equalsIgnoreCase(empStatus)) {
                    linkedUser.setActive(false);
                } else if ("Active".equalsIgnoreCase(empStatus)) {
                    linkedUser.setActive(true);
                }
            }
            userRepository.save(linkedUser);
        }

        return ResponseEntity.ok(employeeRepository.save(employee));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    @Transactional
    public ResponseEntity<?> deleteEmployee(@PathVariable Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        // Check if employee is referenced in historical records
        boolean hasAttendance = attendanceRepository.existsByEmployeeId(id);
        boolean hasPayroll = payrollDetailRepository.existsByEmployeeId(id);
        boolean hasWorkforce = workforceAssignmentRepository.existsByEmployeeId(id);
        boolean hasLeaves = leaveRequestRepository.existsByEmployeeId(id);
        boolean hasOvertime = overtimeRepository.existsByEmployeeId(id);
        boolean hasEvaluations = evaluationRepository.existsByEmployeeId(id);
        boolean hasWarnings = warningRepository.existsByEmployeeId(id);
        boolean hasDisciplinary = disciplinaryRepository.existsByEmployeeId(id);
        boolean hasBenefits = benefitRepository.existsByEmployeeId(id);

        if (hasAttendance || hasPayroll || hasWorkforce || hasLeaves || hasOvertime || hasEvaluations || hasWarnings || hasDisciplinary || hasBenefits) {
            // Prefer deactivation/soft-delete to protect historical records
            employee.setEmploymentStatus("Inactive");
            if (employee.getUser() != null) {
                employee.getUser().setActive(false);
                userRepository.save(employee.getUser());
            }
            Employee saved = employeeRepository.save(employee);
            return ResponseEntity.ok(Map.of(
                    "status", "DEACTIVATED",
                    "message", "Employee has active historical or operational records (attendance/payroll/assignments). Status set to Inactive to preserve audit integrity.",
                    "employee", saved
            ));
        }

        // Pristine employee: Safe to hard delete
        List<EmployeeDocument> docs = documentRepository.findByEmployeeId(id);
        if (!docs.isEmpty()) {
            documentRepository.deleteAll(docs);
        }
        if (employee.getUser() != null) {
            User user = employee.getUser();
            employee.setUser(null);
            employeeRepository.save(employee);
            userRepository.delete(user);
        }
        employeeRepository.delete(employee);
        return ResponseEntity.ok(Map.of(
                "status", "DELETED",
                "message", "Employee record removed successfully from MySQL."
        ));
    }

    // Department Management

    @GetMapping("/departments")
    public ResponseEntity<List<Department>> getDepartments(@RequestParam(required = false) String search) {
        List<Department> list = departmentRepository.findAll();
        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim().toLowerCase();
            list = list.stream().filter(d -> d.getName().toLowerCase().contains(q) || d.getCode().toLowerCase().contains(q)).toList();
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/departments/{id}")
    public ResponseEntity<Department> getDepartmentById(@PathVariable Long id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));
        return ResponseEntity.ok(dept);
    }

    @PostMapping("/departments")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createDepartment(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String code = payload.get("code");
        String description = payload.get("description");

        if (name == null || name.trim().isEmpty() || code == null || code.trim().isEmpty()) {
            throw new BadRequestException("Department Name and Code are required.");
        }

        if (departmentRepository.existsByName(name.trim())) {
            throw new BadRequestException("Department name already exists: " + name);
        }
        if (departmentRepository.existsByCode(code.trim().toUpperCase())) {
            throw new BadRequestException("Department code already exists: " + code);
        }

        Department dept = new Department(name.trim(), code.trim().toUpperCase(), description);
        return ResponseEntity.ok(departmentRepository.save(dept));
    }

    @PutMapping("/departments/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateDepartment(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));

        if (payload.containsKey("name")) {
            String newName = payload.get("name");
            if (newName != null && !newName.trim().equalsIgnoreCase(dept.getName())) {
                if (departmentRepository.existsByName(newName.trim())) {
                    throw new BadRequestException("Department name already exists: " + newName);
                }
                dept.setName(newName.trim());
            }
        }

        if (payload.containsKey("code")) {
            String newCode = payload.get("code");
            if (newCode != null && !newCode.trim().equalsIgnoreCase(dept.getCode())) {
                if (departmentRepository.existsByCode(newCode.trim().toUpperCase())) {
                    throw new BadRequestException("Department code already exists: " + newCode);
                }
                dept.setCode(newCode.trim().toUpperCase());
            }
        }

        if (payload.containsKey("description")) {
            dept.setDescription(payload.get("description"));
        }

        return ResponseEntity.ok(departmentRepository.save(dept));
    }

    @DeleteMapping("/departments/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteDepartment(@PathVariable Long id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));

        if (employeeRepository.existsByDepartmentId(id)) {
            throw new BadRequestException("Cannot delete department '" + dept.getName() + "': Active employees are currently assigned to this department. Please reassign them first.");
        }

        if (positionRepository.existsByDepartmentId(id)) {
            throw new BadRequestException("Cannot delete department '" + dept.getName() + "': Positions are defined under this department. Please remove or reassign them first.");
        }

        departmentRepository.delete(dept);
        return ResponseEntity.ok(Map.of("message", "Department deleted successfully.", "id", id));
    }

    // Position Management

    @GetMapping("/positions")
    public ResponseEntity<List<Position>> getPositions(@RequestParam(required = false) Long departmentId,
                                                       @RequestParam(required = false) String search) {
        List<Position> list;
        if (departmentId != null) {
            list = positionRepository.findByDepartmentId(departmentId);
        } else {
            list = positionRepository.findAll();
        }

        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim().toLowerCase();
            list = list.stream().filter(p -> p.getTitle().toLowerCase().contains(q)).toList();
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/positions/{id}")
    public ResponseEntity<Position> getPositionById(@PathVariable Long id) {
        Position pos = positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found with id: " + id));
        return ResponseEntity.ok(pos);
    }

    @PostMapping("/positions")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createPosition(@RequestBody Map<String, Object> payload) {
        String title = (String) payload.get("title");
        if (title == null || title.trim().isEmpty()) {
            throw new BadRequestException("Position title is required.");
        }

        if (payload.get("departmentId") == null || payload.get("departmentId").toString().trim().isEmpty()) {
            throw new BadRequestException("Department is required for position.");
        }
        Long deptId = Long.valueOf(payload.get("departmentId").toString().trim());
        Department department = departmentRepository.findById(deptId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + deptId));

        if (positionRepository.existsByTitleAndDepartmentId(title.trim(), deptId)) {
            throw new BadRequestException("A position with title '" + title + "' already exists in " + department.getName());
        }

        String description = (String) payload.get("description");
        String level = (String) payload.getOrDefault("level", "Intermediate");

        BigDecimal defaultMonthlySalary = null;
        if (payload.get("defaultMonthlySalary") != null && !payload.get("defaultMonthlySalary").toString().trim().isEmpty()) {
            try {
                defaultMonthlySalary = new BigDecimal(payload.get("defaultMonthlySalary").toString().trim());
                if (defaultMonthlySalary.compareTo(BigDecimal.ZERO) < 0) {
                    throw new BadRequestException("Default monthly salary cannot be negative.");
                }
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid default monthly salary amount.");
            }
        }

        BigDecimal otRatePerHour = BigDecimal.ZERO;
        if (payload.get("otRatePerHour") != null && !payload.get("otRatePerHour").toString().trim().isEmpty()) {
            try {
                otRatePerHour = new BigDecimal(payload.get("otRatePerHour").toString().trim());
                if (otRatePerHour.compareTo(BigDecimal.ZERO) < 0) {
                    throw new BadRequestException("OT rate per hour cannot be negative.");
                }
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid OT rate per hour amount.");
            }
        }

        Double regularWorkingHours = 8.0;
        if (payload.get("regularWorkingHoursPerDay") != null && !payload.get("regularWorkingHoursPerDay").toString().trim().isEmpty()) {
            try {
                regularWorkingHours = Double.valueOf(payload.get("regularWorkingHoursPerDay").toString().trim());
                if (regularWorkingHours <= 0) {
                    throw new BadRequestException("Regular working hours per day must be greater than zero.");
                }
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid regular working hours amount.");
            }
        }

        Position pos = new Position(title.trim(), department, description, level, defaultMonthlySalary, otRatePerHour, regularWorkingHours);
        return ResponseEntity.ok(positionRepository.save(pos));
    }

    @PutMapping("/positions/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updatePosition(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Position pos = positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found with id: " + id));

        if (payload.containsKey("title")) {
            String newTitle = (String) payload.get("title");
            if (newTitle != null && !newTitle.trim().isEmpty()) {
                pos.setTitle(newTitle.trim());
            }
        }

        if (payload.containsKey("departmentId") && payload.get("departmentId") != null) {
            Long deptId = Long.valueOf(payload.get("departmentId").toString().trim());
            departmentRepository.findById(deptId).ifPresent(pos::setDepartment);
        }

        if (payload.containsKey("level")) {
            pos.setLevel((String) payload.get("level"));
        }
        if (payload.containsKey("description")) {
            pos.setDescription((String) payload.get("description"));
        }

        if (payload.containsKey("defaultMonthlySalary")) {
            if (payload.get("defaultMonthlySalary") != null && !payload.get("defaultMonthlySalary").toString().trim().isEmpty()) {
                try {
                    BigDecimal salary = new BigDecimal(payload.get("defaultMonthlySalary").toString().trim());
                    if (salary.compareTo(BigDecimal.ZERO) < 0) {
                        throw new BadRequestException("Default monthly salary cannot be negative.");
                    }
                    pos.setDefaultMonthlySalary(salary);
                } catch (NumberFormatException e) {
                    throw new BadRequestException("Invalid default monthly salary amount.");
                }
            } else {
                pos.setDefaultMonthlySalary(null);
            }
        }

        if (payload.containsKey("otRatePerHour")) {
            if (payload.get("otRatePerHour") != null && !payload.get("otRatePerHour").toString().trim().isEmpty()) {
                try {
                    BigDecimal otRate = new BigDecimal(payload.get("otRatePerHour").toString().trim());
                    if (otRate.compareTo(BigDecimal.ZERO) < 0) {
                        throw new BadRequestException("OT rate per hour cannot be negative.");
                    }
                    pos.setOtRatePerHour(otRate);
                } catch (NumberFormatException e) {
                    throw new BadRequestException("Invalid OT rate per hour amount.");
                }
            } else {
                pos.setOtRatePerHour(BigDecimal.ZERO);
            }
        }

        if (payload.containsKey("regularWorkingHoursPerDay")) {
            if (payload.get("regularWorkingHoursPerDay") != null && !payload.get("regularWorkingHoursPerDay").toString().trim().isEmpty()) {
                try {
                    Double regHours = Double.valueOf(payload.get("regularWorkingHoursPerDay").toString().trim());
                    if (regHours <= 0) {
                        throw new BadRequestException("Regular working hours per day must be greater than zero.");
                    }
                    pos.setRegularWorkingHoursPerDay(regHours);
                } catch (NumberFormatException e) {
                    throw new BadRequestException("Invalid regular working hours amount.");
                }
            } else {
                pos.setRegularWorkingHoursPerDay(8.0);
            }
        }

        return ResponseEntity.ok(positionRepository.save(pos));
    }

    @DeleteMapping("/positions/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deletePosition(@PathVariable Long id) {
        Position pos = positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found with id: " + id));

        if (employeeRepository.existsByPositionId(id)) {
            throw new BadRequestException("Cannot delete position '" + pos.getTitle() + "': Active employees are currently assigned to this position.");
        }

        positionRepository.delete(pos);
        return ResponseEntity.ok(Map.of("message", "Position deleted successfully.", "id", id));
    }

    // Employee Documents

    @GetMapping("/documents")
    public ResponseEntity<List<EmployeeDocument>> getAllDocuments(@RequestParam(required = false) String search,
                                                                 @RequestParam(required = false) String type,
                                                                 @RequestParam(required = false) String status,
                                                                 @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(documentRepository.findByEmployeeId(myEmpId));
        }

        List<EmployeeDocument> list = documentRepository.findAll();
        if (type != null && !type.trim().isEmpty() && !type.equalsIgnoreCase("ALL")) {
            list = list.stream().filter(d -> type.equalsIgnoreCase(d.getDocumentType())).toList();
        }
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            list = list.stream().filter(d -> status.equalsIgnoreCase(d.getStatus())).toList();
        }
        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim().toLowerCase();
            list = list.stream().filter(d -> {
                String empId = d.getEmployee() != null ? d.getEmployee().getEmployeeId().toLowerCase() : "";
                String name = d.getEmployee() != null ? d.getEmployee().getFullName().toLowerCase() : "";
                String docName = d.getDocumentName().toLowerCase();
                return empId.contains(q) || name.contains(q) || docName.contains(q);
            }).toList();
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}/documents")
    public ResponseEntity<List<EmployeeDocument>> getEmployeeDocuments(@PathVariable Long id,
                                                                       @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null || !myEmpId.equals(id)) {
                throw new AccessDeniedException("Access denied: You may only view your own documents.");
            }
        }
        return ResponseEntity.ok(documentRepository.findByEmployeeId(id));
    }

    @GetMapping("/documents/{docId}")
    public ResponseEntity<EmployeeDocument> getDocumentById(@PathVariable Long docId,
                                                           @AuthenticationPrincipal UserPrincipal currentUser) {
        EmployeeDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + docId));
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null || doc.getEmployee() == null || !myEmpId.equals(doc.getEmployee().getId())) {
                throw new AccessDeniedException("Access denied: You may only view your own documents.");
            }
        }
        return ResponseEntity.ok(doc);
    }

    @PostMapping("/{id}/documents")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> uploadDocument(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        String docName = payload.getOrDefault("documentName", "Employee Document");
        String docType = payload.getOrDefault("documentType", "General");
        String fileUrl = payload.getOrDefault("fileUrl", "documents/doc_" + System.currentTimeMillis() + ".pdf");
        String status = payload.getOrDefault("status", "VERIFIED");
        String remarks = payload.getOrDefault("remarks", "");

        EmployeeDocument doc = new EmployeeDocument(employee, docName, docType, fileUrl, status, remarks);
        return ResponseEntity.ok(documentRepository.save(doc));
    }

    @PutMapping("/documents/{docId}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateDocument(@PathVariable Long docId, @RequestBody Map<String, String> payload) {
        EmployeeDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + docId));

        if (payload.containsKey("documentName")) doc.setDocumentName(payload.get("documentName"));
        if (payload.containsKey("documentType")) doc.setDocumentType(payload.get("documentType"));
        if (payload.containsKey("status")) doc.setStatus(payload.get("status"));
        if (payload.containsKey("remarks")) doc.setRemarks(payload.get("remarks"));
        if (payload.containsKey("fileUrl")) doc.setFileUrl(payload.get("fileUrl"));

        return ResponseEntity.ok(documentRepository.save(doc));
    }

    @DeleteMapping("/documents/{docId}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteDocument(@PathVariable Long docId) {
        EmployeeDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + docId));
        documentRepository.delete(doc);
        return ResponseEntity.ok(Map.of("message", "Document deleted successfully.", "id", docId));
    }

    // User Provisioning

    @PostMapping("/{id}/assign-account")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> assignUserAccount(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        String username = payload.get("username");
        String password = payload.get("password");
        String roleStr = payload.get("role");

        if (username == null || password == null || roleStr == null) {
            throw new BadRequestException("Username, password, and role are required.");
        }

        if (userRepository.existsByUsername(username.trim())) {
            throw new BadRequestException("Username already in use: " + username);
        }

        Role role;
        try {
            role = Role.valueOf(roleStr);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + roleStr);
        }

        User user = new User(
                username.trim(),
                employee.getEmail(),
                passwordEncoder.encode(password),
                employee.getFullName(),
                role
        );
        User savedUser = userRepository.save(user);

        employee.setUser(savedUser);
        employeeRepository.save(employee);

        return ResponseEntity.ok(Map.of(
                "message", "User account assigned successfully",
                "username", savedUser.getUsername(),
                "role", savedUser.getRole()
        ));
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
        if (currentUser != null) {
            return employeeRepository.findByUserId(currentUser.getId())
                    .or(() -> employeeRepository.findByEmailIgnoreCase(currentUser.getEmail()))
                    .map(Employee::getId)
                    .orElse(null);
        }
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null) {
            String name = auth.getName();
            return employeeRepository.findByEmailIgnoreCase(name)
                    .or(() -> userRepository.findByUsernameOrEmailIgnoreCase(name, name)
                            .flatMap(u -> employeeRepository.findByUserId(u.getId())))
                    .map(Employee::getId)
                    .orElse(null);
        }
        return null;
    }
}
