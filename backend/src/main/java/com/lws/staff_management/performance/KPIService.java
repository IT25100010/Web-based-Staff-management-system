package com.lws.staff_management.performance;

import com.lws.staff_management.employee.DepartmentRepository;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.exception.ResourceNotFoundException;
import com.lws.staff_management.performance.dto.*;
import com.lws.staff_management.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

import com.lws.staff_management.notification.event.NotificationEvent;
import com.lws.staff_management.notification.publisher.NotificationPublisher;

@Service
@Transactional
public class KPIService {

    private final KPIRepository kpiRepository;
    private final KPIAssignmentRepository assignmentRepository;
    private final KPIQuestionRepository questionRepository;
    private final KPIOptionRepository optionRepository;
    private final KPIResponseRepository responseRepository;
    private final KPIResultRepository resultRepository;
    private final KPIWorkshopRepository workshopRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final NotificationPublisher notificationPublisher;
    private final com.lws.staff_management.notification.NotificationService notificationService;

    public KPIService(KPIRepository kpiRepository,
                      KPIAssignmentRepository assignmentRepository,
                      KPIQuestionRepository questionRepository,
                      KPIOptionRepository optionRepository,
                      KPIResponseRepository responseRepository,
                      KPIResultRepository resultRepository,
                      KPIWorkshopRepository workshopRepository,
                      EmployeeRepository employeeRepository,
                      DepartmentRepository departmentRepository,
                      NotificationPublisher notificationPublisher,
                      com.lws.staff_management.notification.NotificationService notificationService) {
        this.kpiRepository = kpiRepository;
        this.assignmentRepository = assignmentRepository;
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.responseRepository = responseRepository;
        this.resultRepository = resultRepository;
        this.workshopRepository = workshopRepository;
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.notificationPublisher = notificationPublisher;
        this.notificationService = notificationService;
    }

    // ==========================================
    // 1. GRADE CALCULATION LOGIC
    // ==========================================
    public String calculateGrade(BigDecimal percentage) {
        if (percentage == null) return "F";
        double p = percentage.doubleValue();
        if (p >= 85.0) return "A";
        if (p >= 75.0) return "B";
        if (p >= 65.0) return "C";
        if (p >= 50.0) return "D";
        return "F";
    }

    // ==========================================
    // 2. ASSIGN EMPLOYEES TO KPI
    // ==========================================
    public List<KPIAssignment> assignEmployees(Long kpiId, List<Long> employeeIds) {
        KPI kpi = kpiRepository.findById(kpiId)
                .orElseThrow(() -> new ResourceNotFoundException("KPI not found: " + kpiId));

        if (employeeIds == null || employeeIds.isEmpty()) {
            throw new IllegalArgumentException("At least one employee must be selected for assignment.");
        }

        List<KPIAssignment> createdAssignments = new ArrayList<>();

        for (Long empId : employeeIds) {
            Employee emp = employeeRepository.findById(empId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + empId));

            // Validate employee is active
            if (emp.getEmploymentStatus() != null &&
                    !"Active".equalsIgnoreCase(emp.getEmploymentStatus()) &&
                    !"Probation".equalsIgnoreCase(emp.getEmploymentStatus())) {
                throw new IllegalArgumentException("Cannot assign inactive employee: " + emp.getFullName());
            }

            // Check duplicate assignment
            if (assignmentRepository.existsByKpiIdAndEmployeeId(kpiId, empId)) {
                throw new IllegalArgumentException("Employee " + emp.getFullName() + " is already assigned to this KPI.");
            }

            KPIAssignment assignment = new KPIAssignment(kpi, emp);
            KPIAssignment saved = assignmentRepository.save(assignment);
            createdAssignments.add(saved);

            // Step 5: Send targeted notification only to this assigned employee via Observer publisher
            if (kpi.getKpiType() == KPIType.WORKSHOP) {
                String workshopTitle = kpi.getWorkshop() != null && kpi.getWorkshop().getTitle() != null
                        ? kpi.getWorkshop().getTitle() : kpi.getName();
                String dateStr = kpi.getWorkshop() != null && kpi.getWorkshop().getWorkshopDate() != null
                        ? kpi.getWorkshop().getWorkshopDate().toString()
                        : (kpi.getStartDate() != null ? kpi.getStartDate().toString() : "scheduled date");
                notificationPublisher.publish(NotificationEvent.targeted(
                        emp,
                        "New Workshop Assigned",
                        "You have been assigned to " + workshopTitle + " on " + dateStr + ".",
                        "INFO",
                        "/employee/kpi-activities"
                ));
            } else {
                String dueDateStr = kpi.getEndDate() != null ? kpi.getEndDate().toString() : "scheduled deadline";
                notificationPublisher.publish(NotificationEvent.targeted(
                        emp,
                        "New KPI Assessment Assigned",
                        "You have been assigned to " + kpi.getName() + ". Due date: " + dueDateStr + ".",
                        "INFO",
                        "/employee/kpi-activities"
                ));
            }
        }

        return createdAssignments;
    }

    public List<KPIAssignment> getAssignmentsByKpi(Long kpiId) {
        return assignmentRepository.findByKpiId(kpiId);
    }

    public void deleteAssignment(Long assignmentId) {
        KPIAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));
        if (assignment.getEmployee() != null) {
            notificationService.removeTargetedNotificationByLink(assignment.getEmployee().getId(), "/employee/kpi-activities");
        }
        responseRepository.deleteByAssignmentId(assignmentId);
        resultRepository.deleteByAssignmentId(assignmentId);
        assignmentRepository.delete(assignment);
    }

    // ==========================================
    // 3. MCQ QUESTION MANAGEMENT (MANAGER & WIZARD)
    // ==========================================
    public void validateMcqWizardRequest(CreateMcqKpiRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("KPI benchmark name is required.");
        }
        if (request.getQuestions() == null || request.getQuestions().size() != 10) {
            throw new IllegalArgumentException("MCQ assessments must contain exactly 10 questions. Found: " +
                    (request.getQuestions() != null ? request.getQuestions().size() : 0));
        }

        for (int i = 0; i < request.getQuestions().size(); i++) {
            CreateMcqKpiRequest.QuestionItem q = request.getQuestions().get(i);
            int qNum = i + 1;
            if (q.getQuestionText() == null || q.getQuestionText().trim().isEmpty()) {
                throw new IllegalArgumentException("Question " + qNum + " text is required.");
            }
            if (q.getOptions() == null || q.getOptions().size() != 4) {
                throw new IllegalArgumentException("Question " + qNum + " must contain exactly 4 answers. Found: " +
                        (q.getOptions() != null ? q.getOptions().size() : 0));
            }
            long correctCount = q.getOptions().stream().filter(CreateMcqKpiRequest.OptionItem::isCorrect).count();
            if (correctCount != 1) {
                throw new IllegalArgumentException("Question " + qNum + " must have exactly 1 correct answer. Found: " + correctCount);
            }
            for (int j = 0; j < q.getOptions().size(); j++) {
                CreateMcqKpiRequest.OptionItem opt = q.getOptions().get(j);
                int optNum = j + 1;
                if (opt.getOptionText() == null || opt.getOptionText().trim().isEmpty()) {
                    throw new IllegalArgumentException("Answer " + optNum + " for Question " + qNum + " cannot be empty.");
                }
            }
        }
    }

    public KPI createMcqKpiWithWizard(CreateMcqKpiRequest request, User currentUser) {
        validateMcqWizardRequest(request);

        KPI kpi = new KPI();
        kpi.setName(request.getName().trim());
        kpi.setDescription(request.getDescription());
        kpi.setPassMark(request.getPassMark() != null ? request.getPassMark() : 50);
        kpi.setTargetValue("Pass: " + kpi.getPassMark() + "%");
        kpi.setEvaluationCriteria(request.getEvaluationCriteria());
        kpi.setWeightage(request.getWeightage() > 0 ? request.getWeightage() : 20);
        kpi.setStatus(request.getStatus() != null ? request.getStatus() : "ACTIVE");
        kpi.setKpiType(KPIType.MCQ_ASSESSMENT);
        kpi.setMaxScore(BigDecimal.valueOf(100)); // Exactly 100 fixed by system (10 questions x 10 marks)
        kpi.setStartDate(request.getStartDate());
        kpi.setEndDate(request.getEndDate());
        kpi.setInstructions(request.getInstructions());
        kpi.setCreatedBy(currentUser);

        if (request.getDepartmentId() != null) {
            departmentRepository.findById(request.getDepartmentId()).ifPresent(kpi::setDepartment);
        }

        KPI savedKpi = kpiRepository.save(kpi);

        // Save exactly 10 questions with 4 options each (10 marks each)
        for (int i = 0; i < request.getQuestions().size(); i++) {
            CreateMcqKpiRequest.QuestionItem qItem = request.getQuestions().get(i);
            KPIQuestion question = new KPIQuestion();
            question.setKpi(savedKpi);
            question.setQuestionText(qItem.getQuestionText().trim());
            question.setMarks(BigDecimal.valueOf(10)); // Fixed 10 marks per question
            question.setDisplayOrder(i + 1);

            for (int j = 0; j < qItem.getOptions().size(); j++) {
                CreateMcqKpiRequest.OptionItem oItem = qItem.getOptions().get(j);
                KPIOption option = new KPIOption();
                option.setOptionText(oItem.getOptionText().trim());
                option.setCorrect(oItem.isCorrect());
                option.setDisplayOrder(j + 1);
                question.addOption(option);
            }

            questionRepository.save(question);
        }

        // Assign employees if provided in wizard
        if (request.getAssignedEmployeeIds() != null && !request.getAssignedEmployeeIds().isEmpty()) {
            assignEmployees(savedKpi.getId(), request.getAssignedEmployeeIds());
        }

        return savedKpi;
    }

    public KPI updateMcqKpiWithWizard(Long kpiId, CreateMcqKpiRequest request) {
        KPI kpi = kpiRepository.findById(kpiId)
                .orElseThrow(() -> new ResourceNotFoundException("KPI not found: " + kpiId));

        if (kpi.getKpiType() != KPIType.MCQ_ASSESSMENT) {
            throw new IllegalArgumentException("KPI is not an MCQ assessment.");
        }

        if (responseRepository.existsByAssignment_Kpi_Id(kpiId)) {
            throw new IllegalStateException("Cannot modify questions for KPI assessment because employee responses already exist.");
        }

        validateMcqWizardRequest(request);

        kpi.setName(request.getName().trim());
        kpi.setDescription(request.getDescription());
        kpi.setPassMark(request.getPassMark() != null ? request.getPassMark() : 50);
        kpi.setTargetValue("Pass: " + kpi.getPassMark() + "%");
        kpi.setEvaluationCriteria(request.getEvaluationCriteria());
        kpi.setWeightage(request.getWeightage() > 0 ? request.getWeightage() : 20);
        kpi.setStatus(request.getStatus() != null ? request.getStatus() : "ACTIVE");
        kpi.setMaxScore(BigDecimal.valueOf(100)); // Fixed 100
        kpi.setStartDate(request.getStartDate());
        kpi.setEndDate(request.getEndDate());
        kpi.setInstructions(request.getInstructions());

        if (request.getDepartmentId() != null) {
            departmentRepository.findById(request.getDepartmentId()).ifPresent(kpi::setDepartment);
        } else {
            kpi.setDepartment(null);
        }

        KPI savedKpi = kpiRepository.save(kpi);

        // Delete existing questions and replace with new validated 10 questions
        List<KPIQuestion> existingQuestions = questionRepository.findByKpiId(kpiId);
        for (KPIQuestion eq : existingQuestions) {
            questionRepository.delete(eq);
        }
        questionRepository.flush();

        for (int i = 0; i < request.getQuestions().size(); i++) {
            CreateMcqKpiRequest.QuestionItem qItem = request.getQuestions().get(i);
            KPIQuestion question = new KPIQuestion();
            question.setKpi(savedKpi);
            question.setQuestionText(qItem.getQuestionText().trim());
            question.setMarks(BigDecimal.valueOf(10));
            question.setDisplayOrder(i + 1);

            for (int j = 0; j < qItem.getOptions().size(); j++) {
                CreateMcqKpiRequest.OptionItem oItem = qItem.getOptions().get(j);
                KPIOption option = new KPIOption();
                option.setOptionText(oItem.getOptionText().trim());
                option.setCorrect(oItem.isCorrect());
                option.setDisplayOrder(j + 1);
                question.addOption(option);
            }

            questionRepository.save(question);
        }

        if (request.getAssignedEmployeeIds() != null && !request.getAssignedEmployeeIds().isEmpty()) {
            List<Long> unassigned = request.getAssignedEmployeeIds().stream()
                    .filter(empId -> !assignmentRepository.existsByKpiIdAndEmployeeId(kpiId, empId))
                    .toList();
            if (!unassigned.isEmpty()) {
                assignEmployees(savedKpi.getId(), unassigned);
            }
        }

        return savedKpi;
    }

    public KPIQuestion addQuestion(Long kpiId, KPIQuestionDto dto) {
        KPI kpi = kpiRepository.findById(kpiId)
                .orElseThrow(() -> new ResourceNotFoundException("KPI not found: " + kpiId));

        if (dto.getQuestionText() == null || dto.getQuestionText().trim().isEmpty()) {
            throw new IllegalArgumentException("Question text is required.");
        }

        boolean isMcq = kpi.getKpiType() == KPIType.MCQ_ASSESSMENT;
        if (isMcq) {
            long currentCount = questionRepository.countByKpiId(kpiId);
            if (currentCount >= 10) {
                throw new IllegalArgumentException("MCQ assessments must contain exactly 10 questions. Limit reached.");
            }
            if (dto.getOptions() == null || dto.getOptions().size() != 4) {
                throw new IllegalArgumentException("Every MCQ question must have exactly 4 answers.");
            }
        }

        BigDecimal marks = isMcq ? BigDecimal.valueOf(10) : (dto.getMarks() != null ? dto.getMarks() : BigDecimal.valueOf(10));
        if (marks.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Marks must be greater than zero.");
        }

        if (dto.getOptions() == null || dto.getOptions().size() < 2) {
            throw new IllegalArgumentException("Every question must have at least 2 options.");
        }

        long correctCount = dto.getOptions().stream().filter(KPIQuestionDto.OptionDto::isCorrect).count();
        if (correctCount != 1) {
            throw new IllegalArgumentException("Every question must have exactly one correct answer.");
        }

        KPIQuestion question = new KPIQuestion();
        question.setKpi(kpi);
        question.setQuestionText(dto.getQuestionText().trim());
        question.setMarks(marks);
        question.setDisplayOrder(dto.getDisplayOrder() > 0 ? dto.getDisplayOrder() : 1);

        for (int i = 0; i < dto.getOptions().size(); i++) {
            KPIQuestionDto.OptionDto optDto = dto.getOptions().get(i);
            KPIOption option = new KPIOption();
            option.setOptionText(optDto.getOptionText() != null ? optDto.getOptionText().trim() : "");
            option.setCorrect(optDto.isCorrect());
            option.setDisplayOrder(optDto.getDisplayOrder() > 0 ? optDto.getDisplayOrder() : (i + 1));
            question.addOption(option);
        }

        KPIQuestion saved = questionRepository.save(question);
        updateKpiMaxScoreFromQuestions(kpi);
        return saved;
    }

    public KPIQuestion updateQuestion(Long questionId, KPIQuestionDto dto) {
        KPIQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found: " + questionId));

        if (responseRepository.existsByQuestionId(questionId)) {
            throw new IllegalStateException("Cannot modify question because employee responses already exist.");
        }

        if (dto.getQuestionText() == null || dto.getQuestionText().trim().isEmpty()) {
            throw new IllegalArgumentException("Question text is required.");
        }

        boolean isMcq = question.getKpi() != null && question.getKpi().getKpiType() == KPIType.MCQ_ASSESSMENT;
        if (isMcq) {
            if (dto.getOptions() == null || dto.getOptions().size() != 4) {
                throw new IllegalArgumentException("Every MCQ question must have exactly 4 answers.");
            }
        }

        BigDecimal marks = isMcq ? BigDecimal.valueOf(10) : (dto.getMarks() != null ? dto.getMarks() : question.getMarks());
        if (marks.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Marks must be greater than zero.");
        }

        if (dto.getOptions() == null || dto.getOptions().size() < 2) {
            throw new IllegalArgumentException("Every question must have at least 2 options.");
        }

        long correctCount = dto.getOptions().stream().filter(KPIQuestionDto.OptionDto::isCorrect).count();
        if (correctCount != 1) {
            throw new IllegalArgumentException("Every question must have exactly one correct answer.");
        }

        question.setQuestionText(dto.getQuestionText().trim());
        question.setMarks(marks);
        if (dto.getDisplayOrder() > 0) {
            question.setDisplayOrder(dto.getDisplayOrder());
        }

        // Clear and replace options
        question.getOptions().clear();
        for (int i = 0; i < dto.getOptions().size(); i++) {
            KPIQuestionDto.OptionDto optDto = dto.getOptions().get(i);
            KPIOption option = new KPIOption();
            option.setOptionText(optDto.getOptionText() != null ? optDto.getOptionText().trim() : "");
            option.setCorrect(optDto.isCorrect());
            option.setDisplayOrder(optDto.getDisplayOrder() > 0 ? optDto.getDisplayOrder() : (i + 1));
            question.addOption(option);
        }

        KPIQuestion saved = questionRepository.save(question);
        updateKpiMaxScoreFromQuestions(question.getKpi());
        return saved;
    }

    public void deleteQuestion(Long questionId) {
        KPIQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found: " + questionId));

        if (responseRepository.existsByQuestionId(questionId)) {
            throw new IllegalStateException("Cannot delete question because employee responses already exist.");
        }

        KPI kpi = question.getKpi();
        if (kpi != null && kpi.getKpiType() == KPIType.MCQ_ASSESSMENT) {
            throw new IllegalArgumentException("Cannot delete individual questions from a fixed 10-question MCQ assessment.");
        }
        questionRepository.delete(question);
        if (kpi != null) {
            updateKpiMaxScoreFromQuestions(kpi);
        }
    }

    public List<KPIQuestion> getQuestionsForManager(Long kpiId) {
        return questionRepository.findByKpiIdOrderByDisplayOrderAsc(kpiId);
    }

    private void updateKpiMaxScoreFromQuestions(KPI kpi) {
        List<KPIQuestion> questions = questionRepository.findByKpiId(kpi.getId());
        BigDecimal totalMarks = questions.stream()
                .map(KPIQuestion::getMarks)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalMarks.compareTo(BigDecimal.ZERO) > 0) {
            kpi.setMaxScore(totalMarks);
            kpiRepository.save(kpi);
        }
    }

    // ==========================================
    // 4. EMPLOYEE ASSESSMENT ACCESS & SECURITY
    // ==========================================
    @Transactional(readOnly = true)
    public List<KPIAssignment> getMyAssignments(Long employeeId) {
        return assignmentRepository.findByEmployeeId(employeeId);
    }

    @Transactional
    public EmployeeAssessmentDto getEmployeeAssessment(Long assignmentId, Long employeeId) {
        KPIAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        // Security check: must belong to the current authenticated employee
        if (!assignment.getEmployee().getId().equals(employeeId)) {
            throw new SecurityException("Unauthorized access to this assignment.");
        }

        KPI kpi = assignment.getKpi();
        if (kpi.getStatus() != null && !"ACTIVE".equalsIgnoreCase(kpi.getStatus()) && !"PUBLISHED".equalsIgnoreCase(kpi.getStatus())) {
            throw new IllegalStateException("Assessment is not currently active.");
        }
        if (kpi.getStartDate() != null && java.time.LocalDate.now().isBefore(kpi.getStartDate())) {
            throw new IllegalStateException("Assessment is not yet available. Starts on: " + kpi.getStartDate());
        }
        if (kpi.getEndDate() != null && java.time.LocalDate.now().isAfter(kpi.getEndDate())) {
            throw new IllegalStateException("Assessment has expired. Ended on: " + kpi.getEndDate());
        }

        if (assignment.getStartedAt() == null) {
            assignment.setStartedAt(LocalDateTime.now());
            if (!"COMPLETED".equalsIgnoreCase(assignment.getStatus()) && !"ABSENT".equalsIgnoreCase(assignment.getStatus())) {
                assignment.setStatus("IN_PROGRESS");
            }
            assignmentRepository.save(assignment);
        }

        List<KPIQuestion> questions = questionRepository.findByKpiIdOrderByDisplayOrderAsc(kpi.getId());

        EmployeeAssessmentDto dto = new EmployeeAssessmentDto();
        dto.setAssignmentId(assignment.getId());
        dto.setKpiId(kpi.getId());
        dto.setKpiName(kpi.getName());
        dto.setKpiType(kpi.getKpiType().name());
        dto.setDepartmentName(kpi.getDepartment() != null ? kpi.getDepartment().getName() : "All Departments");
        dto.setDescription(kpi.getDescription());
        dto.setInstructions(kpi.getInstructions());
        dto.setStartDate(kpi.getStartDate());
        dto.setEndDate(kpi.getEndDate());
        dto.setStatus(assignment.getStatus());
        dto.setTotalQuestions(questions.size());

        BigDecimal totalMarks = questions.stream()
                .map(KPIQuestion::getMarks)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dto.setTotalMarks(totalMarks.compareTo(BigDecimal.ZERO) > 0 ? totalMarks : kpi.getMaxScore());
        dto.setPassMark(kpi.getPassMark() != null ? kpi.getPassMark() : 50);

        // Map questions and options WITHOUT LEAKING the correct boolean!
        List<EmployeeQuestionDto> questionDtos = new ArrayList<>();
        for (KPIQuestion q : questions) {
            List<EmployeeOptionDto> optionDtos = new ArrayList<>();
            for (KPIOption opt : q.getOptions()) {
                optionDtos.add(new EmployeeOptionDto(opt.getId(), opt.getOptionText(), opt.getDisplayOrder()));
            }
            questionDtos.add(new EmployeeQuestionDto(
                    q.getId(),
                    q.getQuestionText(),
                    q.getMarks(),
                    q.getDisplayOrder(),
                    optionDtos
            ));
        }
        dto.setQuestions(questionDtos);

        return dto;
    }

    // ==========================================
    // 5. EMPLOYEE ASSESSMENT SUBMISSION (AUTO-SCORING)
    // ==========================================
    public KPIResult submitMcqAssessment(Long assignmentId, Long employeeId, SubmitAssessmentRequest request) {
        KPIAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        // Security: must belong to the current employee
        if (!assignment.getEmployee().getId().equals(employeeId)) {
            throw new SecurityException("You can only submit your own assessment.");
        }

        // Duplicate submission prevention
        if ("COMPLETED".equalsIgnoreCase(assignment.getStatus())) {
            throw new IllegalStateException("Assessment has already been submitted and cannot be changed.");
        }

        KPI kpi = assignment.getKpi();
        if (kpi.getKpiType() != KPIType.MCQ_ASSESSMENT) {
            throw new IllegalArgumentException("This KPI is not an MCQ assessment.");
        }

        List<KPIQuestion> questions = questionRepository.findByKpiId(kpi.getId());
        if (questions.isEmpty()) {
            throw new IllegalStateException("No questions available for this assessment.");
        }

        Map<Long, Long> answers = request.getResolvedAnswers();

        // Validate all questions are answered
        for (KPIQuestion q : questions) {
            if (!answers.containsKey(q.getId()) || answers.get(q.getId()) == null) {
                throw new IllegalArgumentException("All questions are required. Missing answer for question: " + q.getQuestionText());
            }
        }

        // Clear any previous responses if retrying or reset
        responseRepository.deleteByAssignmentId(assignmentId);

        int correctCount = 0;
        int wrongCount = 0;

        for (KPIQuestion q : questions) {
            Long selectedOptionId = answers.get(q.getId());
            KPIOption selectedOption = optionRepository.findById(selectedOptionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Option not found: " + selectedOptionId));

            // Validate that the selected option belongs to this question
            if (!selectedOption.getQuestion().getId().equals(q.getId())) {
                throw new IllegalArgumentException("Option " + selectedOptionId + " does not belong to question " + q.getId());
            }

            boolean isCorrect = selectedOption.isCorrect();
            BigDecimal marksAwarded = isCorrect ? BigDecimal.valueOf(10) : BigDecimal.ZERO;
            if (isCorrect) {
                correctCount++;
            } else {
                wrongCount++;
            }

            KPIResponse response = new KPIResponse(
                    assignment,
                    q,
                    selectedOption,
                    isCorrect,
                    marksAwarded
            );
            responseRepository.save(response);
        }

        BigDecimal totalScore = BigDecimal.valueOf(correctCount * 10L);
        BigDecimal maxScore = BigDecimal.valueOf(100); // 10 questions x 10 marks = 100 fixed
        BigDecimal percentage = totalScore; // percentage = score because maxScore is 100
        String grade = calculateGrade(percentage);

        // Update or create KPIResult
        KPIResult result = resultRepository.findByAssignmentId(assignmentId)
                .orElse(new KPIResult());

        result.setAssignment(assignment);
        result.setEmployee(assignment.getEmployee());
        result.setKpi(kpi);
        result.setScore(totalScore.setScale(2, RoundingMode.HALF_UP));
        result.setMaxScore(maxScore.setScale(2, RoundingMode.HALF_UP));
        result.setPercentage(percentage.setScale(2, RoundingMode.HALF_UP));
        result.setGrade(grade);
        result.setCorrectAnswers(correctCount);
        result.setWrongAnswers(wrongCount);
        result.setResultType("AUTO_MCQ");
        result.setRemarks("Auto-evaluated MCQ assessment: " + correctCount + " correct, " + wrongCount + " wrong (" + totalScore.intValue() + " / 100)");
        result.setEvaluatedAt(LocalDateTime.now());
        KPIResult savedResult = resultRepository.save(result);

        assignment.setStatus("COMPLETED");
        assignment.setCompletedAt(LocalDateTime.now());
        assignment.setResult(savedResult);
        assignmentRepository.save(assignment);

        return savedResult;
    }

    // ==========================================
    // 6. WORKSHOP & MANUAL SCORING (MANAGER)
    // ==========================================
    public KPIWorkshop saveWorkshop(Long kpiId, KPIWorkshop workshopData) {
        KPI kpi = kpiRepository.findById(kpiId)
                .orElseThrow(() -> new ResourceNotFoundException("KPI not found: " + kpiId));

        if (kpi.getKpiType() != KPIType.WORKSHOP) {
            throw new IllegalArgumentException("KPI is not of type WORKSHOP.");
        }

        KPIWorkshop workshop = workshopRepository.findByKpiId(kpiId)
                .orElse(new KPIWorkshop());

        workshop.setKpi(kpi);
        workshop.setTitle(workshopData.getTitle() != null ? workshopData.getTitle() : kpi.getName());
        workshop.setDescription(workshopData.getDescription());
        workshop.setWorkshopDate(workshopData.getWorkshopDate());
        workshop.setStartTime(workshopData.getStartTime());
        workshop.setEndTime(workshopData.getEndTime());
        workshop.setLocation(workshopData.getLocation());
        workshop.setTrainer(workshopData.getTrainer());
        workshop.setMaxScore(workshopData.getMaxScore() != null ? workshopData.getMaxScore() : kpi.getMaxScore());
        workshop.setStatus(workshopData.getStatus() != null ? workshopData.getStatus() : "SCHEDULED");

        return workshopRepository.save(workshop);
    }

    public Optional<KPIWorkshop> getWorkshop(Long kpiId) {
        return workshopRepository.findByKpiId(kpiId);
    }

    public void validateWorkshopWizardRequest(CreateWorkshopKpiRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Workshop name is required.");
        }
        if (request.getWorkshopDate() == null) {
            throw new IllegalArgumentException("Workshop date is required.");
        }
        if (request.getStartTime() == null || request.getEndTime() == null) {
            throw new IllegalArgumentException("Valid start time and end time are required.");
        }
        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new IllegalArgumentException("Workshop start time must be before end time.");
        }
        if (request.getLocation() == null || request.getLocation().trim().isEmpty()) {
            throw new IllegalArgumentException("Workshop location is required.");
        }
        if (request.getTrainer() == null || request.getTrainer().trim().isEmpty()) {
            throw new IllegalArgumentException("Workshop trainer is required.");
        }
        if (request.getMaxScore() == null || request.getMaxScore().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Maximum score must be positive.");
        }
    }

    public KPI createWorkshopKpiWithWizard(CreateWorkshopKpiRequest request, User currentUser) {
        validateWorkshopWizardRequest(request);

        KPI kpi = new KPI();
        kpi.setName(request.getName().trim());
        kpi.setDescription(request.getDescription());
        kpi.setTargetValue(request.getTargetValue() != null && !request.getTargetValue().trim().isEmpty()
                ? request.getTargetValue().trim() : "100% Attendance & Practical Passing");
        kpi.setEvaluationCriteria(request.getEvaluationCriteria());
        kpi.setWeightage(request.getWeightage() > 0 ? request.getWeightage() : 20);
        kpi.setStatus(request.getStatus() != null ? request.getStatus() : "ACTIVE");
        kpi.setKpiType(KPIType.WORKSHOP);
        kpi.setMaxScore(request.getMaxScore());
        kpi.setStartDate(request.getStartDate() != null ? request.getStartDate() : request.getWorkshopDate());
        kpi.setEndDate(request.getEndDate() != null ? request.getEndDate() : request.getWorkshopDate());
        kpi.setInstructions(request.getInstructions());
        kpi.setCreatedBy(currentUser);

        if (request.getDepartmentId() != null) {
            departmentRepository.findById(request.getDepartmentId()).ifPresent(kpi::setDepartment);
        }

        KPI savedKpi = kpiRepository.save(kpi);

        KPIWorkshop workshop = new KPIWorkshop();
        workshop.setKpi(savedKpi);
        workshop.setTitle(savedKpi.getName());
        workshop.setDescription(savedKpi.getDescription());
        workshop.setWorkshopDate(request.getWorkshopDate());
        workshop.setStartTime(request.getStartTime());
        workshop.setEndTime(request.getEndTime());
        workshop.setLocation(request.getLocation().trim());
        workshop.setTrainer(request.getTrainer().trim());
        workshop.setMaxScore(request.getMaxScore());
        workshop.setInstructions(request.getInstructions());
        workshop.setStatus("SCHEDULED");
        workshopRepository.save(workshop);

        if (request.getAssignedEmployeeIds() != null && !request.getAssignedEmployeeIds().isEmpty()) {
            assignEmployees(savedKpi.getId(), request.getAssignedEmployeeIds());
        }

        return savedKpi;
    }

    public KPIResult scoreWorkshopParticipant(Long assignmentId, User evaluator, ManualScoreRequest request) {
        KPIAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        KPI kpi = assignment.getKpi();
        if (kpi.getKpiType() != KPIType.WORKSHOP) {
            throw new IllegalArgumentException("Assignment does not belong to a WORKSHOP KPI.");
        }

        KPIWorkshop workshop = workshopRepository.findByKpiId(kpi.getId()).orElse(null);
        BigDecimal maxScore = (workshop != null && workshop.getMaxScore() != null)
                ? workshop.getMaxScore()
                : (kpi.getMaxScore() != null ? kpi.getMaxScore() : BigDecimal.valueOf(100));

        boolean isAbsent = "ABSENT".equalsIgnoreCase(request.getAttendance());

        BigDecimal score;
        if (isAbsent) {
            score = BigDecimal.ZERO;
            assignment.setStatus("ABSENT");
        } else {
            if (request.getScore() == null) {
                throw new IllegalArgumentException("Score is required for PRESENT workshop participants.");
            }
            score = request.getScore();
            if (score.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Score cannot be negative.");
            }
            if (score.compareTo(maxScore) > 0) {
                throw new IllegalArgumentException("Score cannot exceed maximum score of " + maxScore);
            }
            assignment.setStatus("COMPLETED");
            assignment.setCompletedAt(LocalDateTime.now());
        }

        BigDecimal percentage = BigDecimal.ZERO;
        if (maxScore.compareTo(BigDecimal.ZERO) > 0) {
            percentage = score.divide(maxScore, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }
        String grade = isAbsent ? "F" : calculateGrade(percentage);

        KPIResult result = resultRepository.findByAssignmentId(assignmentId)
                .orElse(new KPIResult());

        result.setAssignment(assignment);
        result.setEmployee(assignment.getEmployee());
        result.setKpi(kpi);
        result.setScore(score.setScale(2, RoundingMode.HALF_UP));
        result.setMaxScore(maxScore.setScale(2, RoundingMode.HALF_UP));
        result.setPercentage(percentage);
        result.setGrade(grade);
        result.setResultType("MANUAL_WORKSHOP");
        result.setRemarks(request.getRemarks() != null ? request.getRemarks() : (isAbsent ? "Absent from workshop" : ""));
        result.setEvaluatedBy(evaluator);
        result.setEvaluatedAt(LocalDateTime.now());

        KPIResult savedResult = resultRepository.save(result);
        assignment.setResult(savedResult);
        assignmentRepository.save(assignment);

        return savedResult;
    }

    public KPIResult scoreManualKpi(Long assignmentId, User evaluator, ManualScoreRequest request) {
        KPIAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        KPI kpi = assignment.getKpi();
        BigDecimal maxScore = kpi.getMaxScore() != null ? kpi.getMaxScore() : BigDecimal.valueOf(100);

        BigDecimal score = request.getScore() != null ? request.getScore() : BigDecimal.ZERO;
        if (score.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Score cannot be negative.");
        }
        if (score.compareTo(maxScore) > 0) {
            throw new IllegalArgumentException("Score cannot exceed maximum score of " + maxScore);
        }

        BigDecimal percentage = BigDecimal.ZERO;
        if (maxScore.compareTo(BigDecimal.ZERO) > 0) {
            percentage = score.divide(maxScore, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }
        String grade = calculateGrade(percentage);

        KPIResult result = resultRepository.findByAssignmentId(assignmentId)
                .orElse(new KPIResult());

        result.setAssignment(assignment);
        result.setEmployee(assignment.getEmployee());
        result.setKpi(kpi);
        result.setScore(score.setScale(2, RoundingMode.HALF_UP));
        result.setMaxScore(maxScore.setScale(2, RoundingMode.HALF_UP));
        result.setPercentage(percentage);
        result.setGrade(grade);
        result.setResultType("MANUAL_SCORE");
        result.setRemarks(request.getRemarks());
        result.setEvaluatedBy(evaluator);
        result.setEvaluatedAt(LocalDateTime.now());

        KPIResult savedResult = resultRepository.save(result);
        assignment.setStatus("COMPLETED");
        assignment.setCompletedAt(LocalDateTime.now());
        assignment.setResult(savedResult);
        assignmentRepository.save(assignment);

        return savedResult;
    }

    // ==========================================
    // 7. RESULTS & SUMMARY VIEWS
    // ==========================================
    @Transactional(readOnly = true)
    public KPIResultsSummaryDto getKpiResultsSummary(Long kpiId) {
        KPI kpi = kpiRepository.findById(kpiId)
                .orElseThrow(() -> new ResourceNotFoundException("KPI not found: " + kpiId));

        List<KPIAssignment> assignments = assignmentRepository.findByKpiId(kpiId);
        List<KPIResult> results = resultRepository.findByKpiId(kpiId);

        KPIResultsSummaryDto summary = new KPIResultsSummaryDto();
        summary.setAssignedEmployees(assignments.size());

        int completed = 0;
        int notCompleted = 0;
        for (KPIAssignment a : assignments) {
            if ("COMPLETED".equalsIgnoreCase(a.getStatus())) {
                completed++;
            } else {
                notCompleted++;
            }
        }
        summary.setCompleted(completed);
        summary.setNotCompleted(notCompleted);

        if (!results.isEmpty()) {
            BigDecimal sum = BigDecimal.ZERO;
            BigDecimal highest = results.get(0).getScore();
            BigDecimal lowest = results.get(0).getScore();
            int pass = 0;
            int fail = 0;

            for (KPIResult r : results) {
                BigDecimal s = r.getScore() != null ? r.getScore() : BigDecimal.ZERO;
                sum = sum.add(s);
                if (s.compareTo(highest) > 0) highest = s;
                if (s.compareTo(lowest) < 0) lowest = s;

                int passThreshold = (kpi.getPassMark() != null) ? kpi.getPassMark() : 50;
                BigDecimal threshold = BigDecimal.valueOf(passThreshold);
                if (s.compareTo(threshold) >= 0) {
                    pass++;
                } else {
                    fail++;
                }
            }

            BigDecimal avg = sum.divide(BigDecimal.valueOf(results.size()), 2, RoundingMode.HALF_UP);
            summary.setAverageScore(avg);
            summary.setHighestScore(highest);
            summary.setLowestScore(lowest);
            summary.setPassCount(pass);
            summary.setFailCount(fail);
        }

        summary.setPassMark(kpi.getPassMark() != null ? kpi.getPassMark() : 50);
        summary.setResults(results);
        return summary;
    }

    @Transactional(readOnly = true)
    public KPIResultDetailDto getAssignmentResultDetails(Long assignmentId) {
        KPIAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        KPIResult result = resultRepository.findByAssignmentId(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("No result found for assignment: " + assignmentId));

        KPI kpi = assignment.getKpi();
        Employee emp = assignment.getEmployee();

        KPIResultDetailDto dto = new KPIResultDetailDto();
        dto.setAssignmentId(assignment.getId());
        dto.setKpiId(kpi.getId());
        dto.setKpiName(kpi.getName());
        dto.setKpiType(kpi.getKpiType().name());
        dto.setEmployeeName(emp.getFullName());
        dto.setEmployeeId(emp.getEmployeeId());
        dto.setScore(result.getScore());
        dto.setMaxScore(result.getMaxScore());
        dto.setPercentage(result.getPercentage());
        dto.setGrade(result.getGrade());
        dto.setRemarks(result.getRemarks());
        dto.setCorrectAnswers(result.getCorrectAnswers());
        dto.setWrongAnswers(result.getWrongAnswers());
        dto.setCompletedDate(assignment.getCompletedAt() != null
                ? assignment.getCompletedAt().toString()
                : (result.getEvaluatedAt() != null ? result.getEvaluatedAt().toString() : null));

        if (kpi.getKpiType() == KPIType.MCQ_ASSESSMENT) {
            List<KPIResponse> responses = responseRepository.findByAssignmentId(assignmentId);
            List<KPIResultDetailDto.QuestionResultItem> items = new ArrayList<>();

            for (KPIResponse resp : responses) {
                KPIQuestion q = resp.getQuestion();
                KPIOption selected = resp.getSelectedOption();

                KPIOption correctOption = q.getOptions().stream()
                        .filter(KPIOption::isCorrect)
                        .findFirst()
                        .orElse(null);

                KPIResultDetailDto.QuestionResultItem item = new KPIResultDetailDto.QuestionResultItem();
                item.setQuestionId(q.getId());
                item.setQuestionText(q.getQuestionText());
                item.setMarks(q.getMarks());
                item.setSelectedOptionId(selected != null ? selected.getId() : null);
                item.setSelectedOptionText(selected != null ? selected.getOptionText() : "None");
                item.setCorrectOptionId(correctOption != null ? correctOption.getId() : null);
                item.setCorrectOptionText(correctOption != null ? correctOption.getOptionText() : "None");
                item.setCorrect(resp.isCorrect());
                item.setMarksAwarded(resp.getMarksAwarded());

                items.add(item);
            }
            dto.setQuestions(items);
        }

        return dto;
    }
}
