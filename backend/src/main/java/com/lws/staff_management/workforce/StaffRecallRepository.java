package com.lws.staff_management.workforce;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StaffRecallRepository extends JpaRepository<StaffRecall, Long> {
    List<StaffRecall> findByStatus(String status);
    long countByStatus(String status);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT r FROM StaffRecall r LEFT JOIN r.recipients rec WHERE r.isBroadcast = true OR rec.id = :employeeId ORDER BY r.recallDate DESC, r.recallTime DESC")
    List<StaffRecall> findRecallsForEmployee(@org.springframework.data.repository.query.Param("employeeId") Long employeeId);
}
