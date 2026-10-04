package com.lws.staff_management.payroll;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PayrollDetailRepository extends JpaRepository<PayrollDetail, Long> {
    List<PayrollDetail> findByPayrollId(Long payrollId);
    Optional<PayrollDetail> findByPayrollIdAndEmployeeId(Long payrollId, Long employeeId);
    boolean existsByEmployeeId(Long employeeId);
}
