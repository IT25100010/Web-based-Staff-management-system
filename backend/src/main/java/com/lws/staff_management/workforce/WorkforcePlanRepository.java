package com.lws.staff_management.workforce;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WorkforcePlanRepository extends JpaRepository<WorkforcePlan, Long> {
    List<WorkforcePlan> findByStatus(String status);
}
