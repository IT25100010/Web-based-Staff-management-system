package com.lws.staff_management.performance;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.lws.staff_management.employee.Department;
import com.lws.staff_management.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "kpis")
public class KPI {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(name = "target_value", nullable = false, length = 50)
    private String targetValue; // e.g. "98% on-time delivery", "0 safety incidents", "45 units/hr"

    @Column(name = "evaluation_criteria", columnDefinition = "TEXT")
    private String evaluationCriteria;

    @Column(nullable = false)
    private int weightage = 20; // percentage out of 100

    @Column(nullable = false, length = 30)
    private String status = "ACTIVE"; // ACTIVE, INACTIVE

    @Enumerated(EnumType.STRING)
    @Column(name = "kpi_type", nullable = false, length = 30)
    private KPIType kpiType = KPIType.MANUAL_SCORE;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "max_score", precision = 10, scale = 2)
    private BigDecimal maxScore = BigDecimal.valueOf(100);

    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "pass_mark")
    private Integer passMark = 50;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "kpi", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<KPIQuestion> questions = new ArrayList<>();

    @OneToMany(mappedBy = "kpi", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<KPIAssignment> assignments = new ArrayList<>();

    @OneToOne(mappedBy = "kpi", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private KPIWorkshop workshop;

    public KPI() {}

    public KPI(String name, String description, Department department, String targetValue, String evaluationCriteria, int weightage) {
        this.name = name;
        this.description = description;
        this.department = department;
        this.targetValue = targetValue;
        this.evaluationCriteria = evaluationCriteria;
        this.weightage = weightage;
        this.status = "ACTIVE";
        this.kpiType = KPIType.MANUAL_SCORE;
        this.maxScore = BigDecimal.valueOf(100);
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }

    public String getTargetValue() { return targetValue; }
    public void setTargetValue(String targetValue) { this.targetValue = targetValue; }

    public String getEvaluationCriteria() { return evaluationCriteria; }
    public void setEvaluationCriteria(String evaluationCriteria) { this.evaluationCriteria = evaluationCriteria; }

    public int getWeightage() { return weightage; }
    public void setWeightage(int weightage) { this.weightage = weightage; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public KPIType getKpiType() {
        return kpiType != null ? kpiType : KPIType.MANUAL_SCORE;
    }
    public void setKpiType(KPIType kpiType) {
        this.kpiType = kpiType != null ? kpiType : KPIType.MANUAL_SCORE;
    }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public BigDecimal getMaxScore() { return maxScore != null ? maxScore : BigDecimal.valueOf(100); }
    public void setMaxScore(BigDecimal maxScore) { this.maxScore = maxScore; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<KPIQuestion> getQuestions() { return questions; }
    public void setQuestions(List<KPIQuestion> questions) { this.questions = questions; }

    public List<KPIAssignment> getAssignments() { return assignments; }
    public void setAssignments(List<KPIAssignment> assignments) { this.assignments = assignments; }

    public KPIWorkshop getWorkshop() { return workshop; }
    public void setWorkshop(KPIWorkshop workshop) { this.workshop = workshop; }

    public Integer getPassMark() { return passMark != null ? passMark : 50; }
    public void setPassMark(Integer passMark) { this.passMark = passMark; }
}
