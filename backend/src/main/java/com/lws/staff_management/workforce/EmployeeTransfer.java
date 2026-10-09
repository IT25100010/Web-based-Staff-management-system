package com.lws.staff_management.workforce;

import com.lws.staff_management.employee.Employee;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_transfers")
public class EmployeeTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "from_location_id", nullable = false)
    private WorkLocation fromLocation;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "to_location_id", nullable = false)
    private WorkLocation toLocation;

    @Column(name = "transfer_date", nullable = false)
    private LocalDate transferDate;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(nullable = false, length = 255)
    private String reason;

    @Column(nullable = false, length = 30)
    private String status = "REQUESTED"; // REQUESTED, REVIEWED, APPROVED, REJECTED, EFFECTIVE, COMPLETED

    @Column(name = "requested_by", length = 100)
    private String requestedBy;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "admin_remarks", length = 255)
    private String adminRemarks;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public EmployeeTransfer() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public WorkLocation getFromLocation() { return fromLocation; }
    public void setFromLocation(WorkLocation fromLocation) { this.fromLocation = fromLocation; }

    public WorkLocation getToLocation() { return toLocation; }
    public void setToLocation(WorkLocation toLocation) { this.toLocation = toLocation; }

    public LocalDate getTransferDate() { return transferDate; }
    public void setTransferDate(LocalDate transferDate) { this.transferDate = transferDate; }

    public LocalDate getEffectiveDate() { return effectiveDate != null ? effectiveDate : transferDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRequestedBy() { return requestedBy; }
    public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public String getAdminRemarks() { return adminRemarks; }
    public void setAdminRemarks(String adminRemarks) { this.adminRemarks = adminRemarks; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
