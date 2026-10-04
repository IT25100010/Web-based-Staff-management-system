package com.lws.staff_management.employee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {
    List<Position> findByDepartmentId(Long departmentId);
    boolean existsByDepartmentId(Long departmentId);
    boolean existsByTitleAndDepartmentId(String title, Long departmentId);
}
