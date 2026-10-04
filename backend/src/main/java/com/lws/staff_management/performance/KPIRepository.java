package com.lws.staff_management.performance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface KPIRepository extends JpaRepository<KPI, Long> {
    List<KPI> findByStatus(String status);
    List<KPI> findByDepartmentId(Long departmentId);
}
