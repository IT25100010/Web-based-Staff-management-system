package com.lws.staff_management.performance;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "kpi_responses")
public class KPIResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    @JsonIgnoreProperties({"result", "kpi", "employee"})
    private KPIAssignment assignment;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "question_id", nullable = false)
    @JsonIgnoreProperties({"kpi", "options"})
    private KPIQuestion question;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "selected_option_id", nullable = false)
    @JsonIgnoreProperties({"question"})
    private KPIOption selectedOption;

    @Column(nullable = false)
    private boolean correct;

    @Column(name = "marks_awarded", nullable = false, precision = 10, scale = 2)
    private BigDecimal marksAwarded = BigDecimal.ZERO;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt = LocalDateTime.now();

    public KPIResponse() {}

    public KPIResponse(KPIAssignment assignment, KPIQuestion question, KPIOption selectedOption, boolean correct, BigDecimal marksAwarded) {
        this.assignment = assignment;
        this.question = question;
        this.selectedOption = selectedOption;
        this.correct = correct;
        this.marksAwarded = marksAwarded;
        this.answeredAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public KPIAssignment getAssignment() { return assignment; }
    public void setAssignment(KPIAssignment assignment) { this.assignment = assignment; }

    public KPIQuestion getQuestion() { return question; }
    public void setQuestion(KPIQuestion question) { this.question = question; }

    public KPIOption getSelectedOption() { return selectedOption; }
    public void setSelectedOption(KPIOption selectedOption) { this.selectedOption = selectedOption; }

    public boolean isCorrect() { return correct; }
    public void setCorrect(boolean correct) { this.correct = correct; }

    public BigDecimal getMarksAwarded() { return marksAwarded; }
    public void setMarksAwarded(BigDecimal marksAwarded) { this.marksAwarded = marksAwarded; }

    public LocalDateTime getAnsweredAt() { return answeredAt; }
    public void setAnsweredAt(LocalDateTime answeredAt) { this.answeredAt = answeredAt; }
}
