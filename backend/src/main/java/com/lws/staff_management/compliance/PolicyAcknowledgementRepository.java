package com.lws.staff_management.compliance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PolicyAcknowledgementRepository extends JpaRepository<PolicyAcknowledgement, Long> {
    List<PolicyAcknowledgement> findByEmployeeId(Long employeeId);
    List<PolicyAcknowledgement> findByPolicyId(Long policyId);
    Optional<PolicyAcknowledgement> findByEmployeeIdAndPolicyId(Long employeeId, Long policyId);
    boolean existsByEmployeeIdAndPolicyId(Long employeeId, Long policyId);
}
