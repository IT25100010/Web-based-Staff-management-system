package com.lws.staff_management.payroll;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmployeeBenefitRepository extends JpaRepository<EmployeeBenefit, Long> {
    List<EmployeeBenefit> findByEmployeeId(Long employeeId);
    boolean existsByEmployeeId(Long employeeId);
    List<EmployeeBenefit> findByStatus(String status);
}
