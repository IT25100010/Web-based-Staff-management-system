package com.lws.staff_management.compliance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DisciplinaryActionRepository extends JpaRepository<DisciplinaryAction, Long> {
    List<DisciplinaryAction> findByEmployeeId(Long employeeId);
    boolean existsByEmployeeId(Long employeeId);
    List<DisciplinaryAction> findByStatus(String status);
}
