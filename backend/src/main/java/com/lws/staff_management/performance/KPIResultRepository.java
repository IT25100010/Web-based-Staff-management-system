package com.lws.staff_management.performance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface KPIResultRepository extends JpaRepository<KPIResult, Long> {
    Optional<KPIResult> findByAssignmentId(Long assignmentId);
    List<KPIResult> findByKpiId(Long kpiId);
    List<KPIResult> findByEmployeeId(Long employeeId);
    void deleteByAssignmentId(Long assignmentId);
    void deleteByKpiId(Long kpiId);
}
