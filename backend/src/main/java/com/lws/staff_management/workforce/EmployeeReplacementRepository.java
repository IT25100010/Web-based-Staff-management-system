package com.lws.staff_management.workforce;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmployeeReplacementRepository extends JpaRepository<EmployeeReplacement, Long> {

    List<EmployeeReplacement> findByShiftId(Long shiftId);
    List<EmployeeReplacement> findByStatus(String status);
    long countByStatus(String status);
    boolean existsByShiftIdAndOriginalEmployeeId(Long shiftId, Long originalEmployeeId);
    boolean existsByShiftIdAndOriginalEmployeeIdAndStatus(Long shiftId, Long originalEmployeeId, String status);
}
