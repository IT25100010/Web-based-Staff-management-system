package com.lws.staff_management;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lws.staff_management.employee.Department;
import com.lws.staff_management.employee.DepartmentRepository;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.employee.EmployeeRepository;
import com.lws.staff_management.performance.KPIService;
import com.lws.staff_management.performance.*;
import com.lws.staff_management.performance.dto.*;
import com.lws.staff_management.user.Role;
import com.lws.staff_management.user.User;
import com.lws.staff_management.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
public class KPIAssessmentSystemTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private KPIService kpiService;

    @Autowired
    private KPIRepository kpiRepository;

    @Autowired
    private KPIAssignmentRepository assignmentRepository;

    @Autowired
    private KPIQuestionRepository questionRepository;

    @Autowired
    private KPIOptionRepository optionRepository;

    @Autowired
    private KPIResultRepository resultRepository;

    @Autowired
    private KPIWorkshopRepository workshopRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    private User managerUser;
    private User employeeUser1;
    private User employeeUser2;
    private Employee employee1;
    private Employee employee2;
    private Department department;

    @BeforeEach
    void setUp() {
        department = departmentRepository.findAll().stream().findFirst().orElseGet(() -> {
            Department d = new Department("Operations", "OPS-KPI", "Operations Dept");
            return departmentRepository.save(d);
        });

        managerUser = userRepository.findByUsernameOrEmailIgnoreCase("kpi.mgr.test", "kpi.mgr@lws.lk").orElseGet(() -> {
            User u = new User("kpi.mgr.test", "kpi.mgr@lws.lk", "password", "KPI Manager", Role.HR_MANAGER);
            return userRepository.save(u);
        });

        employeeUser1 = userRepository.findByUsernameOrEmailIgnoreCase("kpi.emp1.test", "kpi.emp1@lws.lk").orElseGet(() -> {
            User u = new User("kpi.emp1.test", "kpi.emp1@lws.lk", "password", "Kamal Perera", Role.EMPLOYEE);
            return userRepository.save(u);
        });

        employeeUser2 = userRepository.findByUsernameOrEmailIgnoreCase("kpi.emp2.test", "kpi.emp2@lws.lk").orElseGet(() -> {
            User u = new User("kpi.emp2.test", "kpi.emp2@lws.lk", "password", "Nimal Silva", Role.EMPLOYEE);
            return userRepository.save(u);
        });

        employee1 = employeeRepository.findByEmployeeId("EMP-KPI-001").orElseGet(() -> {
            Employee e = new Employee();
            e.setEmployeeId("EMP-KPI-001");
            e.setFirstName("Kamal");
            e.setLastName("Perera");
            e.setNic("199511111111");
            e.setEmail("kpi.emp1@lws.lk");
            e.setPhone("0771112233");
            e.setDepartment(department);
            e.setEmploymentStatus("Active");
            e.setUser(employeeUser1);
            return employeeRepository.save(e);
        });

        employee2 = employeeRepository.findByEmployeeId("EMP-KPI-002").orElseGet(() -> {
            Employee e = new Employee();
            e.setEmployeeId("EMP-KPI-002");
            e.setFirstName("Nimal");
            e.setLastName("Silva");
            e.setNic("199522222222");
            e.setEmail("kpi.emp2@lws.lk");
            e.setPhone("0772223344");
            e.setDepartment(department);
            e.setEmploymentStatus("Active");
            e.setUser(employeeUser2);
            return employeeRepository.save(e);
        });
    }

    @Test
    @DisplayName("1. Manager creates MCQ KPI")
    void testManagerCreatesMcqKpi() {
        KPI kpi = new KPI();
        kpi.setName("Safety Protocols MCQ Assessment");
        kpi.setDescription("Mandatory test on workplace safety");
        kpi.setKpiType(KPIType.MCQ_ASSESSMENT);
        kpi.setDepartment(department);
        kpi.setTargetValue("100% Pass");
        kpi.setWeightage(25);
        kpi.setStartDate(LocalDate.now());
        kpi.setEndDate(LocalDate.now().plusDays(14));
        kpi.setCreatedBy(managerUser);
        kpi.setStatus("ACTIVE");

        KPI saved = kpiRepository.save(kpi);
        assertNotNull(saved.getId());
        assertEquals(KPIType.MCQ_ASSESSMENT, saved.getKpiType());
        assertEquals("Safety Protocols MCQ Assessment", saved.getName());
    }

    private List<KPIQuestion> createTenMcqQuestions(Long kpiId) {
        List<KPIQuestion> questions = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            KPIQuestionDto qDto = new KPIQuestionDto();
            qDto.setQuestionText("Question " + i + " on safety procedures?");
            qDto.setMarks(BigDecimal.valueOf(10));
            qDto.setDisplayOrder(i);
            qDto.setOptions(List.of(
                    new KPIQuestionDto.OptionDto(null, "Option " + i + "-A (Correct)", true, 1),
                    new KPIQuestionDto.OptionDto(null, "Option " + i + "-B", false, 2),
                    new KPIQuestionDto.OptionDto(null, "Option " + i + "-C", false, 3),
                    new KPIQuestionDto.OptionDto(null, "Option " + i + "-D", false, 4)
            ));
            questions.add(kpiService.addQuestion(kpiId, qDto));
        }
        return questions;
    }

    @Test
    @DisplayName("2. Add questions and options to MCQ KPI")
    void testAddQuestionsAndOptions() {
        KPI kpi = new KPI();
        kpi.setName("Fire Drill Quiz");
        kpi.setTargetValue("Pass");
        kpi.setKpiType(KPIType.MCQ_ASSESSMENT);
        KPI savedKpi = kpiRepository.save(kpi);

        KPIQuestionDto qDto = new KPIQuestionDto();
        qDto.setQuestionText("What is the primary action during a fire alarm?");
        qDto.setMarks(BigDecimal.valueOf(10));
        qDto.setDisplayOrder(1);

        List<KPIQuestionDto.OptionDto> options = new ArrayList<>();
        options.add(new KPIQuestionDto.OptionDto(null, "Evacuate via marked emergency exits immediately", true, 1));
        options.add(new KPIQuestionDto.OptionDto(null, "Use the main elevator to leave", false, 2));
        options.add(new KPIQuestionDto.OptionDto(null, "Ignore the alarm until instructions arrive", false, 3));
        options.add(new KPIQuestionDto.OptionDto(null, "Collect belongings and take lunch break", false, 4));
        qDto.setOptions(options);

        KPIQuestion question = kpiService.addQuestion(savedKpi.getId(), qDto);
        assertNotNull(question.getId());
        assertEquals(4, question.getOptions().size());

        long correctCount = question.getOptions().stream().filter(KPIOption::isCorrect).count();
        assertEquals(1, correctCount);

        // Negative check: MCQ question with 3 options must be rejected
        KPIQuestionDto invalidDto = new KPIQuestionDto();
        invalidDto.setQuestionText("Invalid question with 3 options?");
        invalidDto.setOptions(List.of(
                new KPIQuestionDto.OptionDto(null, "Opt 1", true, 1),
                new KPIQuestionDto.OptionDto(null, "Opt 2", false, 2),
                new KPIQuestionDto.OptionDto(null, "Opt 3", false, 3)
        ));
        assertThrows(IllegalArgumentException.class, () -> kpiService.addQuestion(savedKpi.getId(), invalidDto));
    }

    @Test
    @DisplayName("3. Employee assignment to KPI")
    void testEmployeeAssignment() {
        KPI kpi = new KPI();
        kpi.setName("Assignment Test KPI");
        kpi.setTargetValue("Goal");
        kpi.setKpiType(KPIType.MCQ_ASSESSMENT);
        KPI savedKpi = kpiRepository.save(kpi);

        List<KPIAssignment> assignments = kpiService.assignEmployees(savedKpi.getId(), List.of(employee1.getId()));
        assertEquals(1, assignments.size());
        assertEquals(employee1.getId(), assignments.get(0).getEmployee().getId());
        assertEquals("ASSIGNED", assignments.get(0).getStatus());
    }

    @Test
    @DisplayName("4. Duplicate assignment rejected")
    void testDuplicateAssignmentRejected() {
        KPI kpi = new KPI();
        kpi.setName("Duplicate Test KPI");
        kpi.setTargetValue("Target");
        kpi.setKpiType(KPIType.MCQ_ASSESSMENT);
        final KPI savedKpi = kpiRepository.save(kpi);

        kpiService.assignEmployees(savedKpi.getId(), List.of(employee1.getId()));

        assertThrows(IllegalArgumentException.class, () -> {
            kpiService.assignEmployees(savedKpi.getId(), List.of(employee1.getId()));
        });
    }

    @Test
    @DisplayName("5. Employee retrieves own MCQ")
    void testEmployeeRetrievesOwnMcq() {
        KPI kpi = new KPI();
        kpi.setName("Employee View Quiz");
        kpi.setTargetValue("80%");
        kpi.setKpiType(KPIType.MCQ_ASSESSMENT);
        KPI savedKpi = kpiRepository.save(kpi);

        createTenMcqQuestions(savedKpi.getId());

        KPIAssignment assignment = kpiService.assignEmployees(savedKpi.getId(), List.of(employee1.getId())).get(0);

        EmployeeAssessmentDto dto = kpiService.getEmployeeAssessment(assignment.getId(), employee1.getId());
        assertNotNull(dto);
        assertEquals(savedKpi.getId(), dto.getKpiId());
        assertEquals(10, dto.getQuestions().size());
        assertEquals(4, dto.getQuestions().get(0).getOptions().size());
        assertEquals(0, dto.getTotalMarks().compareTo(BigDecimal.valueOf(100)));
    }

    @Test
    @DisplayName("6. Correct answer is NOT leaked in employee DTO")
    void testCorrectAnswerNotLeakedInEmployeeDto() {
        KPI kpi = new KPI();
        kpi.setName("Security Assessment");
        kpi.setTargetValue("Pass");
        kpi.setKpiType(KPIType.MCQ_ASSESSMENT);
        KPI savedKpi = kpiRepository.save(kpi);

        createTenMcqQuestions(savedKpi.getId());

        KPIAssignment assignment = kpiService.assignEmployees(savedKpi.getId(), List.of(employee1.getId())).get(0);

        EmployeeAssessmentDto dto = kpiService.getEmployeeAssessment(assignment.getId(), employee1.getId());

        // Serialize to JSON and verify "correct" key does not exist
        String json = assertDoesNotThrow(() -> objectMapper.writeValueAsString(dto));
        assertFalse(json.contains("\"correct\":true"), "Employee DTO must NOT leak 'correct': true");
        assertFalse(json.contains("\"correct\":false"), "Employee DTO must NOT leak 'correct': false");
    }

    @Test
    @DisplayName("7. Employee submits answers, 8. Auto scoring correct, 9. Percentage, 10. Grade calculation")
    void testEmployeeSubmitsAndAutoScoring() {
        KPI kpi = new KPI();
        kpi.setName("Comprehensive Exam");
        kpi.setTargetValue("Pass");
        kpi.setKpiType(KPIType.MCQ_ASSESSMENT);
        KPI savedKpi = kpiRepository.save(kpi);

        List<KPIQuestion> questions = createTenMcqQuestions(savedKpi.getId());

        KPIAssignment assignment = kpiService.assignEmployees(savedKpi.getId(), List.of(employee1.getId())).get(0);

        // Employee answers 7 questions correctly (70/100 -> Grade C) and 3 questions incorrectly
        Map<Long, Long> answers = new HashMap<>();
        for (int i = 0; i < 7; i++) {
            KPIQuestion q = questions.get(i);
            Long correctOptId = q.getOptions().stream().filter(KPIOption::isCorrect).findFirst().get().getId();
            answers.put(q.getId(), correctOptId);
        }
        for (int i = 7; i < 10; i++) {
            KPIQuestion q = questions.get(i);
            Long wrongOptId = q.getOptions().stream().filter(o -> !o.isCorrect()).findFirst().get().getId();
            answers.put(q.getId(), wrongOptId);
        }

        SubmitAssessmentRequest req = new SubmitAssessmentRequest();
        req.setAnswers(answers);

        KPIResult result = kpiService.submitMcqAssessment(assignment.getId(), employee1.getId(), req);

        assertEquals(0, result.getScore().compareTo(BigDecimal.valueOf(70).setScale(2)));
        assertEquals(0, result.getMaxScore().compareTo(BigDecimal.valueOf(100).setScale(2)));
        assertEquals(0, result.getPercentage().compareTo(BigDecimal.valueOf(70).setScale(2)));
        assertEquals("C", result.getGrade());
        assertEquals("AUTO_MCQ", result.getResultType());
        assertEquals(7, result.getCorrectAnswers());
        assertEquals(3, result.getWrongAnswers());

        KPIAssignment updatedAssignment = assignmentRepository.findById(assignment.getId()).get();
        assertEquals("COMPLETED", updatedAssignment.getStatus());
        assertNotNull(updatedAssignment.getCompletedAt());
    }

    @Test
    @DisplayName("11. Employee cannot submit another Employee's assignment")
    void testEmployeeCannotSubmitOtherAssignment() {
        KPI kpi = new KPI();
        kpi.setName("Cross Submission Test");
        kpi.setTargetValue("Pass");
        kpi.setKpiType(KPIType.MCQ_ASSESSMENT);
        KPI savedKpi = kpiRepository.save(kpi);

        final KPIAssignment assignment = kpiService.assignEmployees(savedKpi.getId(), List.of(employee1.getId())).get(0);

        SubmitAssessmentRequest req = new SubmitAssessmentRequest();
        req.setAnswers(Map.of());

        // Employee 2 attempts to submit Employee 1's assignment
        assertThrows(SecurityException.class, () -> {
            kpiService.submitMcqAssessment(assignment.getId(), employee2.getId(), req);
        });
    }

    @Test
    @DisplayName("12. Duplicate submission rejected")
    void testDuplicateSubmissionRejected() {
        KPI kpi = new KPI();
        kpi.setName("Duplicate Submit Test");
        kpi.setTargetValue("Pass");
        kpi.setKpiType(KPIType.MCQ_ASSESSMENT);
        KPI savedKpi = kpiRepository.save(kpi);

        List<KPIQuestion> questions = createTenMcqQuestions(savedKpi.getId());

        final KPIAssignment assignment = kpiService.assignEmployees(savedKpi.getId(), List.of(employee1.getId())).get(0);

        Map<Long, Long> answers = new HashMap<>();
        for (KPIQuestion q : questions) {
            answers.put(q.getId(), q.getOptions().get(0).getId());
        }
        SubmitAssessmentRequest req = new SubmitAssessmentRequest();
        req.setAnswers(answers);

        // First submission succeeds
        kpiService.submitMcqAssessment(assignment.getId(), employee1.getId(), req);

        // Second submission must be rejected
        assertThrows(IllegalStateException.class, () -> {
            kpiService.submitMcqAssessment(assignment.getId(), employee1.getId(), req);
        });
    }

    @Test
    @DisplayName("13. Workshop manual score accepted")
    void testWorkshopManualScoreAccepted() {
        KPI kpi = new KPI();
        kpi.setName("Leadership Workshop");
        kpi.setTargetValue("Complete");
        kpi.setKpiType(KPIType.WORKSHOP);
        kpi.setMaxScore(BigDecimal.valueOf(100));
        KPI savedKpi = kpiRepository.save(kpi);

        KPIWorkshop workshop = new KPIWorkshop();
        workshop.setKpi(savedKpi);
        workshop.setTitle("Advanced Leadership");
        workshop.setMaxScore(BigDecimal.valueOf(100));
        workshop.setWorkshopDate(LocalDate.now());
        kpiService.saveWorkshop(savedKpi.getId(), workshop);

        KPIAssignment assignment = kpiService.assignEmployees(savedKpi.getId(), List.of(employee1.getId())).get(0);

        ManualScoreRequest req = new ManualScoreRequest("PRESENT", BigDecimal.valueOf(88), "Excellent participation");
        KPIResult result = kpiService.scoreWorkshopParticipant(assignment.getId(), managerUser, req);

        assertNotNull(result);
        assertEquals(0, result.getScore().compareTo(BigDecimal.valueOf(88).setScale(2)));
        assertEquals("A", result.getGrade());
        assertEquals("MANUAL_WORKSHOP", result.getResultType());

        KPIAssignment updated = assignmentRepository.findById(assignment.getId()).get();
        assertEquals("COMPLETED", updated.getStatus());
    }

    @Test
    @DisplayName("14. Score greater than maxScore rejected")
    void testScoreGreaterThanMaxScoreRejected() {
        KPI kpi = new KPI();
        kpi.setName("Safety Workshop");
        kpi.setTargetValue("Pass");
        kpi.setKpiType(KPIType.WORKSHOP);
        kpi.setMaxScore(BigDecimal.valueOf(50));
        KPI savedKpi = kpiRepository.save(kpi);

        final KPIAssignment assignment = kpiService.assignEmployees(savedKpi.getId(), List.of(employee1.getId())).get(0);

        // Max score is 50, trying to submit 60
        ManualScoreRequest req = new ManualScoreRequest("PRESENT", BigDecimal.valueOf(60), "Too high score");
        assertThrows(IllegalArgumentException.class, () -> {
            kpiService.scoreWorkshopParticipant(assignment.getId(), managerUser, req);
        });
    }

    @Test
    @DisplayName("15. Manager can view KPI results summary")
    void testManagerCanViewKpiResults() {
        KPI kpi = new KPI();
        kpi.setName("Results Summary Test");
        kpi.setTargetValue("Pass");
        kpi.setKpiType(KPIType.MANUAL_SCORE);
        kpi.setMaxScore(BigDecimal.valueOf(100));
        KPI savedKpi = kpiRepository.save(kpi);

        KPIAssignment a1 = kpiService.assignEmployees(savedKpi.getId(), List.of(employee1.getId())).get(0);
        KPIAssignment a2 = kpiService.assignEmployees(savedKpi.getId(), List.of(employee2.getId())).get(0);

        kpiService.scoreManualKpi(a1.getId(), managerUser, new ManualScoreRequest("PRESENT", BigDecimal.valueOf(90), "Great"));
        kpiService.scoreManualKpi(a2.getId(), managerUser, new ManualScoreRequest("PRESENT", BigDecimal.valueOf(40), "Needs improvement"));

        KPIResultsSummaryDto summary = kpiService.getKpiResultsSummary(savedKpi.getId());
        assertEquals(2, summary.getAssignedEmployees());
        assertEquals(2, summary.getCompleted());
        assertEquals(1, summary.getPassCount());
        assertEquals(1, summary.getFailCount());
        assertEquals(0, summary.getHighestScore().compareTo(BigDecimal.valueOf(90)));
        assertEquals(0, summary.getLowestScore().compareTo(BigDecimal.valueOf(40)));
    }
}
