package com.lws.staff_management.performance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class EmployeeAssessmentDto {
    private Long assignmentId;
    private Long kpiId;
    private String kpiName;
    private String kpiType;
    private String departmentName;
    private String description;
    private String instructions;
    private LocalDate startDate;
    private LocalDate endDate;
    private int totalQuestions;
    private BigDecimal totalMarks;
    private String status;
    private Integer passMark = 50;
    private List<EmployeeQuestionDto> questions = new ArrayList<>();

    public EmployeeAssessmentDto() {}

    public Long getAssignmentId() { return assignmentId; }
    public void setAssignmentId(Long assignmentId) { this.assignmentId = assignmentId; }

    public Long getKpiId() { return kpiId; }
    public void setKpiId(Long kpiId) { this.kpiId = kpiId; }

    public String getKpiName() { return kpiName; }
    public void setKpiName(String kpiName) { this.kpiName = kpiName; }

    public String getKpiType() { return kpiType; }
    public void setKpiType(String kpiType) { this.kpiType = kpiType; }

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }

    public BigDecimal getTotalMarks() { return totalMarks; }
    public void setTotalMarks(BigDecimal totalMarks) { this.totalMarks = totalMarks; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<EmployeeQuestionDto> getQuestions() { return questions; }
    public void setQuestions(List<EmployeeQuestionDto> questions) { this.questions = questions; }

    public Integer getPassMark() { return passMark != null ? passMark : 50; }
    public void setPassMark(Integer passMark) { this.passMark = passMark; }
}
