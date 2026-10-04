package com.lws.staff_management.employee;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_documents")
public class EmployeeDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "document_name", nullable = false, length = 150)
    private String documentName;

    @Column(name = "document_type", nullable = false, length = 80)
    private String documentType; // NIC Copy, Contract, Certificate, Resume, Medical Report, Police Report

    @Column(name = "file_url", length = 255)
    private String fileUrl;

    @Column(length = 50, nullable = false)
    private String status = "PENDING"; // PENDING, VERIFIED, REJECTED

    @Column(name = "upload_date")
    private LocalDateTime uploadDate = LocalDateTime.now();

    @Column(length = 255)
    private String remarks;

    public EmployeeDocument() {}

    public EmployeeDocument(Employee employee, String documentName, String documentType, String fileUrl, String status, String remarks) {
        this.employee = employee;
        this.documentName = documentName;
        this.documentType = documentType;
        this.fileUrl = fileUrl;
        this.status = status != null ? status : "PENDING";
        this.uploadDate = LocalDateTime.now();
        this.remarks = remarks;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public String getDocumentName() { return documentName; }
    public void setDocumentName(String documentName) { this.documentName = documentName; }

    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getUploadDate() { return uploadDate; }
    public void setUploadDate(LocalDateTime uploadDate) { this.uploadDate = uploadDate; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
