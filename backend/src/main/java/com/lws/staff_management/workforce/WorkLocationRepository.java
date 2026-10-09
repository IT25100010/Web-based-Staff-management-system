package com.lws.staff_management.workforce;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkLocationRepository extends JpaRepository<WorkLocation, Long> {
    Optional<WorkLocation> findByLocationCode(String locationCode);
    List<WorkLocation> findByStatus(String status);
    long countByStatus(String status);
    List<WorkLocation> findByWorkforcePlanId(Long workforcePlanId);
    boolean existsByWorkforcePlanId(Long workforcePlanId);
}
