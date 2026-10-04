package com.lws.staff_management.performance;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "kpi_results")
public class KPIResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assignment_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"result", "kpi", "employee", "hibernateLazyInitializer", "handler"})
    private KPIAssignment assignment;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"user", "hibernateLazyInitializer", "handler"})
    private Employee employee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "kpi_id", nullable = false)
    @JsonIgnoreProperties({"questions", "assignments", "workshop", "hibernateLazyInitializer", "handler"})
    private KPI kpi;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal score = BigDecimal.ZERO;

    @Column(name = "max_score", nullable = false, precision = 10, scale = 2)
    private BigDecimal maxScore = BigDecimal.valueOf(100);

    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal percentage = BigDecimal.ZERO;

    @Column(length = 10)
    private String grade; // A, B, C, D, F

    @Column(name = "result_type", nullable = false, length = 30)
    private String resultType; // AUTO_MCQ, MANUAL_WORKSHOP, MANUAL_SCORE

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "correct_answers")
    private Integer correctAnswers;

    @Column(name = "wrong_answers")
    private Integer wrongAnswers;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "evaluated_by_id")
    @JsonIgnoreProperties({"password", "hibernateLazyInitializer", "handler"})
    private User evaluatedBy;

    @Column(name = "evaluated_at")
    private LocalDateTime evaluatedAt = LocalDateTime.now();

    public KPIResult() {}

    public Integer getCorrectAnswers() {
        if (correctAnswers != null) return correctAnswers;
        if (score != null) return score.intValue() / 10;
        return 0;
    }
    public void setCorrectAnswers(Integer correctAnswers) { this.correctAnswers = correctAnswers; }

    public Integer getWrongAnswers() {
        if (wrongAnswers != null) return wrongAnswers;
        return Math.max(0, 10 - getCorrectAnswers());
    }
    public void setWrongAnswers(Integer wrongAnswers) { this.wrongAnswers = wrongAnswers; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public KPIAssignment getAssignment() { return assignment; }
    public void setAssignment(KPIAssignment assignment) { this.assignment = assignment; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public KPI getKpi() { return kpi; }
    public void setKpi(KPI kpi) { this.kpi = kpi; }

    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }

    public BigDecimal getMaxScore() { return maxScore; }
    public void setMaxScore(BigDecimal maxScore) { this.maxScore = maxScore; }

    public BigDecimal getPercentage() { return percentage; }
    public void setPercentage(BigDecimal percentage) { this.percentage = percentage; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public String getResultType() { return resultType; }
    public void setResultType(String resultType) { this.resultType = resultType; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public User getEvaluatedBy() { return evaluatedBy; }
    public void setEvaluatedBy(User evaluatedBy) { this.evaluatedBy = evaluatedBy; }

    public LocalDateTime getEvaluatedAt() { return evaluatedAt; }
    public void setEvaluatedAt(LocalDateTime evaluatedAt) { this.evaluatedAt = evaluatedAt; }
}
