package com.lws.staff_management.employee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmployeeDocumentRepository extends JpaRepository<EmployeeDocument, Long> {
    List<EmployeeDocument> findByEmployeeId(Long employeeId);
    List<EmployeeDocument> findByStatus(String status);
    List<EmployeeDocument> findByDocumentType(String documentType);
    boolean existsByEmployeeId(Long employeeId);
    long countByStatus(String status);
}
