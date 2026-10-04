package com.lws.staff_management.performance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface KPIWorkshopRepository extends JpaRepository<KPIWorkshop, Long> {
    Optional<KPIWorkshop> findByKpiId(Long kpiId);
    void deleteByKpiId(Long kpiId);
}
