package com.lws.staff_management.payroll;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface PayrollRepository extends JpaRepository<Payroll, Long> {
    Optional<Payroll> findByPayrollMonthAndPayrollYear(int month, int year);
    List<Payroll> findAllByOrderByPayrollYearDescPayrollMonthDesc();
}
