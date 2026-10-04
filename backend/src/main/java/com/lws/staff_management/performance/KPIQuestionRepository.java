package com.lws.staff_management.performance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface KPIQuestionRepository extends JpaRepository<KPIQuestion, Long> {
    List<KPIQuestion> findByKpiIdOrderByDisplayOrderAsc(Long kpiId);
    List<KPIQuestion> findByKpiId(Long kpiId);
    long countByKpiId(Long kpiId);
    void deleteByKpiId(Long kpiId);
}
