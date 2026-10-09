package com.lws.staff_management.workforce;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "staff_recalls")
public class StaffRecall {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recall_title", nullable = false, length = 150)
    private String recallTitle;

    @Column(name = "target_employees", columnDefinition = "TEXT")
    private String targetEmployees;

    @Column(name = "recall_date", nullable = false)
    private LocalDate recallDate;

    @Column(name = "recall_time", nullable = false)
    private LocalTime recallTime;

    @Column(nullable = false, length = 150)
    private String location;

    @Column(nullable = false, length = 30)
    private String priority = "HIGH"; // HIGH, CRITICAL, URGENT

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Column(nullable = false, length = 30)
    private String status = "ACTIVE"; // ACTIVE, RESOLVED, CANCELLED

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "staff_recall_recipients",
        joinColumns = @JoinColumn(name = "recall_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id")
    )
    private java.util.Set<com.lws.staff_management.employee.Employee> recipients = new java.util.HashSet<>();

    @Column(name = "is_broadcast")
    private Boolean isBroadcast = false;

    public StaffRecall() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRecallTitle() { return recallTitle; }
    public void setRecallTitle(String recallTitle) { this.recallTitle = recallTitle; }

    public String getTargetEmployees() { return targetEmployees; }
    public void setTargetEmployees(String targetEmployees) { this.targetEmployees = targetEmployees; }

    public LocalDate getRecallDate() { return recallDate; }
    public void setRecallDate(LocalDate recallDate) { this.recallDate = recallDate; }

    public LocalTime getRecallTime() { return recallTime; }
    public void setRecallTime(LocalTime recallTime) { this.recallTime = recallTime; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public java.util.Set<com.lws.staff_management.employee.Employee> getRecipients() { return recipients; }
    public void setRecipients(java.util.Set<com.lws.staff_management.employee.Employee> recipients) { this.recipients = recipients; }

    public Boolean getIsBroadcast() { return isBroadcast; }
    public void setIsBroadcast(Boolean isBroadcast) { this.isBroadcast = isBroadcast; }
}
