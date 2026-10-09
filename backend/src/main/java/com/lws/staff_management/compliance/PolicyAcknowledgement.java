package com.lws.staff_management.compliance;

import com.lws.staff_management.employee.Employee;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "policy_acknowledgements", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"employee_id", "policy_id"})
})
public class PolicyAcknowledgement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "policy_id", nullable = false)
    private CompanyPolicy policy;

    @Column(name = "acknowledged_at", nullable = false)
    private LocalDateTime acknowledgedAt = LocalDateTime.now();

    @Column(nullable = false, length = 30)
    private String status = "ACKNOWLEDGED";

    public PolicyAcknowledgement() {}

    public PolicyAcknowledgement(Employee employee, CompanyPolicy policy) {
        this.employee = employee;
        this.policy = policy;
        this.acknowledgedAt = LocalDateTime.now();
        this.status = "ACKNOWLEDGED";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public CompanyPolicy getPolicy() { return policy; }
    public void setPolicy(CompanyPolicy policy) { this.policy = policy; }

    public LocalDateTime getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(LocalDateTime acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
