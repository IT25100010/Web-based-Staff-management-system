package com.lws.staff_management.performance.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class KPIQuestionDto {
    private Long id;
    private String questionText;
    private BigDecimal marks;
    private int displayOrder;
    private List<OptionDto> options = new ArrayList<>();

    public static class OptionDto {
        private Long id;
        private String optionText;
        private boolean correct;
        private int displayOrder;

        public OptionDto() {}
        public OptionDto(Long id, String optionText, boolean correct, int displayOrder) {
            this.id = id;
            this.optionText = optionText;
            this.correct = correct;
            this.displayOrder = displayOrder;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getOptionText() { return optionText; }
        public void setOptionText(String optionText) { this.optionText = optionText; }

        public boolean isCorrect() { return correct; }
        public void setCorrect(boolean correct) { this.correct = correct; }

        public int getDisplayOrder() { return displayOrder; }
        public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
    }

    public KPIQuestionDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public BigDecimal getMarks() { return marks; }
    public void setMarks(BigDecimal marks) { this.marks = marks; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }

    public List<OptionDto> getOptions() { return options; }
    public void setOptions(List<OptionDto> options) { this.options = options; }
}
