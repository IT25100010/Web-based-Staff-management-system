package com.lws.staff_management.attendance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByEmployeeId(Long employeeId);
    boolean existsByEmployeeId(Long employeeId);
    List<LeaveRequest> findByStatus(String status);
    List<LeaveRequest> findByEmployeeIdAndStatus(Long employeeId, String status);
    long countByStatus(String status);

    @Query("SELECT COUNT(l) > 0 FROM LeaveRequest l WHERE l.employee.id = :employeeId AND l.status = 'APPROVED' AND l.startDate <= :date AND l.endDate >= :date")
    boolean isEmployeeOnApprovedLeave(Long employeeId, LocalDate date);

    @Query("SELECT l FROM LeaveRequest l WHERE l.status = 'APPROVED' AND l.startDate <= :date AND l.endDate >= :date")
    List<LeaveRequest> findApprovedLeavesOnDate(LocalDate date);

    @Query("SELECT l FROM LeaveRequest l WHERE l.employee.id = :employeeId AND l.status = 'APPROVED' AND l.startDate <= :endDate AND l.endDate >= :startDate")
    List<LeaveRequest> findApprovedLeavesInPeriod(@org.springframework.data.repository.query.Param("employeeId") Long employeeId,
                                                  @org.springframework.data.repository.query.Param("startDate") LocalDate startDate,
                                                  @org.springframework.data.repository.query.Param("endDate") LocalDate endDate);
}
