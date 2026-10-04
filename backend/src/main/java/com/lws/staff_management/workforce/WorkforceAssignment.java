package com.lws.staff_management.workforce;

import com.lws.staff_management.employee.Employee;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "workforce_assignments", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"employee_id", "assignment_date", "shift_id"})
})
public class WorkforceAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "work_location_id", nullable = false)
    private WorkLocation workLocation;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shift_id", nullable = false)
    private Shift shift;

    @Column(name = "assignment_date", nullable = false)
    private LocalDate assignmentDate;

    @Column(nullable = false, length = 30)
    private String status = "ASSIGNED"; // ASSIGNED, COMPLETED, CANCELLED, REPLACED

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt = LocalDateTime.now();

    public WorkforceAssignment() {}

    public WorkforceAssignment(Employee employee, WorkLocation workLocation, Shift shift, LocalDate assignmentDate, String status) {
        this.employee = employee;
        this.workLocation = workLocation;
        this.shift = shift;
        this.assignmentDate = assignmentDate;
        this.status = status != null ? status : "ASSIGNED";
        this.assignedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public WorkLocation getWorkLocation() { return workLocation; }
    public void setWorkLocation(WorkLocation workLocation) { this.workLocation = workLocation; }

    public Shift getShift() { return shift; }
    public void setShift(Shift shift) { this.shift = shift; }

    public LocalDate getAssignmentDate() { return assignmentDate; }
    public void setAssignmentDate(LocalDate assignmentDate) { this.assignmentDate = assignmentDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }
}
