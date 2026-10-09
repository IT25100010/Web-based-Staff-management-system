package com.lws.staff_management.attendance;

import com.lws.staff_management.employee.Employee;
import com.lws.staff_management.user.User;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "leave_requests")
public class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "leave_type", nullable = false, length = 50)
    private String leaveType; // Annual, Casual, Medical, Maternity, Unpaid

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "total_days", nullable = false)
    private int totalDays = 1;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Column(nullable = false, length = 30)
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    @Column(name = "action_date")
    private LocalDateTime actionDate;

    @Column(name = "admin_remarks", length = 255)
    private String adminRemarks;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public LeaveRequest() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public String getLeaveType() { return leaveType; }
    public void setLeaveType(String leaveType) { this.leaveType = leaveType; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public int getTotalDays() { return totalDays; }
    public void setTotalDays(int totalDays) { this.totalDays = totalDays; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public User getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(User reviewedBy) { this.reviewedBy = reviewedBy; }

    public LocalDateTime getActionDate() { return actionDate; }
    public void setActionDate(LocalDateTime actionDate) { this.actionDate = actionDate; }

    public String getAdminRemarks() { return adminRemarks; }
    public void setAdminRemarks(String adminRemarks) { this.adminRemarks = adminRemarks; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
