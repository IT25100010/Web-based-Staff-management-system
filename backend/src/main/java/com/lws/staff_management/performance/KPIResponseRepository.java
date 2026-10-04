package com.lws.staff_management.performance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface KPIResponseRepository extends JpaRepository<KPIResponse, Long> {
    List<KPIResponse> findByAssignmentId(Long assignmentId);
    void deleteByAssignmentId(Long assignmentId);
    boolean existsByQuestionId(Long questionId);
    boolean existsByAssignment_Kpi_Id(Long kpiId);
}
