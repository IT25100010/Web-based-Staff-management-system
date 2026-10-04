package com.lws.staff_management.workforce;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmployeeTransferRepository extends JpaRepository<EmployeeTransfer, Long> {
    List<EmployeeTransfer> findByEmployeeId(Long employeeId);
    List<EmployeeTransfer> findByStatus(String status);
    long countByStatus(String status);
}
