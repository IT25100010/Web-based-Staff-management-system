package com.lws.staff_management.attendance;

import com.lws.staff_management.employee.Employee;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "overtime_records")
public class OvertimeRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "overtime_date", nullable = false)
    private LocalDate overtimeDate;

    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal hours = BigDecimal.ZERO;

    @Column(name = "hourly_rate", precision = 10, scale = 2)
    private BigDecimal hourlyRate = BigDecimal.ZERO;

    @Column(precision = 3, scale = 2)
    private BigDecimal multiplier = new BigDecimal("1.00");

    @Column(name = "total_amount", precision = 10, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(length = 255)
    private String reason;

    @Column(nullable = false, length = 30)
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public OvertimeRecord() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public LocalDate getOvertimeDate() { return overtimeDate; }
    public void setOvertimeDate(LocalDate overtimeDate) { this.overtimeDate = overtimeDate; }

    public BigDecimal getHours() { return hours; }
    public void setHours(BigDecimal hours) { this.hours = hours; }

    public BigDecimal getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(BigDecimal hourlyRate) { this.hourlyRate = hourlyRate; }

    public BigDecimal getMultiplier() { return multiplier; }
    public void setMultiplier(BigDecimal multiplier) { this.multiplier = multiplier; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
