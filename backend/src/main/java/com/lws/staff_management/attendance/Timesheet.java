package com.lws.staff_management.attendance;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "timesheets")
public class Timesheet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(name = "regular_hours", precision = 6, scale = 2)
    private BigDecimal regularHours = BigDecimal.ZERO;

    @Column(name = "overtime_hours", precision = 6, scale = 2)
    private BigDecimal overtimeHours = BigDecimal.ZERO;

    @Column(name = "total_hours", precision = 6, scale = 2)
    private BigDecimal totalHours = BigDecimal.ZERO;

    @Column(nullable = false, length = 30)
    private String status = "DRAFT"; // DRAFT, FINALIZED, APPROVED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    private User approvedBy;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;

    public Timesheet() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public LocalDate getPeriodStart() { return periodStart; }
    public void setPeriodStart(LocalDate periodStart) { this.periodStart = periodStart; }

    public LocalDate getPeriodEnd() { return periodEnd; }
    public void setPeriodEnd(LocalDate periodEnd) { this.periodEnd = periodEnd; }

    public BigDecimal getRegularHours() { return regularHours; }
    public void setRegularHours(BigDecimal regularHours) { this.regularHours = regularHours; }

    public BigDecimal getOvertimeHours() { return overtimeHours; }
    public void setOvertimeHours(BigDecimal overtimeHours) { this.overtimeHours = overtimeHours; }

    public BigDecimal getTotalHours() { return totalHours; }
    public void setTotalHours(BigDecimal totalHours) { this.totalHours = totalHours; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public User getApprovedBy() { return approvedBy; }
    public void setApprovedBy(User approvedBy) { this.approvedBy = approvedBy; }

    public LocalDateTime getFinalizedAt() { return finalizedAt; }
    public void setFinalizedAt(LocalDateTime finalizedAt) { this.finalizedAt = finalizedAt; }
}
