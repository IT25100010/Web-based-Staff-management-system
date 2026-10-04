package com.lws.staff_management.performance;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "performance_evaluations")
public class PerformanceEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "evaluator_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"password", "hibernateLazyInitializer", "handler"})
    private User evaluator;

    @Column(name = "evaluation_period", nullable = false, length = 50)
    private String evaluationPeriod; // e.g. "Q1-2026", "2025-Annual"

    @Column(name = "overall_score", precision = 5, scale = 2, nullable = false)
    private BigDecimal overallScore = BigDecimal.ZERO; // e.g. 85.50

    @Column(name = "performance_grade", length = 20)
    private String performanceGrade = "EXCEEDS_EXPECTATIONS"; // OUTSTANDING, EXCEEDS_EXPECTATIONS, MEETS_EXPECTATIONS, NEEDS_IMPROVEMENT

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(columnDefinition = "TEXT")
    private String recommendations;

    @Column(name = "evaluation_date", nullable = false)
    private LocalDate evaluationDate = LocalDate.now();

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public PerformanceEvaluation() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public User getEvaluator() { return evaluator; }
    public void setEvaluator(User evaluator) { this.evaluator = evaluator; }

    public String getEvaluationPeriod() { return evaluationPeriod; }
    public void setEvaluationPeriod(String evaluationPeriod) { this.evaluationPeriod = evaluationPeriod; }

    public BigDecimal getOverallScore() { return overallScore; }
    public void setOverallScore(BigDecimal overallScore) { this.overallScore = overallScore; }

    public String getPerformanceGrade() { return performanceGrade; }
    public void setPerformanceGrade(String performanceGrade) { this.performanceGrade = performanceGrade; }

    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }

    public String getRecommendations() { return recommendations; }
    public void setRecommendations(String recommendations) { this.recommendations = recommendations; }

    public LocalDate getEvaluationDate() { return evaluationDate; }
    public void setEvaluationDate(LocalDate evaluationDate) { this.evaluationDate = evaluationDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
