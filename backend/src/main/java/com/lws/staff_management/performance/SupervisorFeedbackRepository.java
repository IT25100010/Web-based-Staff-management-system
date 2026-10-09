package com.lws.staff_management.performance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SupervisorFeedbackRepository extends JpaRepository<SupervisorFeedback, Long> {
    List<SupervisorFeedback> findByEmployeeId(Long employeeId);
}
