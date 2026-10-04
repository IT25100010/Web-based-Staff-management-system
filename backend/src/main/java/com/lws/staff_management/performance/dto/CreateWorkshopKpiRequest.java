package com.lws.staff_management.performance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class CreateWorkshopKpiRequest {

    private String name;
    private String description;
    private Long departmentId;
    private String targetValue = "100% Attendance & Practical Passing";
    private String evaluationCriteria;
    private int weightage = 20;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status = "ACTIVE";

    // Workshop specific details
    private LocalDate workshopDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String location;
    private String trainer;
    private BigDecimal maxScore = BigDecimal.valueOf(100);
    private String instructions;

    // Assignment
    private List<Long> assignedEmployeeIds = new ArrayList<>();

    public CreateWorkshopKpiRequest() {}

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

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getWorkshopDate() { return workshopDate; }
    public void setWorkshopDate(LocalDate workshopDate) { this.workshopDate = workshopDate; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getTrainer() { return trainer; }
    public void setTrainer(String trainer) { this.trainer = trainer; }

    public BigDecimal getMaxScore() { return maxScore; }
    public void setMaxScore(BigDecimal maxScore) { this.maxScore = maxScore; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public List<Long> getAssignedEmployeeIds() { return assignedEmployeeIds; }
    public void setAssignedEmployeeIds(List<Long> assignedEmployeeIds) { this.assignedEmployeeIds = assignedEmployeeIds; }
}
