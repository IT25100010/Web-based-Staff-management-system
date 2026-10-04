package com.lws.staff_management.payroll;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PayslipRepository extends JpaRepository<Payslip, Long> {
    Optional<Payslip> findByPayslipNumber(String payslipNumber);
    List<Payslip> findByEmployeeIdOrderByIssueDateDesc(Long employeeId);
}
