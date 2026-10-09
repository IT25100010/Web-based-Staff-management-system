package com.lws.staff_management.workforce;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WorkforceAssignmentRepository extends JpaRepository<WorkforceAssignment, Long> {
    List<WorkforceAssignment> findByAssignmentDate(LocalDate date);
    List<WorkforceAssignment> findByShiftId(Long shiftId);
    List<WorkforceAssignment> findByShiftIdAndStatus(Long shiftId, String status);
    List<WorkforceAssignment> findByWorkLocationId(Long workLocationId);
    List<WorkforceAssignment> findByEmployeeId(Long employeeId);
    List<WorkforceAssignment> findByEmployeeIdAndStatus(Long employeeId, String status);
    List<WorkforceAssignment> findByEmployeeIdAndAssignmentDate(Long employeeId, LocalDate date);
    List<WorkforceAssignment> findByEmployeeIdAndAssignmentDateBetween(Long employeeId, LocalDate startDate, LocalDate endDate);
    List<WorkforceAssignment> findByWorkLocationIdAndAssignmentDateAndStatus(Long workLocationId, LocalDate date, String status);

    boolean existsByEmployeeId(Long employeeId);
    boolean existsByWorkLocationId(Long workLocationId);
    boolean existsByShiftId(Long shiftId);
    boolean existsByEmployeeIdAndAssignmentDateAndShiftId(Long employeeId, LocalDate date, Long shiftId);
    boolean existsByEmployeeIdAndAssignmentDateAndStatusNot(Long employeeId, LocalDate date, String notStatus);

    @Query("SELECT a FROM WorkforceAssignment a WHERE a.employee.id = :employeeId AND a.assignmentDate = :date AND a.status != 'CANCELLED' AND a.status != 'REPLACED'")
    List<WorkforceAssignment> findActiveAssignmentsForEmployeeOnDate(Long employeeId, LocalDate date);

    long countByShiftIdAndStatus(Long shiftId, String status);
    long countByWorkLocationIdAndAssignmentDateAndStatus(Long workLocationId, LocalDate date, String status);
}
