package com.lws.staff_management.employee;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "department_employee_sequences")
public class DepartmentEmployeeSequence {

    @Id
    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "last_sequence", nullable = false)
    private Long lastSequence = 0L;

    public DepartmentEmployeeSequence() {}

    public DepartmentEmployeeSequence(Long departmentId, Long lastSequence) {
        this.departmentId = departmentId;
        this.lastSequence = lastSequence;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public Long getLastSequence() {
        return lastSequence;
    }

    public void setLastSequence(Long lastSequence) {
        this.lastSequence = lastSequence;
    }
}
