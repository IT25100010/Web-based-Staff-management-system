package com.lws.staff_management.compliance.dto;

public class ComplaintResponseRequest {

    private String adminResponse;
    private String status; // optional, e.g. "RESOLVED" or "IN_PROGRESS"

    public ComplaintResponseRequest() {}

    public ComplaintResponseRequest(String adminResponse, String status) {
        this.adminResponse = adminResponse;
        this.status = status;
    }

    public String getAdminResponse() { return adminResponse; }
    public void setAdminResponse(String adminResponse) { this.adminResponse = adminResponse; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
