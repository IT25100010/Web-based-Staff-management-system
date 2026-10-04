package com.lws.staff_management.compliance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WarningNoticeRepository extends JpaRepository<WarningNotice, Long> {
    List<WarningNotice> findByEmployeeId(Long employeeId);
    boolean existsByEmployeeId(Long employeeId);
    List<WarningNotice> findByStatus(String status);
    long countByStatus(String status);
}
