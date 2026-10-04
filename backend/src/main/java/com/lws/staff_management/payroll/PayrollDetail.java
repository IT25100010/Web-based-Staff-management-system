package com.lws.staff_management.payroll;

import com.lws.staff_management.employee.Employee;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "payroll_details")
public class PayrollDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payroll_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Payroll payroll;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "base_salary", precision = 12, scale = 2, nullable = false)
    private BigDecimal baseSalary = BigDecimal.ZERO;

    @Column(name = "regular_worked_hours", precision = 6, scale = 2)
    private BigDecimal regularWorkedHours = BigDecimal.ZERO;

    @Column(name = "overtime_hours", precision = 5, scale = 2)
    private BigDecimal overtimeHours = BigDecimal.ZERO;

    @Column(name = "ot_rate", precision = 10, scale = 2)
    private BigDecimal otRate = BigDecimal.ZERO;

    @Column(name = "overtime_pay", precision = 10, scale = 2)
    private BigDecimal overtimePay = BigDecimal.ZERO;

    @Column(name = "allowances", precision = 10, scale = 2)
    private BigDecimal allowances = BigDecimal.ZERO;

    @Column(name = "epf_employee", precision = 10, scale = 2)
    private BigDecimal epfEmployee = BigDecimal.ZERO; // 8%

    @Column(name = "epf_employer", precision = 10, scale = 2)
    private BigDecimal epfEmployer = BigDecimal.ZERO; // 12%

    @Column(name = "etf_employer", precision = 10, scale = 2)
    private BigDecimal etfEmployer = BigDecimal.ZERO; // 3%

    @Column(name = "other_deductions", precision = 10, scale = 2)
    private BigDecimal otherDeductions = BigDecimal.ZERO;

    @Column(name = "total_deductions", precision = 10, scale = 2)
    private BigDecimal totalDeductions = BigDecimal.ZERO;

    @Column(name = "gross_salary", precision = 12, scale = 2)
    private BigDecimal grossSalary = BigDecimal.ZERO;

    @Column(name = "net_salary", precision = 12, scale = 2, nullable = false)
    private BigDecimal netSalary = BigDecimal.ZERO;

    // Explanatory breakdown fields for transparent payroll auditing
    @Column(name = "expected_working_days")
    private Integer expectedWorkingDays = 0;

    @Column(name = "daily_rate", precision = 10, scale = 2)
    private BigDecimal dailyRate = BigDecimal.ZERO;

    @Column(name = "present_days")
    private Integer presentDays = 0;

    @Column(name = "late_days")
    private Integer lateDays = 0;

    @Column(name = "half_days")
    private Integer halfDays = 0;

    @Column(name = "paid_leave_days")
    private Integer paidLeaveDays = 0;

    @Column(name = "unpaid_leave_days")
    private Integer unpaidLeaveDays = 0;

    @Column(name = "absent_days")
    private Integer absentDays = 0;

    @Column(name = "attendance_deduction", precision = 10, scale = 2)
    private BigDecimal attendanceDeduction = BigDecimal.ZERO;

    public PayrollDetail() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Payroll getPayroll() { return payroll; }
    public void setPayroll(Payroll payroll) { this.payroll = payroll; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public BigDecimal getBaseSalary() { return baseSalary; }
    public void setBaseSalary(BigDecimal baseSalary) { this.baseSalary = baseSalary; }

    public BigDecimal getOvertimeHours() { return overtimeHours; }
    public void setOvertimeHours(BigDecimal overtimeHours) { this.overtimeHours = overtimeHours; }

    public BigDecimal getOvertimePay() { return overtimePay; }
    public void setOvertimePay(BigDecimal overtimePay) { this.overtimePay = overtimePay; }

    public BigDecimal getAllowances() { return allowances; }
    public void setAllowances(BigDecimal allowances) { this.allowances = allowances; }

    public BigDecimal getEpfEmployee() { return epfEmployee; }
    public void setEpfEmployee(BigDecimal epfEmployee) { this.epfEmployee = epfEmployee; }

    public BigDecimal getEpfEmployer() { return epfEmployer; }
    public void setEpfEmployer(BigDecimal epfEmployer) { this.epfEmployer = epfEmployer; }

    public BigDecimal getEtfEmployer() { return etfEmployer; }
    public void setEtfEmployer(BigDecimal etfEmployer) { this.etfEmployer = etfEmployer; }

    public BigDecimal getOtherDeductions() { return otherDeductions; }
    public void setOtherDeductions(BigDecimal otherDeductions) { this.otherDeductions = otherDeductions; }

    public BigDecimal getTotalDeductions() { return totalDeductions; }
    public void setTotalDeductions(BigDecimal totalDeductions) { this.totalDeductions = totalDeductions; }

    public BigDecimal getGrossSalary() { return grossSalary; }
    public void setGrossSalary(BigDecimal grossSalary) { this.grossSalary = grossSalary; }

    public BigDecimal getNetSalary() { return netSalary; }
    public void setNetSalary(BigDecimal netSalary) { this.netSalary = netSalary; }

    public Integer getExpectedWorkingDays() { return expectedWorkingDays; }
    public void setExpectedWorkingDays(Integer expectedWorkingDays) { this.expectedWorkingDays = expectedWorkingDays; }

    public BigDecimal getDailyRate() { return dailyRate; }
    public void setDailyRate(BigDecimal dailyRate) { this.dailyRate = dailyRate; }

    public Integer getPresentDays() { return presentDays; }
    public void setPresentDays(Integer presentDays) { this.presentDays = presentDays; }

    public Integer getLateDays() { return lateDays; }
    public void setLateDays(Integer lateDays) { this.lateDays = lateDays; }

    public Integer getHalfDays() { return halfDays; }
    public void setHalfDays(Integer halfDays) { this.halfDays = halfDays; }

    public Integer getPaidLeaveDays() { return paidLeaveDays; }
    public void setPaidLeaveDays(Integer paidLeaveDays) { this.paidLeaveDays = paidLeaveDays; }

    public Integer getUnpaidLeaveDays() { return unpaidLeaveDays; }
    public void setUnpaidLeaveDays(Integer unpaidLeaveDays) { this.unpaidLeaveDays = unpaidLeaveDays; }

    public Integer getAbsentDays() { return absentDays; }
    public void setAbsentDays(Integer absentDays) { this.absentDays = absentDays; }

    public BigDecimal getAttendanceDeduction() { return attendanceDeduction; }
    public void setAttendanceDeduction(BigDecimal attendanceDeduction) { this.attendanceDeduction = attendanceDeduction; }

    public BigDecimal getOtRate() { return otRate != null ? otRate : BigDecimal.ZERO; }
    public void setOtRate(BigDecimal otRate) { this.otRate = otRate; }

    public BigDecimal getRegularWorkedHours() { return regularWorkedHours != null ? regularWorkedHours : BigDecimal.ZERO; }
    public void setRegularWorkedHours(BigDecimal regularWorkedHours) { this.regularWorkedHours = regularWorkedHours; }
}
