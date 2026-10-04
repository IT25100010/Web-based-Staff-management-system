package com.lws.staff_management.recruitment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface JobVacancyRepository extends JpaRepository<JobVacancy, Long> {
    Optional<JobVacancy> findByVacancyCode(String vacancyCode);
    List<JobVacancy> findByStatus(String status);
    List<JobVacancy> findByDepartmentId(Long departmentId);
    long countByStatus(String status);
}
