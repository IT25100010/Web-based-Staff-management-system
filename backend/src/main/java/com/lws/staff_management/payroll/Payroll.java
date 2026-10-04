package com.lws.staff_management.payroll;

import com.lws.staff_management.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payrolls", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"payroll_month", "payroll_year"})
})
public class Payroll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "period_name", nullable = false, length = 50)
    private String periodName; // e.g. "March 2026"

    @Column(name = "payroll_month", nullable = false)
    private int payrollMonth;

    @Column(name = "payroll_year", nullable = false)
    private int payrollYear;

    @Column(name = "total_gross", precision = 14, scale = 2)
    private BigDecimal totalGross = BigDecimal.ZERO;

    @Column(name = "total_overtime", precision = 12, scale = 2)
    private BigDecimal totalOvertime = BigDecimal.ZERO;

    @Column(name = "total_deductions", precision = 12, scale = 2)
    private BigDecimal totalDeductions = BigDecimal.ZERO;

    @Column(name = "total_net", precision = 14, scale = 2)
    private BigDecimal totalNet = BigDecimal.ZERO;

    @Column(name = "employee_count", nullable = false)
    private int employeeCount = 0;

    @Column(nullable = false, length = 30)
    private String status = "DRAFT"; // DRAFT, FINALIZED, PAID

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "processed_by_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"password", "hibernateLazyInitializer", "handler"})
    private User processedBy;

    @Column(name = "processed_date")
    private LocalDateTime processedDate = LocalDateTime.now();

    public Payroll() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPeriodName() { return periodName; }
    public void setPeriodName(String periodName) { this.periodName = periodName; }

    public int getPayrollMonth() { return payrollMonth; }
    public void setPayrollMonth(int payrollMonth) { this.payrollMonth = payrollMonth; }

    public int getPayrollYear() { return payrollYear; }
    public void setPayrollYear(int payrollYear) { this.payrollYear = payrollYear; }

    public BigDecimal getTotalGross() { return totalGross; }
    public void setTotalGross(BigDecimal totalGross) { this.totalGross = totalGross; }

    public BigDecimal getTotalOvertime() { return totalOvertime; }
    public void setTotalOvertime(BigDecimal totalOvertime) { this.totalOvertime = totalOvertime; }

    public BigDecimal getTotalDeductions() { return totalDeductions; }
    public void setTotalDeductions(BigDecimal totalDeductions) { this.totalDeductions = totalDeductions; }

    public BigDecimal getTotalNet() { return totalNet; }
    public void setTotalNet(BigDecimal totalNet) { this.totalNet = totalNet; }

    public int getEmployeeCount() { return employeeCount; }
    public void setEmployeeCount(int employeeCount) { this.employeeCount = employeeCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public User getProcessedBy() { return processedBy; }
    public void setProcessedBy(User processedBy) { this.processedBy = processedBy; }

    public LocalDateTime getProcessedDate() { return processedDate; }
    public void setProcessedDate(LocalDateTime processedDate) { this.processedDate = processedDate; }
}
