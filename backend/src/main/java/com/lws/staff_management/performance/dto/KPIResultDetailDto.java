package com.lws.staff_management.performance.dto;

import java.math.BigDecimal;
import java.util.List;

public class KPIResultDetailDto {
    private Long assignmentId;
    private Long kpiId;
    private String kpiName;
    private String kpiType;
    private String employeeName;
    private String employeeId;
    private BigDecimal score;
    private BigDecimal maxScore;
    private BigDecimal percentage;
    private String grade;
    private String remarks;
    private Integer correctAnswers;
    private Integer wrongAnswers;
    private String completedDate;
    private List<QuestionResultItem> questions;

    public static class QuestionResultItem {
        private Long questionId;
        private String questionText;
        private BigDecimal marks;
        private Long selectedOptionId;
        private String selectedOptionText;
        private Long correctOptionId;
        private String correctOptionText;
        private boolean correct;
        private BigDecimal marksAwarded;

        public QuestionResultItem() {}

        public Long getQuestionId() { return questionId; }
        public void setQuestionId(Long questionId) { this.questionId = questionId; }

        public String getQuestionText() { return questionText; }
        public void setQuestionText(String questionText) { this.questionText = questionText; }

        public BigDecimal getMarks() { return marks; }
        public void setMarks(BigDecimal marks) { this.marks = marks; }

        public Long getSelectedOptionId() { return selectedOptionId; }
        public void setSelectedOptionId(Long selectedOptionId) { this.selectedOptionId = selectedOptionId; }

        public String getSelectedOptionText() { return selectedOptionText; }
        public void setSelectedOptionText(String selectedOptionText) { this.selectedOptionText = selectedOptionText; }

        public Long getCorrectOptionId() { return correctOptionId; }
        public void setCorrectOptionId(Long correctOptionId) { this.correctOptionId = correctOptionId; }

        public String getCorrectOptionText() { return correctOptionText; }
        public void setCorrectOptionText(String correctOptionText) { this.correctOptionText = correctOptionText; }

        public boolean isCorrect() { return correct; }
        public void setCorrect(boolean correct) { this.correct = correct; }

        public BigDecimal getMarksAwarded() { return marksAwarded; }
        public void setMarksAwarded(BigDecimal marksAwarded) { this.marksAwarded = marksAwarded; }
    }

    public KPIResultDetailDto() {}

    public Long getAssignmentId() { return assignmentId; }
    public void setAssignmentId(Long assignmentId) { this.assignmentId = assignmentId; }

    public Long getKpiId() { return kpiId; }
    public void setKpiId(Long kpiId) { this.kpiId = kpiId; }

    public String getKpiName() { return kpiName; }
    public void setKpiName(String kpiName) { this.kpiName = kpiName; }

    public String getKpiType() { return kpiType; }
    public void setKpiType(String kpiType) { this.kpiType = kpiType; }

    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }

    public BigDecimal getMaxScore() { return maxScore; }
    public void setMaxScore(BigDecimal maxScore) { this.maxScore = maxScore; }

    public BigDecimal getPercentage() { return percentage; }
    public void setPercentage(BigDecimal percentage) { this.percentage = percentage; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public Integer getCorrectAnswers() { return correctAnswers; }
    public void setCorrectAnswers(Integer correctAnswers) { this.correctAnswers = correctAnswers; }

    public Integer getWrongAnswers() { return wrongAnswers; }
    public void setWrongAnswers(Integer wrongAnswers) { this.wrongAnswers = wrongAnswers; }

    public String getCompletedDate() { return completedDate; }
    public void setCompletedDate(String completedDate) { this.completedDate = completedDate; }

    public List<QuestionResultItem> getQuestions() { return questions; }
    public void setQuestions(List<QuestionResultItem> questions) { this.questions = questions; }
}
