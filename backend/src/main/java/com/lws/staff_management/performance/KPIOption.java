package com.lws.staff_management.performance;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "kpi_options")
public class KPIOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    @JsonIgnore
    private KPIQuestion question;

    @Column(name = "option_text", nullable = false, columnDefinition = "TEXT")
    private String optionText;

    @Column(nullable = false)
    private boolean correct = false;

    @Column(name = "display_order")
    private int displayOrder = 1;

    public KPIOption() {}

    public KPIOption(KPIQuestion question, String optionText, boolean correct, int displayOrder) {
        this.question = question;
        this.optionText = optionText;
        this.correct = correct;
        this.displayOrder = displayOrder;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public KPIQuestion getQuestion() { return question; }
    public void setQuestion(KPIQuestion question) { this.question = question; }

    public String getOptionText() { return optionText; }
    public void setOptionText(String optionText) { this.optionText = optionText; }

    public boolean isCorrect() { return correct; }
    public void setCorrect(boolean correct) { this.correct = correct; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}
