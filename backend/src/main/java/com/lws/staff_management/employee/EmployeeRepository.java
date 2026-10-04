package com.lws.staff_management.employee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByEmployeeId(String employeeId);
    Optional<Employee> findByEmail(String email);
    Optional<Employee> findByEmailIgnoreCase(String email);
    Optional<Employee> findByNic(String nic);
    Optional<Employee> findByUserId(Long userId);

    boolean existsByEmployeeId(String employeeId);
    boolean existsByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByNic(String nic);
    boolean existsByDepartmentId(Long departmentId);
    boolean existsByPositionId(Long positionId);
    boolean existsByUserId(Long userId);

    List<Employee> findByDepartmentId(Long departmentId);
    List<Employee> findByPositionId(Long positionId);
    List<Employee> findByEmploymentStatus(String employmentStatus);

    @Query("SELECT e FROM Employee e WHERE " +
           "LOWER(e.firstName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(e.lastName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(e.employeeId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(e.nic) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(e.email) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Employee> searchEmployees(String query);
}
