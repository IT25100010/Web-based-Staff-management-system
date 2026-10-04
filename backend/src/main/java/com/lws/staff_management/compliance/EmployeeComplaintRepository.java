package com.lws.staff_management.compliance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeComplaintRepository extends JpaRepository<EmployeeComplaint, Long> {

    List<EmployeeComplaint> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    List<EmployeeComplaint> findByStatusOrderByCreatedAtDesc(String status);

    List<EmployeeComplaint> findByCategoryOrderByCreatedAtDesc(String category);

    List<EmployeeComplaint> findAllByOrderByCreatedAtDesc();

    Optional<EmployeeComplaint> findByComplaintCode(String complaintCode);

    @Query("SELECT c FROM EmployeeComplaint c WHERE " +
           "(:status IS NULL OR c.status = :status) AND " +
           "(:category IS NULL OR c.category = :category) AND " +
           "(:search IS NULL OR LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.complaintCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.description) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.employee.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.employee.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.employee.employeeId) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY c.createdAt DESC")
    List<EmployeeComplaint> searchComplaints(@Param("status") String status,
                                            @Param("category") String category,
                                            @Param("search") String search);
}
