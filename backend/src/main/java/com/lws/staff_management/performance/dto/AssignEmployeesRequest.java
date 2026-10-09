package com.lws.staff_management.performance.dto;

import java.util.ArrayList;
import java.util.List;

public class AssignEmployeesRequest {
    private List<Long> employeeIds = new ArrayList<>();

    public AssignEmployeesRequest() {}

    public AssignEmployeesRequest(List<Long> employeeIds) {
        this.employeeIds = employeeIds;
    }

    public List<Long> getEmployeeIds() { return employeeIds; }
    public void setEmployeeIds(List<Long> employeeIds) { this.employeeIds = employeeIds; }
}
