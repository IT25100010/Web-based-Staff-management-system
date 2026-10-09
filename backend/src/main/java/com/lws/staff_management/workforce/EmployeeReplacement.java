package com.lws.staff_management.workforce;

import com.lws.staff_management.employee.Employee;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_replacements")
public class EmployeeReplacement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shift_id", nullable = false)
    private Shift shift;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "work_location_id", nullable = false)
    private WorkLocation workLocation;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "original_employee_id", nullable = false)
    private Employee originalEmployee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "replacement_employee_id", nullable = false)
    private Employee replacementEmployee;

    @Column(name = "replacement_date", nullable = false)
    private LocalDate replacementDate;

    @Column(nullable = false, length = 255)
    private String reason;

    @Column(nullable = false, length = 30)
    private String status = "APPROVED"; // PENDING, APPROVED, COMPLETED

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public EmployeeReplacement() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Shift getShift() { return shift; }
    public void setShift(Shift shift) { this.shift = shift; }

    public WorkLocation getWorkLocation() { return workLocation; }
    public void setWorkLocation(WorkLocation workLocation) { this.workLocation = workLocation; }

    public Employee getOriginalEmployee() { return originalEmployee; }
    public void setOriginalEmployee(Employee originalEmployee) { this.originalEmployee = originalEmployee; }

    public Employee getReplacementEmployee() { return replacementEmployee; }
    public void setReplacementEmployee(Employee replacementEmployee) { this.replacementEmployee = replacementEmployee; }

    public LocalDate getReplacementDate() { return replacementDate; }
    public void setReplacementDate(LocalDate replacementDate) { this.replacementDate = replacementDate; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
