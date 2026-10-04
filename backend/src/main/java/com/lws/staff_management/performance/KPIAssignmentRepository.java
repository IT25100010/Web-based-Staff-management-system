package com.lws.staff_management.performance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface KPIAssignmentRepository extends JpaRepository<KPIAssignment, Long> {
    List<KPIAssignment> findByKpiId(Long kpiId);
    List<KPIAssignment> findByEmployeeId(Long employeeId);
    List<KPIAssignment> findByEmployeeIdAndStatus(Long employeeId, String status);
    Optional<KPIAssignment> findByKpiIdAndEmployeeId(Long kpiId, Long employeeId);
    boolean existsByKpiIdAndEmployeeId(Long kpiId, Long employeeId);
    void deleteByKpiId(Long kpiId);
}
