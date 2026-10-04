package com.lws.staff_management.performance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface KPIOptionRepository extends JpaRepository<KPIOption, Long> {
    List<KPIOption> findByQuestionIdOrderByDisplayOrderAsc(Long questionId);
    List<KPIOption> findByQuestionId(Long questionId);
    void deleteByQuestionId(Long questionId);
}
