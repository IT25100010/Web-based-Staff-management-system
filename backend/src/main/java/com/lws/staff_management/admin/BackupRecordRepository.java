package com.lws.staff_management.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BackupRecordRepository extends JpaRepository<BackupRecord, Long> {
    List<BackupRecord> findAllByOrderByCreatedAtDesc();
}
