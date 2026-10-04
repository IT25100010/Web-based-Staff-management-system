package com.lws.staff_management.performance;

import com.lws.staff_management.employee.DepartmentRepository;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.exception.ResourceNotFoundException;
import com.lws.staff_management.performance.dto.*;
import com.lws.staff_management.security.UserPrincipal;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.Collections;
import java.util.ArrayList;
import java.util.HashMap;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/performance")
public class PerformanceController {

    private final KPIRepository kpiRepository;
    private final PerformanceEvaluationRepository evaluationRepository;
    private final SupervisorFeedbackRepository feedbackRepository;
    private final EmployeeGoalRepository goalRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final KPIService kpiService;
    private final KPIResultRepository resultRepository;
    private final KPIAssignmentRepository assignmentRepository;

    public PerformanceController(KPIRepository kpiRepository,
                                 PerformanceEvaluationRepository evaluationRepository,
                                 SupervisorFeedbackRepository feedbackRepository,
                                 EmployeeGoalRepository goalRepository,
                                 EmployeeRepository employeeRepository,
                                 DepartmentRepository departmentRepository,
                                 UserRepository userRepository,
                                 KPIService kpiService,
                                 KPIResultRepository resultRepository,
                                 KPIAssignmentRepository assignmentRepository) {
        this.kpiRepository = kpiRepository;
        this.evaluationRepository = evaluationRepository;
        this.feedbackRepository = feedbackRepository;
        this.goalRepository = goalRepository;
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.kpiService = kpiService;
        this.resultRepository = resultRepository;
        this.assignmentRepository = assignmentRepository;
    }

    // ==========================================
    // 1. KPI CORE (CREATION, UPDATE, DELETION)
    // ==========================================
    @GetMapping("/kpis")
    public ResponseEntity<List<KPI>> getKpis(@RequestParam(required = false) Long departmentId) {
        if (departmentId != null) {
            return ResponseEntity.ok(kpiRepository.findByDepartmentId(departmentId));
        }
        return ResponseEntity.ok(kpiRepository.findAll());
    }

    @GetMapping("/kpis/{id}")
    public ResponseEntity<KPI> getKpiById(@PathVariable Long id) {
        KPI kpi = kpiRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KPI not found: " + id));
        return ResponseEntity.ok(kpi);
    }

    @PostMapping("/kpis")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createKpi(@RequestBody Map<String, Object> payload,
                                      @AuthenticationPrincipal UserPrincipal currentUser) {
        KPI kpi = new KPI();
        kpi.setName((String) payload.get("name"));
        kpi.setDescription((String) payload.get("description"));
        kpi.setTargetValue((String) payload.get("targetValue"));
        kpi.setEvaluationCriteria((String) payload.get("evaluationCriteria"));
        kpi.setWeightage(Integer.parseInt(payload.getOrDefault("weightage", 20).toString()));
        if (payload.get("departmentId") != null && !payload.get("departmentId").toString().trim().isEmpty()) {
            Long deptId = Long.valueOf(payload.get("departmentId").toString());
            departmentRepository.findById(deptId).ifPresent(kpi::setDepartment);
        }
        kpi.setStatus((String) payload.getOrDefault("status", "ACTIVE"));

        // Extended KPI fields
        if (payload.containsKey("kpiType") && payload.get("kpiType") != null) {
            try {
                kpi.setKpiType(KPIType.valueOf(payload.get("kpiType").toString()));
            } catch (Exception ignored) {
                kpi.setKpiType(KPIType.MANUAL_SCORE);
            }
        }
        if (payload.get("startDate") != null && !payload.get("startDate").toString().trim().isEmpty()) {
            kpi.setStartDate(LocalDate.parse(payload.get("startDate").toString().substring(0, 10)));
        }
        if (payload.get("endDate") != null && !payload.get("endDate").toString().trim().isEmpty()) {
            kpi.setEndDate(LocalDate.parse(payload.get("endDate").toString().substring(0, 10)));
        }
        if (payload.get("maxScore") != null && !payload.get("maxScore").toString().trim().isEmpty()) {
            kpi.setMaxScore(new BigDecimal(payload.get("maxScore").toString()));
        }
        if (kpi.getKpiType() == KPIType.MCQ_ASSESSMENT) {
            kpi.setMaxScore(BigDecimal.valueOf(100)); // fixed for MCQ
        }
        if (payload.containsKey("instructions")) {
            kpi.setInstructions((String) payload.get("instructions"));
        }

        // Creator tracking
        if (currentUser != null) {
            userRepository.findById(currentUser.getId()).ifPresent(kpi::setCreatedBy);
        }

        KPI savedKpi = kpiRepository.save(kpi);

        // If workshop type and workshop details provided in payload, create default workshop record
        if (savedKpi.getKpiType() == KPIType.WORKSHOP) {
            KPIWorkshop workshop = new KPIWorkshop();
            workshop.setKpi(savedKpi);
            workshop.setTitle(savedKpi.getName());
            workshop.setDescription(savedKpi.getDescription());
            workshop.setWorkshopDate(savedKpi.getStartDate());
            workshop.setMaxScore(savedKpi.getMaxScore());
            kpiService.saveWorkshop(savedKpi.getId(), workshop);
        }

        return ResponseEntity.ok(savedKpi);
    }

    @PostMapping("/kpis/mcq-wizard")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createMcqKpiWithWizard(@RequestBody CreateMcqKpiRequest request,
                                                    @AuthenticationPrincipal UserPrincipal currentUser) {
        User user = currentUser != null ? userRepository.findById(currentUser.getId()).orElse(null) : null;
        KPI created = kpiService.createMcqKpiWithWizard(request, user);
        return ResponseEntity.ok(created);
    }

    @PostMapping("/kpis/workshop-wizard")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createWorkshopKpiWithWizard(@RequestBody CreateWorkshopKpiRequest request,
                                                         @AuthenticationPrincipal UserPrincipal currentUser) {
        User user = currentUser != null ? userRepository.findById(currentUser.getId()).orElse(null) : null;
        KPI created = kpiService.createWorkshopKpiWithWizard(request, user);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/kpis/{id}/mcq-wizard")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateMcqKpiWithWizard(@PathVariable Long id,
                                                    @RequestBody CreateMcqKpiRequest request) {
        KPI updated = kpiService.updateMcqKpiWithWizard(id, request);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/kpis/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateKpi(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        KPI kpi = kpiRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KPI not found: " + id));

        if (payload.containsKey("name")) kpi.setName((String) payload.get("name"));
        if (payload.containsKey("description")) kpi.setDescription((String) payload.get("description"));
        if (payload.containsKey("targetValue")) kpi.setTargetValue((String) payload.get("targetValue"));
        if (payload.containsKey("evaluationCriteria")) kpi.setEvaluationCriteria((String) payload.get("evaluationCriteria"));
        if (payload.containsKey("weightage")) kpi.setWeightage(Integer.parseInt(payload.get("weightage").toString()));
        if (payload.containsKey("status")) kpi.setStatus((String) payload.get("status"));

        if (payload.containsKey("departmentId")) {
            if (payload.get("departmentId") != null && !payload.get("departmentId").toString().trim().isEmpty()) {
                Long deptId = Long.valueOf(payload.get("departmentId").toString());
                departmentRepository.findById(deptId).ifPresent(kpi::setDepartment);
            } else {
                kpi.setDepartment(null);
            }
        }

        if (payload.containsKey("kpiType") && payload.get("kpiType") != null) {
            try {
                kpi.setKpiType(KPIType.valueOf(payload.get("kpiType").toString()));
            } catch (Exception ignored) {}
        }
        if (payload.containsKey("startDate")) {
            if (payload.get("startDate") != null && !payload.get("startDate").toString().trim().isEmpty()) {
                kpi.setStartDate(LocalDate.parse(payload.get("startDate").toString().substring(0, 10)));
            } else {
                kpi.setStartDate(null);
            }
        }
        if (payload.containsKey("endDate")) {
            if (payload.get("endDate") != null && !payload.get("endDate").toString().trim().isEmpty()) {
                kpi.setEndDate(LocalDate.parse(payload.get("endDate").toString().substring(0, 10)));
            } else {
                kpi.setEndDate(null);
            }
        }
        if (payload.containsKey("maxScore") && payload.get("maxScore") != null && !payload.get("maxScore").toString().trim().isEmpty()) {
            kpi.setMaxScore(new BigDecimal(payload.get("maxScore").toString()));
        }
        if (kpi.getKpiType() == KPIType.MCQ_ASSESSMENT) {
            kpi.setMaxScore(BigDecimal.valueOf(100));
        }
        if (payload.containsKey("instructions")) {
            kpi.setInstructions((String) payload.get("instructions"));
        }

        return ResponseEntity.ok(kpiRepository.save(kpi));
    }

    @DeleteMapping("/kpis/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteKpi(@PathVariable Long id) {
        KPI kpi = kpiRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KPI not found: " + id));

        // Delete assignments, workshop, and questions safely through their cascades/service
        List<KPIAssignment> assignments = kpiService.getAssignmentsByKpi(id);
        for (KPIAssignment a : assignments) {
            kpiService.deleteAssignment(a.getId());
        }
        kpiRepository.delete(kpi);
        return ResponseEntity.ok(Map.of("message", "KPI deleted successfully."));
    }

    // ==========================================
    // 2. ASSIGNMENTS
    // ==========================================
    @PostMapping("/kpis/{kpiId}/assignments")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> assignEmployees(@PathVariable Long kpiId, @RequestBody AssignEmployeesRequest request) {
        List<KPIAssignment> created = kpiService.assignEmployees(kpiId, request.getEmployeeIds());
        return ResponseEntity.ok(created);
    }

    @GetMapping("/kpis/{kpiId}/assignments")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> getAssignmentsByKpi(@PathVariable Long kpiId) {
        return ResponseEntity.ok(kpiService.getAssignmentsByKpi(kpiId));
    }

    @DeleteMapping("/kpi-assignments/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteAssignment(@PathVariable Long id) {
        kpiService.deleteAssignment(id);
        return ResponseEntity.ok(Map.of("message", "Assignment deleted successfully."));
    }

    // ==========================================
    // 3. MCQ QUESTIONS & OPTIONS (MANAGER)
    // ==========================================
    @PostMapping("/kpis/{kpiId}/questions")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> addQuestion(@PathVariable Long kpiId, @RequestBody KPIQuestionDto dto) {
        KPIQuestion saved = kpiService.addQuestion(kpiId, dto);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/kpis/{kpiId}/questions")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> getQuestionsForKpi(@PathVariable Long kpiId) {
        return ResponseEntity.ok(kpiService.getQuestionsForManager(kpiId));
    }

    @PutMapping("/questions/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateQuestion(@PathVariable Long id, @RequestBody KPIQuestionDto dto) {
        KPIQuestion updated = kpiService.updateQuestion(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/questions/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteQuestion(@PathVariable Long id) {
        kpiService.deleteQuestion(id);
        return ResponseEntity.ok(Map.of("message", "Question deleted successfully."));
    }

    // ==========================================
    // 4. WORKSHOPS
    // ==========================================
    @PostMapping("/kpis/{kpiId}/workshop")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> saveWorkshop(@PathVariable Long kpiId, @RequestBody KPIWorkshop workshop) {
        return ResponseEntity.ok(kpiService.saveWorkshop(kpiId, workshop));
    }

    @GetMapping("/kpis/{kpiId}/workshop")
    public ResponseEntity<?> getWorkshop(@PathVariable Long kpiId) {
        return ResponseEntity.ok(kpiService.getWorkshop(kpiId).orElse(null));
    }

    @PutMapping("/workshops/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateWorkshop(@PathVariable Long id, @RequestBody KPIWorkshop workshop) {
        if (workshop.getKpi() != null) {
            return ResponseEntity.ok(kpiService.saveWorkshop(workshop.getKpi().getId(), workshop));
        }
        return ResponseEntity.badRequest().body(Map.of("message", "KPI reference is required."));
    }

    // ==========================================
    // 5. SCORING (WORKSHOP & MANUAL)
    // ==========================================
    @PostMapping("/kpi-assignments/{assignmentId}/workshop-score")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> submitWorkshopScore(@PathVariable Long assignmentId,
                                                @RequestBody ManualScoreRequest request,
                                                @AuthenticationPrincipal UserPrincipal currentUser) {
        User user = userRepository.findById(currentUser.getId()).orElse(null);
        return ResponseEntity.ok(kpiService.scoreWorkshopParticipant(assignmentId, user, request));
    }

    @PostMapping("/kpi-assignments/{assignmentId}/manual-score")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> submitManualScore(@PathVariable Long assignmentId,
                                              @RequestBody ManualScoreRequest request,
                                              @AuthenticationPrincipal UserPrincipal currentUser) {
        User user = userRepository.findById(currentUser.getId()).orElse(null);
        return ResponseEntity.ok(kpiService.scoreManualKpi(assignmentId, user, request));
    }

    @PostMapping("/kpi-assignments/{assignmentId}/result")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> submitResult(@PathVariable Long assignmentId,
                                         @RequestBody ManualScoreRequest request,
                                         @AuthenticationPrincipal UserPrincipal currentUser) {
        User user = userRepository.findById(currentUser.getId()).orElse(null);
        if (request.getAttendance() != null && !request.getAttendance().trim().isEmpty()) {
            return ResponseEntity.ok(kpiService.scoreWorkshopParticipant(assignmentId, user, request));
        }
        return ResponseEntity.ok(kpiService.scoreManualKpi(assignmentId, user, request));
    }

    // ==========================================
    // 6. RESULTS & SUMMARY VIEWS
    // ==========================================
    @GetMapping({"/kpis/{kpiId}/results", "/kpis/{kpiId}/results-summary"})
    public ResponseEntity<?> getKpiResults(@PathVariable Long kpiId,
                                          @AuthenticationPrincipal UserPrincipal currentUser) {
        KPI kpi = kpiRepository.findById(kpiId)
                .orElseThrow(() -> new ResourceNotFoundException("KPI not found: " + kpiId));

        // Management roles or creator can view
        boolean isCreator = kpi.getCreatedBy() != null && kpi.getCreatedBy().getId().equals(currentUser.getId());
        boolean isManager = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_HR_MANAGER") ||
                               a.getAuthority().equals("ROLE_OPERATIONS_MANAGER") ||
                               a.getAuthority().equals("ROLE_SENIOR_ADMIN") ||
                               a.getAuthority().equals("ROLE_IT_COORDINATOR"));

        if (!isCreator && !isManager) {
            throw new SecurityException("Unauthorized to view results for this KPI.");
        }

        return ResponseEntity.ok(kpiService.getKpiResultsSummary(kpiId));
    }

    @GetMapping("/kpi-assignments/{assignmentId}/result-details")
    public ResponseEntity<?> getAssignmentResultDetails(@PathVariable Long assignmentId,
                                                       @AuthenticationPrincipal UserPrincipal currentUser) {
        // Can be viewed by manager or by the assigned employee
        KPIResultDetailDto details = kpiService.getAssignmentResultDetails(assignmentId);
        if (isEmployeeUser(currentUser)) {
            Employee emp = resolveCurrentEmployee(currentUser);
            if (!details.getEmployeeId().equals(emp.getEmployeeId())) {
                throw new org.springframework.security.access.AccessDeniedException("Unauthorized access to result details of another employee.");
            }
        }
        return ResponseEntity.ok(details);
    }

    // ==========================================
    // 7. EMPLOYEE-FACING APIS
    // ==========================================
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
        throw new org.springframework.security.access.AccessDeniedException("Not authenticated");
    }

    @GetMapping("/my-kpis")
    public ResponseEntity<List<KPIAssignment>> getMyKpis(@AuthenticationPrincipal UserPrincipal currentUser) {
        Employee employee = resolveCurrentEmployee(currentUser);
        return ResponseEntity.ok(kpiService.getMyAssignments(employee.getId()));
    }

    @GetMapping("/my-kpis/{assignmentId}")
    public ResponseEntity<?> getMyAssessment(@PathVariable Long assignmentId,
                                            @AuthenticationPrincipal UserPrincipal currentUser) {
        Employee employee = resolveCurrentEmployee(currentUser);
        return ResponseEntity.ok(kpiService.getEmployeeAssessment(assignmentId, employee.getId()));
    }

    @PostMapping("/my-kpis/{assignmentId}/submit")
    public ResponseEntity<?> submitMyAssessment(@PathVariable Long assignmentId,
                                               @RequestBody SubmitAssessmentRequest request,
                                               @AuthenticationPrincipal UserPrincipal currentUser) {
        KPIAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        boolean isManager = currentUser != null && currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_HR_MANAGER") ||
                               a.getAuthority().equals("ROLE_OPERATIONS_MANAGER") ||
                               a.getAuthority().equals("ROLE_SENIOR_ADMIN") ||
                               a.getAuthority().equals("ROLE_IT_COORDINATOR"));

        Long empId;
        if (isManager) {
            empId = assignment.getEmployee().getId();
        } else {
            Employee employee = resolveCurrentEmployee(currentUser);
            empId = employee.getId();
        }
        KPIResult result = kpiService.submitMcqAssessment(assignmentId, empId, request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/my-kpis/{assignmentId}/result")
    public ResponseEntity<?> getMyAssessmentResult(@PathVariable Long assignmentId,
                                                  @AuthenticationPrincipal UserPrincipal currentUser) {
        Employee employee = resolveCurrentEmployee(currentUser);
        KPIResultDetailDto details = kpiService.getAssignmentResultDetails(assignmentId);
        // Ensure this result belongs to this employee
        if (!details.getEmployeeId().equals(employee.getEmployeeId())) {
            throw new SecurityException("Unauthorized access to result.");
        }
        return ResponseEntity.ok(details);
    }

    // ==========================================
    // 8. EXISTING PERFORMANCE EVALUATIONS
    // ==========================================
    @GetMapping("/evaluations")
    public ResponseEntity<List<PerformanceEvaluation>> getEvaluations(@RequestParam(required = false) Long employeeId,
                                                                      @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(evaluationRepository.findByEmployeeId(myEmpId));
        }
        if (employeeId != null) {
            return ResponseEntity.ok(evaluationRepository.findByEmployeeId(employeeId));
        }
        return ResponseEntity.ok(evaluationRepository.findAll());
    }

    @GetMapping("/evaluations/{id}")
    public ResponseEntity<PerformanceEvaluation> getEvaluationById(@PathVariable Long id,
                                                                   @AuthenticationPrincipal UserPrincipal currentUser) {
        PerformanceEvaluation eval = evaluationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluation not found: " + id));

        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null || eval.getEmployee() == null || !myEmpId.equals(eval.getEmployee().getId())) {
                throw new org.springframework.security.access.AccessDeniedException("Access denied: You may only view your own evaluations.");
            }
        }
        return ResponseEntity.ok(eval);
    }

    @GetMapping("/evaluations/employee-kpis")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> getEmployeeKpisForEvaluation(@RequestParam Long employeeId,
                                                          @RequestParam(required = false) String period) {
        List<KPIResult> results = resultRepository.findByEmployeeId(employeeId);
        List<Map<String, Object>> completedKpis = new ArrayList<>();
        BigDecimal totalPercentage = BigDecimal.ZERO;
        int count = 0;

        for (KPIResult r : results) {
            if (!matchesEvaluationPeriod(r, period)) {
                continue;
            }

            BigDecimal pct = r.getPercentage();
            if (pct == null) {
                BigDecimal s = r.getScore() != null ? r.getScore() : BigDecimal.ZERO;
                BigDecimal max = r.getMaxScore() != null && r.getMaxScore().compareTo(BigDecimal.ZERO) > 0 ? r.getMaxScore() : BigDecimal.valueOf(100);
                pct = s.multiply(BigDecimal.valueOf(100)).divide(max, 2, RoundingMode.HALF_UP);
            }

            Map<String, Object> item = new HashMap<>();
            item.put("id", r.getId());
            item.put("kpiName", r.getKpi() != null ? r.getKpi().getName() : "Unknown KPI");
            item.put("kpiType", r.getKpi() != null && r.getKpi().getKpiType() != null ? r.getKpi().getKpiType().name() : "MCQ_ASSESSMENT");
            item.put("score", r.getScore());
            item.put("maxScore", r.getMaxScore());
            item.put("percentage", pct);
            item.put("grade", r.getGrade());
            item.put("evaluatedAt", r.getEvaluatedAt());
            completedKpis.add(item);

            totalPercentage = totalPercentage.add(pct);
            count++;
        }

        BigDecimal averagePercentage = BigDecimal.ZERO;
        if (count > 0) {
            averagePercentage = totalPercentage.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
        }

        // System automatically derives Performance Grade:
        // 85-100 Outstanding, 70-84 Meets Expectations, 50-69 Needs Improvement, below 50 Unsatisfactory
        String derivedGrade;
        if (averagePercentage.compareTo(BigDecimal.valueOf(85)) >= 0) {
            derivedGrade = "Outstanding";
        } else if (averagePercentage.compareTo(BigDecimal.valueOf(70)) >= 0) {
            derivedGrade = "Meets Expectations";
        } else if (averagePercentage.compareTo(BigDecimal.valueOf(50)) >= 0) {
            derivedGrade = "Needs Improvement";
        } else {
            derivedGrade = "Unsatisfactory";
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("employeeId", employeeId);
        resp.put("period", period);
        resp.put("completedKpis", completedKpis);
        resp.put("averageScore", averagePercentage);
        resp.put("overallScore", averagePercentage);
        resp.put("derivedGrade", derivedGrade);
        resp.put("performanceGrade", derivedGrade);

        return ResponseEntity.ok(resp);
    }

    private boolean matchesEvaluationPeriod(KPIResult r, String period) {
        if (period == null || period.trim().isEmpty() || "ALL".equalsIgnoreCase(period.trim()) || "Current Period".equalsIgnoreCase(period.trim())) {
            return true;
        }
        String p = period.trim().toLowerCase();

        // 1. Direct name / description matching if period matches KPI name
        if (r.getKpi() != null && r.getKpi().getName() != null) {
            String kName = r.getKpi().getName().toLowerCase();
            if (kName.contains(p) || p.contains(kName)) {
                return true;
            }
        }

        // 2. Evaluated date matching
        LocalDate evalDate = r.getEvaluatedAt() != null ? r.getEvaluatedAt().toLocalDate() : null;
        if (evalDate == null && r.getKpi() != null) {
            evalDate = r.getKpi().getStartDate() != null ? r.getKpi().getStartDate() : r.getKpi().getEndDate();
        }
        if (evalDate == null) {
            return false;
        }

        // Check if string contains year (e.g. 2026)
        java.util.regex.Matcher yearMatcher = java.util.regex.Pattern.compile("(19|20)\\d{2}").matcher(p);
        Integer periodYear = null;
        if (yearMatcher.find()) {
            periodYear = Integer.parseInt(yearMatcher.group());
        }

        // Check Quarter (e.g. Q1, Q2, Q3, Q4)
        java.util.regex.Matcher qMatcher = java.util.regex.Pattern.compile("q([1-4])").matcher(p);
        Integer periodQuarter = null;
        if (qMatcher.find()) {
            periodQuarter = Integer.parseInt(qMatcher.group(1));
        }

        if (periodYear != null && periodQuarter != null) {
            int evalQuarter = (evalDate.getMonthValue() - 1) / 3 + 1;
            return evalDate.getYear() == periodYear && evalQuarter == periodQuarter;
        }

        if (periodYear != null) {
            if (evalDate.getYear() != periodYear) {
                return false;
            }
        }

        if (periodQuarter != null) {
            int evalQuarter = (evalDate.getMonthValue() - 1) / 3 + 1;
            return evalQuarter == periodQuarter;
        }

        // Check Month names
        for (java.time.Month m : java.time.Month.values()) {
            String mName = m.name().toLowerCase();
            if (p.contains(mName) || p.contains(mName.substring(0, 3))) {
                return evalDate.getMonth() == m;
            }
        }

        return evalDate.toString().contains(p);
    }

    @PostMapping("/evaluations")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createEvaluation(@RequestBody Map<String, Object> payload,
                                             @AuthenticationPrincipal UserPrincipal currentUser) {
        Long employeeId = Long.valueOf(payload.get("employeeId").toString());
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        PerformanceEvaluation eval = new PerformanceEvaluation();
        eval.setEmployee(employee);
        String evalPeriod = payload.get("evaluationPeriod") != null ? payload.get("evaluationPeriod").toString() : "Current Period";
        eval.setEvaluationPeriod(evalPeriod);

        // Derive calculated score and grade based on employee's KPI percentage in that period
        List<KPIResult> results = resultRepository.findByEmployeeId(employeeId);
        BigDecimal totalPercentage = BigDecimal.ZERO;
        int count = 0;
        for (KPIResult r : results) {
            if (matchesEvaluationPeriod(r, evalPeriod)) {
                BigDecimal pct = r.getPercentage() != null ? r.getPercentage() :
                        (r.getMaxScore() != null && r.getMaxScore().compareTo(BigDecimal.ZERO) > 0
                                ? r.getScore().multiply(BigDecimal.valueOf(100)).divide(r.getMaxScore(), 2, RoundingMode.HALF_UP)
                                : r.getScore());
                totalPercentage = totalPercentage.add(pct != null ? pct : BigDecimal.ZERO);
                count++;
            }
        }

        BigDecimal overallScore = count > 0
                ? totalPercentage.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        eval.setOverallScore(overallScore);

        // Auto-derive grade based on standard scale
        String derivedGrade;
        if (overallScore.compareTo(BigDecimal.valueOf(85)) >= 0) {
            derivedGrade = "Outstanding";
        } else if (overallScore.compareTo(BigDecimal.valueOf(70)) >= 0) {
            derivedGrade = "Meets Expectations";
        } else if (overallScore.compareTo(BigDecimal.valueOf(50)) >= 0) {
            derivedGrade = "Needs Improvement";
        } else {
            derivedGrade = "Unsatisfactory";
        }
        eval.setPerformanceGrade(derivedGrade);

        eval.setComments((String) payload.get("comments"));
        eval.setRecommendations((String) payload.get("recommendations"));
        eval.setEvaluationDate(LocalDate.now());

        if (currentUser != null) {
            userRepository.findById(currentUser.getId()).ifPresent(eval::setEvaluator);
        }

        return ResponseEntity.ok(evaluationRepository.save(eval));
    }

    @PutMapping("/evaluations/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateEvaluation(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        PerformanceEvaluation eval = evaluationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluation not found: " + id));

        if (payload.containsKey("evaluationPeriod")) eval.setEvaluationPeriod((String) payload.get("evaluationPeriod"));
        if (payload.containsKey("overallScore")) {
            BigDecimal overallScore = new BigDecimal(payload.get("overallScore").toString());
            eval.setOverallScore(overallScore);
            String derivedGrade;
            if (overallScore.compareTo(BigDecimal.valueOf(85)) >= 0) {
                derivedGrade = "Outstanding";
            } else if (overallScore.compareTo(BigDecimal.valueOf(70)) >= 0) {
                derivedGrade = "Meets Expectations";
            } else if (overallScore.compareTo(BigDecimal.valueOf(50)) >= 0) {
                derivedGrade = "Needs Improvement";
            } else {
                derivedGrade = "Unsatisfactory";
            }
            eval.setPerformanceGrade(derivedGrade);
        }
        if (payload.containsKey("comments")) eval.setComments((String) payload.get("comments"));
        if (payload.containsKey("recommendations")) eval.setRecommendations((String) payload.get("recommendations"));

        return ResponseEntity.ok(evaluationRepository.save(eval));
    }

    @DeleteMapping("/evaluations/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteEvaluation(@PathVariable Long id) {
        PerformanceEvaluation eval = evaluationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluation not found: " + id));
        evaluationRepository.delete(eval);
        return ResponseEntity.ok(Map.of("message", "Evaluation record deleted successfully."));
    }

    // ==========================================
    // 9. EXISTING SUPERVISOR FEEDBACK
    // ==========================================
    @GetMapping("/feedbacks")
    public ResponseEntity<List<SupervisorFeedback>> getFeedbacks(@RequestParam(required = false) Long employeeId,
                                                                 @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(feedbackRepository.findByEmployeeId(myEmpId));
        }
        if (employeeId != null) {
            return ResponseEntity.ok(feedbackRepository.findByEmployeeId(employeeId));
        }
        return ResponseEntity.ok(feedbackRepository.findAll());
    }

    @GetMapping("/feedbacks/{id}")
    public ResponseEntity<SupervisorFeedback> getFeedbackById(@PathVariable Long id,
                                                              @AuthenticationPrincipal UserPrincipal currentUser) {
        SupervisorFeedback fb = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found: " + id));

        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null || fb.getEmployee() == null || !myEmpId.equals(fb.getEmployee().getId())) {
                throw new org.springframework.security.access.AccessDeniedException("Access denied: You may only view your own feedback.");
            }
        }
        return ResponseEntity.ok(fb);
    }

    @PostMapping("/feedbacks")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> submitFeedback(@RequestBody Map<String, Object> payload,
                                           @AuthenticationPrincipal UserPrincipal currentUser) {
        Long employeeId = Long.valueOf(payload.get("employeeId").toString());
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        SupervisorFeedback feedback = new SupervisorFeedback();
        feedback.setEmployee(employee);
        feedback.setFeedbackType((String) payload.get("feedbackType"));
        feedback.setFeedbackNotes((String) payload.get("feedbackNotes"));
        feedback.setRating(Integer.parseInt(payload.getOrDefault("rating", 4).toString()));

        if (currentUser != null) {
            userRepository.findById(currentUser.getId()).ifPresent(feedback::setSupervisor);
        }

        return ResponseEntity.ok(feedbackRepository.save(feedback));
    }

    @PutMapping("/feedbacks/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> updateFeedback(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        SupervisorFeedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found: " + id));

        if (payload.containsKey("feedbackType")) feedback.setFeedbackType((String) payload.get("feedbackType"));
        if (payload.containsKey("feedbackNotes")) feedback.setFeedbackNotes((String) payload.get("feedbackNotes"));
        if (payload.containsKey("rating")) feedback.setRating(Integer.parseInt(payload.get("rating").toString()));

        return ResponseEntity.ok(feedbackRepository.save(feedback));
    }

    @DeleteMapping("/feedbacks/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteFeedback(@PathVariable Long id) {
        SupervisorFeedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found: " + id));
        feedbackRepository.delete(feedback);
        return ResponseEntity.ok(Map.of("message", "Feedback record deleted successfully."));
    }

    // ==========================================
    // 10. EXISTING EMPLOYEE GOALS
    // ==========================================
    @GetMapping("/goals")
    public ResponseEntity<List<EmployeeGoal>> getGoals(@RequestParam(required = false) Long employeeId,
                                                       @AuthenticationPrincipal UserPrincipal currentUser) {
        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(goalRepository.findByEmployeeId(myEmpId));
        }
        if (employeeId != null) {
            return ResponseEntity.ok(goalRepository.findByEmployeeId(employeeId));
        }
        return ResponseEntity.ok(goalRepository.findAll());
    }

    @GetMapping("/goals/{id}")
    public ResponseEntity<EmployeeGoal> getGoalById(@PathVariable Long id,
                                                    @AuthenticationPrincipal UserPrincipal currentUser) {
        EmployeeGoal goal = goalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found: " + id));

        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null || goal.getEmployee() == null || !myEmpId.equals(goal.getEmployee().getId())) {
                throw new org.springframework.security.access.AccessDeniedException("Access denied: You may only view your own goals.");
            }
        }
        return ResponseEntity.ok(goal);
    }

    @PostMapping("/goals")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> createGoal(@RequestBody Map<String, Object> payload) {
        Long employeeId = Long.valueOf(payload.get("employeeId").toString());
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        EmployeeGoal goal = new EmployeeGoal();
        goal.setEmployee(employee);
        goal.setGoalTitle((String) payload.get("goalTitle"));
        goal.setTargetDescription((String) payload.get("targetDescription"));
        goal.setDeadline(LocalDate.parse(payload.get("deadline").toString()));
        goal.setProgressPercentage(Integer.parseInt(payload.getOrDefault("progressPercentage", 0).toString()));
        goal.setStatus((String) payload.getOrDefault("status", "IN_PROGRESS"));

        return ResponseEntity.ok(goalRepository.save(goal));
    }

    @PutMapping("/goals/{id}")
    public ResponseEntity<?> updateGoal(@PathVariable Long id, @RequestBody Map<String, Object> payload,
                                        @AuthenticationPrincipal UserPrincipal currentUser) {
        EmployeeGoal goal = goalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found: " + id));

        if (isEmployeeUser(currentUser)) {
            Long myEmpId = getLinkedEmployeeIdOrNull(currentUser);
            if (myEmpId == null || goal.getEmployee() == null || !myEmpId.equals(goal.getEmployee().getId())) {
                throw new org.springframework.security.access.AccessDeniedException("Access denied: You may only update your own goals.");
            }
            if (payload.containsKey("progressPercentage")) {
                int progress = Integer.parseInt(payload.get("progressPercentage").toString());
                goal.setProgressPercentage(progress);
                if (progress >= 100) {
                    goal.setStatus("ACHIEVED");
                }
            }
            return ResponseEntity.ok(goalRepository.save(goal));
        }

        if (payload.containsKey("goalTitle")) goal.setGoalTitle((String) payload.get("goalTitle"));
        if (payload.containsKey("targetDescription")) goal.setTargetDescription((String) payload.get("targetDescription"));
        if (payload.containsKey("deadline")) goal.setDeadline(LocalDate.parse(payload.get("deadline").toString()));
        if (payload.containsKey("progressPercentage")) {
            int progress = Integer.parseInt(payload.get("progressPercentage").toString());
            goal.setProgressPercentage(progress);
            if (progress >= 100) {
                goal.setStatus("ACHIEVED");
            }
        }
        if (payload.containsKey("status")) {
            goal.setStatus((String) payload.get("status"));
        }

        return ResponseEntity.ok(goalRepository.save(goal));
    }

    @DeleteMapping("/goals/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'OPERATIONS_MANAGER', 'SENIOR_ADMIN', 'IT_COORDINATOR')")
    public ResponseEntity<?> deleteGoal(@PathVariable Long id) {
        EmployeeGoal goal = goalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found: " + id));
        goalRepository.delete(goal);
        return ResponseEntity.ok(Map.of("message", "Goal record deleted successfully."));
    }

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
