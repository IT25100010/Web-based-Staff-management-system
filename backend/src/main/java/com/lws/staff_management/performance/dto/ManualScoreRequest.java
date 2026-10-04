package com.lws.staff_management.performance.dto;

import java.math.BigDecimal;

public class ManualScoreRequest {
    private String attendance; // PRESENT, ABSENT
    private BigDecimal score;
    private String remarks;

    public ManualScoreRequest() {}

    public ManualScoreRequest(String attendance, BigDecimal score, String remarks) {
        this.attendance = attendance;
        this.score = score;
        this.remarks = remarks;
    }

    public String getAttendance() { return attendance; }
    public void setAttendance(String attendance) { this.attendance = attendance; }

    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
