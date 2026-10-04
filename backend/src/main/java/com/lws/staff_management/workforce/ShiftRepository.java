package com.lws.staff_management.workforce;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long> {
    Optional<Shift> findByShiftCode(String shiftCode);
    List<Shift> findByShiftDate(LocalDate shiftDate);
    List<Shift> findByShiftDateBetween(LocalDate startDate, LocalDate endDate);
    List<Shift> findByWorkLocationId(Long workLocationId);
    boolean existsByWorkLocationId(Long workLocationId);
    List<Shift> findByStatus(String status);
    long countByShiftDate(LocalDate shiftDate);
}
