package com.lws.staff_management.performance;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "kpi_questions")
public class KPIQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_id", nullable = false)
    @JsonIgnore
    private KPI kpi;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal marks = BigDecimal.valueOf(10);

    @Column(name = "display_order")
    private int displayOrder = 1;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("displayOrder ASC")
    private List<KPIOption> options = new ArrayList<>();

    public KPIQuestion() {}

    public KPIQuestion(KPI kpi, String questionText, BigDecimal marks, int displayOrder) {
        this.kpi = kpi;
        this.questionText = questionText;
        this.marks = marks != null ? marks : BigDecimal.valueOf(10);
        this.displayOrder = displayOrder;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public KPI getKpi() { return kpi; }
    public void setKpi(KPI kpi) { this.kpi = kpi; }

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public BigDecimal getMarks() { return marks; }
    public void setMarks(BigDecimal marks) { this.marks = marks; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }

    public List<KPIOption> getOptions() { return options; }
    public void setOptions(List<KPIOption> options) { this.options = options; }

    public void addOption(KPIOption option) {
        options.add(option);
        option.setQuestion(this);
    }

    public void removeOption(KPIOption option) {
        options.remove(option);
        option.setQuestion(null);
    }
}
