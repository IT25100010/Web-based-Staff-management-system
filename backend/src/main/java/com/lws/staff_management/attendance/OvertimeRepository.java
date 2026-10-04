package com.lws.staff_management.attendance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface OvertimeRepository extends JpaRepository<OvertimeRecord, Long> {
    List<OvertimeRecord> findByEmployeeId(Long employeeId);
    boolean existsByEmployeeId(Long employeeId);
    java.util.Optional<OvertimeRecord> findByEmployeeIdAndOvertimeDate(Long employeeId, LocalDate overtimeDate);
    List<OvertimeRecord> findByOvertimeDateBetween(LocalDate startDate, LocalDate endDate);
    List<OvertimeRecord> findByEmployeeIdAndOvertimeDateBetween(Long employeeId, LocalDate startDate, LocalDate endDate);
}
