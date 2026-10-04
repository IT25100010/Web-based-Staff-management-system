package com.lws.staff_management.compliance;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.user.User;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "warning_notices")
public class WarningNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "warning_level", nullable = false, length = 50)
    private String warningLevel; // Verbal Warning, First Written Warning, Final Written Warning

    @Column(name = "warning_date", nullable = false)
    private LocalDate warningDate;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Column(name = "action_required", columnDefinition = "TEXT")
    private String actionRequired;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issued_by_id")
    private User issuedBy;

    @Column(nullable = false, length = 30)
    private String status = "ACTIVE"; // ACTIVE, RESOLVED, EXPIRED

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public WarningNotice() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public String getWarningLevel() { return warningLevel; }
    public void setWarningLevel(String warningLevel) { this.warningLevel = warningLevel; }

    public LocalDate getWarningDate() { return warningDate; }
    public void setWarningDate(LocalDate warningDate) { this.warningDate = warningDate; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getActionRequired() { return actionRequired; }
    public void setActionRequired(String actionRequired) { this.actionRequired = actionRequired; }

    public User getIssuedBy() { return issuedBy; }
    public void setIssuedBy(User issuedBy) { this.issuedBy = issuedBy; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
