package com.lws.staff_management.performance.dto;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class CreateMcqKpiRequest {

    private String name;
    private String description;
    private Long departmentId;
    private String targetValue;
    private String evaluationCriteria;
    private int weightage = 20;
    private LocalDate startDate;
    private LocalDate endDate;
    private String instructions;
    private Integer passMark = 50;
    private String status = "ACTIVE";
    private List<QuestionItem> questions = new ArrayList<>();
    private List<Long> assignedEmployeeIds = new ArrayList<>();

    public static class QuestionItem {
        private String questionText;
        private int displayOrder = 1;
        private List<OptionItem> options = new ArrayList<>();

        public QuestionItem() {}

        public String getQuestionText() { return questionText; }
        public void setQuestionText(String questionText) { this.questionText = questionText; }

        public int getDisplayOrder() { return displayOrder; }
        public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }

        public List<OptionItem> getOptions() { return options; }
        public void setOptions(List<OptionItem> options) { this.options = options; }
    }

    public static class OptionItem {
        private String optionText;
        private boolean correct = false;
        private int displayOrder = 1;

        public OptionItem() {}

        public OptionItem(String optionText, boolean correct, int displayOrder) {
            this.optionText = optionText;
            this.correct = correct;
            this.displayOrder = displayOrder;
        }

        public String getOptionText() { return optionText; }
        public void setOptionText(String optionText) { this.optionText = optionText; }

        public boolean isCorrect() { return correct; }
        public void setCorrect(boolean correct) { this.correct = correct; }

        public int getDisplayOrder() { return displayOrder; }
        public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
    }

    public CreateMcqKpiRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getDepartmentId() { return departmentId; }
    public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }

    public String getTargetValue() { return targetValue; }
    public void setTargetValue(String targetValue) { this.targetValue = targetValue; }

    public String getEvaluationCriteria() { return evaluationCriteria; }
    public void setEvaluationCriteria(String evaluationCriteria) { this.evaluationCriteria = evaluationCriteria; }

    public int getWeightage() { return weightage; }
    public void setWeightage(int weightage) { this.weightage = weightage; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public Integer getPassMark() { return passMark != null ? passMark : 50; }
    public void setPassMark(Integer passMark) { this.passMark = passMark; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<QuestionItem> getQuestions() { return questions; }
    public void setQuestions(List<QuestionItem> questions) { this.questions = questions; }

    public List<Long> getAssignedEmployeeIds() { return assignedEmployeeIds; }
    public void setAssignedEmployeeIds(List<Long> assignedEmployeeIds) { this.assignedEmployeeIds = assignedEmployeeIds; }
}
