package com.lws.staff_management.performance;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.lws.staff_management.employee.Employee;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "kpi_assignments", uniqueConstraints = {
    @UniqueConstraint(name = "uk_kpi_employee", columnNames = {"kpi_id", "employee_id"})
})
public class KPIAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "kpi_id", nullable = false)
    @JsonIgnoreProperties({"questions", "assignments", "workshop"})
    private KPI kpi;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"user"})
    private Employee employee;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt = LocalDateTime.now();

    @Column(nullable = false, length = 30)
    private String status = "ASSIGNED"; // ASSIGNED, IN_PROGRESS, COMPLETED, ABSENT, CANCELLED

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToOne(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonIgnoreProperties({"assignment"})
    private KPIResult result;

    public KPIAssignment() {}

    public KPIAssignment(KPI kpi, Employee employee) {
        this.kpi = kpi;
        this.employee = employee;
        this.assignedAt = LocalDateTime.now();
        this.status = "ASSIGNED";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public KPI getKpi() { return kpi; }
    public void setKpi(KPI kpi) { this.kpi = kpi; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public KPIResult getResult() { return result; }
    public void setResult(KPIResult result) { this.result = result; }
}
