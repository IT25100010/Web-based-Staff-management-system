package com.lws.staff_management.employee;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DepartmentEmployeeSequenceRepository extends JpaRepository<DepartmentEmployeeSequence, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM DepartmentEmployeeSequence s WHERE s.departmentId = :departmentId")
    Optional<DepartmentEmployeeSequence> findByDepartmentIdWithLock(@Param("departmentId") Long departmentId);
}
