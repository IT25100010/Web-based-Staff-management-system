package com.lws.staff_management.attendance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    Optional<Attendance> findByEmployeeIdAndAttendanceDate(Long employeeId, LocalDate date);
    List<Attendance> findByEmployeeId(Long employeeId);
    boolean existsByEmployeeId(Long employeeId);
    List<Attendance> findByAttendanceDate(LocalDate date);
    List<Attendance> findByAttendanceDateBetween(LocalDate startDate, LocalDate endDate);
    List<Attendance> findByEmployeeIdAndAttendanceDateBetween(Long employeeId, LocalDate startDate, LocalDate endDate);
    long countByAttendanceDateAndStatus(LocalDate date, String status);
}
