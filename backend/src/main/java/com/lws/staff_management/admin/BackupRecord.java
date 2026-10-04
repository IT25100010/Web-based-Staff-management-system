package com.lws.staff_management.admin;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "backup_records")
public class BackupRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "backup_name", nullable = false, length = 150)
    private String backupName;

    @Column(name = "backup_type", nullable = false, length = 50)
    private String backupType = "FULL_DATABASE"; // FULL_DATABASE, EMPLOYEES_ONLY, AUDIT_ARCHIVE

    @Column(name = "file_size", length = 50)
    private String fileSize = "4.2 MB";

    @Column(nullable = false, length = 30)
    private String status = "SUCCESS"; // SUCCESS, FAILED, RUNNING

    @Column(name = "triggered_by", length = 100)
    private String triggeredBy = "IT_COORDINATOR";

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public BackupRecord() {}

    public BackupRecord(String backupName, String backupType, String fileSize, String status, String triggeredBy) {
        this.backupName = backupName;
        this.backupType = backupType;
        this.fileSize = fileSize;
        this.status = status;
        this.triggeredBy = triggeredBy;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBackupName() { return backupName; }
    public void setBackupName(String backupName) { this.backupName = backupName; }

    public String getBackupType() { return backupType; }
    public void setBackupType(String backupType) { this.backupType = backupType; }

    public String getFileSize() { return fileSize; }
    public void setFileSize(String fileSize) { this.fileSize = fileSize; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTriggeredBy() { return triggeredBy; }
    public void setTriggeredBy(String triggeredBy) { this.triggeredBy = triggeredBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
