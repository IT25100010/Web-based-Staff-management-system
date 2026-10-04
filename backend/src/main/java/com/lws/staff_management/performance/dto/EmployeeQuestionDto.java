package com.lws.staff_management.performance.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class EmployeeQuestionDto {
    private Long questionId;
    private String questionText;
    private BigDecimal marks;
    private int displayOrder;
    private List<EmployeeOptionDto> options = new ArrayList<>();

    public EmployeeQuestionDto() {}

    public EmployeeQuestionDto(Long questionId, String questionText, BigDecimal marks, int displayOrder, List<EmployeeOptionDto> options) {
        this.questionId = questionId;
        this.questionText = questionText;
        this.marks = marks;
        this.displayOrder = displayOrder;
        this.options = options != null ? options : new ArrayList<>();
    }

    public Long getQuestionId() { return questionId; }
    public void setQuestionId(Long questionId) { this.questionId = questionId; }

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public BigDecimal getMarks() { return marks; }
    public void setMarks(BigDecimal marks) { this.marks = marks; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }

    public List<EmployeeOptionDto> getOptions() { return options; }
    public void setOptions(List<EmployeeOptionDto> options) { this.options = options; }
}
