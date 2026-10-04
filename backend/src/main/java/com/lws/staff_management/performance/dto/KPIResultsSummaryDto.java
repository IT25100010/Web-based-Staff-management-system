package com.lws.staff_management.performance.dto;

import com.lws.staff_management.performance.KPIResult;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class KPIResultsSummaryDto {
    private int assignedEmployees;
    private int completed;
    private int notCompleted;
    private BigDecimal averageScore = BigDecimal.ZERO;
    private BigDecimal highestScore = BigDecimal.ZERO;
    private BigDecimal lowestScore = BigDecimal.ZERO;
    private int passCount;
    private int failCount;
    private Integer passMark;
    private List<KPIResult> results = new ArrayList<>();

    public KPIResultsSummaryDto() {}

    public Integer getPassMark() { return passMark; }
    public void setPassMark(Integer passMark) { this.passMark = passMark; }
    public Integer getKpiPassMark() { return passMark; }

    public int getAssignedEmployees() { return assignedEmployees; }
    public void setAssignedEmployees(int assignedEmployees) { this.assignedEmployees = assignedEmployees; }

    public int getCompleted() { return completed; }
    public void setCompleted(int completed) { this.completed = completed; }

    public int getNotCompleted() { return notCompleted; }
    public void setNotCompleted(int notCompleted) { this.notCompleted = notCompleted; }

    public BigDecimal getAverageScore() { return averageScore; }
    public void setAverageScore(BigDecimal averageScore) { this.averageScore = averageScore; }

    public BigDecimal getHighestScore() { return highestScore; }
    public void setHighestScore(BigDecimal highestScore) { this.highestScore = highestScore; }

    public BigDecimal getLowestScore() { return lowestScore; }
    public void setLowestScore(BigDecimal lowestScore) { this.lowestScore = lowestScore; }

    public int getPassCount() { return passCount; }
    public void setPassCount(int passCount) { this.passCount = passCount; }

    public int getFailCount() { return failCount; }
    public void setFailCount(int failCount) { this.failCount = failCount; }

    public List<KPIResult> getResults() { return results; }
    public void setResults(List<KPIResult> results) { this.results = results; }
}
